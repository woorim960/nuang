import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ProductFeedbackArea,
  ProductFeedbackKind,
} from "@/features/feedback/product-feedback-contract";
import type {
  CoreResultFeedbackReason,
  CoreResultFeedbackSentiment,
  CoreResultFeedbackStatus,
} from "@/features/result/unified-core-report/core-result-feedback-contract";

export type AdminProductFeedbackStatus =
  "received" | "reviewing" | "planned" | "resolved" | "closed";

export type AdminProductFeedbackItem = {
  accountLinked: boolean;
  area: ProductFeedbackArea;
  body: string;
  createdAt: string;
  id: string;
  kind: ProductFeedbackKind;
  sourcePath: string | null;
  status: AdminProductFeedbackStatus;
  technicalContext: {
    locale?: string | null;
    timeZone?: string | null;
    viewportHeight?: number;
    viewportWidth?: number;
  };
  updatedAt: string;
};

export type AdminAssessmentQualitySummary = {
  assessmentSlug: string;
  firstSeenAt: string;
  instrumentVersion: string;
  lastSeenAt: string;
  observationCount: number;
  observationKind: "item_experience" | "result_fit";
  observationRate: number;
  priority: "monitor" | "normal" | "medium" | "high";
  sampleCount: number;
  signalKey: string;
};

export type AdminCoreResultFeedbackItem = {
  contentKey: string;
  contentVersion: string;
  createdAt: string;
  id: string;
  profileCode: string;
  reason: CoreResultFeedbackReason | null;
  reportKind: "full" | "quick";
  sectionId: string;
  sentiment: CoreResultFeedbackSentiment;
  status: CoreResultFeedbackStatus;
  surface: "completion" | "my";
};

export type AdminCoreResultFeedbackSummary = {
  contentKey: string;
  contentVersion: string;
  dependsCount: number;
  fitCount: number;
  lastSeenAt: string;
  notFitCount: number;
  notFitRate: number;
  priority: "collecting" | "normal" | "medium" | "high";
  profileCode: string;
  reportKind: "full" | "quick";
  sampleCount: number;
  sectionId: string;
};

export async function readAdminCoreResultFeedback({
  client,
}: {
  client: SupabaseClient;
}) {
  const [queue, summaries] = await Promise.all([
    client
      .schema("report")
      .from("core_result_feedback")
      .select(
        "id,profile_code,report_kind,surface,section_id,content_key,content_version,sentiment,reason,status,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    client
      .schema("report")
      .from("core_result_feedback_review_summary")
      .select(
        "profile_code,report_kind,section_id,content_key,content_version,sample_count,fit_count,depends_count,not_fit_count,not_fit_rate,last_seen_at,priority",
      )
      .order("not_fit_rate", { ascending: false })
      .order("sample_count", { ascending: false })
      .limit(100),
  ]);

  return {
    available: !queue.error && !summaries.error,
    items: queue.error
      ? ([] as AdminCoreResultFeedbackItem[])
      : (queue.data ?? []).map((row) => ({
          contentKey: String(row.content_key),
          contentVersion: String(row.content_version),
          createdAt: String(row.created_at),
          id: String(row.id),
          profileCode: String(row.profile_code),
          reason: (row.reason as CoreResultFeedbackReason | null) ?? null,
          reportKind: row.report_kind as "full" | "quick",
          sectionId: String(row.section_id),
          sentiment: row.sentiment as CoreResultFeedbackSentiment,
          status: row.status as CoreResultFeedbackStatus,
          surface: row.surface as "completion" | "my",
        })),
    summaries: summaries.error
      ? ([] as AdminCoreResultFeedbackSummary[])
      : (summaries.data ?? []).map((row) => ({
          contentKey: String(row.content_key),
          contentVersion: String(row.content_version),
          dependsCount: Number(row.depends_count),
          fitCount: Number(row.fit_count),
          lastSeenAt: String(row.last_seen_at),
          notFitCount: Number(row.not_fit_count),
          notFitRate: Number(row.not_fit_rate),
          priority: row.priority as AdminCoreResultFeedbackSummary["priority"],
          profileCode: String(row.profile_code),
          reportKind: row.report_kind as "full" | "quick",
          sampleCount: Number(row.sample_count),
          sectionId: String(row.section_id),
        })),
  };
}

export async function readAdminAssessmentQualityQueue({
  client,
}: {
  client: SupabaseClient;
}) {
  const response = await client
    .schema("assessment")
    .from("quality_observation_review_summary")
    .select(
      "assessment_slug,instrument_version,observation_kind,signal_key,priority,priority_rank,observation_count,sample_count,observation_rate,first_seen_at,last_seen_at",
    )
    .order("priority_rank", { ascending: false })
    .order("last_seen_at", { ascending: false })
    .limit(100);

  if (response.error) {
    return {
      available: false as const,
      items: [] as AdminAssessmentQualitySummary[],
    };
  }
  return {
    available: true as const,
    items: (response.data ?? []).map((row) => ({
      assessmentSlug: String(row.assessment_slug),
      firstSeenAt: String(row.first_seen_at),
      instrumentVersion: String(row.instrument_version),
      lastSeenAt: String(row.last_seen_at),
      observationCount: Number(row.observation_count),
      observationKind:
        row.observation_kind as AdminAssessmentQualitySummary["observationKind"],
      observationRate: Number(row.observation_rate),
      priority: row.priority as AdminAssessmentQualitySummary["priority"],
      sampleCount: Number(row.sample_count),
      signalKey: String(row.signal_key),
    })),
  };
}

export async function readAdminProductFeedback({
  client,
  kind,
  status,
}: {
  client: SupabaseClient;
  kind?: ProductFeedbackKind;
  status?: AdminProductFeedbackStatus;
}) {
  let query = client
    .from("product_feedback")
    .select(
      "id,account_id,kind,area,body,source_path,technical_context,status,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (kind) query = query.eq("kind", kind);
  if (status) query = query.eq("status", status);

  const response = await query;
  if (response.error) {
    return {
      available: false as const,
      items: [] as AdminProductFeedbackItem[],
    };
  }

  return {
    available: true as const,
    items: (response.data ?? []).map((row) => ({
      accountLinked: Boolean(row.account_id),
      area: row.area as ProductFeedbackArea,
      body: String(row.body),
      createdAt: String(row.created_at),
      id: String(row.id),
      kind: row.kind as ProductFeedbackKind,
      sourcePath: row.source_path ? String(row.source_path) : null,
      status: row.status as AdminProductFeedbackStatus,
      technicalContext:
        row.technical_context &&
        typeof row.technical_context === "object" &&
        !Array.isArray(row.technical_context)
          ? row.technical_context
          : {},
      updatedAt: String(row.updated_at),
    })),
  };
}
