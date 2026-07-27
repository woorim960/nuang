import type { SupabaseClient } from "@supabase/supabase-js";
import { candidateQuickItemIds } from "@/features/assessment/candidate-quick-core-seed";
import { gateCParticipantDefinitions } from "@/features/research/gate-c/gate-c-study-fixture";
import {
  gateCCandidateBankId,
  gateCUnifiedProtocolVersion,
  gateCUnifiedSourceKinds,
  type GateCUnifiedSourceKind,
} from "@/features/research/gate-c/gate-c-unified-item-pool";

export type GateCAnalysisSessionRow = {
  id: string;
  item_assignment?: unknown;
  pool_version?: string;
  status: "completed" | "started";
  quality_status: "excluded" | "included" | "pending";
};

export type GateCAnalysisResponseRow = {
  session_id: string;
  study_item_id: string;
  response_changed: boolean;
  first_answer_elapsed_ms: number;
  confusion_flag: boolean;
  unsure_reason: string | null;
};

export type GateCItemMetric = {
  studyItemId: string;
  sourceKind: GateCUnifiedSourceKind | "legacy_fixed";
  observationCount: number;
  unsureRate: number;
  wordingUnclearRate: number;
  confusionFlagRate: number;
  responseChangeRate: number;
  medianFirstAnswerMs: number | null;
  recommendationStatus: "insufficient_data" | "monitor" | "review_required";
  reasonCodes: string[];
  publicationState: "review_only";
};

export type GateCAnalysis = {
  startedSessionCount: number;
  completedSessionCount: number;
  includedSessionCount: number;
  excludedSessionCount: number;
  itemMetrics: GateCItemMetric[];
};

const minimumItemObservations = 8;

export function buildGateCAnalysis(
  sessions: GateCAnalysisSessionRow[],
  responses: GateCAnalysisResponseRow[],
): GateCAnalysis {
  const includedSessionIds = new Set(
    sessions
      .filter(
        (session) =>
          session.status === "completed" &&
          session.quality_status === "included",
      )
      .map((session) => session.id),
  );
  const includedResponses = responses.filter((response) =>
    includedSessionIds.has(response.session_id),
  );
  const itemSourceKinds = collectItemSourceKinds(sessions);
  const allItemIds = Array.from(
    new Set([
      ...Object.values(gateCParticipantDefinitions).flatMap((definition) =>
        definition.items.map((item) => item.studyItemId),
      ),
      ...includedResponses.map((response) => response.study_item_id),
    ]),
  );

  const itemMetrics = allItemIds.map((studyItemId) => {
    const itemRows = includedResponses.filter(
      (response) => response.study_item_id === studyItemId,
    );
    const observationCount = itemRows.length;
    const unsureCount = itemRows.filter((row) => row.unsure_reason).length;
    const wordingUnclearCount = itemRows.filter(
      (row) => row.unsure_reason === "WORDING_UNCLEAR",
    ).length;
    const confusionCount = itemRows.filter((row) => row.confusion_flag).length;
    const responseChangeCount = itemRows.filter(
      (row) => row.response_changed,
    ).length;
    const reasonCodes: string[] = [];

    if (observationCount < minimumItemObservations) {
      reasonCodes.push("NEED_MORE_RESPONSES");
    } else {
      if (rate(wordingUnclearCount, observationCount) >= 0.15) {
        reasonCodes.push("WORDING_REVIEW");
      }
      if (rate(confusionCount, observationCount) >= 0.2) {
        reasonCodes.push("COMPREHENSION_REVIEW");
      }
      if (rate(unsureCount, observationCount) >= 0.2) {
        reasonCodes.push("EXPERIENCE_COVERAGE_REVIEW");
      }
      if (rate(responseChangeCount, observationCount) >= 0.25) {
        reasonCodes.push("RESPONSE_PROCESS_REVIEW");
      }
    }

    return {
      studyItemId,
      sourceKind:
        itemSourceKinds.get(studyItemId) ?? inferSourceKind(studyItemId),
      observationCount,
      unsureRate: rate(unsureCount, observationCount),
      wordingUnclearRate: rate(wordingUnclearCount, observationCount),
      confusionFlagRate: rate(confusionCount, observationCount),
      responseChangeRate: rate(responseChangeCount, observationCount),
      medianFirstAnswerMs: median(
        itemRows.map((row) => row.first_answer_elapsed_ms),
      ),
      recommendationStatus:
        observationCount < minimumItemObservations
          ? "insufficient_data"
          : reasonCodes.length > 0
            ? "review_required"
            : "monitor",
      reasonCodes,
      publicationState: "review_only",
    } satisfies GateCItemMetric;
  });

  return {
    startedSessionCount: sessions.length,
    completedSessionCount: sessions.filter(
      (session) => session.status === "completed",
    ).length,
    includedSessionCount: sessions.filter(
      (session) =>
        session.status === "completed" && session.quality_status === "included",
    ).length,
    excludedSessionCount: sessions.filter(
      (session) =>
        session.status === "completed" && session.quality_status === "excluded",
    ).length,
    itemMetrics,
  };
}

export async function refreshGateCAnalysis(client: SupabaseClient) {
  const unifiedSessionResponse = await client
    .from("research_gate_c_session")
    .select("id,status,quality_status,pool_version,item_assignment")
    .order("created_at", { ascending: false })
    .limit(5000);
  let sessionRows = (unifiedSessionResponse.data ??
    []) as GateCAnalysisSessionRow[];
  let sessionError = unifiedSessionResponse.error;

  if (isMissingUnifiedResearchSchema(sessionError)) {
    const legacyResponse = await client
      .from("research_gate_c_session")
      .select("id,status,quality_status")
      .order("created_at", { ascending: false })
      .limit(5000);
    sessionRows = (legacyResponse.data ?? []).map((session) => ({
        ...session,
        item_assignment: null,
        pool_version: "GATE-C-FIXED-FORMS-1.0",
      })) as GateCAnalysisSessionRow[];
    sessionError = legacyResponse.error;
  }

  if (sessionError) throw sessionError;

  const sessions = sessionRows;
  const includedSessionIds = sessions
    .filter(
      (session) =>
        session.status === "completed" && session.quality_status === "included",
    )
    .map((session) => session.id);
  const responseRows: GateCAnalysisResponseRow[] = [];

  for (let index = 0; index < includedSessionIds.length; index += 100) {
    const sessionBatch = includedSessionIds.slice(index, index + 100);
    const response = await client
      .from("research_gate_c_item_response")
      .select(
        "session_id,study_item_id,response_changed,first_answer_elapsed_ms,confusion_flag,unsure_reason",
      )
      .in("session_id", sessionBatch)
      .limit(1200);

    if (response.error) throw response.error;
    responseRows.push(...((response.data ?? []) as GateCAnalysisResponseRow[]));
  }

  const analysis = buildGateCAnalysis(sessions, responseRows);
  const queueRows = analysis.itemMetrics.map((metric) => ({
    candidate_set_id: gateCCandidateBankId,
    metrics: {
      confusionFlagRate: metric.confusionFlagRate,
      medianFirstAnswerMs: metric.medianFirstAnswerMs,
      responseChangeRate: metric.responseChangeRate,
      sourceKind: metric.sourceKind,
      unsureRate: metric.unsureRate,
      wordingUnclearRate: metric.wordingUnclearRate,
      publicationState: metric.publicationState,
    },
    observation_count: metric.observationCount,
    protocol_version: gateCUnifiedProtocolVersion,
    reason_codes: metric.reasonCodes,
    recommendation_status: metric.recommendationStatus,
    review_state: "awaiting_human_review",
    study_item_id: metric.studyItemId,
    updated_at: new Date().toISOString(),
  }));

  const queueResponse = await client
    .from("research_gate_c_item_review_queue")
    .upsert(queueRows, {
      onConflict: "protocol_version,candidate_set_id,study_item_id",
    });
  if (queueResponse.error) throw queueResponse.error;

  const snapshotResponse = await client
    .from("research_gate_c_analysis_snapshot")
    .upsert(
      {
        candidate_set_id: gateCCandidateBankId,
        completed_session_count: analysis.completedSessionCount,
        excluded_session_count: analysis.excludedSessionCount,
        generated_at: new Date().toISOString(),
        included_session_count: analysis.includedSessionCount,
        item_metrics: analysis.itemMetrics,
        protocol_version: gateCUnifiedProtocolVersion,
        publication_state: "review_only",
        started_session_count: analysis.startedSessionCount,
      },
      { onConflict: "protocol_version,candidate_set_id" },
    );
  if (snapshotResponse.error) throw snapshotResponse.error;

  return analysis;
}

function rate(count: number, total: number) {
  return total === 0 ? 0 : Number((count / total).toFixed(4));
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function collectItemSourceKinds(sessions: GateCAnalysisSessionRow[]) {
  const sourceKinds = new Map<
    string,
    GateCUnifiedSourceKind | "legacy_fixed"
  >();

  for (const session of sessions) {
    if (!Array.isArray(session.item_assignment)) continue;

    for (const assignment of session.item_assignment) {
      if (!isRecord(assignment)) continue;
      const studyItemId = assignment.studyItemId;
      const sourceKind = assignment.sourceKind;

      if (
        typeof studyItemId === "string" &&
        typeof sourceKind === "string" &&
        gateCUnifiedSourceKinds.includes(
          sourceKind as GateCUnifiedSourceKind,
        )
      ) {
        sourceKinds.set(
          studyItemId,
          sourceKind as GateCUnifiedSourceKind,
        );
      }
    }
  }

  return sourceKinds;
}

function inferSourceKind(
  studyItemId: string,
): GateCUnifiedSourceKind | "legacy_fixed" {
  if (studyItemId.startsWith("NX-")) return "candidate";
  if (
    candidateQuickItemIds.includes(
      studyItemId as (typeof candidateQuickItemIds)[number],
    )
  ) {
    return "quick_current";
  }
  if (studyItemId.startsWith("NU-B1-")) return "full_current";
  return "legacy_fixed";
}

function isMissingUnifiedResearchSchema(error: { code?: string } | null) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
