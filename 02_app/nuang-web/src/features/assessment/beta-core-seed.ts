import betaItemSet from "../../../content-seed/items/core-beta-item-set.v1.0.json";
import betaAdaptiveItemSet from "../../../content-seed/items/core-beta-adaptive-item-set.v1.0.json";
import type { AssessmentDefinition } from "@/features/assessment/types";
import { nextNuangCodeScheme } from "@/features/nuang-code/next-code-scheme";
import { candidateProfileNames } from "@/features/nuang-code/candidate-profile-names";
import type { FacetDefinition, ScoringRelease } from "@/lib/scoring/types";

type BetaSourceItem = {
  construct_id: string;
  context_label: string;
  domain_id: string;
  item_id: string;
  keyed_direction: "HIGH" | "LOW";
  scoring_key: "direct" | "reverse";
  text_ko: string;
};

type BetaSourceItemSet = {
  assessment_release_id: string;
  baseOrder: string[];
  items: BetaSourceItem[];
  status: string;
};

type BetaAdaptiveSource = {
  assessment_release_id: string;
  items: Array<{
    construct_id: string;
    context_label: string;
    domain_id: string;
    item_id: string;
    scoring_key: "direct" | "reverse";
    text_ko: string;
  }>;
};

const source = betaItemSet as BetaSourceItemSet;
const adaptiveSource = betaAdaptiveItemSet as BetaAdaptiveSource;
const itemById = new Map(source.items.map((item) => [item.item_id, item]));
const facetLabels = new Map([
  ["SE-RE", "함께하는 에너지"],
  ["SE-AI", "먼저 표현하기"],
  ["OE-AE", "미적 경험"],
  ["OE-CI", "상상 확장"],
  ["OE-IE", "지적 탐구"],
  ["RO-EC", "관계에서 관심이 가는 곳"],
  ["SM-EP", "실행과 지속"],
  ["SM-OS", "질서와 구조"],
  ["ER-IR", "감정 동요"],
  ["ER-WD", "걱정과 주저"],
]);

export const betaCoreAssessment: AssessmentDefinition = {
  assessmentId: "nu-core-beta",
  releaseId: source.assessment_release_id,
  mode: "full",
  title: "정밀 코어",
  resultLabel: "정밀 성향 결과",
  estimatedMinutes: 10,
  items: source.baseOrder.map((itemId) => {
    const item = itemById.get(itemId);
    if (!item) throw new Error(`Missing beta core item: ${itemId}`);

    return {
      itemId: item.item_id,
      domainId: item.domain_id,
      facetId: item.construct_id,
      contextLabel: item.context_label,
      text: item.text_ko,
      isReverse: item.scoring_key === "reverse",
    };
  }),
  adaptiveItems: adaptiveSource.items.map((item) => ({
    itemId: item.item_id,
    domainId: item.domain_id,
    facetId: item.construct_id,
    contextLabel: item.context_label,
    text: item.text_ko,
    isReverse: item.scoring_key === "reverse",
    responseFormat: "forced_direction_4",
  })),
};

if (adaptiveSource.assessment_release_id !== betaCoreAssessment.releaseId) {
  throw new Error("Adaptive beta item release mismatch");
}

const betaFacetDefinitions: FacetDefinition[] = Array.from(
  new Set(source.items.map((item) => item.construct_id)),
).map((facetId) => ({
  facetId,
  label: facetLabels.get(facetId) ?? facetId,
  minValidResponses: 4,
}));

export const betaScoringRelease: ScoringRelease = {
  assessmentReleaseId: betaCoreAssessment.releaseId,
  scoringReleaseId: "NUANG-CORE-BETA-SCORING-1.0",
  scoringModelVersion: "CORE_SCORING_ALGORITHM_SPEC_v1.0-BETA",
  codeSchemeVersion: nextNuangCodeScheme.version,
  items: betaCoreAssessment.items.map((item) => ({
    itemId: item.itemId,
    facetId: item.facetId,
    isReverse: item.isReverse,
  })),
  facets: betaFacetDefinitions,
  domains: nextNuangCodeScheme.positions.map((position) => ({
    codePosition: position.codePosition,
    domainId: position.domainId,
    label: position.label,
    lowSymbol: position.lowSymbol,
    highSymbol: position.highSymbol,
    facetIds: position.publicFacetIds.filter((facetId) =>
      facetLabels.has(facetId),
    ),
  })),
  profileNames: candidateProfileNames,
};

export function isBetaCoreReleaseActive() {
  return false;
}
