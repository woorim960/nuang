import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import {
  calculateLabResult,
  getLabAssessment,
} from "@/features/lab/lab-assessments";
import { isCurrentNuangCode } from "@/features/nuang-code/profile-name-resolution";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const labResultRequestSchema = z.object({
  answers: z.record(
    z.string(),
    z.object({
      optionId: z.string().min(1).max(80),
      questionId: z.string().min(1).max(80),
      resultId: z.string().min(1).max(80),
    }),
  ),
  completedAt: z.string().datetime(),
  contentVersion: z.string().min(1).max(100),
  localResultId: z.string().trim().min(8).max(128),
  slug: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  const parsed = labResultRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  const assessment = getLabAssessment(parsed.data.slug);
  if (
    !assessment ||
    assessment.contentVersion !== parsed.data.contentVersion ||
    !hasExactAnswerSet(assessment, parsed.data.answers)
  ) {
    return NextResponse.json(
      { error: "lab_result_version_or_answers_invalid" },
      { status: 422 },
    );
  }

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;
  const client = createSupabaseServiceClient();
  if (!client) return createApiClosedResponse("supabase_env_missing");

  const account = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", auth.user.id)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (account.error || !account.data?.account_id) {
    return NextResponse.json({ error: "account_not_found" }, { status: 404 });
  }
  const accountId = String(account.data.account_id);
  const result = calculateLabResult(assessment, parsed.data.answers);
  const profileCodeAtCompletion = await readProfileCodeAtCompletion({
    accountId,
    client,
    completedAt: parsed.data.completedAt,
  });
  const saved = await client
    .schema("assessment")
    .from("lab_result")
    .upsert(
      {
        account_id: accountId,
        answers: parsed.data.answers,
        completed_at: parsed.data.completedAt,
        content_version: assessment.contentVersion,
        lab_slug: assessment.slug,
        local_result_id: parsed.data.localResultId,
        profile_code_at_completion: profileCodeAtCompletion,
        result_payload: result,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id,local_result_id" },
    )
    .select("id, updated_at")
    .single();
  if (saved.error || !saved.data) {
    return NextResponse.json(
      { error: "lab_result_write_failed" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    result: {
      ...result,
      completedAt: parsed.data.completedAt,
      nuangCodeContext: profileCodeAtCompletion
        ? {
            capturedAt: parsed.data.completedAt,
            code: profileCodeAtCompletion,
          }
        : null,
      serverResultId: String(saved.data.id),
      syncedAt: String(saved.data.updated_at),
    },
  });
}

function hasExactAnswerSet(
  assessment: NonNullable<ReturnType<typeof getLabAssessment>>,
  answers: z.infer<typeof labResultRequestSchema>["answers"],
) {
  if (Object.keys(answers).length !== assessment.questions.length) return false;

  return assessment.questions.every((question) => {
    const answer = answers[question.id];
    const option = question.options.find(
      (candidate) => candidate.id === answer?.optionId,
    );
    return (
      answer?.questionId === question.id &&
      option?.resultId === answer.resultId
    );
  });
}

async function readProfileCodeAtCompletion({
  accountId,
  client,
  completedAt,
}: {
  accountId: string;
  client: NonNullable<ReturnType<typeof createSupabaseServiceClient>>;
  completedAt: string;
}) {
  const response = await client
    .schema("report")
    .from("result_report")
    .select("profile_code, report_kind, created_at")
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .lte("created_at", completedAt)
    .order("created_at", { ascending: false })
    .limit(20);
  if (response.error) return null;
  const rows = (response.data ?? []) as Array<{
    profile_code: string;
    report_kind: "full" | "quick";
  }>;
  const selectedCode =
    rows.find((row) => row.report_kind === "full")?.profile_code ??
    rows[0]?.profile_code ??
    null;

  return isCurrentNuangCode(selectedCode) ? selectedCode : null;
}
