import type {
  AssessmentDefinition,
  AssessmentItem,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";
import type { CoreScoreResult } from "@/lib/scoring/types";

export const adaptiveItemsPerDomain = 3;
const publicPairByDomain: Record<string, string> = {
  SE: "E/I",
  OE: "R/N",
  RO: "G/A",
  SM: "K/M",
  ER: "C/Q",
};

export function getDisplayedTieDomainIds(result: CoreScoreResult) {
  return result.domains
    .filter(
      (domain) =>
        domain.status === "valid" &&
        domain.score !== null &&
        Math.round(domain.score) === 50,
    )
    .map((domain) => domain.domainId);
}

export function getAdaptiveItemsForDomains(
  assessment: AssessmentDefinition,
  domainIds: string[],
) {
  const requestedDomains = new Set(domainIds);
  const items = (assessment.adaptiveItems ?? []).filter((item) =>
    requestedDomains.has(item.domainId),
  );

  if (
    requestedDomains.size === 0 ||
    domainIds.some(
      (domainId) =>
        items.filter((item) => item.domainId === domainId).length !==
        adaptiveItemsPerDomain,
    )
  ) {
    return [];
  }

  return items;
}

export function getAttemptAdaptiveItems(
  assessment: AssessmentDefinition,
  attempt: LocalAssessmentAttempt,
) {
  const itemById = new Map(
    (assessment.adaptiveItems ?? []).map((item) => [item.itemId, item]),
  );

  return (attempt.adaptiveItemIds ?? [])
    .map((itemId) => itemById.get(itemId))
    .filter((item): item is AssessmentItem => Boolean(item));
}

export function getAssessmentRunItems(
  assessment: AssessmentDefinition,
  attempt: LocalAssessmentAttempt,
) {
  return [...assessment.items, ...getAttemptAdaptiveItems(assessment, attempt)];
}

export function getAttemptAdaptiveAxisLabels(
  assessment: AssessmentDefinition,
  attempt: LocalAssessmentAttempt,
) {
  return Array.from(
    new Set(
      getAttemptAdaptiveItems(assessment, attempt).map(
        (item) => publicPairByDomain[item.domainId] ?? item.domainId,
      ),
    ),
  );
}
