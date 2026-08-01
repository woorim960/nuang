"use client";

import type {
  FreeTopicAnswer,
  FreeTopicAssessment,
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
  evidenceVersion?: string;
  formatVersion: typeof freeTopicResultFormatVersion;
  instrumentVersion: string;
  localResultId: string;
  nuangCodeContext?: {
    capturedAt: string;
    code: string;
  };
  reportContentVersion: string;
  reportSnapshot: FreeTopicResultReport;
  result: FreeTopicScoreResult;
  scoringVersion: string;
  serverResultId?: string;
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
    evidenceVersion: getFreeTopicEvidenceVersion(assessment.slug),
    expiresAt: addDays(new Date(completedAt), retentionDays).toISOString(),
    formatVersion: freeTopicResultFormatVersion,
    instrumentVersion: getFreeTopicInstrumentVersion(assessment.slug),
    localResultId,
    reportContentVersion: getFreeTopicReportContentVersion(assessment.slug),
    reportSnapshot: buildFreeTopicResultReport({ assessment, result }),
    result,
    scoringVersion: getFreeTopicScoringVersion(assessment.slug),
    sync: { status: "queued" },
  };

  writeStoredFreeTopicResult(storedResult);
  return storedResult;
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
  const localResults = listFreeTopicResults();
  const serverResults = await fetchFreeTopicResultsFromServer();
  const merged = new Map(
    serverResults.map((result) => [result.localResultId, result] as const),
  );

  localResults.forEach((result) => {
    // 같은 완료 기록은 사용자가 완료 직후 확인한 로컬 스냅샷을 유지합니다.
    merged.set(result.localResultId, result);
  });

  return [...merged.values()].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  );
}

export async function loadFreeTopicResultLocalFirst(localResultId: string) {
  const localResult = loadFreeTopicResult(localResultId);

  if (localResult) return localResult;

  const serverResults = await fetchFreeTopicResultsFromServer(localResultId);
  return (
    serverResults.find((result) => result.localResultId === localResultId) ??
    null
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
      body: JSON.stringify({
        answers: result.answers,
        assessment: { slug: result.assessment.slug },
        completedAt: result.completedAt,
        localResultId: result.localResultId,
      }),
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

    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      result?: Omit<StoredFreeTopicResult, "answers" | "expiresAt"> & {
        answers?: Record<string, FreeTopicAnswer>;
        expiresAt?: string;
      };
      syncedAt?: string;
    } | null;
    const canonicalResult = body?.result
      ? normalizeServerFreeTopicResult(body.result)
      : null;
    const syncedResult: StoredFreeTopicResult = canonicalResult
      ? {
          ...canonicalResult,
          answers: result.answers,
          expiresAt: result.expiresAt,
          sync: {
            lastTriedAt: triedAt,
            status: "synced",
            syncedAt: body?.syncedAt ?? new Date().toISOString(),
          },
        }
      : {
          ...result,
          sync: {
            lastTriedAt: triedAt,
            status: "synced",
            syncedAt: body?.syncedAt ?? new Date().toISOString(),
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

export function deleteFreeTopicResult(localResultId: string) {
  localStorage.removeItem(`${RESULT_PREFIX}${localResultId}`);
  writeIndex(readIndex().filter((id) => id !== localResultId));
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
  const assessment = getFreeTopicAssessment(slug);

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

  const questions = getFreeTopicQuestions(slug);
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
