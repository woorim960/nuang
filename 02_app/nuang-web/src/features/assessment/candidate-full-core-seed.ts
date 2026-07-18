import {
  betaCoreAssessment,
  betaScoringRelease,
} from "@/features/assessment/beta-core-seed";
import type { AssessmentDefinition } from "@/features/assessment/types";
import type { ScoringRelease } from "@/lib/scoring/types";

/** Development-only product binding for the new five-axis full assessment. */
export const candidateFullCoreAssessment: AssessmentDefinition = {
  ...betaCoreAssessment,
  assessmentId: "nu-core-full",
  releaseId: "NUANG-CORE-FULL-CANDIDATE-1.0",
};

export const candidateFullScoringRelease: ScoringRelease = {
  ...betaScoringRelease,
  assessmentReleaseId: candidateFullCoreAssessment.releaseId,
  scoringReleaseId: "NUANG-CORE-FULL-CANDIDATE-SCORING-1.0",
};

export function isCandidateFullRelease(attempt: {
  assessmentId: string;
  releaseId: string;
  mode: string;
}) {
  return (
    attempt.assessmentId === candidateFullCoreAssessment.assessmentId &&
    attempt.releaseId === candidateFullCoreAssessment.releaseId &&
    attempt.mode === candidateFullCoreAssessment.mode
  );
}
