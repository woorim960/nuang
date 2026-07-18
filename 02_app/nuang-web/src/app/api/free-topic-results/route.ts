import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const freeTopicResultSchema = z.object({
  answers: z.record(
    z.string(),
    z.object({
      answeredAt: z.string(),
      questionId: z.string(),
      value: z.number().int().min(1).max(5),
    }),
  ),
  assessment: z.object({
    categoryId: z.string(),
    categoryLabel: z.string(),
    slug: z.string(),
    title: z.string(),
  }),
  completedAt: z.string(),
  localResultId: z.string(),
  result: z.object({
    observations: z.array(z.unknown()),
    scoresByTargetId: z.record(z.string(), z.number()),
    summary: z.string(),
  }),
});

const freeTopicResultsQuerySchema = z.object({
  localResultId: z.string().min(6).max(128).optional(),
});

export async function POST(request: Request) {
  const parsedBody = freeTopicResultSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: "validation_error",
        issues: parsedBody.error.issues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          path: issue.path,
        })),
      },
      { status: 422 },
    );
  }

  const auth = await requireAuthenticatedUser();

  if (!auth.ok) {
    return auth.response;
  }

  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return createApiClosedResponse("supabase_env_missing");
  }

  const accountResponse = await serviceClient
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", auth.user.id)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (accountResponse.error) {
    return NextResponse.json({ error: "account_read_failed" }, { status: 500 });
  }

  if (!accountResponse.data) {
    return NextResponse.json({ error: "account_not_found" }, { status: 404 });
  }

  const accountId = (accountResponse.data as { account_id: string }).account_id;
  const payload = parsedBody.data;
  const insertResponse = await serviceClient
    .schema("assessment")
    .from("free_topic_result")
    .upsert(
      {
        account_id: accountId,
        category_id: payload.assessment.categoryId,
        category_label: payload.assessment.categoryLabel,
        completed_at: payload.completedAt,
        evidence_payload: {
          observations: payload.result.observations,
          scoresByTargetId: payload.result.scoresByTargetId,
        },
        local_result_id: payload.localResultId,
        result_summary: {
          summary: payload.result.summary,
          title: payload.assessment.title,
        },
        topic_slug: payload.assessment.slug,
      },
      { onConflict: "account_id,local_result_id" },
    )
    .select("id, updated_at")
    .single();

  if (insertResponse.error || !insertResponse.data) {
    return NextResponse.json(
      {
        error: "free_topic_result_write_failed",
        message: insertResponse.error?.message ?? "Write failed.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    resultId: (insertResponse.data as { id: string }).id,
    syncedAt: (insertResponse.data as { updated_at: string }).updated_at,
  });
}

export async function GET(request: Request) {
  const parsedQuery = freeTopicResultsQuerySchema.safeParse({
    localResultId: new URL(request.url).searchParams.get("localResultId") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: "validation_error",
        issues: parsedQuery.error.issues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          path: issue.path,
        })),
      },
      { status: 422 },
    );
  }

  const auth = await requireAuthenticatedUser();

  if (!auth.ok) {
    return auth.response;
  }

  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return createApiClosedResponse("supabase_env_missing");
  }

  const accountResponse = await serviceClient
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", auth.user.id)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (accountResponse.error) {
    return NextResponse.json({ error: "account_read_failed" }, { status: 500 });
  }

  if (!accountResponse.data) {
    return NextResponse.json({ ok: true, results: [] });
  }

  const accountId = (accountResponse.data as { account_id: string }).account_id;
  let resultQuery = serviceClient
    .schema("assessment")
    .from("free_topic_result")
    .select(
      "local_result_id, topic_slug, category_id, category_label, completed_at, result_summary, evidence_payload",
    )
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .order("completed_at", { ascending: false });

  if (parsedQuery.data.localResultId) {
    resultQuery = resultQuery.eq("local_result_id", parsedQuery.data.localResultId);
  }

  const resultResponse = await resultQuery.limit(
    parsedQuery.data.localResultId ? 1 : 30,
  );

  if (resultResponse.error) {
    return NextResponse.json(
      {
        error: "free_topic_results_read_failed",
        message: resultResponse.error.message,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    results: (resultResponse.data ?? []).map((row) => ({
      assessment: {
        categoryId: row.category_id,
        categoryLabel: row.category_label,
        slug: row.topic_slug,
        title: readTitle(row.result_summary),
      },
      completedAt: row.completed_at,
      localResultId: row.local_result_id,
      result: {
        observations: readObservations(row.evidence_payload),
        scoresByTargetId: readScores(row.evidence_payload),
        summary: readSummary(row.result_summary),
      },
      sync: { status: "synced", syncedAt: row.completed_at },
    })),
  });
}

function readTitle(value: unknown) {
  return readRecord(value).title ?? "무료 주제 검사";
}

function readSummary(value: unknown) {
  return readRecord(value).summary ?? "저장된 무료 주제 검사 결과예요.";
}

function readObservations(value: unknown) {
  const observations = readRecord(value).observations;
  return Array.isArray(observations) ? observations : [];
}

function readScores(value: unknown) {
  const scoresByTargetId = readRecord(value).scoresByTargetId;
  return isRecord(scoresByTargetId)
    ? Object.fromEntries(
        Object.entries(scoresByTargetId).filter(
          (entry): entry is [string, number] => typeof entry[1] === "number",
        ),
      )
    : {};
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
