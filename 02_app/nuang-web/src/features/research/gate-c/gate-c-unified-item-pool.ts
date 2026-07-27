import type { SupabaseClient } from "@supabase/supabase-js";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import {
  candidateQuickCoreAssessment,
  candidateQuickItemIds,
} from "@/features/assessment/candidate-quick-core-seed";
import type { AssessmentItem } from "@/features/assessment/types";
import type { GateCParticipantItem } from "@/features/research/gate-c/gate-c-study-contract";

export const gateCUnifiedProtocolVersion =
  "GATE-C-UNIFIED-ITEM-VALIDATION-2026-07-24";
export const gateCUnifiedPoolVersion =
  "NUANG-CORE-QUICK-FULL-CANDIDATE-MIXED-1.0";
export const gateCCandidateBankId = "NUANG-CORE-CANDIDATE-BANK-M03-150";

export const gateCUnifiedSourceKinds = [
  "quick_current",
  "full_current",
  "candidate",
] as const;

export type GateCUnifiedSourceKind = (typeof gateCUnifiedSourceKinds)[number];

export type GateCAssignedItem = GateCParticipantItem & {
  domainId: string;
  facetId: string;
  sourceKind: GateCUnifiedSourceKind;
};

type CandidateRevisionRow = {
  context_label: string;
  domain_id: string;
  facet_id: string;
  item_revision_id: string;
  metadata: { selectedForBeta?: boolean } | null;
  prompt_text: string;
};

const emptyProbes = {
  access: "",
  comprehension: "",
  desirability: "",
  judgment: "",
  recall: "",
  responseSelection: "",
  seam: "",
};

const quickItemIds = new Set<string>(candidateQuickItemIds);
const currentQuickItems = candidateQuickCoreAssessment.items.map((item) =>
  fromAssessmentItem(item, "quick_current"),
);
const currentFullOnlyItems = candidateFullCoreAssessment.items
  .filter((item) => !quickItemIds.has(item.itemId))
  .map((item) => fromAssessmentItem(item, "full_current"));
const currentItemTextKeys = new Set(
  candidateFullCoreAssessment.items.map((item) =>
    createTextKey(item.contextLabel ?? "", item.text),
  ),
);

export async function createUnifiedGateCAssignment({
  client,
  exposureCounts = new Map<string, number>(),
  random = Math.random,
}: {
  client: SupabaseClient;
  exposureCounts?: Map<string, number>;
  random?: () => number;
}) {
  const candidateItems = await loadCandidateResearchItems(client);
  const buckets = [
    { count: 4, items: currentQuickItems },
    { count: 4, items: currentFullOnlyItems },
    {
      count: candidateItems.length >= 4 ? 4 : 0,
      items: candidateItems,
    },
  ];

  if (candidateItems.length < 4) {
    buckets[1].count = 8;
  }

  const selected = buckets.flatMap((bucket) =>
    selectBalancedItems({
      count: bucket.count,
      exposureCounts,
      items: bucket.items,
      random,
    }),
  );

  if (selected.length !== 12) {
    throw new Error(
      `Expected 12 unified Gate C items, received ${selected.length}`,
    );
  }

  return selected
    .sort(() => random() - 0.5)
    .map((item, index) => ({ ...item, orderIndex: index + 1 }));
}

export async function loadCandidateResearchItems(client: SupabaseClient) {
  try {
    const assessmentClient = client.schema("assessment");
    const memberResponse = await assessmentClient
      .from("item_release_member")
      .select("item_revision_id")
      .eq("item_bank_release_id", gateCCandidateBankId)
      .limit(200);

    if (memberResponse.error) return [];

    const revisionIds = (memberResponse.data ?? []).flatMap((row) => {
      const itemRevisionId = (row as { item_revision_id?: unknown })
        .item_revision_id;
      return typeof itemRevisionId === "string" ? [itemRevisionId] : [];
    });
    if (revisionIds.length === 0) return [];

    const revisionResponse = await assessmentClient
      .from("item_revision")
      .select(
        "item_revision_id,domain_id,facet_id,context_label,prompt_text,metadata",
      )
      .in("item_revision_id", revisionIds)
      .limit(200);

    if (revisionResponse.error) return [];

    return ((revisionResponse.data ?? []) as CandidateRevisionRow[])
      .filter((row) => row.metadata?.selectedForBeta !== true)
      .filter(
        (row) =>
          !currentItemTextKeys.has(
            createTextKey(row.context_label, row.prompt_text),
          ),
      )
      .map((row): GateCAssignedItem => ({
        contextLabel: row.context_label,
        domainId: row.domain_id,
        facetId: row.facet_id,
        orderIndex: 0,
        probes: emptyProbes,
        promptText: row.prompt_text,
        sourceKind: "candidate",
        studyItemId: row.item_revision_id,
      }));
  } catch {
    return [];
  }
}

export function selectBalancedItems({
  count,
  exposureCounts,
  items,
  random,
}: {
  count: number;
  exposureCounts: Map<string, number>;
  items: GateCAssignedItem[];
  random: () => number;
}) {
  const available = items
    .map((item) => ({ item, tieBreaker: random() }))
    .sort((left, right) => {
      const exposureDifference =
        (exposureCounts.get(left.item.studyItemId) ?? 0) -
        (exposureCounts.get(right.item.studyItemId) ?? 0);
      return exposureDifference || left.tieBreaker - right.tieBreaker;
    });
  const selected: GateCAssignedItem[] = [];
  const usedDomains = new Set<string>();

  while (selected.length < count && available.length > 0) {
    const diverseIndex = available.findIndex(
      ({ item }) => !usedDomains.has(item.domainId),
    );
    const index = diverseIndex >= 0 ? diverseIndex : 0;
    const [{ item }] = available.splice(index, 1);
    selected.push(item);
    usedDomains.add(item.domainId);

    if (usedDomains.size >= 5) usedDomains.clear();
  }

  return selected;
}

function fromAssessmentItem(
  item: AssessmentItem,
  sourceKind: Exclude<GateCUnifiedSourceKind, "candidate">,
): GateCAssignedItem {
  return {
    contextLabel: item.contextLabel ?? "평소의 모습을 떠올릴 때",
    domainId: item.domainId,
    facetId: item.facetId,
    orderIndex: 0,
    probes: emptyProbes,
    promptText: item.text,
    sourceKind,
    studyItemId: item.itemId,
  };
}

function createTextKey(contextLabel: string, promptText: string) {
  return `${contextLabel.trim()}::${promptText.trim()}`;
}
