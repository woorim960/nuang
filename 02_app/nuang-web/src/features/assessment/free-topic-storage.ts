"use client";

import type {
  FreeTopicAnswer,
  FreeTopicAssessment,
  FreeTopicScoreResult,
} from "@/features/assessment/free-topic-assessments";

export type StoredFreeTopicResult = {
  answers: Record<string, FreeTopicAnswer>;
  assessment: {
    categoryId: string;
    categoryLabel: string;
    slug: string;
    title: string;
  };
  completedAt: string;
  expiresAt: string;
  localResultId: string;
  result: FreeTopicScoreResult;
  sync: {
    lastError?: string;
    lastTriedAt?: string;
    status: "queued" | "synced" | "failed";
    syncedAt?: string;
  };
};

const RESULT_PREFIX = "nuang-free-topic-result:";
const RESULT_INDEX_KEY = "nuang-free-topic-result:index";
const retentionDays = 365;

export function saveFreeTopicResult({
  answers,
  assessment,
  completedAt,
  result,
}: {
  answers: Record<string, FreeTopicAnswer>;
  assessment: FreeTopicAssessment;
  completedAt: string;
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
    completedAt,
    expiresAt: addDays(new Date(completedAt), retentionDays).toISOString(),
    localResultId,
    result,
    sync: { status: "queued" },
  };

  writeStoredFreeTopicResult(storedResult);
  return storedResult;
}

export function loadFreeTopicResult(localResultId: string) {
  const raw = localStorage.getItem(`${RESULT_PREFIX}${localResultId}`);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredFreeTopicResult;
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
  const localResults = listFreeTopicResults();

  if (localResults.length > 0) return localResults;

  return fetchFreeTopicResultsFromServer();
}

export async function loadFreeTopicResultLocalFirst(localResultId: string) {
  const localResult = loadFreeTopicResult(localResultId);

  if (localResult) return localResult;

  const serverResults = await fetchFreeTopicResultsFromServer(localResultId);
  return (
    serverResults.find((result) => result.localResultId === localResultId) ?? null
  );
}

async function fetchFreeTopicResultsFromServer(localResultId?: string) {
  try {
    const query = localResultId
      ? `?localResultId=${encodeURIComponent(localResultId)}`
      : "";
    const response = await fetch(`/api/free-topic-results${query}`, {
      cache: "no-store",
      method: "GET",
    });

    if (!response.ok) return [];

    const body = (await response.json()) as {
      ok?: boolean;
      results?: Array<
        Omit<StoredFreeTopicResult, "answers" | "expiresAt"> & {
          answers?: Record<string, FreeTopicAnswer>;
          expiresAt?: string;
        }
      >;
    };

    if (!body.ok || !Array.isArray(body.results)) return [];

    return body.results.map(normalizeServerFreeTopicResult);
  } catch {
    return [];
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
  const triedAt = new Date().toISOString();

  try {
    const response = await fetch("/api/free-topic-results", {
      body: JSON.stringify(result),
      cache: "no-store",
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (response.status === 401) {
      return markSyncFailed(result, triedAt, "login_required");
    }

    if (!response.ok) {
      return markSyncFailed(result, triedAt, `http_${response.status}`);
    }

    const syncedResult: StoredFreeTopicResult = {
      ...result,
      sync: {
        lastTriedAt: triedAt,
        status: "synced",
        syncedAt: new Date().toISOString(),
      },
    };
    writeStoredFreeTopicResult(syncedResult);
    return syncedResult;
  } catch {
    return markSyncFailed(result, triedAt, "network_unavailable");
  }
}

function markSyncFailed(
  result: StoredFreeTopicResult,
  lastTriedAt: string,
  lastError: string,
) {
  const failedResult: StoredFreeTopicResult = {
    ...result,
    sync: {
      lastError,
      lastTriedAt,
      status: "failed",
    },
  };
  writeStoredFreeTopicResult(failedResult);
  return failedResult;
}

function writeStoredFreeTopicResult(result: StoredFreeTopicResult) {
  localStorage.setItem(
    `${RESULT_PREFIX}${result.localResultId}`,
    JSON.stringify(result),
  );
  writeIndex([result.localResultId, ...readIndex()]);
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
