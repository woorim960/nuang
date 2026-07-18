import type {
  AssessmentDefinition,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";

export const halfwayCheckpointId = "HALFWAY_BREAK_V1" as const;
export const halfwayCheckpointContentVersion = "midpoint-copy-motion.v2";

export function getHalfwayThreshold(totalItemCount: number) {
  return Math.ceil(totalItemCount / 2);
}

export function getCompletedResponseCount(
  attempt: LocalAssessmentAttempt,
  assessment: AssessmentDefinition,
) {
  const assessmentItemIds = new Set(
    assessment.items.map((item) => item.itemId),
  );
  return Object.keys(attempt.responses).filter((itemId) =>
    assessmentItemIds.has(itemId),
  ).length;
}

export function shouldShowHalfwayCheckpoint(
  attempt: LocalAssessmentAttempt,
  assessment: AssessmentDefinition,
) {
  if (assessment.mode !== "full" || attempt.state !== "in_progress") {
    return false;
  }

  const milestone = attempt.milestones?.[halfwayCheckpointId];
  if (milestone) return milestone.status === "shown";

  return (
    getCompletedResponseCount(attempt, assessment) >=
    getHalfwayThreshold(assessment.items.length)
  );
}

export function hasResolvedHalfwayCheckpoint(attempt: LocalAssessmentAttempt) {
  const status = attempt.milestones?.[halfwayCheckpointId]?.status;
  return status === "completed" || status === "deferred";
}
