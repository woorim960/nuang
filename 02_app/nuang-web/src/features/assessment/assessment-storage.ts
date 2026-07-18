"use client";

import { openDB, type DBSchema } from "idb";
import type {
  AssessmentAnswer,
  AssessmentDefinition,
  AssessmentMilestoneId,
  AssessmentMilestoneStatus,
  AssessmentResultEvidenceStatus,
  AssessmentResultSnapshot,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";
import { halfwayCheckpointContentVersion } from "@/features/assessment/assessment-milestone";
import { getApprovedReusableResponses } from "@/features/assessment/assessment-response-reuse";
import { sanitizePrecisionDestination } from "@/features/assessment/precision-entry";
import {
  localCompletedRetentionDays,
  localInProgressRetentionDays,
} from "@/features/account/local-retention-policy";

const DB_NAME = "nuang-local";
const DB_VERSION = 1;
const ATTEMPT_STORE = "assessmentAttempts";

interface NuangLocalDb extends DBSchema {
  assessmentAttempts: {
    key: string;
    value: LocalAssessmentAttempt;
    indexes: {
      "by-assessment-state": [string, string];
    };
  };
}

function getDb() {
  return openDB<NuangLocalDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(ATTEMPT_STORE, { keyPath: "id" });
      store.createIndex("by-assessment-state", ["assessmentId", "state"]);
    },
  });
}

export async function getOrCreateLocalAttempt(
  assessment: AssessmentDefinition,
  reuseSourceAttempt?: LocalAssessmentAttempt,
  returnDestination?: string | null,
) {
  const db = await getDb();
  const existing = await db.getAllFromIndex(
    ATTEMPT_STORE,
    "by-assessment-state",
    [assessment.assessmentId, "in_progress"],
  );
  const active = existing
    .filter(
      (attempt) =>
        attempt.releaseId === assessment.releaseId &&
        attempt.itemIds.length === assessment.items.length &&
        attempt.itemIds.every(
          (itemId, index) => itemId === assessment.items[index]?.itemId,
        ) &&
        new Date(attempt.expiresAt).getTime() > Date.now(),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  const safeReturnDestination = sanitizePrecisionDestination(returnDestination);

  if (active) {
    if (
      safeReturnDestination &&
      safeReturnDestination !== active.returnDestination
    ) {
      const resumed = {
        ...active,
        returnDestination: safeReturnDestination,
        updatedAt: new Date().toISOString(),
      };
      await db.put(ATTEMPT_STORE, resumed);
      return resumed;
    }

    return active;
  }

  const now = new Date();
  const reusableResponses = getApprovedReusableResponses(
    reuseSourceAttempt,
    assessment,
  );
  const currentIndex = assessment.items.findIndex(
    (item) => !reusableResponses[item.itemId],
  );
  const attempt: LocalAssessmentAttempt = {
    id: `local_${crypto.randomUUID()}`,
    assessmentId: assessment.assessmentId,
    releaseId: assessment.releaseId,
    mode: assessment.mode,
    itemIds: assessment.items.map((item) => item.itemId),
    responses: reusableResponses,
    currentIndex:
      currentIndex === -1 ? assessment.items.length - 1 : currentIndex,
    state: "in_progress",
    localPersistStatus: "saved",
    milestones: {},
    ...(safeReturnDestination
      ? { returnDestination: safeReturnDestination }
      : {}),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: addDays(now, localInProgressRetentionDays).toISOString(),
  };

  await db.put(ATTEMPT_STORE, attempt);
  return attempt;
}

export async function saveLocalAnswer(
  attempt: LocalAssessmentAttempt,
  answer: AssessmentAnswer,
  currentIndex: number,
) {
  const db = await getDb();
  const updatedAt = new Date();
  const nextAttempt: LocalAssessmentAttempt = {
    ...withoutCompletionResult(attempt),
    currentIndex,
    responses: {
      ...attempt.responses,
      [answer.itemId]: answer,
    },
    updatedAt: updatedAt.toISOString(),
    expiresAt: addDays(updatedAt, localInProgressRetentionDays).toISOString(),
    localPersistStatus: "saved",
  };

  await db.put(ATTEMPT_STORE, nextAttempt);
  return nextAttempt;
}

export async function saveLocalProgress(
  attempt: LocalAssessmentAttempt,
  currentIndex: number,
) {
  const db = await getDb();
  const now = new Date();
  const nextAttempt: LocalAssessmentAttempt = {
    ...attempt,
    currentIndex,
    updatedAt: now.toISOString(),
    expiresAt: addDays(now, localInProgressRetentionDays).toISOString(),
    localPersistStatus: "saved",
  };

  await db.put(ATTEMPT_STORE, nextAttempt);
  return nextAttempt;
}

export async function reopenLocalAttemptForReview(
  attempt: LocalAssessmentAttempt,
  currentIndex: number,
) {
  const db = await getDb();
  const now = new Date();
  const baseItemIds = new Set(attempt.itemIds);
  const reopenedAttempt: LocalAssessmentAttempt = {
    ...withoutCompletionResult(attempt),
    currentIndex,
    responses: Object.fromEntries(
      Object.entries(attempt.responses).filter(([itemId]) =>
        baseItemIds.has(itemId),
      ),
    ),
    state: "in_progress",
    localPersistStatus: "saved",
    updatedAt: now.toISOString(),
    expiresAt: addDays(now, localInProgressRetentionDays).toISOString(),
  };

  delete reopenedAttempt.adaptiveItemIds;
  delete reopenedAttempt.adaptiveStatus;

  await db.put(ATTEMPT_STORE, reopenedAttempt);
  return reopenedAttempt;
}

export async function startLocalAdaptiveFollowUp(
  attempt: LocalAssessmentAttempt,
  adaptiveItemIds: string[],
) {
  const db = await getDb();
  const now = new Date();
  const allowedResponseIds = new Set([...attempt.itemIds, ...adaptiveItemIds]);
  const adaptiveAttempt: LocalAssessmentAttempt = {
    ...withoutCompletionResult(attempt),
    adaptiveItemIds,
    adaptiveStatus: "intro",
    currentIndex: attempt.itemIds.length,
    responses: Object.fromEntries(
      Object.entries(attempt.responses).filter(([itemId]) =>
        allowedResponseIds.has(itemId),
      ),
    ),
    state: "in_progress",
    localPersistStatus: "saved",
    updatedAt: now.toISOString(),
    expiresAt: addDays(now, localInProgressRetentionDays).toISOString(),
  };

  await db.put(ATTEMPT_STORE, adaptiveAttempt);
  return adaptiveAttempt;
}

export async function beginLocalAdaptiveFollowUp(
  attempt: LocalAssessmentAttempt,
) {
  const db = await getDb();
  const now = new Date();
  const activeAttempt: LocalAssessmentAttempt = {
    ...attempt,
    adaptiveStatus: "in_progress",
    localPersistStatus: "saved",
    updatedAt: now.toISOString(),
    expiresAt: addDays(now, localInProgressRetentionDays).toISOString(),
  };

  await db.put(ATTEMPT_STORE, activeAttempt);
  return activeAttempt;
}

export async function saveLocalMilestone(
  attempt: LocalAssessmentAttempt,
  milestoneId: AssessmentMilestoneId,
  status: AssessmentMilestoneStatus,
  currentIndex = attempt.currentIndex,
) {
  const db = await getDb();
  const now = new Date();
  const existing = attempt.milestones?.[milestoneId];
  const milestone = {
    id: milestoneId,
    status,
    contentVersion: halfwayCheckpointContentVersion,
    shownAt: existing?.shownAt ?? now.toISOString(),
    ...(status === "shown" ? {} : { resolvedAt: now.toISOString() }),
  };
  const nextAttempt: LocalAssessmentAttempt = {
    ...attempt,
    currentIndex,
    localPersistStatus: "saved",
    milestones: {
      ...attempt.milestones,
      [milestoneId]: milestone,
    },
    updatedAt: now.toISOString(),
    expiresAt: addDays(now, localInProgressRetentionDays).toISOString(),
  };

  await db.put(ATTEMPT_STORE, nextAttempt);
  return nextAttempt;
}

export async function completeLocalAttempt(
  attempt: LocalAssessmentAttempt,
  options: {
    completionRequestId: string;
    evidenceStatus: AssessmentResultEvidenceStatus;
    resultCopyVersion?: string;
    resultSnapshot: AssessmentResultSnapshot;
  },
) {
  const db = await getDb();
  const storedAttempt = await db.get(ATTEMPT_STORE, attempt.id);

  if (
    (options.evidenceStatus === "insufficient_evidence") !==
    (options.resultSnapshot.resultStatus === "insufficient_evidence")
  ) {
    throw new Error("COMPLETION_EVIDENCE_STATUS_MISMATCH");
  }

  if (
    storedAttempt?.resultSnapshot &&
    (storedAttempt.completionStatus === "completed" ||
      storedAttempt.completionStatus === "insufficient_evidence")
  ) {
    if (
      storedAttempt.completionRequestId === options.completionRequestId &&
      storedAttempt.responseSnapshotHash !==
        options.resultSnapshot.responseSnapshotHash
    ) {
      throw new Error("COMPLETION_SNAPSHOT_CONFLICT");
    }
    return storedAttempt;
  }

  const sourceAttempt = storedAttempt ?? attempt;

  if (
    sourceAttempt.completionRequestId &&
    (sourceAttempt.completionRequestId !== options.completionRequestId ||
      sourceAttempt.responseSnapshotHash !==
        options.resultSnapshot.responseSnapshotHash)
  ) {
    throw new Error("COMPLETION_SNAPSHOT_CONFLICT");
  }

  const now = new Date();
  const isInsufficient =
    options.resultSnapshot.resultStatus === "insufficient_evidence";
  const completed: LocalAssessmentAttempt = {
    ...sourceAttempt,
    completionRequestId: options.completionRequestId,
    completionStatus: isInsufficient ? "insufficient_evidence" : "completed",
    responseSnapshotHash: options.resultSnapshot.responseSnapshotHash,
    resultCopyVersion: options.resultCopyVersion,
    resultEvidenceStatus: options.evidenceStatus,
    resultSnapshot: options.resultSnapshot,
    ...(sourceAttempt.adaptiveItemIds?.length
      ? { adaptiveStatus: "completed" as const }
      : {}),
    state: isInsufficient ? "in_progress" : "completed",
    localPersistStatus: "saved",
    updatedAt: now.toISOString(),
    completedAt: isInsufficient ? undefined : now.toISOString(),
    expiresAt: addDays(
      now,
      isInsufficient
        ? localInProgressRetentionDays
        : localCompletedRetentionDays,
    ).toISOString(),
  };

  await db.put(ATTEMPT_STORE, completed);
  return completed;
}

export async function beginLocalAttemptCompletion(
  attempt: LocalAssessmentAttempt,
  completionRequestId: string,
  responseSnapshotHash: string,
) {
  const db = await getDb();
  const storedAttempt = await db.get(ATTEMPT_STORE, attempt.id);
  const sourceAttempt = storedAttempt ?? attempt;

  if (sourceAttempt.state === "completed") return sourceAttempt;

  if (sourceAttempt.completionRequestId) {
    if (
      sourceAttempt.completionRequestId !== completionRequestId ||
      sourceAttempt.responseSnapshotHash !== responseSnapshotHash
    ) {
      throw new Error("COMPLETION_SNAPSHOT_CONFLICT");
    }
    return sourceAttempt;
  }

  const now = new Date();
  const submitting: LocalAssessmentAttempt = {
    ...sourceAttempt,
    completionRequestId,
    completionStatus: "submitting",
    responseSnapshotHash,
    updatedAt: now.toISOString(),
    expiresAt: addDays(now, localInProgressRetentionDays).toISOString(),
  };

  await db.put(ATTEMPT_STORE, submitting);
  return submitting;
}

export async function getLocalAttempt(id: string) {
  const db = await getDb();
  return db.get(ATTEMPT_STORE, id);
}

export async function saveLocalAttemptReturnDestination(
  attempt: LocalAssessmentAttempt,
  returnDestination: string | null,
) {
  const db = await getDb();
  const stored = (await db.get(ATTEMPT_STORE, attempt.id)) ?? attempt;
  const safeReturnDestination = sanitizePrecisionDestination(returnDestination);
  const updated = { ...stored, updatedAt: new Date().toISOString() };

  if (safeReturnDestination) {
    updated.returnDestination = safeReturnDestination;
  } else {
    delete updated.returnDestination;
  }

  await db.put(ATTEMPT_STORE, updated);
  return updated;
}

export async function listLocalAttempts() {
  const db = await getDb();
  const attempts = await db.getAll(ATTEMPT_STORE);
  const now = Date.now();

  return attempts
    .filter((attempt) => new Date(attempt.expiresAt).getTime() > now)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteLocalAttempt(id: string) {
  const db = await getDb();
  await db.delete(ATTEMPT_STORE, id);
}

export async function getLatestCompletedAttempt(
  assessmentId: string,
): Promise<LocalAssessmentAttempt | undefined> {
  const db = await getDb();
  const completed = await db.getAllFromIndex(
    ATTEMPT_STORE,
    "by-assessment-state",
    [assessmentId, "completed"],
  );

  return completed
    .filter((attempt) => new Date(attempt.expiresAt).getTime() > Date.now())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function withoutCompletionResult(
  attempt: LocalAssessmentAttempt,
): LocalAssessmentAttempt {
  const activeAttempt = { ...attempt };

  delete activeAttempt.completedAt;
  delete activeAttempt.completionRequestId;
  delete activeAttempt.completionStatus;
  delete activeAttempt.responseSnapshotHash;
  delete activeAttempt.resultCopyVersion;
  delete activeAttempt.resultEvidenceStatus;
  delete activeAttempt.resultSnapshot;

  return activeAttempt;
}
