import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import {
  calculateLabResult,
  getLabAssessment,
} from "@/features/lab/lab-assessments";
import { isCurrentNuangCode } from "@/features/nuang-code/profile-name-resolution";
import { localResultIdSchema } from "@/features/result-persistence/local-result-id-contract";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type {
  LabAnswer,
  LabAssessment,
  LabResultProfile,
  LabScoreResult,
} from "@/features/lab/lab-assessments";
import {
  resolveAssessmentReleaseById,
  resolveAssessmentRuntimeContent,
} from "@/features/assessment/server-assessment-content-runtime";

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
  localResultId: localResultIdSchema,
  productReleaseId: z.string().uuid().optional(),
  slug: z.string().min(1).max(100),
});

const labResultsQuerySchema = z.object({
  localResultId: localResultIdSchema.optional(),
});

const deleteLabResultRequestSchema = z.object({
  localResultId: localResultIdSchema,
});

const privateNoStoreHeaders = {
  "cache-control": "private, no-store, max-age=0",
};

type LabResultRow = {
  answers: unknown;
  assessment_content_release_id?: string | null;
  completed_at: string;
  content_version: string;
  id: string;
  lab_slug: string;
  local_result_id: string;
  profile_code_at_completion?: string | null;
  result_payload: unknown;
  updated_at?: string;
};

export async function POST(request: Request) {
  const parsed = labResultRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  const auth = await requireAuthenticatedUser(request, {
    expectedSupabaseUserId: request.headers.get("x-nuang-auth-user-id"),
  });
  if (!auth.ok) return auth.response;
  if (!hasMatchingRequestAuthScope(request, auth.user.id)) {
    return createAuthScopeChangedResponse(auth.user.id);
  }

  const runtime = parsed.data.productReleaseId
    ? await resolveAssessmentReleaseById({
        category: "lab",
        releaseId: parsed.data.productReleaseId,
        slug: parsed.data.slug,
        subtype: "odd_lab",
      })
    : await resolveAssessmentRuntimeContent({
        category: "lab",
        slug: parsed.data.slug,
        subtype: "odd_lab",
      });
  const runtimePayload = runtime.document?.payload as
    { assessment?: LabAssessment } | undefined;
  const assessment =
    runtimePayload?.assessment ?? getLabAssessment(parsed.data.slug);
  if (
    !assessment ||
    runtime.state === "unavailable" ||
    assessment.contentVersion !== parsed.data.contentVersion ||
    !hasExactAnswerSet(assessment, parsed.data.answers)
  ) {
    return NextResponse.json(
      { error: "lab_result_version_or_answers_invalid" },
      { status: 422 },
    );
  }

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
        assessment_content_release_id: runtime.releaseId,
        answers: parsed.data.answers,
        completed_at: parsed.data.completedAt,
        content_version: assessment.contentVersion,
        lab_slug: assessment.slug,
        local_result_id: parsed.data.localResultId,
        profile_code_at_completion: profileCodeAtCompletion,
        result_payload: {
          ...result,
          assessmentSnapshot: assessment,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id,local_result_id" },
    )
    .select("id, updated_at")
    .single();
  if (saved.error?.message?.includes("persisted_result_deleted")) {
    return NextResponse.json(
      { authUserId: auth.user.id, error: "lab_result_deleted" },
      { headers: privateNoStoreHeaders, status: 410 },
    );
  }
  if (saved.error || !saved.data) {
    return NextResponse.json(
      { error: "lab_result_write_failed" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    accountId,
    authUserId: auth.user.id,
    ok: true,
    result: {
      ...result,
      assessmentSnapshot: assessment,
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

export async function GET(request: Request) {
  const parsed = labResultsQuerySchema.safeParse({
    localResultId:
      new URL(request.url).searchParams.get("localResultId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error" },
      { headers: privateNoStoreHeaders, status: 422 },
    );
  }

  const auth = await requireAuthenticatedUser(request, {
    expectedSupabaseUserId: request.headers.get("x-nuang-auth-user-id"),
  });
  if (!auth.ok) return auth.response;
  if (!hasMatchingRequestAuthScope(request, auth.user.id)) {
    return createAuthScopeChangedResponse(auth.user.id);
  }
  const client = createSupabaseServiceClient();
  if (!client) return createApiClosedResponse("supabase_env_missing");
  const accountId = await readAccountId(client, auth.user.id);
  if (accountId === "read_failed") {
    return NextResponse.json(
      { error: "account_read_failed" },
      { headers: privateNoStoreHeaders, status: 500 },
    );
  }
  if (!accountId) {
    return NextResponse.json(
      {
        authUserId: auth.user.id,
        deletedLocalResultIds: [],
        ok: true,
        results: [],
      },
      { headers: privateNoStoreHeaders },
    );
  }

  let tombstoneQuery = client
    .schema("assessment")
    .from("result_deletion_tombstone")
    .select("local_result_id")
    .eq("account_id", accountId)
    .eq("result_kind", "lab")
    .order("deleted_at", { ascending: false });
  if (parsed.data.localResultId) {
    tombstoneQuery = tombstoneQuery.eq(
      "local_result_id",
      parsed.data.localResultId,
    );
  }
  let query = client
    .schema("assessment")
    .from("lab_result")
    .select(
      "id, local_result_id, lab_slug, content_version, completed_at, answers, result_payload, profile_code_at_completion, assessment_content_release_id, updated_at",
    )
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .order("completed_at", { ascending: false });
  if (parsed.data.localResultId) {
    query = query.eq("local_result_id", parsed.data.localResultId);
  }
  const response = await query.limit(parsed.data.localResultId ? 1 : 50);
  if (response.error) {
    return NextResponse.json(
      { error: "lab_results_read_failed" },
      { headers: privateNoStoreHeaders, status: 503 },
    );
  }

  // Read tombstones after active rows so a concurrent deletion cannot produce
  // an empty active response without also returning its deletion boundary.
  const tombstoneResponse = await tombstoneQuery.limit(
    parsed.data.localResultId ? 1 : 1_000,
  );
  if (tombstoneResponse.error) {
    return NextResponse.json(
      { error: "lab_result_tombstones_read_failed" },
      { headers: privateNoStoreHeaders, status: 503 },
    );
  }
  const deletedLocalResultIds = (tombstoneResponse.data ?? [])
    .map((row) =>
      typeof row.local_result_id === "string" ? row.local_result_id : null,
    )
    .filter((value): value is string => Boolean(value));

  const results = (response.data ?? [])
    .map((row) => serializeLabResult(row as LabResultRow))
    .filter((result): result is NonNullable<typeof result> => Boolean(result))
    .filter((result) => !deletedLocalResultIds.includes(result.localResultId));
  return NextResponse.json(
    {
      accountId,
      authUserId: auth.user.id,
      deletedLocalResultIds,
      ok: true,
      results,
    },
    { headers: privateNoStoreHeaders },
  );
}

export async function DELETE(request: Request) {
  const parsed = deleteLabResultRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error" },
      { headers: privateNoStoreHeaders, status: 422 },
    );
  }

  const auth = await requireAuthenticatedUser(request, {
    expectedSupabaseUserId: request.headers.get("x-nuang-auth-user-id"),
  });
  if (!auth.ok) return auth.response;
  if (!hasMatchingRequestAuthScope(request, auth.user.id)) {
    return createAuthScopeChangedResponse(auth.user.id);
  }
  const client = createSupabaseServiceClient();
  if (!client) return createApiClosedResponse("supabase_env_missing");
  const accountId = await readAccountId(client, auth.user.id);
  if (accountId === "read_failed") {
    return NextResponse.json(
      { error: "account_read_failed" },
      { headers: privateNoStoreHeaders, status: 500 },
    );
  }
  if (!accountId) {
    return NextResponse.json(
      { authUserId: auth.user.id, deleted: false, ok: true },
      { headers: privateNoStoreHeaders },
    );
  }

  const response = await client
    .schema("assessment")
    .rpc("delete_persisted_result", {
      p_account_id: accountId,
      p_local_result_id: parsed.data.localResultId,
      p_result_kind: "lab",
    });
  if (response.error) {
    return NextResponse.json(
      { error: "lab_result_delete_failed" },
      { headers: privateNoStoreHeaders, status: 503 },
    );
  }

  return NextResponse.json(
    {
      authUserId: auth.user.id,
      deleted: response.data === true,
      ok: true,
    },
    { headers: privateNoStoreHeaders },
  );
}

function hasMatchingRequestAuthScope(request: Request, authUserId: string) {
  return request.headers.get("x-nuang-auth-user-id") === authUserId;
}

function createAuthScopeChangedResponse(authUserId: string) {
  return NextResponse.json(
    {
      authUserId,
      error: "auth_scope_changed",
      message: "로그인 계정이 변경되어 요청을 중단했어요. 다시 시도해 주세요.",
      ok: false,
    },
    { headers: privateNoStoreHeaders, status: 409 },
  );
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
      answer?.questionId === question.id && option?.resultId === answer.resultId
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

async function readAccountId(
  client: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  supabaseUserId: string,
) {
  const response = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", supabaseUserId)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (response.error) return "read_failed" as const;
  return response.data?.account_id ? String(response.data.account_id) : null;
}

function serializeLabResult(row: LabResultRow) {
  const payload = readRecord(row.result_payload);
  const profilePayload = readRecord(payload.profile);
  const assessment =
    readLabAssessment(payload.assessmentSnapshot) ??
    getLabAssessment(row.lab_slug);
  const frozenProfile = readLabProfile(profilePayload);
  const profile =
    frozenProfile ??
    assessment?.profiles.find(
      (candidate) => candidate.id === profilePayload.id,
    );
  if (!assessment || !profile) return null;

  const scores = readNumberRecord(payload.scores);
  const tiedProfileIds = Array.isArray(payload.tiedProfileIds)
    ? payload.tiedProfileIds.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const result = { profile, scores, tiedProfileIds } satisfies LabScoreResult;

  return {
    answers: readLabAnswers(row.answers),
    assessmentSnapshot: assessment,
    completedAt: row.completed_at,
    contentVersion: row.content_version,
    localResultId: row.local_result_id,
    ...(row.profile_code_at_completion
      ? {
          nuangCodeContext: {
            capturedAt: row.completed_at,
            code: row.profile_code_at_completion,
          },
        }
      : {}),
    ...(row.assessment_content_release_id
      ? { productReleaseId: row.assessment_content_release_id }
      : {}),
    result,
    serverResultId: row.id,
    slug: assessment.slug,
    sync: {
      status: "synced" as const,
      syncedAt: row.updated_at ?? row.completed_at,
    },
  };
}

function readLabAssessment(value: unknown) {
  const assessment = readRecord(value);
  return typeof assessment.slug === "string" &&
    typeof assessment.title === "string" &&
    typeof assessment.cardTitle === "string" &&
    typeof assessment.contentVersion === "string" &&
    Array.isArray(assessment.questions) &&
    Array.isArray(assessment.profiles)
    ? (assessment as unknown as LabAssessment)
    : null;
}

function readLabProfile(value: Record<string, unknown>) {
  return typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.shortTitle === "string" &&
    typeof value.summary === "string" &&
    Array.isArray(value.strengths) &&
    value.strengths.every((item) => typeof item === "string") &&
    typeof value.watch === "string" &&
    typeof value.relationTip === "string" &&
    typeof value.smallExperiment === "string"
    ? (value as unknown as LabResultProfile)
    : null;
}

function readLabAnswers(value: unknown) {
  const answers = readRecord(value);
  return Object.fromEntries(
    Object.entries(answers).filter((entry): entry is [string, LabAnswer] => {
      const answer = readRecord(entry[1]);
      return (
        typeof answer.optionId === "string" &&
        typeof answer.questionId === "string" &&
        typeof answer.resultId === "string"
      );
    }),
  );
}

function readNumberRecord(value: unknown) {
  return Object.fromEntries(
    Object.entries(readRecord(value)).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1]),
    ),
  );
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
