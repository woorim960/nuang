import { createResponseSnapshotHash } from "@/features/assessment/assessment-completion";
import {
  fullCoreAssessment,
  fullScoringRelease,
} from "@/features/assessment/full-core-seed";
import {
  betaCoreAssessment,
  betaScoringRelease,
} from "@/features/assessment/beta-core-seed";
import {
  candidateQuickCoreAssessment,
  candidateQuickScoringRelease,
  isCandidateQuickRelease,
} from "@/features/assessment/candidate-quick-core-seed";
import {
  candidateFullCoreAssessment,
  candidateFullScoringRelease,
  isCandidateFullRelease,
} from "@/features/assessment/candidate-full-core-seed";
import {
  quickCoreAssessment,
  quickScoringRelease,
} from "@/features/assessment/quick-core-seed";
import type {
  AssessmentDefinition,
  AssessmentResultSnapshot,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";
import { coreResultCopyVersion } from "@/features/result/report-copy";
import type { ScoringRelease } from "@/lib/scoring/types";

type SupportedResultRelease = {
  assessment: AssessmentDefinition;
  scoring: ScoringRelease;
};

export function getValidatedLocalResultSnapshot(
  attempt: LocalAssessmentAttempt,
): AssessmentResultSnapshot | null {
  const snapshot = attempt.resultSnapshot;
  const supported = getSupportedResultRelease(attempt);

  if (
    !snapshot ||
    !supported ||
    attempt.state !== "completed" ||
    attempt.completionStatus !== "completed" ||
    snapshot.resultStatus !== "ready" ||
    attempt.resultEvidenceStatus === "insufficient_evidence" ||
    attempt.releaseId !== snapshot.assessmentReleaseId ||
    attempt.releaseId !== supported.assessment.releaseId ||
    snapshot.assessmentReleaseId !== supported.scoring.assessmentReleaseId ||
    attempt.responseSnapshotHash !== snapshot.responseSnapshotHash ||
    createResponseSnapshotHash(supported.assessment, attempt) !==
      snapshot.responseSnapshotHash ||
    attempt.resultCopyVersion !== snapshot.resultCopyVersion ||
    snapshot.resultCopyVersion !== coreResultCopyVersion ||
    snapshot.scoringReleaseId !== supported.scoring.scoringReleaseId ||
    snapshot.scoringModelVersion !== supported.scoring.scoringModelVersion ||
    snapshot.codeSchemeVersion !== supported.scoring.codeSchemeVersion
  ) {
    return null;
  }

  const result = snapshot.scoreResult;
  const isCandidateResult =
    attempt.assessmentId === betaCoreAssessment.assessmentId ||
    isCandidateQuickRelease(attempt) ||
    isCandidateFullRelease(attempt);
  const orderedSymbols = supported.scoring.domains.map((domain) => {
    const score = result.domains.find(
      (candidate) => candidate.domainId === domain.domainId,
    );
    return score?.status === "valid" ? score.symbol : null;
  });

  if (
    !result.code ||
    !result.profileName ||
    result.domains.length !== supported.scoring.domains.length ||
    result.facets.length !== supported.scoring.facets.length ||
    orderedSymbols.some((symbol) => !symbol) ||
    orderedSymbols.join("") !== result.code ||
    (!isCandidateResult &&
      supported.scoring.profileNames[result.code] !== result.profileName) ||
    (isCandidateResult && !supported.scoring.profileNames[result.code]) ||
    result.alternativeCodes.some(
      (alternativeCode) => !supported.scoring.profileNames[alternativeCode],
    )
  ) {
    return null;
  }

  return snapshot;
}

function getSupportedResultRelease(
  attempt: LocalAssessmentAttempt,
): SupportedResultRelease | null {
  if (isCandidateFullRelease(attempt)) {
    return {
      assessment: candidateFullCoreAssessment,
      scoring: candidateFullScoringRelease,
    };
  }

  if (isCandidateQuickRelease(attempt)) {
    return {
      assessment: candidateQuickCoreAssessment,
      scoring: candidateQuickScoringRelease,
    };
  }

  if (
    attempt.assessmentId === betaCoreAssessment.assessmentId &&
    attempt.mode === betaCoreAssessment.mode
  ) {
    return {
      assessment: betaCoreAssessment,
      scoring: betaScoringRelease,
    };
  }

  if (
    attempt.assessmentId === quickCoreAssessment.assessmentId &&
    attempt.mode === quickCoreAssessment.mode
  ) {
    return {
      assessment: quickCoreAssessment,
      scoring: quickScoringRelease,
    };
  }

  if (
    attempt.assessmentId === fullCoreAssessment.assessmentId &&
    attempt.mode === fullCoreAssessment.mode
  ) {
    return {
      assessment: fullCoreAssessment,
      scoring: fullScoringRelease,
    };
  }

  return null;
}
