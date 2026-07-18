import {
  betaCoreAssessment,
  betaScoringRelease,
} from "@/features/assessment/beta-core-seed";
import type { AssessmentDefinition } from "@/features/assessment/types";
import type { ScoringRelease } from "@/lib/scoring/types";

/**
 * Local product-flow candidate only.
 *
 * This release lets the approved E/I · R/N · G/A · K/M · C/Q experience run
 * end-to-end without presenting the legacy code scheme. It is deliberately
 * versioned as CANDIDATE and must not be promoted to an active measurement
 * release before the quantitative scoring gates are complete.
 */
export const candidateQuickItemIds = [
  "NU-B1-001", // SE-RE · HIGH
  "NU-B1-032", // OE-AE · HIGH
  "NU-B1-003", // RO-EC · HIGH
  "NU-B1-034", // SM-EP · HIGH
  "NU-B1-045", // ER-IR · HIGH
  "NU-B1-056", // SE-AI · LOW
  "NU-B1-017", // OE-CI · LOW
  "NU-B1-023", // RO-EC · LOW
  "NU-B1-058", // SM-OS · LOW
  "NU-B1-019", // ER-WD · LOW
  "NU-B1-051", // SE-RE · LOW
  "NU-B1-050", // OE-IE · HIGH
  "NU-B1-033", // RO-EC · HIGH
  "NU-B1-024", // SM-EP · LOW
  "NU-B1-055", // ER-IR · LOW
  "NU-B1-036", // SE-AI · HIGH
  "NU-B1-022", // OE-AE · LOW
  "NU-B1-047", // OE-CI · HIGH
  "NU-B1-053", // RO-EC · LOW
  "NU-B1-008", // SM-OS · HIGH
  "NU-B1-009", // ER-WD · HIGH
  "NU-B1-020", // OE-IE · LOW
] as const;

const betaItemById = new Map(
  betaCoreAssessment.items.map((item) => [item.itemId, item]),
);
const candidateQuickItems = candidateQuickItemIds.map((itemId) => {
  const item = betaItemById.get(itemId);

  if (!item) {
    throw new Error(`Missing candidate quick-core source item: ${itemId}`);
  }

  return item;
});

export const candidateQuickCoreAssessment: AssessmentDefinition = {
  assessmentId: "nu-core-quick",
  releaseId: "NUANG-CORE-QUICK-CANDIDATE-1.0",
  mode: "quick",
  title: "빠른 코어",
  resultLabel: "첫 성향 결과",
  estimatedMinutes: 3,
  items: candidateQuickItems,
  adaptiveItems: betaCoreAssessment.adaptiveItems,
};

const selectedFacetIds = new Set(
  candidateQuickCoreAssessment.items.map((item) => item.facetId),
);

export const candidateQuickScoringRelease: ScoringRelease = {
  assessmentReleaseId: candidateQuickCoreAssessment.releaseId,
  scoringReleaseId: "NUANG-CORE-QUICK-CANDIDATE-SCORING-1.0",
  scoringModelVersion: "CORE_SCORING_ALGORITHM_SPEC_v1.0-CANDIDATE",
  codeSchemeVersion: betaScoringRelease.codeSchemeVersion,
  items: candidateQuickCoreAssessment.items.map((item) => ({
    itemId: item.itemId,
    facetId: item.facetId,
    isReverse: item.isReverse,
  })),
  facets: betaScoringRelease.facets
    .filter((facet) => selectedFacetIds.has(facet.facetId))
    .map((facet) => ({
      ...facet,
      minValidResponses: facet.facetId === "RO-EC" ? 2 : 1,
    })),
  domains: betaScoringRelease.domains,
  profileNames: betaScoringRelease.profileNames,
};

export function isCandidateQuickRelease(attempt: {
  assessmentId: string;
  releaseId: string;
  mode: string;
}) {
  return (
    attempt.assessmentId === candidateQuickCoreAssessment.assessmentId &&
    attempt.releaseId === candidateQuickCoreAssessment.releaseId &&
    attempt.mode === candidateQuickCoreAssessment.mode
  );
}
