"use client";

import type {
  BalanceApiError,
  BalanceRoomStateResponse,
  BalanceRoomPreviewResponse,
  CreateBalanceRoomRequest,
  CreateBalanceRoomResponse,
  JoinBalanceRoomRequest,
  JoinBalanceRoomResponse,
  SaveBalanceResponseRequest,
} from "@/features/together-balance/api-contract";
import {
  BALANCE_PARTICIPANT_TOKEN_HEADER,
  balanceParticipantSessionStorageKey,
} from "@/features/together-balance/api-contract";

type ParticipantSession = {
  lastClientSequence?: number;
  participantId: string;
  participantToken: string;
  savedAt: string;
};

type ParticipantSessions = Record<string, ParticipantSession>;
type ExposureEntry = {
  itemId: string;
  seenAt: string;
};
type ExposureHistory = Record<string, ExposureEntry[]>;

const balanceExposureStorageKey = "nuang.together-balance.exposure.v1";
const EXPOSURE_WINDOW_MS = 90 * 24 * 60 * 60 * 1_000;
const MAX_CLIENT_SEQUENCE = 2_147_483_647;
const inMemoryParticipantSessions: ParticipantSessions = {};

export class BalanceApiClientError extends Error {
  code: BalanceApiError["code"];
  retryable: boolean;
  status: number;

  constructor(payload: BalanceApiError, status: number) {
    super(payload.message);
    this.name = "BalanceApiClientError";
    this.code = payload.code;
    this.retryable = payload.retryable;
    this.status = status;
  }
}

export async function createBalanceRoom(payload: CreateBalanceRoomRequest) {
  const result = await requestBalanceApi<CreateBalanceRoomResponse>(
    "/api/together/balance-game/rooms",
    {
      body: JSON.stringify({
        ...payload,
        recentItemIds: readRecentBalanceItemIds(payload.packSlug),
      }),
      method: "POST",
    },
  );

  saveParticipantSession(result.room.roomCode, {
    participantId: result.room.myParticipantId,
    participantToken: result.participantToken,
    savedAt: new Date().toISOString(),
  });
  saveBalanceExposureHistory(result.room);
  return result;
}

export async function joinBalanceRoom(
  roomCode: string,
  payload: JoinBalanceRoomRequest,
) {
  const result = await requestBalanceApi<JoinBalanceRoomResponse>(
    `/api/together/balance-game/rooms/${encodeURIComponent(roomCode)}/join`,
    {
      body: JSON.stringify(payload),
      method: "POST",
    },
  );

  saveParticipantSession(result.room.roomCode, {
    participantId: result.room.myParticipantId,
    participantToken: result.participantToken,
    savedAt: new Date().toISOString(),
  });
  saveBalanceExposureHistory(result.room);
  return result;
}

export async function readBalanceRoom(roomCode: string) {
  const result = await requestRoom<BalanceRoomStateResponse>(
    roomCode,
    "state",
    {
      method: "GET",
    },
  );
  saveBalanceExposureHistory(result.room);
  return result;
}

export async function readBalanceRoomPreview(roomCode: string) {
  return requestBalanceApi<BalanceRoomPreviewResponse>(
    `/api/together/balance-game/rooms/${encodeURIComponent(
      normalizeRoomCode(roomCode),
    )}/preview`,
    { method: "GET" },
  );
}

export async function saveBalanceResponse(
  roomCode: string,
  itemId: string,
  payload: Omit<SaveBalanceResponseRequest, "clientSequence">,
) {
  return requestRoom<BalanceRoomStateResponse>(
    roomCode,
    `responses/${encodeURIComponent(itemId)}`,
    {
      body: JSON.stringify({
        ...payload,
        clientSequence: nextParticipantClientSequence(roomCode),
      }),
      method: "PUT",
    },
  );
}

export async function completeBalanceRoom(
  roomCode: string,
  clientRequestId: string,
) {
  return requestRoom<BalanceRoomStateResponse>(roomCode, "complete", {
    body: JSON.stringify({ clientRequestId }),
    method: "POST",
  });
}

export async function finalizeBalanceRoom(
  roomCode: string,
  clientRequestId: string,
) {
  return requestRoom<BalanceRoomStateResponse>(roomCode, "finalize", {
    body: JSON.stringify({ clientRequestId }),
    method: "POST",
  });
}

export async function removeBalanceParticipant(
  roomCode: string,
  participantId: string,
  clientRequestId: string,
) {
  return requestRoom<BalanceRoomStateResponse>(
    roomCode,
    `participants/${encodeURIComponent(participantId)}/remove`,
    {
      body: JSON.stringify({ clientRequestId }),
      method: "POST",
    },
  );
}

export async function shareBalanceRoomToFeed(
  roomCode: string,
  clientRequestId: string,
) {
  return requestRoom<BalanceRoomStateResponse>(roomCode, "feed-share", {
    body: JSON.stringify({ clientRequestId }),
    method: "POST",
  });
}

export function readParticipantSession(roomCode: string) {
  if (typeof window === "undefined") return null;
  return readParticipantSessions()[normalizeRoomCode(roomCode)] ?? null;
}

export function clearParticipantSession(roomCode: string) {
  if (typeof window === "undefined") return;
  const normalizedCode = normalizeRoomCode(roomCode);
  const sessions = readParticipantSessions();
  delete sessions[normalizedCode];
  delete inMemoryParticipantSessions[normalizedCode];
  persistParticipantSessions(sessions);
}

function readRecentBalanceItemIds(packSlug: string) {
  if (typeof window === "undefined") return [];
  const cutoff = Date.now() - EXPOSURE_WINDOW_MS;
  try {
    const history = JSON.parse(
      window.localStorage.getItem(balanceExposureStorageKey) ?? "{}",
    ) as ExposureHistory;
    return (history[packSlug] ?? [])
      .filter((entry) => new Date(entry.seenAt).getTime() >= cutoff)
      .map((entry) => entry.itemId)
      .slice(-128);
  } catch {
    return [];
  }
}

function saveBalanceExposureHistory(room: BalanceRoomStateResponse["room"]) {
  if (typeof window === "undefined") return;
  try {
    const history = JSON.parse(
      window.localStorage.getItem(balanceExposureStorageKey) ?? "{}",
    ) as ExposureHistory;
    const cutoff = Date.now() - EXPOSURE_WINDOW_MS;
    const current = (history[room.pack.slug] ?? []).filter(
      (entry) => new Date(entry.seenAt).getTime() >= cutoff,
    );
    const latestSeenAtById = new Map(
      current.map((entry) => [entry.itemId, entry.seenAt]),
    );
    const now = new Date().toISOString();
    for (const question of room.questions) {
      latestSeenAtById.set(question.id, now);
    }
    history[room.pack.slug] = Array.from(
      latestSeenAtById,
      ([itemId, seenAt]) => ({ itemId, seenAt }),
    ).slice(-128);
    window.localStorage.setItem(
      balanceExposureStorageKey,
      JSON.stringify(history),
    );
  } catch {
    // Storage can be unavailable in privacy mode; the game remains playable.
  }
}

async function requestRoom<T extends { ok: true }>(
  roomCode: string,
  action: string,
  init: RequestInit,
) {
  const normalizedCode = normalizeRoomCode(roomCode);
  const session = readParticipantSession(normalizedCode);

  return requestBalanceApi<T>(
    `/api/together/balance-game/rooms/${encodeURIComponent(
      normalizedCode,
    )}/${action}`,
    {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(session
          ? {
              [BALANCE_PARTICIPANT_TOKEN_HEADER]: session.participantToken,
            }
          : {}),
      },
    },
  );
}

async function requestBalanceApi<T extends { ok: true }>(
  url: string,
  init: RequestInit,
) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: init.signal ?? controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new BalanceApiClientError(
        {
          code: "unexpected_error",
          message: "연결이 오래 걸리고 있어요. 잠시 뒤 다시 시도해 주세요.",
          ok: false,
          retryable: true,
        },
        408,
      );
    }
    throw new BalanceApiClientError(
      {
        code: "unexpected_error",
        message: "연결이 불안정해요. 네트워크를 확인하고 다시 시도해 주세요.",
        ok: false,
        retryable: true,
      },
      0,
    );
  } finally {
    window.clearTimeout(timeout);
  }
  const payload = (await response.json().catch(() => null)) as
    T | BalanceApiError | null;

  if (!response.ok || !payload || !payload.ok) {
    const errorPayload: BalanceApiError =
      payload && !payload.ok
        ? payload
        : {
            code: "unexpected_error",
            message: "잠시 연결이 불안정해요. 다시 시도해 주세요.",
            ok: false,
            retryable: true,
          };
    throw new BalanceApiClientError(errorPayload, response.status);
  }

  return payload as T;
}

function saveParticipantSession(roomCode: string, session: ParticipantSession) {
  if (typeof window === "undefined") return;
  const sessions = readParticipantSessions();
  const normalizedCode = normalizeRoomCode(roomCode);
  const nextSession = {
    ...session,
    lastClientSequence: session.lastClientSequence ?? 0,
  };
  sessions[normalizedCode] = nextSession;
  inMemoryParticipantSessions[normalizedCode] = nextSession;
  persistParticipantSessions(sessions);
}

function readParticipantSessions(): ParticipantSessions {
  if (typeof window === "undefined") return {};

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(balanceParticipantSessionStorageKey) ?? "{}",
    ) as ParticipantSessions;
    return { ...stored, ...inMemoryParticipantSessions };
  } catch {
    return { ...inMemoryParticipantSessions };
  }
}

function nextParticipantClientSequence(roomCode: string) {
  const normalizedCode = normalizeRoomCode(roomCode);
  const sessions = readParticipantSessions();
  const session = sessions[normalizedCode];
  const current = session?.lastClientSequence ?? 0;
  if (!session || current >= MAX_CLIENT_SEQUENCE) {
    throw new Error(
      "응답 저장 순서를 준비하지 못했어요. 방을 다시 열어 주세요.",
    );
  }

  const next = current + 1;
  const nextSession = { ...session, lastClientSequence: next };
  sessions[normalizedCode] = nextSession;
  inMemoryParticipantSessions[normalizedCode] = nextSession;
  persistParticipantSessions(sessions);
  return next;
}

function persistParticipantSessions(sessions: ParticipantSessions) {
  try {
    window.localStorage.setItem(
      balanceParticipantSessionStorageKey,
      JSON.stringify(sessions),
    );
  } catch {
    // Keep the active-tab fallback when durable browser storage is unavailable.
  }
}

function normalizeRoomCode(roomCode: string) {
  return roomCode.trim().toUpperCase();
}
