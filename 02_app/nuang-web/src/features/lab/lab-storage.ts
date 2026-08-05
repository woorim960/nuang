"use client";

import { localCompletedRetentionDays } from "@/features/account/local-retention-policy";
import type {
  LabAnswer,
  LabAssessment,
  LabScoreResult,
} from "@/features/lab/lab-assessments";

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
  productReleaseId?: string;
  result: LabScoreResult;
  serverResultId?: string;
  slug: string;
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
    )
      .toISOString();

  const storedResult = {
    ...result,
    expiresAt,
    localResultId: result.localResultId ?? createLabLocalResultId(),
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

export function deleteLabResult(localResultIdOrSlug: string) {
  const directResult = loadLabResultById(localResultIdOrSlug);
  const result = directResult ?? loadLabResult(localResultIdOrSlug);

  if (!result) {
    localStorage.removeItem(`${LEGACY_RESULT_PREFIX}${localResultIdOrSlug}`);
    return;
  }

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

export function getLabExpiresAt(result: StoredLabResult) {
  if (result.expiresAt) return result.expiresAt;

  const completedAt = new Date(result.completedAt);
  return addDays(
    Number.isNaN(completedAt.getTime()) ? new Date() : completedAt,
    localCompletedRetentionDays,
  ).toISOString();
}

export async function syncLabResult(result: StoredLabResult) {
  try {
    const response = await fetch("/api/lab-results", {
      body: JSON.stringify({
        answers: result.answers,
        completedAt: result.completedAt,
        contentVersion: result.contentVersion,
        localResultId: result.localResultId,
        productReleaseId: result.productReleaseId,
        slug: result.slug,
      }),
      cache: "no-store",
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      return saveLabResult({
        ...result,
        sync: { lastError: `http_${response.status}`, status: "failed" },
      });
    }
    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      result?: {
        nuangCodeContext?: StoredLabResult["nuangCodeContext"] | null;
        serverResultId?: string;
        syncedAt?: string;
      };
    } | null;
    if (!body?.ok || !body.result?.serverResultId) {
      return saveLabResult({
        ...result,
        sync: { lastError: "invalid_response", status: "failed" },
      });
    }
    return saveLabResult({
      ...result,
      ...(body.result.nuangCodeContext
        ? { nuangCodeContext: body.result.nuangCodeContext }
        : {}),
      serverResultId: body.result.serverResultId,
      sync: {
        status: "synced",
        syncedAt: body.result.syncedAt ?? new Date().toISOString(),
      },
    });
  } catch {
    return saveLabResult({
      ...result,
      sync: { lastError: "network_unavailable", status: "failed" },
    });
  }
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

function writeIndex(ids: string[]) {
  localStorage.setItem(RESULT_INDEX_KEY, JSON.stringify(Array.from(new Set(ids))));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
