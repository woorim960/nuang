import type { CoreScoreResult, ResponseValue } from "@/lib/scoring/types";
import type { ReportContentSnapshot } from "@/features/result/unified-core-report/report-content-snapshot-contract";

export type AssessmentMode = "quick" | "full";

export type AssessmentItem = {
  itemId: string;
  domainId: string;
  facetId: string;
  contextLabel?: string;
  text: string;
  isReverse: boolean;
  responseFormat?: "frequency_5" | "forced_direction_4";
};

export type AssessmentDefinition = {
  contentReleaseId?: string;
  assessmentId: string;
  releaseId: string;
  mode: AssessmentMode;
  title: string;
  resultLabel: string;
  estimatedMinutes: number;
  items: AssessmentItem[];
  adaptiveItems?: AssessmentItem[];
};

export type AssessmentAnswer = {
  itemId: string;
  value?: ResponseValue;
  isUnsure?: boolean;
  unsureReason?: AssessmentUnsureReason;
  answeredAt: string;
};

export type AssessmentUnsureReason =
  | "NO_EXPERIENCE"
  | "CONTEXT_VARIES"
  | "WORDING_UNCLEAR"
  | "PREFER_NOT_TO_ANSWER";

export type LocalPersistStatus = "idle" | "saving" | "saved" | "failed";

export type AssessmentAccountSyncStatus =
  | "failed"
  | "local_only"
  | "queued"
  | "rejected"
  | "synced"
  | "syncing";

export type AssessmentAccountSyncMetadata = {
  accountId?: string;
  lastAttemptedAt?: string;
  lastSyncedAt?: string;
  restoredAt?: string;
  revision?: number;
  status: AssessmentAccountSyncStatus;
};

export type AssessmentMilestoneId = "HALFWAY_BREAK_V1";

export type AssessmentMilestoneStatus = "shown" | "completed" | "deferred";

export type AssessmentMilestone = {
  id: AssessmentMilestoneId;
  status: AssessmentMilestoneStatus;
  contentVersion: string;
  shownAt: string;
  resolvedAt?: string;
};

export type LocalAttemptState = "in_progress" | "completed";

export type AssessmentResultEvidenceStatus =
  "clear" | "near_boundary" | "insufficient_evidence";

export type AssessmentResultSnapshot = {
  assessmentReleaseId: string;
  codeSchemeVersion: string;
  createdAt: string;
  responseSnapshotHash: string;
  reportContentSnapshot?: ReportContentSnapshot;
  resultCopyVersion: string;
  resultStatus: "ready" | "insufficient_evidence";
  scoreResult: CoreScoreResult;
  scoringModelVersion: string;
  scoringReleaseId: string;
};

export type AssessmentCompletionStatus =
  "submitting" | "completed" | "insufficient_evidence" | "failed";

export type LocalAssessmentAttempt = {
  assessmentContentReleaseId?: string;
  /** 시작 당시 문항·문구를 고정해 게시 중에도 같은 검사로 이어서 수행한다. */
  assessmentSnapshot?: AssessmentDefinition;
  id: string;
  assessmentId: string;
  releaseId: string;
  mode: AssessmentMode;
  itemIds: string[];
  responses: Record<string, AssessmentAnswer>;
  currentIndex: number;
  state: LocalAttemptState;
  accountSync?: AssessmentAccountSyncMetadata;
  localPersistStatus?: LocalPersistStatus;
  milestones?: Partial<Record<AssessmentMilestoneId, AssessmentMilestone>>;
  adaptiveItemIds?: string[];
  adaptiveStatus?: "intro" | "in_progress" | "completed";
  completionRequestId?: string;
  completionStatus?: AssessmentCompletionStatus;
  responseSnapshotHash?: string;
  resultEvidenceStatus?: AssessmentResultEvidenceStatus;
  resultSnapshot?: AssessmentResultSnapshot;
  resultCopyVersion?: string;
  returnDestination?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  expiresAt: string;
};
