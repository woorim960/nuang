import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  accountAssessmentProgressAttemptSchema,
  type AccountAssessmentProgressEntry,
  type AccountAssessmentProgressAttempt,
} from "@/features/assessment/account-assessment-progress-contract";
import { prepareAssessmentCompletion } from "@/features/assessment/assessment-completion";
import { getAssessmentRunItems } from "@/features/assessment/assessment-adaptive";
import { halfwayCheckpointContentVersion } from "@/features/assessment/assessment-milestone";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import { candidateQuickCoreAssessment } from "@/features/assessment/candidate-quick-core-seed";
import { sanitizePrecisionDestination } from "@/features/assessment/precision-entry";
import type {
  AssessmentDefinition,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";
import { ensureAccountForUser } from "@/features/account/server-writes";
import { coreResultCopyVersion } from "@/features/result/report-copy";
import { buildReportContentSnapshot } from "@/features/result/unified-core-report/report-content-snapshot";

type ServiceClient = SupabaseClient;

type ProgressFailureCode =
  | "account_link_missing"
  | "assessment_progress_conflict"
  | "assessment_progress_deleted"
  | "assessment_progress_invalid"
  | "assessment_progress_read_failed"
  | "assessment_progress_write_failed";

export type AccountAssessmentProgressReadResult =
  | {
      accountId: string;
      attempts: AccountAssessmentProgressEntry[];
      deletedLocalResultIds: string[];
      ok: true;
    }
  | { code: ProgressFailureCode; ok: false };

export type AccountAssessmentProgressWriteResult =
  | {
      accountId: string;
      attempt: LocalAssessmentAttempt;
      ok: true;
      restored: boolean;
      revision: number;
    }
  | {
      code: ProgressFailureCode;
      currentRevision?: number | null;
      ok: false;
    };

type StoredProgressRow = {
  attempt_payload: unknown;
  revision: number;
  updated_at: unknown;
};

type SavedProgressRow = StoredProgressRow & {
  restored: boolean;
};

type DeletedProgressRow = {
  local_result_id: string;
};

export async function readAccountAssessmentProgress({
  client,
  user,
}: {
  client: ServiceClient;
  user: User;
}): Promise<AccountAssessmentProgressReadResult> {
  const account = await ensureAccountForUser(client, user);

  if (!account.ok) {
    return { code: "account_link_missing", ok: false };
  }

  const response = await client
    .schema("assessment")
    .from("account_assessment_progress")
    .select("attempt_payload, revision, updated_at")
    .eq("account_id", account.accountId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (response.error) {
    return { code: "assessment_progress_read_failed", ok: false };
  }

  const deletedResponse = await client
    .schema("assessment")
    .from("result_deletion_tombstone")
    .select("local_result_id")
    .eq("account_id", account.accountId)
    .eq("result_kind", "core");

  if (deletedResponse.error) {
    return { code: "assessment_progress_read_failed", ok: false };
  }

  const parsedEntries: AccountAssessmentProgressEntry[] = [];

  for (const row of (response.data ?? []) as StoredProgressRow[]) {
    const parsed = accountAssessmentProgressAttemptSchema.safeParse(
      row.attempt_payload,
    );

    if (
      !parsed.success ||
      !Number.isInteger(row.revision) ||
      row.revision < 1 ||
      typeof row.updated_at !== "string" ||
      !Number.isFinite(Date.parse(row.updated_at))
    ) {
      return { code: "assessment_progress_read_failed", ok: false };
    }

    const canonical = validateAndCanonicalizeAttempt(parsed.data);
    if (!canonical.ok) {
      return { code: "assessment_progress_read_failed", ok: false };
    }

    parsedEntries.push({
      attempt: canonical.attempt,
      revision: row.revision,
      serverUpdatedAt: row.updated_at,
    });
  }

  return {
    accountId: account.accountId,
    attempts: selectVisibleAccountAttempts(parsedEntries),
    deletedLocalResultIds: (deletedResponse.data ?? []).map(
      (row) => (row as DeletedProgressRow).local_result_id,
    ),
    ok: true,
  };
}

export async function saveAccountAssessmentProgress({
  attempt,
  client,
  expectedRevision,
  user,
}: {
  attempt: AccountAssessmentProgressAttempt;
  client: ServiceClient;
  expectedRevision?: number;
  user: User;
}): Promise<AccountAssessmentProgressWriteResult> {
  const canonical = validateAndCanonicalizeAttempt(attempt);

  if (!canonical.ok) {
    return { code: "assessment_progress_invalid", ok: false };
  }

  const account = await ensureAccountForUser(client, user);

  if (!account.ok) {
    return { code: "account_link_missing", ok: false };
  }

  const response = await client.schema("assessment").rpc(
    "save_account_assessment_progress",
    {
      p_account_id: account.accountId,
      p_attempt: canonical.attempt,
      p_client_attempt_id: canonical.attempt.id,
      p_expected_revision: expectedRevision ?? null,
    },
  );

  if (response.error) {
    if (isDeletionTombstoneError(response.error)) {
      return { code: "assessment_progress_deleted", ok: false };
    }

    if (isRevisionConflict(response.error)) {
      const [currentRevision, deleted] = await Promise.all([
        readCurrentRevision({
          accountId: account.accountId,
          client,
          clientAttemptId: canonical.attempt.id,
        }),
        isPersistedResultDeleted({
          accountId: account.accountId,
          client,
          clientAttemptId: canonical.attempt.id,
        }),
      ]);
      if (deleted) {
        return { code: "assessment_progress_deleted", ok: false };
      }
      return {
        code: "assessment_progress_conflict",
        currentRevision,
        ok: false,
      };
    }

    return { code: "assessment_progress_write_failed", ok: false };
  }

  const row = Array.isArray(response.data)
    ? (response.data[0] as SavedProgressRow | undefined)
    : undefined;
  const parsedStored = accountAssessmentProgressAttemptSchema.safeParse(
    row?.attempt_payload,
  );

  if (
    !row ||
    !parsedStored.success ||
    !Number.isInteger(row.revision) ||
    row.revision < 1
  ) {
    return { code: "assessment_progress_write_failed", ok: false };
  }

  const storedCanonical = validateAndCanonicalizeAttempt(parsedStored.data);
  if (!storedCanonical.ok) {
    return { code: "assessment_progress_write_failed", ok: false };
  }

  return {
    accountId: account.accountId,
    attempt: storedCanonical.attempt,
    ok: true,
    restored: Boolean(row.restored),
    revision: row.revision,
  };
}

export function validateAndCanonicalizeAttempt(
  attempt: AccountAssessmentProgressAttempt,
):
  | { attempt: LocalAssessmentAttempt; ok: true }
  | { ok: false } {
  const assessment = getOfficialAssessment(attempt);
  if (!assessment) return { ok: false };

  if (
    attempt.mode !== assessment.mode ||
    attempt.releaseId !== assessment.releaseId ||
    !hasSameOrderedValues(
      attempt.itemIds,
      assessment.items.map((item) => item.itemId),
    ) ||
    !hasValidDates(attempt) ||
    (attempt.returnDestination !== undefined &&
      sanitizePrecisionDestination(attempt.returnDestination) !==
        attempt.returnDestination)
  ) {
    return { ok: false };
  }

  const officialAdaptiveIds = new Set(
    (assessment.adaptiveItems ?? []).map((item) => item.itemId),
  );
  const adaptiveItemIds = attempt.adaptiveItemIds ?? [];

  if (
    new Set(adaptiveItemIds).size !== adaptiveItemIds.length ||
    adaptiveItemIds.some((itemId) => !officialAdaptiveIds.has(itemId)) ||
    (adaptiveItemIds.length === 0 && attempt.adaptiveStatus !== undefined) ||
    (adaptiveItemIds.length > 0 && attempt.adaptiveStatus === undefined)
  ) {
    return { ok: false };
  }

  const runItems = getAssessmentRunItems(
    assessment,
    attempt as LocalAssessmentAttempt,
  );
  const runItemById = new Map(runItems.map((item) => [item.itemId, item]));
  const adaptiveResponseCount = adaptiveItemIds.reduce(
    (count, itemId) => count + (attempt.responses[itemId] ? 1 : 0),
    0,
  );

  if (
    adaptiveItemIds.length > 0 &&
    (attempt.currentIndex < assessment.items.length ||
      (attempt.adaptiveStatus === "intro" &&
        (attempt.currentIndex !== assessment.items.length ||
          adaptiveResponseCount > 0)) ||
      (attempt.adaptiveStatus === "completed" &&
        (adaptiveResponseCount !== adaptiveItemIds.length ||
          (attempt.completionStatus !== "completed" &&
            attempt.completionStatus !== "insufficient_evidence"))))
  ) {
    return { ok: false };
  }

  if (
    attempt.currentIndex >= runItems.length ||
    Object.entries(attempt.responses).some(([itemId, answer]) => {
      const item = runItemById.get(itemId);
      if (!item || answer.itemId !== itemId) return true;
      if (item.responseFormat === "forced_direction_4") {
        return (
          answer.isUnsure === true ||
          answer.value === undefined ||
          answer.value === 3
        );
      }
      return false;
    }) ||
    attempt.milestones?.HALFWAY_BREAK_V1?.contentVersion !== undefined &&
      attempt.milestones.HALFWAY_BREAK_V1.contentVersion !==
        halfwayCheckpointContentVersion
  ) {
    return { ok: false };
  }

  const canonicalAttempt: LocalAssessmentAttempt = {
    ...attempt,
    localPersistStatus: "saved",
  };

  if (attempt.state !== "completed") {
    if (
      attempt.completionStatus === "completed" ||
      attempt.completedAt !== undefined
    ) {
      return { ok: false };
    }

    return { attempt: canonicalAttempt, ok: true };
  }

  try {
    const readiness = prepareAssessmentCompletion(
      assessment,
      canonicalAttempt,
    );

    if (
      readiness.evidenceStatus === "insufficient_evidence" ||
      !readiness.result.code ||
      !readiness.result.profileName
    ) {
      return { ok: false };
    }

    const completedAt = attempt.completedAt!;
    const resultSnapshot = {
      ...readiness.versionBundle,
      createdAt: completedAt,
      reportContentSnapshot: buildReportContentSnapshot({
        code: readiness.result.code,
        kind: assessment.mode,
        measurementVersion: coreResultCopyVersion,
      }),
      responseSnapshotHash: readiness.responseSnapshotHash,
      resultCopyVersion: coreResultCopyVersion,
      resultStatus: "ready" as const,
      scoreResult: readiness.result,
    };

    return {
      attempt: {
        ...canonicalAttempt,
        completionStatus: "completed",
        responseSnapshotHash: readiness.responseSnapshotHash,
        resultCopyVersion: coreResultCopyVersion,
        resultEvidenceStatus: readiness.evidenceStatus,
        resultSnapshot,
      },
      ok: true,
    };
  } catch {
    return { ok: false };
  }
}

function getOfficialAssessment(
  attempt: Pick<
    AccountAssessmentProgressAttempt,
    "assessmentId" | "releaseId"
  >,
): AssessmentDefinition | null {
  if (
    attempt.assessmentId === candidateQuickCoreAssessment.assessmentId &&
    attempt.releaseId === candidateQuickCoreAssessment.releaseId
  ) {
    return candidateQuickCoreAssessment;
  }

  if (
    attempt.assessmentId === candidateFullCoreAssessment.assessmentId &&
    attempt.releaseId === candidateFullCoreAssessment.releaseId
  ) {
    return candidateFullCoreAssessment;
  }

  return null;
}

function hasSameOrderedValues(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function hasValidDates(attempt: AccountAssessmentProgressAttempt) {
  const createdAt = Date.parse(attempt.createdAt);
  const updatedAt = Date.parse(attempt.updatedAt);
  const completedAt = attempt.completedAt
    ? Date.parse(attempt.completedAt)
    : null;

  return (
    createdAt <= updatedAt &&
    (completedAt === null ||
      (completedAt >= createdAt && completedAt <= updatedAt))
  );
}

export function selectVisibleAccountAttempts(
  entries: AccountAssessmentProgressEntry[],
) {
  const completed = entries.filter(
    (entry) => entry.attempt.state === "completed",
  );
  const activeByRelease = new Map<string, AccountAssessmentProgressEntry>();

  for (const entry of entries) {
    if (entry.attempt.state !== "in_progress") continue;
    const key = `${entry.attempt.assessmentId}:${entry.attempt.releaseId}`;
    const current = activeByRelease.get(key);

    if (!current || compareEntryRecency(entry, current) > 0) {
      activeByRelease.set(key, entry);
    }
  }

  return [...completed, ...activeByRelease.values()].sort((left, right) =>
    right.attempt.updatedAt.localeCompare(left.attempt.updatedAt),
  );
}

function compareEntryRecency(
  left: AccountAssessmentProgressEntry,
  right: AccountAssessmentProgressEntry,
) {
  if (left.serverUpdatedAt && right.serverUpdatedAt) {
    const serverOrder = left.serverUpdatedAt.localeCompare(
      right.serverUpdatedAt,
    );
    if (serverOrder !== 0) return serverOrder;
  }

  return compareAttemptRecency(left.attempt, right.attempt);
}

function compareAttemptRecency(
  left: LocalAssessmentAttempt,
  right: LocalAssessmentAttempt,
) {
  const updatedOrder = left.updatedAt.localeCompare(right.updatedAt);
  return updatedOrder !== 0
    ? updatedOrder
    : left.createdAt.localeCompare(right.createdAt);
}

function isRevisionConflict(error: { code?: string; message?: string }) {
  return (
    error.code === "40001" ||
    error.message?.includes("core_assessment_progress_revision_conflict") ===
      true
  );
}

function isDeletionTombstoneError(error: { code?: string; message?: string }) {
  return (
    error.code === "P0001" &&
    error.message?.includes("persisted_result_deleted") === true
  );
}

async function isPersistedResultDeleted({
  accountId,
  client,
  clientAttemptId,
}: {
  accountId: string;
  client: ServiceClient;
  clientAttemptId: string;
}) {
  const response = await client
    .schema("assessment")
    .from("result_deletion_tombstone")
    .select("local_result_id")
    .eq("account_id", accountId)
    .eq("result_kind", "core")
    .eq("local_result_id", clientAttemptId)
    .maybeSingle();

  return !response.error && Boolean(response.data);
}

async function readCurrentRevision({
  accountId,
  client,
  clientAttemptId,
}: {
  accountId: string;
  client: ServiceClient;
  clientAttemptId: string;
}) {
  const response = await client
    .schema("assessment")
    .from("account_assessment_progress")
    .select("revision")
    .eq("account_id", accountId)
    .eq("client_attempt_id", clientAttemptId)
    .is("deleted_at", null)
    .maybeSingle();

  if (response.error || !response.data) return null;
  const revision = Number((response.data as { revision?: unknown }).revision);
  return Number.isInteger(revision) && revision >= 1 ? revision : null;
}
