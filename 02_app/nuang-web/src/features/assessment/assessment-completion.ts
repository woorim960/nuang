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
} from "@/features/assessment/candidate-quick-core-seed";
import {
  candidateFullCoreAssessment,
  candidateFullScoringRelease,
} from "@/features/assessment/candidate-full-core-seed";
import {
  quickCoreAssessment,
  quickScoringRelease,
} from "@/features/assessment/quick-core-seed";
import {
  getAdaptiveItemsForDomains,
  getAssessmentRunItems,
  getAttemptAdaptiveItems,
  getDisplayedTieDomainIds,
} from "@/features/assessment/assessment-adaptive";
import type {
  AssessmentDefinition,
  AssessmentResultEvidenceStatus,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";
import {
  calculateCoreScore,
  isCoreResultUndetermined,
  resolveCoreDomainTies,
  scoreResponse,
} from "@/lib/scoring/core";
import type { CoreScoreResult, ItemResponse } from "@/lib/scoring/types";

export type AssessmentCompletionReadiness = {
  adaptiveDomainIds: string[];
  evidenceStatus: AssessmentResultEvidenceStatus;
  needsAdaptiveFollowUp: boolean;
  needsResponseReview: boolean;
  responseSnapshotHash: string;
  result: CoreScoreResult;
  versionBundle: {
    assessmentReleaseId: string;
    codeSchemeVersion: string;
    scoringModelVersion: string;
    scoringReleaseId: string;
  };
};

export class AssessmentCompletionError extends Error {
  constructor(
    public readonly code:
      | "ASSESSMENT_MISMATCH"
      | "INCOMPLETE_RESPONSE_SNAPSHOT"
      | "INVALID_RESPONSE_SNAPSHOT"
      | "RELEASE_MISMATCH"
      | "SNAPSHOT_NOT_PERSISTED"
      | "UNSUPPORTED_ASSESSMENT",
  ) {
    super(code);
    this.name = "AssessmentCompletionError";
  }
}

export function prepareAssessmentCompletion(
  assessment: AssessmentDefinition,
  attempt: LocalAssessmentAttempt,
): AssessmentCompletionReadiness {
  if (
    assessment.assessmentId !== attempt.assessmentId ||
    assessment.mode !== attempt.mode
  ) {
    throw new AssessmentCompletionError("ASSESSMENT_MISMATCH");
  }

  if (
    assessment.releaseId !== attempt.releaseId ||
    new Set(attempt.itemIds).size !== attempt.itemIds.length ||
    !hasSameOrderedItems(
      assessment.items.map((item) => item.itemId),
      attempt.itemIds,
    )
  ) {
    throw new AssessmentCompletionError("RELEASE_MISMATCH");
  }

  if (attempt.localPersistStatus !== "saved") {
    throw new AssessmentCompletionError("SNAPSHOT_NOT_PERSISTED");
  }

  const adaptiveItems = getAttemptAdaptiveItems(assessment, attempt);
  if (
    (attempt.adaptiveItemIds?.length ?? 0) !== adaptiveItems.length ||
    new Set(attempt.adaptiveItemIds ?? []).size !==
      (attempt.adaptiveItemIds?.length ?? 0)
  ) {
    throw new AssessmentCompletionError("RELEASE_MISMATCH");
  }

  const runItems = getAssessmentRunItems(assessment, attempt);
  const expectedItemIds = new Set(runItems.map((item) => item.itemId));
  const storedResponses = Object.entries(attempt.responses);

  if (
    storedResponses.length !== runItems.length ||
    storedResponses.some(
      ([itemId, response]) =>
        !expectedItemIds.has(itemId) || response.itemId !== itemId,
    )
  ) {
    throw new AssessmentCompletionError("INCOMPLETE_RESPONSE_SNAPSHOT");
  }

  const responses = assessment.items.map((item): ItemResponse => {
    const response = attempt.responses[item.itemId];

    if (
      !response ||
      (response.value === undefined && response.isUnsure !== true)
    ) {
      throw new AssessmentCompletionError("INCOMPLETE_RESPONSE_SNAPSHOT");
    }

    const isValidValue =
      response.value !== undefined &&
      Number.isInteger(response.value) &&
      response.value >= 1 &&
      response.value <= 5;
    const isValidUnsure =
      response.isUnsure === true && response.value === undefined;

    if (
      (!isValidValue && !isValidUnsure) ||
      (isValidValue && response.isUnsure === true)
    ) {
      throw new AssessmentCompletionError("INVALID_RESPONSE_SNAPSHOT");
    }

    return {
      isUnsure: response.isUnsure,
      itemId: response.itemId,
      value: response.value,
    };
  });
  const scoringRelease = getScoringRelease(assessment);

  if (scoringRelease.assessmentReleaseId !== assessment.releaseId) {
    throw new AssessmentCompletionError("RELEASE_MISMATCH");
  }

  const scoringItemIds = scoringRelease.items.map((item) => item.itemId);
  const scoringItemById = new Map(
    scoringRelease.items.map((item) => [item.itemId, item]),
  );

  if (
    !hasSameItems(
      assessment.items.map((item) => item.itemId),
      scoringItemIds,
    ) ||
    assessment.items.some((item) => {
      const scoringItem = scoringItemById.get(item.itemId);
      return (
        !scoringItem ||
        scoringItem.facetId !== item.facetId ||
        scoringItem.isReverse !== item.isReverse
      );
    })
  ) {
    throw new AssessmentCompletionError("RELEASE_MISMATCH");
  }

  const result = calculateCoreScore(scoringRelease, responses);
  const adaptiveDomainIds = getDisplayedTieDomainIds(result);
  const needsResponseReview = hasUniformCoreResponses(assessment, attempt);
  const expectedAdaptiveItems = getAdaptiveItemsForDomains(
    assessment,
    adaptiveDomainIds,
  );
  const needsAdaptiveFollowUp =
    !needsResponseReview &&
    adaptiveDomainIds.length > 0 &&
    adaptiveItems.length === 0 &&
    expectedAdaptiveItems.length > 0;

  if (
    adaptiveItems.length > 0 &&
    !hasSameOrderedItems(
      expectedAdaptiveItems.map((item) => item.itemId),
      adaptiveItems.map((item) => item.itemId),
    )
  ) {
    throw new AssessmentCompletionError("RELEASE_MISMATCH");
  }

  const resolvedResult =
    adaptiveItems.length > 0
      ? resolveCoreDomainTies(
          scoringRelease,
          result,
          adaptiveDomainIds.map((domainId) => {
            const votes = adaptiveItems
              .filter((item) => item.domainId === domainId)
              .map((item) => {
                const response = attempt.responses[item.itemId];

                if (
                  !response ||
                  response.isUnsure ||
                  response.value === undefined ||
                  response.value === 3
                ) {
                  throw new AssessmentCompletionError(
                    "INCOMPLETE_RESPONSE_SNAPSHOT",
                  );
                }

                return scoreResponse(response.value, item.isReverse) > 50
                  ? "high"
                  : "low";
              });

            return {
              domainId,
              highVotes: votes.filter((vote) => vote === "high").length,
              lowVotes: votes.filter((vote) => vote === "low").length,
            };
          }),
        )
      : result;
  const hasInsufficientDomain = resolvedResult.domains.some(
    (domain) => domain.status !== "valid" || !domain.symbol,
  );
  const isUndetermined = isCoreResultUndetermined(resolvedResult);
  const evidenceStatus: AssessmentResultEvidenceStatus = needsResponseReview
    ? "insufficient_evidence"
    : hasInsufficientDomain
      ? "insufficient_evidence"
      : needsAdaptiveFollowUp || isUndetermined
        ? "insufficient_evidence"
        : resolvedResult.domains.some((domain) => domain.isBoundary)
          ? "near_boundary"
          : "clear";

  if (resolvedResult.code && !resolvedResult.profileName) {
    throw new AssessmentCompletionError("RELEASE_MISMATCH");
  }

  return {
    adaptiveDomainIds,
    evidenceStatus,
    needsAdaptiveFollowUp,
    needsResponseReview,
    responseSnapshotHash: createResponseSnapshotHash(assessment, attempt),
    result: resolvedResult,
    versionBundle: {
      assessmentReleaseId: assessment.releaseId,
      codeSchemeVersion: scoringRelease.codeSchemeVersion,
      scoringModelVersion: scoringRelease.scoringModelVersion,
      scoringReleaseId: scoringRelease.scoringReleaseId,
    },
  };
}

/**
 * Detects an exact straight-line response pattern across the scored base items.
 *
 * The core item bank intentionally mixes direct and reverse-keyed statements.
 * Giving every statement the exact same answer can therefore create artificial
 * 50:50 domain scores. It is safer to ask the user to review those answers than
 * to treat the pattern as a genuine trait tie and launch adaptive questions.
 */
export function hasUniformCoreResponses(
  assessment: AssessmentDefinition,
  attempt: LocalAssessmentAttempt,
) {
  if (
    assessment.items.length < 5 ||
    !assessment.items.some((item) => item.isReverse) ||
    !assessment.items.some((item) => !item.isReverse)
  ) {
    return false;
  }

  const values = assessment.items.map((item) => {
    const response = attempt.responses[item.itemId];
    return response?.isUnsure === true ? undefined : response?.value;
  });

  return (
    values.every((value) => value !== undefined) && new Set(values).size === 1
  );
}

export function createResponseSnapshotHash(
  assessment: AssessmentDefinition,
  attempt: LocalAssessmentAttempt,
) {
  const canonicalSnapshot = getAssessmentRunItems(assessment, attempt)
    .map((item) => {
      const response = attempt.responses[item.itemId];
      return [
        item.itemId,
        response?.value ?? "",
        response?.isUnsure === true ? "1" : "0",
        response?.unsureReason ?? "",
        response?.answeredAt ?? "",
      ].join(":");
    })
    .join("|");

  return `fnv1a32x2:${fnv1a32x2(canonicalSnapshot)}`;
}

function getScoringRelease(assessment: AssessmentDefinition) {
  if (
    assessment.assessmentId === candidateFullCoreAssessment.assessmentId &&
    assessment.releaseId === candidateFullCoreAssessment.releaseId &&
    assessment.mode === candidateFullCoreAssessment.mode
  ) {
    return candidateFullScoringRelease;
  }

  if (
    assessment.assessmentId === candidateQuickCoreAssessment.assessmentId &&
    assessment.releaseId === candidateQuickCoreAssessment.releaseId &&
    assessment.mode === candidateQuickCoreAssessment.mode
  ) {
    return candidateQuickScoringRelease;
  }

  if (
    assessment.assessmentId === betaCoreAssessment.assessmentId &&
    assessment.mode === betaCoreAssessment.mode
  ) {
    return betaScoringRelease;
  }

  if (
    assessment.assessmentId === quickCoreAssessment.assessmentId &&
    assessment.mode === "quick"
  ) {
    return quickScoringRelease;
  }

  if (
    assessment.assessmentId === fullCoreAssessment.assessmentId &&
    assessment.mode === "full"
  ) {
    return fullScoringRelease;
  }

  throw new AssessmentCompletionError("UNSUPPORTED_ASSESSMENT");
}

function hasSameOrderedItems(expected: string[], actual: string[]) {
  return (
    expected.length === actual.length &&
    expected.every((itemId, index) => itemId === actual[index])
  );
}

function hasSameItems(expected: string[], actual: string[]) {
  if (expected.length !== actual.length) return false;
  const actualItems = new Set(actual);
  return expected.every((itemId) => actualItems.has(itemId));
}

function fnv1a32x2(value: string) {
  let first = 0x811c9dc5;
  let second = 0x811c9dc5 ^ 0x9e3779b9;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ (code + index), 0x01000193);
  }

  return [first, second]
    .map((hash) => (hash >>> 0).toString(16).padStart(8, "0"))
    .join("");
}
