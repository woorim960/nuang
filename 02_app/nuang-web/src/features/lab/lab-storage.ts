"use client";

import { localCompletedRetentionDays } from "@/features/account/local-retention-policy";
import type {
  LabAnswer,
  LabAssessment,
  LabScoreResult,
} from "@/features/lab/lab-assessments";
import {
  canReadScopedLocalResult,
  confirmResultAuthScopeUnchanged,
  isGuestOnlyResult,
  readCurrentSupabaseUserId,
  rememberVerifiedAccountScope,
  verifyStableResultAuthScope,
} from "@/features/result-persistence/client-result-scope";

export type StoredLabResult = {
  assessmentSnapshot?: LabAssessment;
  answers: Record<string, LabAnswer>;
  completedAt: string;
  contentVersion?: string;
  expiresAt?: string;
  localResultId: string;
  nuangCodeContext?: {
    capturedAt: string;
    code: string;
  };
  ownerAccountId?: string;
  ownerSupabaseUserId?: string;
  productReleaseId?: string;
  result: LabScoreResult;
  serverResultId?: string;
  slug: string;
  storageRevision?: number;
  sync?: {
    lastError?: string;
    status: "failed" | "queued" | "synced";
    syncedAt?: string;
  };
};

type SaveLabResultInput = Omit<StoredLabResult, "localResultId"> & {
  localResultId?: string;
};

const LEGACY_RESULT_PREFIX = "nuang-lab-result:";
const RESULT_ITEM_PREFIX = "nuang-lab-result:item:";
const RESULT_INDEX_KEY = "nuang-lab-result:index";
const LATEST_RESULT_PREFIX = "nuang-lab-result:latest:";
const TOMBSTONE_PREFIX = "nuang-lab-result:tombstone:";
const syncControllers = new Map<string, AbortController>();
const syncInFlight = new Map<string, Promise<StoredLabResult>>();

export function createLabLocalResultId() {
  return `lab_${crypto.randomUUID()}`;
}

export function saveLabResult(result: SaveLabResultInput): StoredLabResult {
  const completedAt = new Date(result.completedAt);
  const expiresAt =
    result.expiresAt ??
    addDays(
      Number.isNaN(completedAt.getTime()) ? new Date() : completedAt,
      localCompletedRetentionDays,
    ).toISOString();

  const localResultId = result.localResultId ?? createLabLocalResultId();
  const current = loadLabResultById(localResultId);
  if (
    !current &&
    result.storageRevision &&
    localStorage.getItem(`${TOMBSTONE_PREFIX}${localResultId}`)
  ) {
    return { ...result, expiresAt, localResultId } as StoredLabResult;
  }
  if (!current && !result.storageRevision) {
    localStorage.removeItem(`${TOMBSTONE_PREFIX}${localResultId}`);
  }
  const storedResult = {
    ...result,
    expiresAt,
    localResultId,
    storageRevision:
      Math.max(current?.storageRevision ?? 0, result.storageRevision ?? 0) + 1,
    sync: result.sync ?? { status: "queued" as const },
  } satisfies StoredLabResult;
  localStorage.setItem(
    `${RESULT_ITEM_PREFIX}${storedResult.localResultId}`,
    JSON.stringify(storedResult),
  );
  writeIndex([
    storedResult.localResultId,
    ...readIndex().filter((id) => id !== storedResult.localResultId),
  ]);
  updateLatestPointer(storedResult);
  return storedResult;
}

export function loadLabResult(slug: string) {
  const latestId = localStorage.getItem(`${LATEST_RESULT_PREFIX}${slug}`);
  const current = latestId ? loadLabResultById(latestId) : null;

  if (current?.slug === slug) return current;
  return migrateLegacyLabResult(slug);
}

export function loadLabResultById(localResultId: string) {
  const raw = localStorage.getItem(`${RESULT_ITEM_PREFIX}${localResultId}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredLabResult>;
    if (
      parsed.localResultId !== localResultId ||
      typeof parsed.slug !== "string" ||
      typeof parsed.completedAt !== "string" ||
      !parsed.result ||
      !parsed.answers
    ) {
      return null;
    }
    return parsed as StoredLabResult;
  } catch {
    return null;
  }
}

export function listLabResults(slugs: string[]) {
  slugs.forEach((slug) => {
    migrateLegacyLabResult(slug);
  });

  const now = Date.now();
  const allowedSlugs = new Set(slugs);
  return readIndex()
    .map((localResultId) => loadLabResultById(localResultId))
    .filter((result): result is StoredLabResult => Boolean(result))
    .filter((result) => allowedSlugs.has(result.slug))
    .filter((result) => new Date(getLabExpiresAt(result)).getTime() > now)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export async function listLabResultsLocalFirst(slugs: string[]) {
  const serverRead = await fetchLabResultsFromServer();
  const supabaseUserId = serverRead.authUserId;
  rememberVerifiedAccountScope({
    accountId: serverRead.accountId,
    supabaseUserId,
  });
  reconcileDeletedLabResults(serverRead.deletedLocalResultIds);
  const deletedLocalResultIds = new Set(serverRead.deletedLocalResultIds);
  const serverResults = serverRead.results.filter(
    (result) => !deletedLocalResultIds.has(result.localResultId),
  );
  const allowedSlugs = new Set(slugs);
  const merged = new Map<string, StoredLabResult>(
    serverResults
      .filter((result) => allowedSlugs.has(result.slug))
      .map(
        (result) =>
          [
            result.localResultId,
            supabaseUserId
              ? { ...result, ownerSupabaseUserId: supabaseUserId }
              : result,
          ] as const,
      ),
  );

  listLabResults(slugs).forEach((result) => {
    const serverResult = merged.get(result.localResultId);
    if (
      !canReadScopedLocalResult({
        accountId: serverRead.accountId,
        result,
        serverHasResult: Boolean(serverResult),
        serverState: serverRead.state,
        supabaseUserId,
      })
    ) {
      return;
    }
    const scopedServerResult = serverResult
      ? {
          ...serverResult,
          ...(supabaseUserId ? { ownerSupabaseUserId: supabaseUserId } : {}),
        }
      : null;
    merged.set(
      result.localResultId,
      scopedServerResult && result.sync?.status === "synced"
        ? saveLabResult({
            ...scopedServerResult,
            answers: result.answers,
            expiresAt: result.expiresAt,
          })
        : result,
    );
  });

  return [...merged.values()].sort((left, right) =>
    right.completedAt.localeCompare(left.completedAt),
  );
}

export async function loadLabResultLocalFirst(localResultId: string) {
  const localResult = loadLabResultById(localResultId);
  if (localResult && isGuestOnlyResult(localResult)) {
    const requestUserId = await readCurrentSupabaseUserId();
    if (!requestUserId) return localResult;
    return loadLabResultForAuthenticatedScope({
      localResult,
      localResultId,
      requestUserId,
    });
  }

  return loadLabResultForAuthenticatedScope({ localResult, localResultId });
}

async function loadLabResultForAuthenticatedScope({
  localResult,
  localResultId,
  requestUserId,
}: {
  localResult: StoredLabResult | null;
  localResultId: string;
  requestUserId?: string;
}) {
  const serverRead = await fetchLabResultsFromServer(
    localResultId,
    requestUserId,
  );
  const supabaseUserId = serverRead.authUserId;
  rememberVerifiedAccountScope({
    accountId: serverRead.accountId,
    supabaseUserId,
  });
  reconcileDeletedLabResults(serverRead.deletedLocalResultIds);
  if (serverRead.deletedLocalResultIds.includes(localResultId)) return null;
  const serverResult = serverRead.results.find(
    (result) => result.localResultId === localResultId,
  );
  if (
    localResult &&
    !canReadScopedLocalResult({
      accountId: serverRead.accountId,
      result: localResult,
      serverHasResult: Boolean(serverResult),
      serverState: serverRead.state,
      supabaseUserId,
    })
  ) {
    return null;
  }
  if (!serverResult) return localResult;

  const hydrated = saveLabResult({
    ...serverResult,
    ...(supabaseUserId ? { ownerSupabaseUserId: supabaseUserId } : {}),
    ...(localResult
      ? { answers: localResult.answers, expiresAt: localResult.expiresAt }
      : {}),
  });
  return hydrated;
}

export async function loadLatestLabResultLocalFirst(slug: string) {
  const serverRead = await fetchLabResultsFromServer();
  const supabaseUserId = serverRead.authUserId;
  rememberVerifiedAccountScope({
    accountId: serverRead.accountId,
    supabaseUserId,
  });
  reconcileDeletedLabResults(serverRead.deletedLocalResultIds);
  const localCandidate = loadLabResult(slug);
  const localResult =
    localCandidate &&
    !canReadScopedLocalResult({
      accountId: serverRead.accountId,
      result: localCandidate,
      serverHasResult: serverRead.results.some(
        (result) => result.localResultId === localCandidate.localResultId,
      ),
      serverState: serverRead.state,
      supabaseUserId,
    })
      ? null
      : localCandidate;
  const serverResult = serverRead.results.find(
    (result) => result.slug === slug,
  );
  if (!serverResult) return localResult;
  if (
    localResult &&
    (localResult.sync?.status !== "synced" ||
      localResult.completedAt >= serverResult.completedAt)
  ) {
    return localResult;
  }
  return saveLabResult({
    ...serverResult,
    ...(supabaseUserId ? { ownerSupabaseUserId: supabaseUserId } : {}),
  });
}

export function deleteLabResult(localResultIdOrSlug: string) {
  const directResult = loadLabResultById(localResultIdOrSlug);
  const result = directResult ?? loadLabResult(localResultIdOrSlug);

  if (!result) {
    localStorage.removeItem(`${LEGACY_RESULT_PREFIX}${localResultIdOrSlug}`);
    return;
  }

  syncControllers.get(result.localResultId)?.abort();
  localStorage.setItem(
    `${TOMBSTONE_PREFIX}${result.localResultId}`,
    new Date().toISOString(),
  );
  localStorage.removeItem(`${RESULT_ITEM_PREFIX}${result.localResultId}`);
  writeIndex(readIndex().filter((id) => id !== result.localResultId));

  const latestPointerKey = `${LATEST_RESULT_PREFIX}${result.slug}`;
  if (localStorage.getItem(latestPointerKey) === result.localResultId) {
    const nextLatest = listLabResults([result.slug])[0];
    if (nextLatest) {
      localStorage.setItem(latestPointerKey, nextLatest.localResultId);
    } else {
      localStorage.removeItem(latestPointerKey);
    }
  }

  localStorage.removeItem(`${LEGACY_RESULT_PREFIX}${result.slug}`);
}

export async function deleteLabResultEverywhere(
  localResultId: string,
): Promise<"deleted" | "error" | "local_only"> {
  const localResult = loadLabResultById(localResultId);
  if (localResult && isGuestOnlyResult(localResult)) {
    deleteLabResult(localResultId);
    return "local_only";
  }
  syncControllers.get(localResultId)?.abort();
  const requestUserId = await readCurrentSupabaseUserId();
  if (
    !requestUserId ||
    (localResult?.ownerSupabaseUserId &&
      localResult.ownerSupabaseUserId !== requestUserId)
  ) {
    return "error";
  }
  try {
    const response = await fetch("/api/lab-results", {
      body: JSON.stringify({ localResultId }),
      headers: {
        "content-type": "application/json",
        "x-nuang-auth-user-id": requestUserId,
      },
      method: "DELETE",
    });
    const body = (await response.json().catch(() => null)) as {
      authUserId?: string;
      ok?: boolean;
    } | null;
    if (response.status === 401 || !response.ok || !body?.ok) return "error";
    const stableUserId = await verifyStableResultAuthScope({
      requestUserId,
      responseUserId: body.authUserId,
    });
    if (!stableUserId) return "error";
    deleteLabResult(localResultId);
    return "deleted";
  } catch {
    return "error";
  }
}

export function getLabExpiresAt(result: StoredLabResult) {
  if (result.expiresAt) return result.expiresAt;

  const completedAt = new Date(result.completedAt);
  return addDays(
    Number.isNaN(completedAt.getTime()) ? new Date() : completedAt,
    localCompletedRetentionDays,
  ).toISOString();
}

export async function syncLabResult(result: StoredLabResult) {
  const existing = syncInFlight.get(result.localResultId);
  if (existing) return existing;

  const sync = syncLabResultOnce(result).finally(() => {
    syncInFlight.delete(result.localResultId);
    syncControllers.delete(result.localResultId);
  });
  syncInFlight.set(result.localResultId, sync);
  return sync;
}

async function syncLabResultOnce(result: StoredLabResult) {
  let current = loadLabResultById(result.localResultId);
  if (!current) {
    if (localStorage.getItem(`${TOMBSTONE_PREFIX}${result.localResultId}`)) {
      return result;
    }
    current = saveLabResult(result);
  }

  const supabaseUserId = await readCurrentSupabaseUserId();
  if (!supabaseUserId) {
    return markLabSyncFailed(current, "login_required");
  }
  if (
    current.ownerSupabaseUserId &&
    current.ownerSupabaseUserId !== supabaseUserId
  ) {
    return current;
  }
  const latest = loadLabResultById(current.localResultId);
  if (
    !latest ||
    (latest.storageRevision ?? 0) !== (current.storageRevision ?? 0) ||
    localStorage.getItem(`${TOMBSTONE_PREFIX}${current.localResultId}`)
  ) {
    return current;
  }

  const scoped = saveLabResult({
    ...latest,
    ownerSupabaseUserId: supabaseUserId,
  });
  const expectedRevision = scoped.storageRevision ?? 0;
  const controller = new AbortController();
  syncControllers.set(scoped.localResultId, controller);

  try {
    const response = await fetch("/api/lab-results", {
      body: JSON.stringify({
        answers: scoped.answers,
        completedAt: scoped.completedAt,
        contentVersion: scoped.contentVersion,
        localResultId: scoped.localResultId,
        productReleaseId: scoped.productReleaseId,
        slug: scoped.slug,
      }),
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "x-nuang-auth-user-id": supabaseUserId,
      },
      method: "POST",
      signal: controller.signal,
    });
    const body = (await response.json().catch(() => null)) as {
      accountId?: string;
      authUserId?: string;
      ok?: boolean;
      result?: {
        nuangCodeContext?: StoredLabResult["nuangCodeContext"] | null;
        serverResultId?: string;
        syncedAt?: string;
      };
    } | null;
    if (response.status === 401) {
      return markLabSyncFailed(scoped, "login_required", expectedRevision);
    }
    if (response.status === 410) {
      const stableUserId = await verifyStableResultAuthScope({
        requestUserId: supabaseUserId,
        responseUserId: body?.authUserId,
      });
      if (!stableUserId) {
        return markLabSyncFailed(
          scoped,
          "auth_scope_changed",
          expectedRevision,
        );
      }
      deleteLabResult(scoped.localResultId);
      return scoped;
    }
    if (!response.ok) {
      return markLabSyncFailed(
        scoped,
        `http_${response.status}`,
        expectedRevision,
      );
    }
    if (!body?.ok || !body.result?.serverResultId) {
      return markLabSyncFailed(scoped, "invalid_response", expectedRevision);
    }
    const stableUserId = await verifyStableResultAuthScope({
      requestUserId: supabaseUserId,
      responseUserId: body.authUserId,
    });
    if (!stableUserId) {
      return markLabSyncFailed(scoped, "auth_scope_changed", expectedRevision);
    }
    rememberVerifiedAccountScope({
      accountId: body.accountId ?? null,
      supabaseUserId: stableUserId,
    });
    return (
      saveLabResultIfCurrent({
        expectedRevision,
        result: {
          ...scoped,
          ...(body.result.nuangCodeContext
            ? { nuangCodeContext: body.result.nuangCodeContext }
            : {}),
          ...(body.accountId ? { ownerAccountId: body.accountId } : {}),
          ownerSupabaseUserId: stableUserId,
          serverResultId: body.result.serverResultId,
          sync: {
            status: "synced",
            syncedAt: body.result.syncedAt ?? new Date().toISOString(),
          },
        },
      }) ?? scoped
    );
  } catch {
    return markLabSyncFailed(scoped, "network_unavailable", expectedRevision);
  }
}

async function fetchLabResultsFromServer(
  localResultId?: string,
  capturedRequestUserId?: string,
) {
  const requestUserId =
    capturedRequestUserId ?? (await readCurrentSupabaseUserId());
  try {
    const query = localResultId
      ? `?localResultId=${encodeURIComponent(localResultId)}`
      : "";
    const response = await fetch(`/api/lab-results${query}`, {
      cache: "no-store",
      headers: requestUserId
        ? { "x-nuang-auth-user-id": requestUserId }
        : undefined,
      method: "GET",
    });
    if (response.status === 401) {
      return {
        accountId: null,
        authUserId: null,
        deletedLocalResultIds: [] as string[],
        results: [] as StoredLabResult[],
        state: "unauthenticated" as const,
      };
    }
    if (!response.ok) {
      return {
        accountId: null,
        authUserId: await confirmResultAuthScopeUnchanged(requestUserId),
        deletedLocalResultIds: [] as string[],
        results: [] as StoredLabResult[],
        state: "error" as const,
      };
    }
    const body = (await response.json()) as {
      accountId?: string;
      authUserId?: string;
      deletedLocalResultIds?: string[];
      ok?: boolean;
      results?: Array<
        Omit<StoredLabResult, "expiresAt"> & { expiresAt?: string }
      >;
    };
    const stableUserId = await verifyStableResultAuthScope({
      requestUserId,
      responseUserId: body.authUserId,
    });
    if (
      !body.ok ||
      !Array.isArray(body.deletedLocalResultIds) ||
      !Array.isArray(body.results) ||
      !stableUserId
    ) {
      return {
        accountId: null,
        authUserId: null,
        deletedLocalResultIds: [] as string[],
        results: [] as StoredLabResult[],
        state: "error" as const,
      };
    }
    return {
      accountId: body.accountId ?? null,
      authUserId: stableUserId,
      deletedLocalResultIds: body.deletedLocalResultIds.filter(
        (value): value is string => typeof value === "string",
      ),
      results: body.results.map((result) =>
        normalizeServerLabResult({
          ...result,
          ...(body.accountId ? { ownerAccountId: body.accountId } : {}),
        }),
      ),
      state: "ready" as const,
    };
  } catch {
    return {
      accountId: null,
      authUserId: await confirmResultAuthScopeUnchanged(requestUserId),
      deletedLocalResultIds: [] as string[],
      results: [] as StoredLabResult[],
      state: "error" as const,
    };
  }
}

function reconcileDeletedLabResults(localResultIds: string[]) {
  localResultIds.forEach((localResultId) => {
    const result = loadLabResultById(localResultId);
    if (result) {
      deleteLabResult(localResultId);
    } else {
      syncControllers.get(localResultId)?.abort();
      localStorage.removeItem(`${RESULT_ITEM_PREFIX}${localResultId}`);
      writeIndex(readIndex().filter((id) => id !== localResultId));

      const staleLatestKeys: string[] = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (
          key?.startsWith(LATEST_RESULT_PREFIX) &&
          localStorage.getItem(key) === localResultId
        ) {
          staleLatestKeys.push(key);
        }
      }
      staleLatestKeys.forEach((key) => localStorage.removeItem(key));
    }
    localStorage.setItem(
      `${TOMBSTONE_PREFIX}${localResultId}`,
      new Date().toISOString(),
    );
  });
}

export function clearAccountOwnedLabResults(accountId?: string) {
  for (const controller of syncControllers.values()) controller.abort();
  syncControllers.clear();
  allStoredLabResultIds()
    .map((localResultId) => loadLabResultById(localResultId))
    .filter((result): result is StoredLabResult => Boolean(result))
    .filter(
      (result) =>
        !isGuestOnlyResult(result) &&
        (!accountId ||
          !result.ownerAccountId ||
          result.ownerAccountId === accountId),
    )
    .forEach((result) => deleteLabResult(result.localResultId));
}

function markLabSyncFailed(
  result: StoredLabResult,
  lastError: string,
  expectedRevision = result.storageRevision ?? 0,
) {
  return (
    saveLabResultIfCurrent({
      expectedRevision,
      result: {
        ...result,
        sync: { lastError, status: "failed" },
      },
    }) ?? result
  );
}

function saveLabResultIfCurrent({
  expectedRevision,
  result,
}: {
  expectedRevision: number;
  result: StoredLabResult;
}) {
  const current = loadLabResultById(result.localResultId);
  if (
    !current ||
    (current.storageRevision ?? 0) !== expectedRevision ||
    localStorage.getItem(`${TOMBSTONE_PREFIX}${result.localResultId}`)
  ) {
    return null;
  }
  return saveLabResult(result);
}

function normalizeServerLabResult(
  result: Omit<StoredLabResult, "expiresAt"> & { expiresAt?: string },
) {
  return {
    ...result,
    expiresAt:
      result.expiresAt ??
      addDays(new Date(), localCompletedRetentionDays).toISOString(),
  } satisfies StoredLabResult;
}

function migrateLegacyLabResult(slug: string) {
  const legacyKey = `${LEGACY_RESULT_PREFIX}${slug}`;
  const raw = localStorage.getItem(legacyKey);
  if (!raw) return null;

  try {
    const legacy = JSON.parse(raw) as SaveLabResultInput;
    if (
      legacy.slug !== slug ||
      typeof legacy.completedAt !== "string" ||
      !legacy.result ||
      !legacy.answers
    ) {
      return null;
    }

    const migrated = saveLabResult(legacy);
    localStorage.removeItem(legacyKey);
    return migrated;
  } catch {
    return null;
  }
}

function updateLatestPointer(result: StoredLabResult) {
  const pointerKey = `${LATEST_RESULT_PREFIX}${result.slug}`;
  const currentId = localStorage.getItem(pointerKey);
  const current = currentId ? loadLabResultById(currentId) : null;

  if (!current || current.completedAt <= result.completedAt) {
    localStorage.setItem(pointerKey, result.localResultId);
  }
}

function readIndex() {
  const raw = localStorage.getItem(RESULT_INDEX_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function allStoredLabResultIds() {
  const ids = new Set(readIndex());
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(RESULT_ITEM_PREFIX)) {
      ids.add(key.slice(RESULT_ITEM_PREFIX.length));
    }
  }
  return [...ids];
}

function writeIndex(ids: string[]) {
  localStorage.setItem(
    RESULT_INDEX_KEY,
    JSON.stringify(Array.from(new Set(ids))),
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
