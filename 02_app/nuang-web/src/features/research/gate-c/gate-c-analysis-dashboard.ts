import type { SupabaseClient } from "@supabase/supabase-js";
import { gateCFormIds } from "@/features/research/gate-c/gate-c-study-contract";

export type GateCReviewQueueRow = {
  metrics: {
    confusionFlagRate?: number;
    medianFirstAnswerMs?: number | null;
    responseChangeRate?: number;
    unsureRate?: number;
    wordingUnclearRate?: number;
  };
  observationCount: number;
  reasonCodes: string[];
  recommendationStatus: "insufficient_data" | "monitor" | "review_required";
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
};

type SessionRow = {
  form_id: (typeof gateCFormIds)[number];
  quality_status: "excluded" | "included" | "pending";
  status: "completed" | "started";
};

type QueueDbRow = {
  metrics: unknown;
  observation_count: number;
  reason_codes: unknown;
  recommendation_status: GateCReviewQueueRow["recommendationStatus"];
  study_item_id: string;
  updated_at: string;
};

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
        "study_item_id,observation_count,recommendation_status,reason_codes,metrics,updated_at",
      )
      .limit(60),
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
  const queue = ((queueResponse.data ?? []) as QueueDbRow[])
    .map(mapQueueRow)
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

function mapQueueRow(row: QueueDbRow): GateCReviewQueueRow {
  return {
    metrics: isRecord(row.metrics) ? row.metrics : {},
    observationCount: row.observation_count,
    reasonCodes: Array.isArray(row.reason_codes)
      ? row.reason_codes.filter(
          (code): code is string => typeof code === "string",
        )
      : [],
    recommendationStatus: row.recommendation_status,
    studyItemId: row.study_item_id,
    updatedAt: row.updated_at,
  };
}

function recommendationPriority(
  status: GateCReviewQueueRow["recommendationStatus"],
) {
  if (status === "review_required") return 0;
  if (status === "insufficient_data") return 1;
  return 2;
}

function isRecord(value: unknown): value is Record<string, number | null> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
