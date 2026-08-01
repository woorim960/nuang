import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import {
  assessmentQualityObservationSchema,
  classifyAssessmentQualityPriority,
} from "@/features/assessment/assessment-quality-observation";
import {
  getFreeTopicAssessment,
  getFreeTopicQuestions,
} from "@/features/assessment/free-topic-assessments";
import { getFreeTopicInstrumentVersion } from "@/features/assessment/free-topic-result-version";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";
import {
  createSupabaseServiceClient,
  getSupabaseServiceEnv,
} from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  const payload = await readValidatedJson(
    request,
    assessmentQualityObservationSchema,
  );
  if (!payload.ok) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }
  const assessment = getFreeTopicAssessment(payload.data.assessmentSlug);
  if (!assessment) {
    return NextResponse.json({ error: "unknown_assessment" }, { status: 404 });
  }
  if (
    payload.data.instrumentVersion !==
    getFreeTopicInstrumentVersion(assessment.slug)
  ) {
    return NextResponse.json(
      { error: "instrument_version_mismatch" },
      { status: 409 },
    );
  }
  const allowedQuestionIds = new Set(
    getFreeTopicQuestions(assessment.slug).map((question) => question.id),
  );
  if (
    payload.data.observations.some(
      (item) =>
        item.kind === "item_experience" &&
        !allowedQuestionIds.has(item.questionId),
    )
  ) {
    return NextResponse.json({ error: "unknown_question" }, { status: 422 });
  }
  const client = createSupabaseServiceClient();
  const serviceEnv = getSupabaseServiceEnv();
  if (!client || !serviceEnv) {
    return createApiClosedResponse("supabase_env_missing");
  }
  const requestFingerprint = createRequestFingerprint({
    clientSessionId: payload.data.clientSessionId,
    pepper: serviceEnv.shareTokenPepper,
    request,
  });
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1_000).toISOString();
  const recent = await client
    .schema("assessment")
    .from("quality_observation")
    .select("id", { count: "exact", head: true })
    .eq("request_fingerprint", requestFingerprint)
    .gte("created_at", tenMinutesAgo);

  if (recent.error) {
    return NextResponse.json(
      { error: "quality_observation_rate_check_failed" },
      { status: 503 },
    );
  }
  if ((recent.count ?? 0) >= 120) {
    return NextResponse.json(
      { error: "quality_observation_rate_limited" },
      { status: 429 },
    );
  }

  const rows = payload.data.observations.map((item, observationIndex) => ({
    assessment_slug: assessment.slug,
    instrument_version: payload.data.instrumentVersion,
    local_result_id: payload.data.localResultId ?? null,
    observation_index: observationIndex,
    observation_kind: item.kind,
    priority: classifyAssessmentQualityPriority(item),
    request_fingerprint: requestFingerprint,
    signal_payload: item,
    submission_id: payload.data.submissionId,
  }));
  const inserted = await client
    .schema("assessment")
    .from("quality_observation")
    .upsert(rows, {
      ignoreDuplicates: true,
      onConflict: "submission_id,observation_index",
    });
  if (inserted.error) {
    return NextResponse.json(
      { error: "quality_observation_write_failed" },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { accepted: rows.length, ok: true },
    { headers: { "cache-control": "private, no-store" }, status: 201 },
  );
}

function createRequestFingerprint({
  clientSessionId,
  pepper,
  request,
}: {
  clientSessionId: string;
  pepper: string;
  request: Request;
}) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent")?.slice(0, 240) ?? "";

  return createHmac("sha256", pepper)
    .update(`assessment-quality:${clientSessionId}:${ip}:${userAgent}`)
    .digest("hex");
}
