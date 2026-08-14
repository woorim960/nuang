"use client";

import {
  cacheLocalAssessmentAttempt,
  compareAndSwapStoredLocalAttempt,
  deleteLocalAttempt,
  getStoredLocalAttempt,
  isLocalAssessmentAttemptDeleted,
  listLocalAttempts,
  listStoredLocalAttempts,
  removeStoredLocalAttempt,
  setLocalAssessmentAccountScope,
} from "@/features/assessment/assessment-storage";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { readCurrentSupabaseUserId } from "@/features/result-persistence/client-result-scope";
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
  authUserId: string;
  deletedLocalResultIds: string[];
  ok: true;
};

type AssessmentProgressWrite = {
  accountId: string;
  attempt: LocalAssessmentAttempt;
  authUserId: string;
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
  const boundaryRevision = accountBoundaryRevision;
  const accountSync = withoutSyncRequestId(attempt.accountSync);
  const queued: LocalAssessmentAttempt = {
    ...attempt,
    accountSync: {
      ...accountSync,
      status: "queued",
    },
  };

  if (!(await cacheAttemptDuringActiveBoundary(queued, boundaryRevision))) {
    return attempt;
  }

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
        const ownerAccountId = attempt.accountSync?.accountId;
        const provisionalOwner = attempt.accountSync?.ownerSupabaseUserId;
        return accountId
          ? ownerAccountId === accountId
          : Boolean(ownerAccountId || provisionalOwner);
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

  const authUserId = remoteRead.data.authUserId;
  if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
    return createSynchronizationErrorResult();
  }

  authenticationState = "authenticated";
  const { accountId } = remoteRead.data;
  setLocalAssessmentAccountScope(accountId, authUserId);
  if (
    !(await removeCachesOwnedByAnotherAccount(
      accountId,
      authUserId,
      boundaryRevision,
    ))
  ) {
    return createSynchronizationErrorResult();
  }
  if (
    !(await reconcileDeletedCoreAttempts(
      remoteRead.data.deletedLocalResultIds,
      authUserId,
      boundaryRevision,
    ))
  ) {
    return createSynchronizationErrorResult();
  }
  const initialHydration = await hydrateRemoteEntries(
    remoteRead.data.attempts,
    accountId,
    authUserId,
    boundaryRevision,
  );
  if (initialHydration.status === "cancelled") {
    return createSynchronizationErrorResult();
  }
  let restoredCount = initialHydration.restoredCount;

  if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
    return createSynchronizationErrorResult();
  }
  const storedAttempts = await listStoredLocalAttempts();
  if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
    return createSynchronizationErrorResult();
  }
  const uploadCandidates = storedAttempts.filter(
    (attempt) =>
      isValidUploadCandidate(attempt) &&
      (!attempt.accountSync?.ownerSupabaseUserId ||
        attempt.accountSync.ownerSupabaseUserId === authUserId) &&
      (!attempt.accountSync?.accountId ||
        attempt.accountSync.accountId === accountId) &&
      attempt.accountSync?.status !== "synced" &&
      attempt.accountSync?.status !== "rejected",
  );
  let uploadedCount = 0;
  for (const attempt of uploadCandidates) {
    if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
      return createSynchronizationErrorResult();
    }
    const outcome = await uploadAttempt(
      attempt,
      accountId,
      authUserId,
      boundaryRevision,
    );
    if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
      return createSynchronizationErrorResult();
    }
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

  if (uploadCandidates.length === 0) {
    const syncedResult = await createSyncedResult({
      accountId,
      authUserId,
      boundaryRevision,
      restoredCount,
      uploadedCount,
    });
    return syncedResult ?? createSynchronizationErrorResult();
  }

  const refreshedRead = await requestRemoteAttempts();
  if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
    return createSynchronizationErrorResult();
  }
  if (refreshedRead.status === "ready") {
    if (
      refreshedRead.data.authUserId !== authUserId ||
      refreshedRead.data.accountId !== accountId
    ) {
      invalidateAuthenticationBoundary();
      return createSynchronizationErrorResult();
    }
    if (
      !(await reconcileDeletedCoreAttempts(
        refreshedRead.data.deletedLocalResultIds,
        authUserId,
        boundaryRevision,
      ))
    ) {
      return createSynchronizationErrorResult();
    }
    const refreshedHydration = await hydrateRemoteEntries(
      refreshedRead.data.attempts,
      accountId,
      authUserId,
      boundaryRevision,
    );
    if (refreshedHydration.status === "cancelled") {
      return createSynchronizationErrorResult();
    }
    restoredCount += refreshedHydration.restoredCount;
  } else if (refreshedRead.status === "unauthenticated") {
    authenticationState = "unauthenticated";
    setLocalAssessmentAccountScope(null);
    return {
      attempts: await listLocalAttempts(),
      status: "unauthenticated",
    };
  }

  const syncedResult = await createSyncedResult({
    accountId,
    authUserId,
    boundaryRevision,
    restoredCount,
    uploadedCount,
  });
  return syncedResult ?? createSynchronizationErrorResult();
}

async function requestRemoteAttempts(): Promise<
  | { data: AssessmentProgressCollection; status: "ready" }
  | { status: "error" | "unauthenticated" }
> {
  try {
    const requestAuthUserId = await readCurrentSupabaseUserId();
    const response = await fetch("/api/assessment-progress", {
      cache: "no-store",
      headers: requestAuthUserId
        ? { "x-nuang-auth-user-id": requestAuthUserId }
        : undefined,
      method: "GET",
    });

    if (response.status === 401) return { status: "unauthenticated" };
    if (!response.ok) return { status: "error" };

    const body = await readJson<unknown>(response);
    if (!isAssessmentProgressCollection(body)) return { status: "error" };
    const currentAuthUserId = await readCurrentSupabaseUserId();
    if (
      !requestAuthUserId ||
      body.authUserId !== requestAuthUserId ||
      currentAuthUserId !== requestAuthUserId
    ) {
      invalidateAuthenticationBoundary();
      return { status: "error" };
    }
    return { data: body, status: "ready" };
  } catch {
    return { status: "error" };
  }
}

async function uploadAttempt(
  attempt: LocalAssessmentAttempt,
  accountId: string,
  authUserId: string,
  boundaryRevision: number,
): Promise<
  | "cancelled"
  | "deleted"
  | "error"
  | "restored"
  | "unauthenticated"
  | "uploaded"
> {
  const attemptedAt = new Date().toISOString();
  const existingOwner = attempt.accountSync?.accountId;
  const syncRequestId = crypto.randomUUID();
  const syncing: LocalAssessmentAttempt = {
    ...attempt,
    accountSync: {
      ...withoutSyncRequestId(attempt.accountSync),
      accountId,
      lastAttemptedAt: attemptedAt,
      status: "syncing",
      syncRequestId,
    },
  };
  if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
    return "cancelled";
  }
  if (
    !(await cacheAttemptDuringActiveBoundary(
      syncing,
      boundaryRevision,
      attempt,
      authUserId,
    ))
  ) {
    return "cancelled";
  }

  try {
    if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
      return "cancelled";
    }
    const expectedRevision = attempt.accountSync?.revision;
    const response = await fetch("/api/assessment-progress", {
      body: JSON.stringify({
        attempt: stripClientSyncMetadata(attempt),
        ...(expectedRevision === undefined ? {} : { expectedRevision }),
      }),
      headers: {
        "content-type": "application/json",
        "x-nuang-auth-user-id": authUserId,
      },
      method: "PUT",
    });

    if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
      return "cancelled";
    }

    if (response.status === 401) {
      await markSyncFailure(
        attempt.id,
        existingOwner,
        attemptedAt,
        boundaryRevision,
        syncRequestId,
        { authUserId, releaseProvisionalOwner: true },
      );
      return "unauthenticated";
    }

    const body = await readJson<unknown>(response);
    if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
      return "cancelled";
    }
    if (
      (response.ok || response.status === 409 || response.status === 410) &&
      readResponseAuthUserId(body) !== authUserId
    ) {
      invalidateAuthenticationBoundary();
      return "cancelled";
    }
    if (response.status === 410 && isAssessmentProgressDeleted(body)) {
      if (
        !(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))
      ) {
        return "cancelled";
      }
      await deleteLocalAttempt(attempt.id);
      if (
        !(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))
      ) {
        return "cancelled";
      }
      return "deleted";
    }
    if (response.status === 422) {
      await markSyncRejected(
        attempt,
        existingOwner,
        attemptedAt,
        boundaryRevision,
        syncRequestId,
        authUserId,
      );
      return "error";
    }

    if (response.status === 409 && isAssessmentProgressConflict(body)) {
      if (
        !(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))
      ) {
        return "cancelled";
      }
      const current = await getStoredLocalAttempt(attempt.id);
      if (
        !(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))
      ) {
        return "cancelled";
      }

      if (isCurrentSyncRequest(current, syncRequestId)) {
        const cached = await cacheAttemptDuringActiveBoundary(
          {
            ...current,
            accountSync: {
              ...withoutSyncRequestId(current.accountSync),
              accountId,
              lastAttemptedAt: attemptedAt,
              revision: body.currentRevision,
              status: "queued",
            },
          },
          boundaryRevision,
          current,
          authUserId,
        );
        if (!cached) return "cancelled";
        anotherPassRequested = true;
      } else {
        await markSyncFailure(
          attempt.id,
          existingOwner,
          attemptedAt,
          boundaryRevision,
          syncRequestId,
          { authUserId },
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
        syncRequestId,
        { authUserId },
      );
      return "error";
    }

    const remote = refreshRemoteCacheAttempt(
      body.attempt,
      body.accountId,
      authUserId,
      body.revision,
      body.restored,
    );
    if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
      return "cancelled";
    }
    const current = await getStoredLocalAttempt(attempt.id);
    if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
      return "cancelled";
    }

    if (
      !isCurrentSyncRequest(current, syncRequestId) ||
      isLocalAssessmentAttemptDeleted(attempt.id)
    ) {
      return "cancelled";
    }

    if (current && current.updatedAt !== attempt.updatedAt) {
      const cached = await cacheAttemptDuringActiveBoundary(
        {
          ...current,
          accountSync: {
            ...withoutSyncRequestId(current.accountSync),
            accountId: body.accountId,
            lastAttemptedAt: attemptedAt,
            revision: body.revision,
            status: "queued",
          },
        },
        boundaryRevision,
        current,
        authUserId,
      );
      if (!cached) return "cancelled";
      anotherPassRequested = true;
    } else {
      const cached = await cacheAttemptDuringActiveBoundary(
        remote,
        boundaryRevision,
        current,
        authUserId,
      );
      if (!cached) return "cancelled";
    }

    return body.restored ? "restored" : "uploaded";
  } catch {
    await markSyncFailure(
      attempt.id,
      existingOwner,
      attemptedAt,
      boundaryRevision,
      syncRequestId,
      { authUserId },
    );
    return "error";
  }
}

async function markSyncRejected(
  attempted: LocalAssessmentAttempt,
  existingOwner: string | undefined,
  attemptedAt: string,
  boundaryRevision: number,
  syncRequestId: string,
  authUserId: string,
) {
  if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
    return;
  }
  const current = await getStoredLocalAttempt(attempted.id);
  if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
    return;
  }
  if (!isCurrentSyncRequest(current, syncRequestId)) return;

  const changedSinceRequest = current.updatedAt !== attempted.updatedAt;
  const accountSync = withoutSyncRequestId(current.accountSync);
  if (!existingOwner) delete accountSync.accountId;
  const cached = await cacheAttemptDuringActiveBoundary(
    {
      ...current,
      accountSync: {
        ...accountSync,
        ...(existingOwner ? { accountId: existingOwner } : {}),
        lastAttemptedAt: attemptedAt,
        status: changedSinceRequest ? "queued" : "rejected",
      },
    },
    boundaryRevision,
    current,
    authUserId,
  );

  if (cached && changedSinceRequest) anotherPassRequested = true;
}

async function markSyncFailure(
  attemptId: string,
  existingOwner: string | undefined,
  attemptedAt: string,
  boundaryRevision: number,
  syncRequestId: string,
  options: {
    authUserId?: string;
    releaseProvisionalOwner?: boolean;
  } = {},
) {
  if (
    options.authUserId &&
    !(await isAuthenticationBoundaryActive(
      options.authUserId,
      boundaryRevision,
    ))
  ) {
    return;
  }
  const current = await getStoredLocalAttempt(attemptId);
  if (
    options.authUserId &&
    !(await isAuthenticationBoundaryActive(
      options.authUserId,
      boundaryRevision,
    ))
  ) {
    return;
  }
  if (!isCurrentSyncRequest(current, syncRequestId)) return;

  const accountSync = withoutSyncRequestId(current.accountSync);
  if (options.releaseProvisionalOwner && !existingOwner) {
    delete accountSync.accountId;
  }
  await cacheAttemptDuringActiveBoundary(
    {
      ...current,
      accountSync: {
        ...accountSync,
        ...(existingOwner ? { accountId: existingOwner } : {}),
        lastAttemptedAt: attemptedAt,
        status: "failed",
      },
    },
    boundaryRevision,
    current,
    options.authUserId,
  );
}

async function hydrateRemoteEntries(
  entries: RemoteAttemptEntry[],
  accountId: string,
  authUserId: string,
  boundaryRevision: number,
): Promise<
  | { restoredCount: number; status: "completed" }
  | { restoredCount: number; status: "cancelled" }
> {
  let restoredCount = 0;

  for (const entry of entries) {
    if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
      return { restoredCount, status: "cancelled" };
    }
    if (!isCoreAttempt(entry.attempt)) continue;
    if (isLocalAssessmentAttemptDeleted(entry.attempt.id)) continue;
    const local = await getStoredLocalAttempt(entry.attempt.id);
    if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
      return { restoredCount, status: "cancelled" };
    }
    const remote = refreshRemoteCacheAttempt(
      entry.attempt,
      accountId,
      authUserId,
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

    const cached = await cacheAttemptDuringActiveBoundary(
      merged,
      boundaryRevision,
      local,
      authUserId,
    );
    if (!cached) return { restoredCount, status: "cancelled" };
    if (cached && merged === remote && !wasAlreadyHydrated) restoredCount += 1;
  }

  if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
    return { restoredCount, status: "cancelled" };
  }
  return { restoredCount, status: "completed" };
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
  authUserId: string,
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
      ownerSupabaseUserId: authUserId,
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
  authUserId: string,
  boundaryRevision: number,
) {
  if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
    return false;
  }
  const localAttempts = await listStoredLocalAttempts();
  if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
    return false;
  }
  const staleAttempts = localAttempts.filter((attempt) => {
    const ownerAccountId = attempt.accountSync?.accountId;
    const provisionalOwner = attempt.accountSync?.ownerSupabaseUserId;
    return (
      (Boolean(ownerAccountId) && ownerAccountId !== accountId) ||
      (Boolean(provisionalOwner) && provisionalOwner !== authUserId)
    );
  });
  for (const attempt of staleAttempts) {
    if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
      return false;
    }
    await removeStoredLocalAttempt(attempt.id);
    if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
      return false;
    }
  }
  return isAuthenticationBoundaryActive(authUserId, boundaryRevision);
}

async function reconcileDeletedCoreAttempts(
  localResultIds: string[],
  authUserId: string,
  boundaryRevision: number,
) {
  for (const localResultId of localResultIds) {
    if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
      return false;
    }
    await deleteLocalAttempt(localResultId);
    if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
      return false;
    }
  }
  return isAuthenticationBoundaryActive(authUserId, boundaryRevision);
}

function invalidateAuthenticationBoundary() {
  accountBoundaryRevision += 1;
  anotherPassRequested = false;
  authenticationState = "unknown";
  setLocalAssessmentAccountScope(null);
}

async function isAuthenticationBoundaryActive(
  authUserId: string,
  boundaryRevision: number,
) {
  if (boundaryRevision !== accountBoundaryRevision) return false;

  try {
    const currentAuthUserId = await readCurrentSupabaseUserId();
    if (boundaryRevision !== accountBoundaryRevision) return false;
    if (currentAuthUserId === authUserId) return true;
  } catch {
    if (boundaryRevision !== accountBoundaryRevision) return false;
  }

  invalidateAuthenticationBoundary();
  return false;
}

async function createSynchronizationErrorResult(): Promise<{
  attempts: LocalAssessmentAttempt[];
  status: "error";
}> {
  return {
    attempts: await safelyListLocalAttempts(),
    status: "error",
  };
}

async function createSyncedResult({
  accountId,
  authUserId,
  boundaryRevision,
  restoredCount,
  uploadedCount,
}: {
  accountId: string;
  authUserId: string;
  boundaryRevision: number;
  restoredCount: number;
  uploadedCount: number;
}): Promise<Extract<AccountAssessmentSyncResult, { status: "synced" }> | null> {
  if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
    return null;
  }
  const attempts = await listLocalAttempts();
  if (!(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))) {
    return null;
  }
  return {
    accountId,
    attempts,
    restoredCount,
    status: "synced",
    uploadedCount,
  };
}

async function cacheAttemptDuringActiveBoundary(
  attempt: LocalAssessmentAttempt,
  boundaryRevision: number,
  expected?: LocalAssessmentAttempt,
  authUserId?: string,
) {
  if (
    boundaryRevision !== accountBoundaryRevision ||
    isLocalAssessmentAttemptDeleted(attempt.id)
  ) {
    return false;
  }
  if (
    authUserId &&
    !(await isAuthenticationBoundaryActive(authUserId, boundaryRevision))
  ) {
    return false;
  }
  const cached = expected
    ? await compareAndSwapStoredLocalAttempt({
        attempt,
        expected: {
          syncRequestId: expected.accountSync?.syncRequestId ?? null,
          updatedAt: expected.updatedAt,
        },
      })
    : await cacheAttemptWithoutTombstone(attempt);
  if (!cached) return false;
  const authBoundaryActive = authUserId
    ? await isAuthenticationBoundaryActive(authUserId, boundaryRevision)
    : true;
  if (
    authBoundaryActive &&
    boundaryRevision === accountBoundaryRevision &&
    !isLocalAssessmentAttemptDeleted(attempt.id)
  ) {
    return true;
  }

  const ownerAccountId = attempt.accountSync?.accountId;
  const stored = await getStoredLocalAttempt(attempt.id);
  if (
    isLocalAssessmentAttemptDeleted(attempt.id) ||
    (ownerAccountId && stored?.accountSync?.accountId === ownerAccountId)
  ) {
    await removeStoredLocalAttempt(attempt.id);
  }
  return false;
}

async function cacheAttemptWithoutTombstone(attempt: LocalAssessmentAttempt) {
  if (isLocalAssessmentAttemptDeleted(attempt.id)) return false;
  await cacheLocalAssessmentAttempt(attempt);
  if (!isLocalAssessmentAttemptDeleted(attempt.id)) return true;
  await removeStoredLocalAttempt(attempt.id);
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
    typeof candidate.authUserId === "string" &&
    Array.isArray(candidate.deletedLocalResultIds) &&
    candidate.deletedLocalResultIds.every(
      (localResultId) => typeof localResultId === "string",
    ) &&
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
    typeof candidate.authUserId === "string" &&
    typeof candidate.revision === "number" &&
    Number.isInteger(candidate.revision) &&
    candidate.revision >= 0 &&
    typeof candidate.restored === "boolean" &&
    Boolean(candidate.attempt) &&
    isLocalAttempt(candidate.attempt)
  );
}

function isAssessmentProgressDeleted(
  value: unknown,
): value is { error: "assessment_progress_deleted" } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    (value as { error?: unknown }).error === "assessment_progress_deleted"
  );
}

function readResponseAuthUserId(value: unknown) {
  return value && typeof value === "object"
    ? ((value as { authUserId?: unknown }).authUserId ?? null)
    : null;
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

function withoutSyncRequestId(metadata: LocalAssessmentAttempt["accountSync"]) {
  const next = { ...metadata };
  delete next.syncRequestId;
  return next;
}

function isCurrentSyncRequest(
  attempt: LocalAssessmentAttempt | undefined,
  syncRequestId: string,
): attempt is LocalAssessmentAttempt {
  return (
    Boolean(attempt) && attempt?.accountSync?.syncRequestId === syncRequestId
  );
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
