import type { SupabaseClient } from "@supabase/supabase-js";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import { gateCFormIds } from "@/features/research/gate-c/gate-c-study-contract";
import {
  evaluateGateCCandidatePromotion,
  type GateCCandidatePromotionGate,
} from "@/features/research/gate-c/gate-c-candidate-promotion-policy";
import type { GateCUnifiedSourceKind } from "@/features/research/gate-c/gate-c-unified-item-pool";
import { gateCParticipantDefinitions } from "@/features/research/gate-c/gate-c-study-fixture";

export type GateCAnalysisSourceKind = GateCUnifiedSourceKind | "legacy_fixed";

export type GateCReviewQueueRow = {
  candidateSetId: string;
  contextLabel: string | null;
  domainId: string | null;
  facetId: string | null;
  metrics: {
    confusionFlagRate?: number;
    medianFirstAnswerMs?: number | null;
    responseChangeRate?: number;
    unsureRate?: number;
    wordingUnclearRate?: number;
  };
  observationCount: number;
  promotionGate: GateCCandidatePromotionGate;
  promptText: string | null;
  publicationState: "review_only";
  protocolVersion: string;
  reasonCodes: string[];
  recommendationStatus: "insufficient_data" | "monitor" | "review_required";
  sourceKind: GateCAnalysisSourceKind;
  studyItemId: string;
  updatedAt: string;
};

export type GateCAnalysisDashboardData = {
  formCompletionCounts: Record<(typeof gateCFormIds)[number], number>;
  generatedAt: string | null;
  sessionCounts: {
    completed: number;
    excluded: number;
    included: number;
    started: number;
  };
  queue: GateCReviewQueueRow[];
  queueCounts: {
    insufficientData: number;
    monitor: number;
    reviewRequired: number;
  };
  sourceItemCounts: Record<GateCAnalysisSourceKind, number>;
};

type SessionRow = {
  form_id: (typeof gateCFormIds)[number];
  quality_status: "excluded" | "included" | "pending";
  status: "completed" | "started";
};

type QueueDbRow = {
  candidate_set_id: string;
  metrics: unknown;
  observation_count: number;
  protocol_version: string;
  reason_codes: unknown;
  recommendation_status: GateCReviewQueueRow["recommendationStatus"];
  study_item_id: string;
  updated_at: string;
};

type ResearchItemDescriptor = {
  contextLabel: string;
  domainId: string | null;
  facetId: string | null;
  promptText: string;
};

type CandidateRevisionRow = {
  context_label: string;
  domain_id: string;
  facet_id: string;
  item_revision_id: string;
  prompt_text: string;
};

const localItemCatalog = createLocalItemCatalog();

export async function readGateCAnalysisDashboard(
  client: SupabaseClient,
): Promise<GateCAnalysisDashboardData> {
  const [snapshotResponse, queueResponse, sessionResponse] = await Promise.all([
    client
      .from("research_gate_c_analysis_snapshot")
      .select("generated_at")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("research_gate_c_item_review_queue")
      .select(
        "protocol_version,candidate_set_id,study_item_id,observation_count,recommendation_status,reason_codes,metrics,updated_at",
      )
      .limit(250),
    client
      .from("research_gate_c_session")
      .select("form_id,status,quality_status")
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  if (snapshotResponse.error) throw snapshotResponse.error;
  if (queueResponse.error) throw queueResponse.error;
  if (sessionResponse.error) throw sessionResponse.error;

  const sessions = (sessionResponse.data ?? []) as SessionRow[];
  const queueRows = (queueResponse.data ?? []) as QueueDbRow[];
  const itemCatalog = await readResearchItemCatalog(
    client,
    queueRows.map((row) => row.study_item_id),
  );
  const queue = queueRows
    .map((row) => mapQueueRow(row, itemCatalog.get(row.study_item_id)))
    .sort(
      (left, right) =>
        recommendationPriority(left.recommendationStatus) -
          recommendationPriority(right.recommendationStatus) ||
        left.studyItemId.localeCompare(right.studyItemId),
    );
  const formCompletionCounts = Object.fromEntries(
    gateCFormIds.map((formId) => [
      formId,
      sessions.filter(
        (session) =>
          session.form_id === formId && session.status === "completed",
      ).length,
    ]),
  ) as GateCAnalysisDashboardData["formCompletionCounts"];

  return {
    formCompletionCounts,
    generatedAt:
      (snapshotResponse.data as { generated_at?: string } | null)
        ?.generated_at ?? null,
    queue,
    queueCounts: {
      insufficientData: queue.filter(
        (row) => row.recommendationStatus === "insufficient_data",
      ).length,
      monitor: queue.filter((row) => row.recommendationStatus === "monitor")
        .length,
      reviewRequired: queue.filter(
        (row) => row.recommendationStatus === "review_required",
      ).length,
    },
    sourceItemCounts: {
      candidate: queue.filter((row) => row.sourceKind === "candidate").length,
      full_current: queue.filter((row) => row.sourceKind === "full_current")
        .length,
      legacy_fixed: queue.filter((row) => row.sourceKind === "legacy_fixed")
        .length,
      quick_current: queue.filter((row) => row.sourceKind === "quick_current")
        .length,
    },
    sessionCounts: {
      completed: sessions.filter((session) => session.status === "completed")
        .length,
      excluded: sessions.filter(
        (session) =>
          session.status === "completed" &&
          session.quality_status === "excluded",
      ).length,
      included: sessions.filter(
        (session) =>
          session.status === "completed" &&
          session.quality_status === "included",
      ).length,
      started: sessions.length,
    },
  };
}

function mapQueueRow(
  row: QueueDbRow,
  descriptor?: ResearchItemDescriptor,
): GateCReviewQueueRow {
  const metrics = isRecord(row.metrics) ? row.metrics : {};
  const sourceKind = readSourceKind(metrics.sourceKind);
  const confusionFlagRate = readNumber(metrics.confusionFlagRate) ?? 0;
  const medianFirstAnswerMs = readNumber(metrics.medianFirstAnswerMs) ?? null;
  const responseChangeRate = readNumber(metrics.responseChangeRate) ?? 0;
  const unsureRate = readNumber(metrics.unsureRate) ?? 0;
  const wordingUnclearRate = readNumber(metrics.wordingUnclearRate) ?? 0;

  return {
    candidateSetId: row.candidate_set_id,
    contextLabel: descriptor?.contextLabel ?? null,
    domainId: descriptor?.domainId ?? null,
    facetId: descriptor?.facetId ?? null,
    metrics: {
      confusionFlagRate,
      medianFirstAnswerMs,
      responseChangeRate,
      unsureRate,
      wordingUnclearRate,
    },
    observationCount: row.observation_count,
    promotionGate: evaluateGateCCandidatePromotion({
      confusionFlagRate,
      medianFirstAnswerMs,
      observationCount: row.observation_count,
      responseChangeRate,
      sourceKind,
      unsureRate,
      wordingUnclearRate,
    }),
    promptText: descriptor?.promptText ?? null,
    publicationState: "review_only",
    protocolVersion: row.protocol_version,
    reasonCodes: Array.isArray(row.reason_codes)
      ? row.reason_codes.filter(
          (code): code is string => typeof code === "string",
        )
      : [],
    recommendationStatus: row.recommendation_status,
    sourceKind,
    studyItemId: row.study_item_id,
    updatedAt: row.updated_at,
  };
}

async function readResearchItemCatalog(
  client: SupabaseClient,
  studyItemIds: string[],
) {
  const catalog = new Map(localItemCatalog);
  const unresolvedIds = [...new Set(studyItemIds)].filter(
    (itemId) => !catalog.has(itemId),
  );
  if (unresolvedIds.length === 0) return catalog;

  try {
    const response = await client
      .schema("assessment")
      .from("item_revision")
      .select("item_revision_id,domain_id,facet_id,context_label,prompt_text")
      .in("item_revision_id", unresolvedIds)
      .limit(250);

    if (response.error) return catalog;
    for (const row of (response.data ?? []) as CandidateRevisionRow[]) {
      catalog.set(row.item_revision_id, {
        contextLabel: row.context_label,
        domainId: row.domain_id,
        facetId: row.facet_id,
        promptText: row.prompt_text,
      });
    }
  } catch {
    return catalog;
  }

  return catalog;
}

function createLocalItemCatalog() {
  const catalog = new Map<string, ResearchItemDescriptor>();
  const currentItemsByText = new Map(
    candidateFullCoreAssessment.items.map((item) => [
      createItemTextKey(item.contextLabel ?? "", item.text),
      item,
    ]),
  );

  for (const item of candidateFullCoreAssessment.items) {
    catalog.set(item.itemId, {
      contextLabel: item.contextLabel ?? "",
      domainId: item.domainId,
      facetId: item.facetId,
      promptText: item.text,
    });
  }

  for (const definition of Object.values(gateCParticipantDefinitions)) {
    for (const item of definition.items) {
      const currentItem = currentItemsByText.get(
        createItemTextKey(item.contextLabel, item.promptText),
      );
      catalog.set(item.studyItemId, {
        contextLabel: item.contextLabel,
        domainId: currentItem?.domainId ?? null,
        facetId: currentItem?.facetId ?? null,
        promptText: item.promptText,
      });
    }
  }

  return catalog;
}

function createItemTextKey(contextLabel: string, promptText: string) {
  return `${contextLabel.trim()}::${promptText.trim()}`;
}

function recommendationPriority(
  status: GateCReviewQueueRow["recommendationStatus"],
) {
  if (status === "review_required") return 0;
  if (status === "insufficient_data") return 1;
  return 2;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readNumber(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function readSourceKind(value: unknown): GateCAnalysisSourceKind {
  if (
    value === "quick_current" ||
    value === "full_current" ||
    value === "candidate" ||
    value === "legacy_fixed"
  ) {
    return value;
  }
  return "legacy_fixed";
}
