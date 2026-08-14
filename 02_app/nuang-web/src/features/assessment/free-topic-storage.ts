"use client";

import type {
  FreeTopicAnswer,
  FreeTopicAssessment,
  FreeTopicQuestion,
  FreeTopicResultReport,
  FreeTopicScoreResult,
} from "@/features/assessment/free-topic-assessments";
import {
  buildFreeTopicResultReport,
  calculateFreeTopicResult,
  getFreeTopicAssessment,
  getFreeTopicQuestions,
} from "@/features/assessment/free-topic-assessments";
import {
  freeTopicResultFormatVersion,
  getFreeTopicEvidenceVersion,
  getFreeTopicInstrumentVersion,
  getFreeTopicReportContentVersion,
  getFreeTopicScoringVersion,
} from "@/features/assessment/free-topic-result-version";
import type { TopicTraitImpactSnapshot } from "@/features/assessment/topic-trait-impact";
import {
  canReadScopedLocalResult,
  confirmResultAuthScopeUnchanged,
  isGuestOnlyResult,
  readCurrentSupabaseUserId,
  rememberVerifiedAccountScope,
  verifyStableResultAuthScope,
} from "@/features/result-persistence/client-result-scope";

export type StoredFreeTopicResult = {
  answers: Record<string, FreeTopicAnswer>;
  assessment: {
    categoryId: string;
    categoryLabel: string;
    slug: string;
    title: string;
  };
  assessmentSnapshot?: FreeTopicAssessment;
  completedAt: string;
  expiresAt: string;
  evidenceVersion?: string;
  formatVersion: typeof freeTopicResultFormatVersion;
  instrumentVersion: string;
  localResultId: string;
  nuangCodeContext?: {
    capturedAt: string;
    code: string;
  };
  ownerAccountId?: string;
  ownerSupabaseUserId?: string;
  productReleaseId?: string;
  questionsSnapshot?: FreeTopicQuestion[];
  reportContentVersion: string;
  reportSnapshot: FreeTopicResultReport;
  result: FreeTopicScoreResult;
  scoringVersion: string;
  serverResultId?: string;
  storageRevision?: number;
  traitImpactSnapshot?: TopicTraitImpactSnapshot;
  sync: {
    lastError?: string;
    lastTriedAt?: string;
    status: "queued" | "synced" | "failed";
    syncedAt?: string;
  };
};

const RESULT_PREFIX = "nuang-free-topic-result:";
const RESULT_INDEX_KEY = "nuang-free-topic-result:index";
const TOMBSTONE_PREFIX = "nuang-free-topic-result:tombstone:";
const retentionDays = 365;
const syncControllers = new Map<string, AbortController>();
const syncInFlight = new Map<string, Promise<StoredFreeTopicResult>>();

export function saveFreeTopicResult({
  answers,
  assessment,
  completedAt,
  ownerSupabaseUserId,
  productReleaseId,
  questions,
  result,
}: {
  answers: Record<string, FreeTopicAnswer>;
  assessment: FreeTopicAssessment;
  completedAt: string;
  ownerSupabaseUserId?: string;
  productReleaseId?: string | null;
  questions?: Parameters<typeof calculateFreeTopicResult>[0]["questions"];
  result: FreeTopicScoreResult;
}) {
  const localResultId = `topic_${crypto.randomUUID()}`;
  const storedResult: StoredFreeTopicResult = {
    answers,
    assessment: {
      categoryId: assessment.categoryId,
      categoryLabel: assessment.categoryLabel,
      slug: assessment.slug,
      title: assessment.title,
    },
    assessmentSnapshot: structuredClone(assessment),
    completedAt,
    evidenceVersion: getFreeTopicEvidenceVersion(assessment.slug),
    expiresAt: addDays(new Date(completedAt), retentionDays).toISOString(),
    formatVersion: freeTopicResultFormatVersion,
    instrumentVersion: getFreeTopicInstrumentVersion(assessment.slug),
    localResultId,
    ...(ownerSupabaseUserId ? { ownerSupabaseUserId } : {}),
    ...(productReleaseId ? { productReleaseId } : {}),
    questionsSnapshot: structuredClone(
      questions ?? getFreeTopicQuestions(assessment.slug),
    ),
    reportContentVersion: getFreeTopicReportContentVersion(assessment.slug),
    reportSnapshot: buildFreeTopicResultReport({
      assessment,
      questions,
      result,
    }),
    result,
    scoringVersion: getFreeTopicScoringVersion(assessment.slug),
    sync: { status: "queued" },
  };

  return writeStoredFreeTopicResult(storedResult);
}

export function loadFreeTopicResult(localResultId: string) {
  const raw = localStorage.getItem(`${RESULT_PREFIX}${localResultId}`);

  if (!raw) return null;

  try {
    const normalized = normalizeLocalFreeTopicResult(JSON.parse(raw));

    if (normalized?.upgraded) {
      writeStoredFreeTopicResult(normalized.result);
    }

    return normalized?.result ?? null;
  } catch {
    return null;
  }
}

export function listFreeTopicResults() {
  const now = Date.now();

  return readIndex()
    .map((localResultId) => loadFreeTopicResult(localResultId))
    .filter((result): result is StoredFreeTopicResult => Boolean(result))
    .filter((result) => new Date(result.expiresAt).getTime() > now)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export async function listFreeTopicResultsLocalFirst() {
  const serverRead = await fetchFreeTopicResultsFromServer();
  const supabaseUserId = serverRead.authUserId;
  rememberVerifiedAccountScope({
    accountId: serverRead.accountId,
    supabaseUserId,
  });
  reconcileDeletedFreeTopicResults(serverRead.deletedLocalResultIds);
  const deletedLocalResultIds = new Set(serverRead.deletedLocalResultIds);
  const serverResults = serverRead.results.filter(
    (result) => !deletedLocalResultIds.has(result.localResultId),
  );
  const merged = new Map(
    serverResults.map(
      (result) =>
        [
          result.localResultId,
          supabaseUserId
            ? { ...result, ownerSupabaseUserId: supabaseUserId }
            : result,
        ] as const,
    ),
  );

  listFreeTopicResults().forEach((result) => {
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
    // 동기화가 끝난 같은 기록은 서버의 성향 반영 스냅샷을 우선하고,
    // 서버에 보내지 않는 원본 답변과 로컬 보관 기한만 기기에서 유지합니다.
    merged.set(
      result.localResultId,
      serverResult && result.sync.status === "synced"
        ? writeStoredFreeTopicResult({
            ...serverResult,
            answers: result.answers,
            expiresAt: result.expiresAt,
            ...(supabaseUserId ? { ownerSupabaseUserId: supabaseUserId } : {}),
          })
        : result,
    );
  });

  return [...merged.values()].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  );
}

export async function loadFreeTopicResultLocalFirst(localResultId: string) {
  const localResult = loadFreeTopicResult(localResultId);

  if (localResult && isGuestOnlyResult(localResult)) {
    const requestUserId = await readCurrentSupabaseUserId();
    if (!requestUserId) return localResult;
    return loadFreeTopicResultForAuthenticatedScope({
      localResult,
      localResultId,
      requestUserId,
    });
  }

  return loadFreeTopicResultForAuthenticatedScope({
    localResult,
    localResultId,
  });
}

async function loadFreeTopicResultForAuthenticatedScope({
  localResult,
  localResultId,
  requestUserId,
}: {
  localResult: StoredFreeTopicResult | null;
  localResultId: string;
  requestUserId?: string;
}) {
  const serverRead = await fetchFreeTopicResultsFromServer(
    localResultId,
    requestUserId,
  );
  const supabaseUserId = serverRead.authUserId;
  rememberVerifiedAccountScope({
    accountId: serverRead.accountId,
    supabaseUserId,
  });
  reconcileDeletedFreeTopicResults(serverRead.deletedLocalResultIds);
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
  if (!localResult) {
    return writeStoredFreeTopicResult({
      ...serverResult,
      ...(supabaseUserId ? { ownerSupabaseUserId: supabaseUserId } : {}),
    });
  }

  return writeStoredFreeTopicResult({
    ...serverResult,
    answers: localResult.answers,
    expiresAt: localResult.expiresAt,
    ...(supabaseUserId ? { ownerSupabaseUserId: supabaseUserId } : {}),
  });
}

async function fetchFreeTopicResultsFromServer(
  localResultId?: string,
  capturedRequestUserId?: string,
) {
  const requestUserId =
    capturedRequestUserId ?? (await readCurrentSupabaseUserId());
  try {
    const query = localResultId
      ? `?localResultId=${encodeURIComponent(localResultId)}`
      : "";
    const response = await fetch(`/api/free-topic-results${query}`, {
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
        results: [] as StoredFreeTopicResult[],
        state: "unauthenticated" as const,
      };
    }
    if (!response.ok) {
      return {
        accountId: null,
        authUserId: await confirmResultAuthScopeUnchanged(requestUserId),
        deletedLocalResultIds: [] as string[],
        results: [] as StoredFreeTopicResult[],
        state: "error" as const,
      };
    }

    const body = (await response.json()) as {
      accountId?: string;
      authUserId?: string;
      deletedLocalResultIds?: string[];
      ok?: boolean;
      results?: Array<
        Omit<StoredFreeTopicResult, "answers" | "expiresAt"> & {
          answers?: Record<string, FreeTopicAnswer>;
          expiresAt?: string;
        }
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
        results: [] as StoredFreeTopicResult[],
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
        normalizeServerFreeTopicResult({
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
      results: [] as StoredFreeTopicResult[],
      state: "error" as const,
    };
  }
}

function normalizeServerFreeTopicResult(
  result: Omit<StoredFreeTopicResult, "answers" | "expiresAt"> & {
    answers?: Record<string, FreeTopicAnswer>;
    expiresAt?: string;
  },
) {
  const completedAt = new Date(result.completedAt);
  return {
    ...result,
    answers: result.answers ?? {},
    expiresAt:
      result.expiresAt ??
      addDays(
        Number.isNaN(completedAt.getTime()) ? new Date() : completedAt,
        retentionDays,
      ).toISOString(),
  } satisfies StoredFreeTopicResult;
}

export async function syncQueuedFreeTopicResults() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { attempted: 0, synced: 0 };
  }

  const queuedResults = listFreeTopicResults().filter(
    (result) => result.sync.status !== "synced",
  );
  let synced = 0;

  for (const result of queuedResults) {
    const nextResult = await syncFreeTopicResult(result);
    if (nextResult.sync.status === "synced") synced += 1;
  }

  return { attempted: queuedResults.length, synced };
}

export async function syncFreeTopicResult(result: StoredFreeTopicResult) {
  const existing = syncInFlight.get(result.localResultId);
  if (existing) return existing;

  const sync = syncFreeTopicResultOnce(result).finally(() => {
    syncInFlight.delete(result.localResultId);
    syncControllers.delete(result.localResultId);
  });
  syncInFlight.set(result.localResultId, sync);
  return sync;
}

async function syncFreeTopicResultOnce(result: StoredFreeTopicResult) {
  const triedAt = new Date().toISOString();
  let current = loadFreeTopicResult(result.localResultId);
  if (!current) {
    if (localStorage.getItem(`${TOMBSTONE_PREFIX}${result.localResultId}`)) {
      return result;
    }
    current = writeStoredFreeTopicResult(result);
  }

  const supabaseUserId = await readCurrentSupabaseUserId();
  if (!supabaseUserId) {
    return markSyncFailed(current, triedAt, "login_required");
  }
  if (
    current.ownerSupabaseUserId &&
    current.ownerSupabaseUserId !== supabaseUserId
  ) {
    return current;
  }
  const latest = loadFreeTopicResult(current.localResultId);
  if (
    !latest ||
    (latest.storageRevision ?? 0) !== (current.storageRevision ?? 0) ||
    localStorage.getItem(`${TOMBSTONE_PREFIX}${current.localResultId}`)
  ) {
    return current;
  }

  const scoped = writeStoredFreeTopicResult({
    ...latest,
    ownerSupabaseUserId: supabaseUserId,
  });
  const expectedRevision = scoped.storageRevision ?? 0;
  const controller = new AbortController();
  syncControllers.set(scoped.localResultId, controller);

  try {
    const response = await fetch("/api/free-topic-results", {
      body: JSON.stringify({
        answers: scoped.answers,
        assessment: { slug: scoped.assessment.slug },
        completedAt: scoped.completedAt,
        localResultId: scoped.localResultId,
        productReleaseId: scoped.productReleaseId,
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
      result?: Omit<StoredFreeTopicResult, "answers" | "expiresAt"> & {
        answers?: Record<string, FreeTopicAnswer>;
        expiresAt?: string;
      };
      syncedAt?: string;
    } | null;

    if (response.status === 401) {
      return markSyncFailed(
        scoped,
        triedAt,
        "login_required",
        expectedRevision,
      );
    }

    if (response.status === 410) {
      const stableUserId = await verifyStableResultAuthScope({
        requestUserId: supabaseUserId,
        responseUserId: body?.authUserId,
      });
      if (!stableUserId) {
        return markSyncFailed(
          scoped,
          triedAt,
          "auth_scope_changed",
          expectedRevision,
        );
      }
      deleteFreeTopicResult(scoped.localResultId);
      return scoped;
    }

    if (!response.ok) {
      return markSyncFailed(
        scoped,
        triedAt,
        `http_${response.status}`,
        expectedRevision,
      );
    }

    const stableUserId = await verifyStableResultAuthScope({
      requestUserId: supabaseUserId,
      responseUserId: body?.authUserId,
    });
    if (!stableUserId) {
      return markSyncFailed(
        scoped,
        triedAt,
        "auth_scope_changed",
        expectedRevision,
      );
    }
    const canonicalResult = body?.result
      ? normalizeServerFreeTopicResult(body.result)
      : null;
    if (!body?.ok || !canonicalResult) {
      return markSyncFailed(
        scoped,
        triedAt,
        "invalid_success_response",
        expectedRevision,
      );
    }
    rememberVerifiedAccountScope({
      accountId: body?.accountId ?? null,
      supabaseUserId: stableUserId,
    });
    const syncedResult: StoredFreeTopicResult = {
      ...canonicalResult,
      answers: scoped.answers,
      expiresAt: scoped.expiresAt,
      ...(body?.accountId ? { ownerAccountId: body.accountId } : {}),
      ownerSupabaseUserId: stableUserId,
      sync: {
        lastTriedAt: triedAt,
        status: "synced",
        syncedAt: body?.syncedAt ?? new Date().toISOString(),
      },
    };
    return (
      writeStoredFreeTopicResultIfCurrent({
        expectedRevision,
        result: syncedResult,
      }) ?? scoped
    );
  } catch {
    return markSyncFailed(
      scoped,
      triedAt,
      "network_unavailable",
      expectedRevision,
    );
  }
}

function reconcileDeletedFreeTopicResults(localResultIds: string[]) {
  localResultIds.forEach((localResultId) => {
    deleteFreeTopicResult(localResultId);
  });
}

export function clearAccountOwnedFreeTopicResults(accountId?: string) {
  for (const controller of syncControllers.values()) controller.abort();
  syncControllers.clear();
  const ownedResults = allStoredFreeTopicResultIds()
    .map((localResultId) => loadFreeTopicResult(localResultId))
    .filter((result): result is StoredFreeTopicResult => Boolean(result))
    .filter(
      (result) =>
        !isGuestOnlyResult(result) &&
        (!accountId ||
          !result.ownerAccountId ||
          result.ownerAccountId === accountId),
    );
  ownedResults.forEach((result) => deleteFreeTopicResult(result.localResultId));
}

function markSyncFailed(
  result: StoredFreeTopicResult,
  lastTriedAt: string,
  lastError: string,
  expectedRevision = result.storageRevision ?? 0,
) {
  const failedResult: StoredFreeTopicResult = {
    ...result,
    sync: {
      lastError,
      lastTriedAt,
      status: "failed",
    },
  };
  return (
    writeStoredFreeTopicResultIfCurrent({
      expectedRevision,
      result: failedResult,
    }) ?? result
  );
}

function writeStoredFreeTopicResult(result: StoredFreeTopicResult) {
  const current = readStoredFreeTopicResultWithoutUpgrade(result.localResultId);
  if (
    !current &&
    result.storageRevision &&
    localStorage.getItem(`${TOMBSTONE_PREFIX}${result.localResultId}`)
  ) {
    return result;
  }
  if (!current && !result.storageRevision) {
    localStorage.removeItem(`${TOMBSTONE_PREFIX}${result.localResultId}`);
  }
  const storedResult: StoredFreeTopicResult = {
    ...result,
    storageRevision:
      Math.max(current?.storageRevision ?? 0, result.storageRevision ?? 0) + 1,
  };
  localStorage.setItem(
    `${RESULT_PREFIX}${storedResult.localResultId}`,
    JSON.stringify(storedResult),
  );
  writeIndex([storedResult.localResultId, ...readIndex()]);
  return storedResult;
}

export function deleteFreeTopicResult(localResultId: string) {
  syncControllers.get(localResultId)?.abort();
  localStorage.setItem(
    `${TOMBSTONE_PREFIX}${localResultId}`,
    new Date().toISOString(),
  );
  localStorage.removeItem(`${RESULT_PREFIX}${localResultId}`);
  writeIndex(readIndex().filter((id) => id !== localResultId));
}

export async function deleteFreeTopicResultEverywhere(
  localResultId: string,
): Promise<"deleted" | "error" | "local_only"> {
  const localResult = loadFreeTopicResult(localResultId);
  if (localResult && isGuestOnlyResult(localResult)) {
    deleteFreeTopicResult(localResultId);
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
    const response = await fetch("/api/free-topic-results", {
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
    deleteFreeTopicResult(localResultId);
    return "deleted";
  } catch {
    return "error";
  }
}

function writeStoredFreeTopicResultIfCurrent({
  expectedRevision,
  result,
}: {
  expectedRevision: number;
  result: StoredFreeTopicResult;
}) {
  const current = readStoredFreeTopicResultWithoutUpgrade(result.localResultId);
  if (
    !current ||
    (current.storageRevision ?? 0) !== expectedRevision ||
    localStorage.getItem(`${TOMBSTONE_PREFIX}${result.localResultId}`)
  ) {
    return null;
  }
  return writeStoredFreeTopicResult(result);
}

function readStoredFreeTopicResultWithoutUpgrade(localResultId: string) {
  const raw = localStorage.getItem(`${RESULT_PREFIX}${localResultId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredFreeTopicResult>;
    return parsed.localResultId === localResultId
      ? (parsed as StoredFreeTopicResult)
      : null;
  } catch {
    return null;
  }
}

function normalizeLocalFreeTopicResult(value: unknown): {
  result: StoredFreeTopicResult;
  upgraded: boolean;
} | null {
  if (!isRecord(value)) return null;

  const assessmentRecord = isRecord(value.assessment) ? value.assessment : null;
  const slug =
    assessmentRecord && typeof assessmentRecord.slug === "string"
      ? assessmentRecord.slug
      : "";
  const assessmentSnapshot = isRecord(value.assessmentSnapshot)
    ? (value.assessmentSnapshot as unknown as FreeTopicAssessment)
    : undefined;
  const assessment = assessmentSnapshot ?? getFreeTopicAssessment(slug);

  if (!assessment) return null;

  if (
    typeof value.completedAt !== "string" ||
    Number.isNaN(Date.parse(value.completedAt)) ||
    typeof value.localResultId !== "string" ||
    !isRecord(value.answers)
  ) {
    return null;
  }

  const stored = value as unknown as StoredFreeTopicResult;
  const hasFrozenSnapshot =
    typeof stored.formatVersion === "number" &&
    typeof stored.instrumentVersion === "string" &&
    stored.instrumentVersion.length > 0 &&
    typeof stored.reportContentVersion === "string" &&
    stored.reportContentVersion.length > 0 &&
    typeof stored.scoringVersion === "string" &&
    stored.scoringVersion.length > 0 &&
    isFreeTopicReportSnapshot(stored.reportSnapshot);

  if (hasFrozenSnapshot) {
    return { result: stored, upgraded: false };
  }

  const questions = Array.isArray(value.questionsSnapshot)
    ? (value.questionsSnapshot as FreeTopicQuestion[])
    : getFreeTopicQuestions(slug);
  const answers = stored.answers;
  const hasCurrentQuestionSet =
    questions.length > 0 &&
    Object.keys(answers).length === questions.length &&
    questions.every((question) => {
      const answer = answers[question.id];
      return answer?.questionId === question.id;
    });

  if (!hasCurrentQuestionSet) return null;

  const result = calculateFreeTopicResult({
    answers,
    assessment,
    observedAt: stored.completedAt,
  });
  const upgraded: StoredFreeTopicResult = {
    ...stored,
    assessment: {
      categoryId: assessment.categoryId,
      categoryLabel: assessment.categoryLabel,
      slug: assessment.slug,
      title: assessment.title,
    },
    assessmentSnapshot: structuredClone(assessment),
    expiresAt:
      typeof stored.expiresAt === "string"
        ? stored.expiresAt
        : addDays(new Date(stored.completedAt), retentionDays).toISOString(),
    evidenceVersion: getFreeTopicEvidenceVersion(slug),
    formatVersion: freeTopicResultFormatVersion,
    instrumentVersion: getFreeTopicInstrumentVersion(slug),
    reportContentVersion: getFreeTopicReportContentVersion(slug),
    reportSnapshot: buildFreeTopicResultReport({ assessment, result }),
    result,
    questionsSnapshot: structuredClone(questions),
    scoringVersion: getFreeTopicScoringVersion(slug),
    sync: { status: "queued" },
  };

  return { result: upgraded, upgraded: true };
}

function readIndex() {
  const raw = localStorage.getItem(RESULT_INDEX_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function allStoredFreeTopicResultIds() {
  const ids = new Set(readIndex());
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(RESULT_PREFIX)) {
      ids.add(key.slice(RESULT_PREFIX.length));
    }
  }
  return [...ids];
}

function writeIndex(ids: string[]) {
  localStorage.setItem(
    RESULT_INDEX_KEY,
    JSON.stringify([...new Set(ids)].slice(0, 80)),
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(Number.isNaN(date.getTime()) ? new Date() : date);
  next.setDate(next.getDate() + days);
  return next;
}

function isFreeTopicReportSnapshot(
  value: unknown,
): value is FreeTopicResultReport {
  return (
    isRecord(value) &&
    (typeof value.averageScore === "number" || value.averageScore === null) &&
    typeof value.confidenceCopy === "string" &&
    typeof value.confidenceLabel === "string" &&
    typeof value.headline === "string" &&
    Array.isArray(value.longReportSections) &&
    Array.isArray(value.signals)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
