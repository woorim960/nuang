import fullItemSet from "../../../content-seed/items/core-public-item-set-provisional.v0.9.json";
import type { AssessmentDefinition } from "@/features/assessment/types";
import {
  buildFacetDefinitions,
  coreDomainDefinitions,
  profileNames,
} from "@/features/assessment/quick-core-seed";
import type { ScoringRelease } from "@/lib/scoring/types";

type SourceItem = {
  item_id: string;
  domain_id: string;
  construct_id: string;
  text_ko: string;
  scoring_key: "direct" | "reverse";
};

type SourceItemSet = {
  item_set_id: string;
  item_set_version: string;
  status: string;
  baseOrder: string[];
  items: SourceItem[];
};

const source = fullItemSet as SourceItemSet;
const itemById = new Map(source.items.map((item) => [item.item_id, item]));

export const fullCoreAssessment: AssessmentDefinition = {
  assessmentId: "nu-core-full",
  releaseId: "NUANG-CORE-FULL-0.9",
  mode: "full",
  title: "정밀 코어",
  resultLabel: "현재 가장 가까운 대표 성향",
  estimatedMinutes: 10,
  items: source.baseOrder.map((itemId) => {
    const item = itemById.get(itemId);
    if (!item) {
      throw new Error(`Missing full core item: ${itemId}`);
    }

    return {
      itemId: item.item_id,
      domainId: item.domain_id,
      facetId: item.construct_id,
      text: item.text_ko,
      isReverse: item.scoring_key === "reverse",
    };
  }),
};

export const fullScoringRelease: ScoringRelease = {
  items: fullCoreAssessment.items.map((item) => ({
    itemId: item.itemId,
    facetId: item.facetId,
    isReverse: item.isReverse,
  })),
  facets: buildFacetDefinitions(4),
  domains: coreDomainDefinitions,
  profileNames,
};
