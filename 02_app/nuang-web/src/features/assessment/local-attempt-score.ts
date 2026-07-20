import {
  betaCoreAssessment,
  betaScoringRelease,
} from "@/features/assessment/beta-core-seed";
import {
  candidateFullScoringRelease,
  isCandidateFullRelease,
} from "@/features/assessment/candidate-full-core-seed";
import {
  candidateQuickScoringRelease,
  isCandidateQuickRelease,
} from "@/features/assessment/candidate-quick-core-seed";
import {
  fullCoreAssessment,
  fullScoringRelease,
} from "@/features/assessment/full-core-seed";
import {
  quickCoreAssessment,
  quickScoringRelease,
} from "@/features/assessment/quick-core-seed";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { calculateCoreScore } from "@/lib/scoring/core";
import type { ScoringRelease } from "@/lib/scoring/types";

type AssessmentReleaseIdentity = Pick<
  LocalAssessmentAttempt,
  "assessmentId" | "mode" | "releaseId"
>;

/**
 * Resolves the exact scoring release that produced an attempt.
 *
 * Assessment ids are intentionally reused between product releases, so using
 * only `assessmentId` can silently score current E/I · R/N · G/A · K/M · C/Q
 * answers with the retired five-axis model.
 */
export function getScoringReleaseForAttempt(
  attempt: AssessmentReleaseIdentity,
): ScoringRelease | null {
  if (isCandidateFullRelease(attempt)) return candidateFullScoringRelease;
  if (isCandidateQuickRelease(attempt)) return candidateQuickScoringRelease;

  if (
    attempt.assessmentId === betaCoreAssessment.assessmentId &&
    attempt.releaseId === betaCoreAssessment.releaseId &&
    attempt.mode === betaCoreAssessment.mode
  ) {
    return betaScoringRelease;
  }

  if (
    attempt.assessmentId === fullCoreAssessment.assessmentId &&
    attempt.releaseId === fullCoreAssessment.releaseId &&
    attempt.mode === fullCoreAssessment.mode
  ) {
    return fullScoringRelease;
  }

  if (
    attempt.assessmentId === quickCoreAssessment.assessmentId &&
    attempt.releaseId === quickCoreAssessment.releaseId &&
    attempt.mode === quickCoreAssessment.mode
  ) {
    return quickScoringRelease;
  }

  return null;
}

export function calculateLocalAttemptScore(attempt: LocalAssessmentAttempt) {
  const snapshot = attempt.resultSnapshot;

  if (
    snapshot?.assessmentReleaseId === attempt.releaseId &&
    snapshot.scoreResult
  ) {
    return snapshot.scoreResult;
  }

  const scoringRelease = getScoringReleaseForAttempt(attempt);
  if (!scoringRelease) return null;

  return calculateCoreScore(
    scoringRelease,
    Object.values(attempt.responses).map((response) => ({
      isUnsure: response.isUnsure,
      itemId: response.itemId,
      value: response.value,
    })),
  );
}
