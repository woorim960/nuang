import type { CoreScoreResult, ResponseValue } from "@/lib/scoring/types";

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
  resultCopyVersion: string;
  resultStatus: "ready" | "insufficient_evidence";
  scoreResult: CoreScoreResult;
  scoringModelVersion: string;
  scoringReleaseId: string;
};

export type AssessmentCompletionStatus =
  "submitting" | "completed" | "insufficient_evidence" | "failed";

export type LocalAssessmentAttempt = {
  id: string;
  assessmentId: string;
  releaseId: string;
  mode: AssessmentMode;
  itemIds: string[];
  responses: Record<string, AssessmentAnswer>;
  currentIndex: number;
  state: LocalAttemptState;
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
