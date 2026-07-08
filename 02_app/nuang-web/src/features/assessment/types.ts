import type { ResponseValue } from "@/lib/scoring/types";

export type AssessmentMode = "quick" | "full";

export type AssessmentItem = {
  itemId: string;
  domainId: string;
  facetId: string;
  text: string;
  isReverse: boolean;
};

export type AssessmentDefinition = {
  assessmentId: string;
  releaseId: string;
  mode: AssessmentMode;
  title: string;
  resultLabel: string;
  estimatedMinutes: number;
  items: AssessmentItem[];
};

export type AssessmentAnswer = {
  itemId: string;
  value?: ResponseValue;
  isUnsure?: boolean;
  answeredAt: string;
};

export type LocalAttemptState = "in_progress" | "completed";

export type LocalAssessmentAttempt = {
  id: string;
  assessmentId: string;
  releaseId: string;
  mode: AssessmentMode;
  itemIds: string[];
  responses: Record<string, AssessmentAnswer>;
  currentIndex: number;
  state: LocalAttemptState;
  resultCopyVersion?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  expiresAt: string;
};
