"use client";

import {
  cacheLocalAssessmentAttempt,
  getStoredLocalAttempt,
  listLocalAttempts,
  listStoredLocalAttempts,
  removeStoredLocalAttempt,
  setLocalAssessmentAccountScope,
} from "@/features/assessment/assessment-storage";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import {
  localCompletedRetentionDays,
  localInProgressRetentionDays,
} from "@/features/account/local-retention-policy";

type RemoteAttemptEntry = {
  attempt: LocalAssessmentAttempt;
  revision: number;
};

type AssessmentProgressCollection = {
  accountId: string;
  attempts: RemoteAttemptEntry[];
  ok: true;
};

type AssessmentProgressWrite = {
  accountId: string;
  attempt: LocalAssessmentAttempt;
  ok: true;
  restored: boolean;
  revision: number;
};

export type AccountAssessmentSyncResult =
  | {
      accountId: string;
      attempts: LocalAssessmentAttempt[];
      restoredCount: number;
      status: "synced";
      uploadedCount: number;
    }
  | {
      attempts: LocalAssessmentAttempt[];
      status: "error" | "unauthenticated";
    };

let authenticationState: "unknown" | "authenticated" | "unauthenticated" =
  "unknown";
let synchronizeInFlight: Promise<AccountAssessmentSyncResult> | null = null;
let anotherPassRequested = false;
let accountBoundaryRevision = 0;

/**
 * Claims valid guest attempts, refreshes account-owned cache records, and then
 * exposes only the current account plus unclaimed guest records to the app.
 */
export function synchronizeAccountAssessmentAttempts() {
  if (authenticationState === "unauthenticated") {
    return Promise.resolve<AccountAssessmentSyncResult>({
      attempts: [],
      status: "unauthenticated",
    });
  }

  if (synchronizeInFlight) {
    anotherPassRequested = true;
    return synchronizeInFlight;
  }

  synchronizeInFlight = synchronizeRequestedPasses()
    .catch(async () => ({
      attempts: await safelyListLocalAttempts(),
      status: "error" as const,
    }))
    .finally(() => {
      synchronizeInFlight = null;
    });
  return synchronizeInFlight;
}

/**
 * Local persistence is the success boundary. Network/auth failures are handled
 * in the background and never reject the answer/progress save that called this.
 */
export async function queueAccountAssessmentAttemptSync(
  attempt: LocalAssessmentAttempt,
) {
  const queued: LocalAssessmentAttempt = {
    ...attempt,
    accountSync: {
      ...attempt.accountSync,
      status: "queued",
    },
  };

  await cacheLocalAssessmentAttempt(queued);

  if (authenticationState !== "unauthenticated") {
    if (synchronizeInFlight) anotherPassRequested = true;
    void synchronizeAccountAssessmentAttempts().catch(() => undefined);
  }

  return queued;
}

/** Removes account caches on logout/account switch while preserving guest work. */
export async function clearAccountOwnedLocalAttempts(accountId?: string) {
  accountBoundaryRevision += 1;
  anotherPassRequested = false;
  authenticationState = "unknown";
  setLocalAssessmentAccountScope(null);

  const attempts = await listStoredLocalAttempts();
  await Promise.all(
    attempts
      .filter((attempt) => {
        const owner = attempt.accountSync?.accountId;
        return Boolean(owner) && (!accountId || owner === accountId);
      })
      .map((attempt) => removeStoredLocalAttempt(attempt.id)),
  );
}

/** Test/auth-boundary helper. OAuth normally resets this module by navigation. */
export function resetAssessmentAccountSyncSession() {
  accountBoundaryRevision += 1;
  authenticationState = "unknown";
  anotherPassRequested = false;
  setLocalAssessmentAccountScope(null);
}

async function synchronizeRequestedPasses() {
  let result = await synchronizeOnce();
  let pass = 0;

  while (
    anotherPassRequested &&
    authenticationState !== "unauthenticated" &&
    pass < 2
  ) {
    anotherPassRequested = false;
    result = await synchronizeOnce();
    pass += 1;
  }

  return result;
}

async function synchronizeOnce(): Promise<AccountAssessmentSyncResult> {
  const boundaryRevision = accountBoundaryRevision;
  const remoteRead = await requestRemoteAttempts();

  if (boundaryRevision !== accountBoundaryRevision) {
    return {
      attempts: await safelyListLocalAttempts(),
      status: "error",
    };
  }

  if (remoteRead.status !== "ready") {
    if (remoteRead.status === "unauthenticated") {
      authenticationState = "unauthenticated";
      setLocalAssessmentAccountScope(null);
    }

    return {
      attempts: await listLocalAttempts(),
      status: remoteRead.status,
    };
  }

  authenticationState = "authenticated";
  const { accountId } = remoteRead.data;
  setLocalAssessmentAccountScope(accountId);
  await removeCachesOwnedByAnotherAccount(accountId, boundaryRevision);
  if (boundaryRevision !== accountBoundaryRevision) {
    return {
      attempts: await safelyListLocalAttempts(),
      status: "error",
    };
  }
  let restoredCount = await hydrateRemoteEntries(
    remoteRead.data.attempts,
    accountId,
    boundaryRevision,
  );

  if (boundaryRevision !== accountBoundaryRevision) {
    return {
      attempts: await safelyListLocalAttempts(),
      status: "error",
    };
  }

  const uploadCandidates = (await listStoredLocalAttempts()).filter(
    (attempt) =>
      isValidUploadCandidate(attempt) &&
      (!attempt.accountSync?.accountId ||
        attempt.accountSync.accountId === accountId) &&
      attempt.accountSync?.status !== "synced" &&
      attempt.accountSync?.status !== "rejected",
  );
  let uploadedCount = 0;
  for (const attempt of uploadCandidates) {
    const outcome = await uploadAttempt(attempt, accountId, boundaryRevision);
    if (outcome === "cancelled") {
      return {
        attempts: await safelyListLocalAttempts(),
        status: "error",
      };
    }
    if (outcome === "unauthenticated") {
      authenticationState = "unauthenticated";
      setLocalAssessmentAccountScope(null);
      return {
        attempts: await listLocalAttempts(),
        status: "unauthenticated",
      };
    }
    if (outcome === "uploaded") uploadedCount += 1;
    if (outcome === "restored") {
      uploadedCount += 1;
      restoredCount += 1;
    }
  }

  const refreshedRead = await requestRemoteAttempts();
  if (boundaryRevision !== accountBoundaryRevision) {
    return {
      attempts: await safelyListLocalAttempts(),
      status: "error",
    };
  }
  if (refreshedRead.status === "ready") {
    restoredCount += await hydrateRemoteEntries(
      refreshedRead.data.attempts,
      accountId,
      boundaryRevision,
    );
  } else if (refreshedRead.status === "unauthenticated") {
    authenticationState = "unauthenticated";
    setLocalAssessmentAccountScope(null);
    return {
      attempts: await listLocalAttempts(),
      status: "unauthenticated",
    };
  }

  return {
    accountId,
    attempts: await listLocalAttempts(),
    restoredCount,
    status: "synced",
    uploadedCount,
  };
}

async function requestRemoteAttempts(): Promise<
  | { data: AssessmentProgressCollection; status: "ready" }
  | { status: "error" | "unauthenticated" }
> {
  try {
    const response = await fetch("/api/assessment-progress", {
      cache: "no-store",
      method: "GET",
    });

    if (response.status === 401) return { status: "unauthenticated" };
    if (!response.ok) return { status: "error" };

    const body = await readJson<unknown>(response);
    if (!isAssessmentProgressCollection(body)) return { status: "error" };
    return { data: body, status: "ready" };
  } catch {
    return { status: "error" };
  }
}

async function uploadAttempt(
  attempt: LocalAssessmentAttempt,
  accountId: string,
  boundaryRevision: number,
): Promise<
  "cancelled" | "error" | "restored" | "unauthenticated" | "uploaded"
> {
  const attemptedAt = new Date().toISOString();
  const existingOwner = attempt.accountSync?.accountId;
  const syncing: LocalAssessmentAttempt = {
    ...attempt,
    accountSync: {
      ...attempt.accountSync,
      ...(existingOwner ? { accountId: existingOwner } : {}),
      lastAttemptedAt: attemptedAt,
      status: "syncing",
    },
  };
  if (!(await cacheAttemptDuringActiveBoundary(syncing, boundaryRevision))) {
    return "cancelled";
  }

  try {
    const expectedRevision = attempt.accountSync?.revision;
    const response = await fetch("/api/assessment-progress", {
      body: JSON.stringify({
        attempt: stripClientSyncMetadata(attempt),
        ...(expectedRevision === undefined ? {} : { expectedRevision }),
      }),
      headers: { "content-type": "application/json" },
      method: "PUT",
    });

    if (boundaryRevision !== accountBoundaryRevision) return "cancelled";

    if (response.status === 401) {
      await markSyncFailure(
        attempt.id,
        existingOwner,
        attemptedAt,
        boundaryRevision,
      );
      return "unauthenticated";
    }

    const body = await readJson<unknown>(response);
    if (response.status === 422) {
      await markSyncRejected(
        attempt,
        existingOwner,
        attemptedAt,
        boundaryRevision,
      );
      return "error";
    }

    if (response.status === 409 && isAssessmentProgressConflict(body)) {
      const current = await getStoredLocalAttempt(attempt.id);

      if (current) {
        await cacheAttemptDuringActiveBoundary(
          {
            ...current,
            accountSync: {
              ...current.accountSync,
              accountId,
              lastAttemptedAt: attemptedAt,
              revision: body.currentRevision,
              status: "queued",
            },
          },
          boundaryRevision,
        );
        anotherPassRequested = true;
      } else {
        await markSyncFailure(
          attempt.id,
          existingOwner,
          attemptedAt,
          boundaryRevision,
        );
      }

      return "error";
    }

    if (!response.ok || !isAssessmentProgressWrite(body)) {
      await markSyncFailure(
        attempt.id,
        existingOwner,
        attemptedAt,
        boundaryRevision,
      );
      return "error";
    }

    const remote = refreshRemoteCacheAttempt(
      body.attempt,
      body.accountId,
      body.revision,
      body.restored,
    );
    const current = await getStoredLocalAttempt(attempt.id);

    if (current && current.updatedAt !== attempt.updatedAt) {
      await cacheAttemptDuringActiveBoundary(
        {
          ...current,
          accountSync: {
            ...current.accountSync,
            accountId: body.accountId,
            lastAttemptedAt: attemptedAt,
            revision: body.revision,
            status: "queued",
          },
        },
        boundaryRevision,
      );
      anotherPassRequested = true;
    } else {
      await cacheAttemptDuringActiveBoundary(remote, boundaryRevision);
    }

    return body.restored ? "restored" : "uploaded";
  } catch {
    await markSyncFailure(
      attempt.id,
      existingOwner,
      attemptedAt,
      boundaryRevision,
    );
    return "error";
  }
}

async function markSyncRejected(
  attempted: LocalAssessmentAttempt,
  existingOwner: string | undefined,
  attemptedAt: string,
  boundaryRevision: number,
) {
  const current = await getStoredLocalAttempt(attempted.id);
  if (!current) return;

  const changedSinceRequest = current.updatedAt !== attempted.updatedAt;
  await cacheAttemptDuringActiveBoundary(
    {
      ...current,
      accountSync: {
        ...current.accountSync,
        ...(existingOwner ? { accountId: existingOwner } : {}),
        lastAttemptedAt: attemptedAt,
        status: changedSinceRequest ? "queued" : "rejected",
      },
    },
    boundaryRevision,
  );

  if (changedSinceRequest) anotherPassRequested = true;
}

async function markSyncFailure(
  attemptId: string,
  existingOwner: string | undefined,
  attemptedAt: string,
  boundaryRevision: number,
) {
  const current = await getStoredLocalAttempt(attemptId);
  if (!current) return;

  await cacheAttemptDuringActiveBoundary(
    {
      ...current,
      accountSync: {
        ...current.accountSync,
        ...(existingOwner ? { accountId: existingOwner } : {}),
        lastAttemptedAt: attemptedAt,
        status: "failed",
      },
    },
    boundaryRevision,
  );
}

async function hydrateRemoteEntries(
  entries: RemoteAttemptEntry[],
  accountId: string,
  boundaryRevision: number,
) {
  let restoredCount = 0;

  for (const entry of entries) {
    if (boundaryRevision !== accountBoundaryRevision) break;
    if (!isCoreAttempt(entry.attempt)) continue;
    const local = await getStoredLocalAttempt(entry.attempt.id);
    const remote = refreshRemoteCacheAttempt(
      entry.attempt,
      accountId,
      entry.revision,
      !local,
      local?.accountSync?.restoredAt,
    );

    if (
      local?.accountSync?.accountId &&
      local.accountSync.accountId !== accountId
    ) {
      continue;
    }

    const merged = local ? mergeSameAttempt(local, remote) : remote;
    const wasAlreadyHydrated =
      local?.accountSync?.accountId === accountId &&
      local.accountSync.revision === entry.revision &&
      local.accountSync.status === "synced";

    if (merged === remote && !wasAlreadyHydrated) restoredCount += 1;
    await cacheAttemptDuringActiveBoundary(merged, boundaryRevision);
  }

  return restoredCount;
}

async function safelyListLocalAttempts() {
  try {
    return await listLocalAttempts();
  } catch {
    return [];
  }
}

function refreshRemoteCacheAttempt(
  attempt: LocalAssessmentAttempt,
  accountId: string,
  revision: number,
  restored: boolean,
  existingRestoredAt?: string,
): LocalAssessmentAttempt {
  const now = new Date();
  const syncedAt = now.toISOString();
  const retentionDays =
    attempt.state === "completed"
      ? localCompletedRetentionDays
      : localInProgressRetentionDays;

  return {
    ...attempt,
    accountSync: {
      accountId,
      lastSyncedAt: syncedAt,
      ...(existingRestoredAt
        ? { restoredAt: existingRestoredAt }
        : restored
          ? { restoredAt: syncedAt }
          : {}),
      revision,
      status: "synced",
    },
    // An account attempt remains valid even if an old device-cache TTL elapsed.
    expiresAt: addDays(now, retentionDays).toISOString(),
  };
}

function mergeSameAttempt(
  local: LocalAssessmentAttempt,
  remote: LocalAssessmentAttempt,
) {
  if (local.state !== remote.state) {
    if (local.state === "completed") {
      return isPendingAccountSync(local)
        ? preserveLocalWithRemoteRevision(local, remote)
        : local;
    }
    return remote;
  }

  if (isPendingAccountSync(local)) {
    const localResponseCount = Object.keys(local.responses).length;
    const remoteResponseCount = Object.keys(remote.responses).length;

    if (localResponseCount !== remoteResponseCount) {
      return localResponseCount > remoteResponseCount
        ? preserveLocalWithRemoteRevision(local, remote)
        : remote;
    }

    const updatedAtComparison = local.updatedAt.localeCompare(remote.updatedAt);
    if (updatedAtComparison >= 0) {
      return preserveLocalWithRemoteRevision(local, remote);
    }
    return remote;
  }

  const localRevision = local.accountSync?.revision ?? 0;
  const remoteRevision = remote.accountSync?.revision ?? 0;
  if (localRevision !== remoteRevision) {
    return localRevision > remoteRevision ? local : remote;
  }

  return local.updatedAt.localeCompare(remote.updatedAt) > 0 ? local : remote;
}

function isPendingAccountSync(attempt: LocalAssessmentAttempt) {
  return (
    attempt.accountSync?.status === "local_only" ||
    attempt.accountSync?.status === "queued" ||
    attempt.accountSync?.status === "syncing" ||
    attempt.accountSync?.status === "failed"
  );
}

function preserveLocalWithRemoteRevision(
  local: LocalAssessmentAttempt,
  remote: LocalAssessmentAttempt,
): LocalAssessmentAttempt {
  return {
    ...local,
    accountSync: {
      ...remote.accountSync,
      ...local.accountSync,
      accountId: remote.accountSync?.accountId,
      revision: remote.accountSync?.revision,
      status: local.accountSync?.status ?? "queued",
    },
  };
}

async function removeCachesOwnedByAnotherAccount(
  accountId: string,
  boundaryRevision: number,
) {
  const localAttempts = await listStoredLocalAttempts();
  if (boundaryRevision !== accountBoundaryRevision) return;
  await Promise.all(
    localAttempts
      .filter(
        (attempt) =>
          attempt.accountSync?.accountId &&
          attempt.accountSync.accountId !== accountId,
      )
      .map((attempt) => removeStoredLocalAttempt(attempt.id)),
  );
}

async function cacheAttemptDuringActiveBoundary(
  attempt: LocalAssessmentAttempt,
  boundaryRevision: number,
) {
  if (boundaryRevision !== accountBoundaryRevision) return false;
  await cacheLocalAssessmentAttempt(attempt);
  if (boundaryRevision === accountBoundaryRevision) return true;

  const ownerAccountId = attempt.accountSync?.accountId;
  if (ownerAccountId) {
    const stored = await getStoredLocalAttempt(attempt.id);
    if (stored?.accountSync?.accountId === ownerAccountId) {
      await removeStoredLocalAttempt(attempt.id);
    }
  }
  return false;
}

function isValidUploadCandidate(attempt: LocalAssessmentAttempt) {
  return (
    isCoreAttempt(attempt) &&
    Number.isFinite(new Date(attempt.expiresAt).getTime()) &&
    new Date(attempt.expiresAt).getTime() > Date.now()
  );
}

function isCoreAttempt(attempt: LocalAssessmentAttempt) {
  return (
    (attempt.assessmentId === "nu-core-quick" ||
      attempt.assessmentId === "nu-core-full") &&
    (attempt.mode === "quick" || attempt.mode === "full") &&
    (attempt.state === "in_progress" || attempt.state === "completed") &&
    Array.isArray(attempt.itemIds) &&
    typeof attempt.responses === "object" &&
    attempt.responses !== null
  );
}

function isAssessmentProgressCollection(
  value: unknown,
): value is AssessmentProgressCollection {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AssessmentProgressCollection>;
  return (
    candidate.ok === true &&
    typeof candidate.accountId === "string" &&
    Array.isArray(candidate.attempts) &&
    candidate.attempts.every(isRemoteAttemptEntry)
  );
}

function isAssessmentProgressWrite(
  value: unknown,
): value is AssessmentProgressWrite {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AssessmentProgressWrite>;
  return (
    candidate.ok === true &&
    typeof candidate.accountId === "string" &&
    typeof candidate.revision === "number" &&
    Number.isInteger(candidate.revision) &&
    candidate.revision >= 0 &&
    typeof candidate.restored === "boolean" &&
    Boolean(candidate.attempt) &&
    isLocalAttempt(candidate.attempt)
  );
}

function isAssessmentProgressConflict(
  value: unknown,
): value is { currentRevision: number; error: "assessment_progress_conflict" } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as {
    currentRevision?: unknown;
    error?: unknown;
  };
  return (
    candidate.error === "assessment_progress_conflict" &&
    typeof candidate.currentRevision === "number" &&
    Number.isInteger(candidate.currentRevision) &&
    candidate.currentRevision >= 1
  );
}

function isRemoteAttemptEntry(value: unknown): value is RemoteAttemptEntry {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RemoteAttemptEntry>;
  return (
    typeof candidate.revision === "number" &&
    Number.isInteger(candidate.revision) &&
    candidate.revision >= 0 &&
    Boolean(candidate.attempt) &&
    isLocalAttempt(candidate.attempt)
  );
}

function isLocalAttempt(value: unknown): value is LocalAssessmentAttempt {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LocalAssessmentAttempt>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.assessmentId === "string" &&
    typeof candidate.releaseId === "string" &&
    typeof candidate.currentIndex === "number" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.expiresAt === "string" &&
    Array.isArray(candidate.itemIds) &&
    typeof candidate.responses === "object" &&
    candidate.responses !== null &&
    (candidate.mode === "quick" || candidate.mode === "full") &&
    (candidate.state === "in_progress" || candidate.state === "completed")
  );
}

function stripClientSyncMetadata(attempt: LocalAssessmentAttempt) {
  const payload = { ...attempt };
  delete payload.accountSync;
  return payload;
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
