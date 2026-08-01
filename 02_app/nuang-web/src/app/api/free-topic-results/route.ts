import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessTopicAssessmentRoute } from "@/features/assessment/assessment-catalog";
import {
  buildFreeTopicResultReport,
  calculateFreeTopicResult,
  getFreeTopicAssessment,
  getFreeTopicQuestions,
  type FreeTopicResultReport,
  type FreeTopicScaleStatistics,
  type FreeTopicScoreResult,
} from "@/features/assessment/free-topic-assessments";
import {
  freeTopicResultFormatVersion,
  getFreeTopicEvidenceVersion,
  getFreeTopicInstrumentVersion,
  getFreeTopicReportContentVersion,
  getFreeTopicScoringVersion,
} from "@/features/assessment/free-topic-result-version";
import { buildFreeTopicNuangCodeSection } from "@/features/assessment/free-topic-long-report";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { isCurrentNuangCode } from "@/features/nuang-code/profile-name-resolution";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const freeTopicResultSchema = z.object({
  answers: z.record(
    z.string(),
    z
      .object({
        answeredAt: z.string(),
        questionId: z.string(),
        unsureReason: z
          .enum([
            "NO_EXPERIENCE",
            "CONTEXT_VARIES",
            "WORDING_UNCLEAR",
            "PREFER_NOT_TO_ANSWER",
          ])
          .optional(),
        value: z
          .union([
            z.literal(1),
            z.literal(2),
            z.literal(3),
            z.literal(4),
            z.literal(5),
          ])
          .optional(),
      })
      .refine(
        (answer) =>
          (answer.value !== undefined) !== (answer.unsureReason !== undefined),
        { message: "value 또는 unsureReason 중 하나만 필요해요." },
      ),
  ),
  assessment: z.object({
    slug: z.string(),
  }),
  completedAt: z.string().datetime(),
  localResultId: z.string().min(6).max(128),
});

const freeTopicResultsQuerySchema = z.object({
  localResultId: z.string().min(6).max(128).optional(),
});

const deleteFreeTopicResultSchema = z.object({
  localResultId: z.string().min(6).max(128),
});

type FreeTopicResultRow = {
  category_id: string;
  category_label: string;
  completed_at: string;
  evidence_payload: unknown;
  id: string;
  local_result_id: string;
  profile_code_at_completion: string | null;
  result_summary: unknown;
  topic_slug: string;
  updated_at?: string;
};

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

  const payload = parsedBody.data;
  const assessment = getFreeTopicAssessment(payload.assessment.slug);

  if (!assessment || !canAccessTopicAssessmentRoute(payload.assessment.slug)) {
    return NextResponse.json(
      { error: "assessment_not_available" },
      { status: 404 },
    );
  }

  const questions = getFreeTopicQuestions(assessment.slug);
  const allowedQuestionIds = new Set(questions.map((question) => question.id));
  const answerEntries = Object.entries(payload.answers);
  const hasExactQuestionSet =
    answerEntries.length === questions.length &&
    questions.every((question) => {
      const answer = payload.answers[question.id];
      return answer?.questionId === question.id;
    }) &&
    answerEntries.every(
      ([answerKey, answer]) =>
        answerKey === answer.questionId && allowedQuestionIds.has(answerKey),
    );

  if (!hasExactQuestionSet) {
    return NextResponse.json(
      { error: "incomplete_or_unknown_answers" },
      { status: 422 },
    );
  }

  const result = calculateFreeTopicResult({
    answers: payload.answers,
    assessment,
    observedAt: payload.completedAt,
  });
  const baseReportSnapshot = buildFreeTopicResultReport({
    assessment,
    result,
  });
  const evidenceVersion = getFreeTopicEvidenceVersion(assessment.slug);
  const instrumentVersion = getFreeTopicInstrumentVersion(assessment.slug);
  const reportContentVersion = getFreeTopicReportContentVersion(
    assessment.slug,
  );
  const scoringVersion = getFreeTopicScoringVersion(assessment.slug);

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
  const profileCodeAtCompletion = await readProfileCodeAtCompletion({
    accountId,
    client: serviceClient,
    completedAt: payload.completedAt,
  });
  const nuangCodeSection = profileCodeAtCompletion
    ? buildFreeTopicNuangCodeSection({
        assessment,
        code: profileCodeAtCompletion,
        scoresByScaleId: result.scoresByScaleId,
      })
    : null;
  const reportSnapshot: FreeTopicResultReport = {
    ...baseReportSnapshot,
    ...(nuangCodeSection ? { nuangCodeSection } : {}),
  };
  const insertResponse = await serviceClient
    .schema("assessment")
    .from("free_topic_result")
    .insert({
      account_id: accountId,
      category_id: assessment.categoryId,
      category_label: assessment.categoryLabel,
      completed_at: payload.completedAt,
      evidence_payload: {
        evidenceVersion,
        formatVersion: freeTopicResultFormatVersion,
        instrumentVersion,
        observations: result.observations,
        reportContentVersion,
        reportSnapshot,
        scaleStatisticsById: result.scaleStatisticsById,
        scoresByScaleId: result.scoresByScaleId,
        scoresByQuestionId: result.scoresByQuestionId,
        scoresByTargetId: result.scoresByTargetId,
        scoringVersion,
        validResponsesByScaleId: result.validResponsesByScaleId,
      },
      local_result_id: payload.localResultId,
      profile_code_at_completion: profileCodeAtCompletion,
      result_summary: {
        summary: result.summary,
        title: assessment.title,
      },
      topic_slug: assessment.slug,
    })
    .select("id, updated_at")
    .single();

  if (insertResponse.error?.code === "23505") {
    const existingResponse = await serviceClient
      .schema("assessment")
      .from("free_topic_result")
      .select(
        "id, local_result_id, topic_slug, category_id, category_label, completed_at, profile_code_at_completion, result_summary, evidence_payload, updated_at",
      )
      .eq("account_id", accountId)
      .eq("local_result_id", payload.localResultId)
      .is("deleted_at", null)
      .maybeSingle();
    const existingResult = existingResponse.data
      ? serializeStoredFreeTopicResult(
          existingResponse.data as FreeTopicResultRow,
        )
      : null;

    if (existingResponse.error || !existingResult) {
      return NextResponse.json(
        { error: "free_topic_result_read_after_conflict_failed" },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      result: existingResult,
      resultId: existingResult.serverResultId,
      syncedAt: existingResult.sync.syncedAt,
    });
  }

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
    result: serializeFreeTopicResult({
      assessment,
      completedAt: payload.completedAt,
      evidenceVersion,
      formatVersion: freeTopicResultFormatVersion,
      instrumentVersion,
      localResultId: payload.localResultId,
      profileCodeAtCompletion,
      reportContentVersion,
      reportSnapshot,
      result,
      scoringVersion,
      serverResultId: (insertResponse.data as { id: string }).id,
      syncedAt: (insertResponse.data as { updated_at: string }).updated_at,
    }),
    resultId: (insertResponse.data as { id: string }).id,
    syncedAt: (insertResponse.data as { updated_at: string }).updated_at,
  });
}

export async function GET(request: Request) {
  const parsedQuery = freeTopicResultsQuerySchema.safeParse({
    localResultId:
      new URL(request.url).searchParams.get("localResultId") ?? undefined,
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
      "id, local_result_id, topic_slug, category_id, category_label, completed_at, profile_code_at_completion, result_summary, evidence_payload",
    )
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .order("completed_at", { ascending: false });

  if (parsedQuery.data.localResultId) {
    resultQuery = resultQuery.eq(
      "local_result_id",
      parsedQuery.data.localResultId,
    );
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
    results: (resultResponse.data ?? []).flatMap((row) => {
      const storedResult = serializeStoredFreeTopicResult(
        row as FreeTopicResultRow,
      );
      return storedResult ? [storedResult] : [];
    }),
  });
}

export async function DELETE(request: Request) {
  const parsedBody = deleteFreeTopicResultSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsedBody.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  const auth = await requireAuthenticatedUser();

  if (!auth.ok) return auth.response;

  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) return createApiClosedResponse("supabase_env_missing");

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
    return NextResponse.json({ ok: true });
  }

  const deletedAt = new Date().toISOString();
  const deleteResponse = await serviceClient
    .schema("assessment")
    .from("free_topic_result")
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq(
      "account_id",
      (accountResponse.data as { account_id: string }).account_id,
    )
    .eq("local_result_id", parsedBody.data.localResultId)
    .is("deleted_at", null);

  if (deleteResponse.error) {
    return NextResponse.json(
      { error: "free_topic_result_delete_failed" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}

function serializeFreeTopicResult({
  assessment,
  completedAt,
  evidenceVersion,
  formatVersion,
  instrumentVersion,
  localResultId,
  profileCodeAtCompletion,
  reportContentVersion,
  reportSnapshot,
  result,
  scoringVersion,
  serverResultId,
  syncedAt,
}: {
  assessment: NonNullable<ReturnType<typeof getFreeTopicAssessment>>;
  completedAt: string;
  evidenceVersion?: string;
  formatVersion: number;
  instrumentVersion: string;
  localResultId: string;
  profileCodeAtCompletion: string | null;
  reportContentVersion: string;
  reportSnapshot: FreeTopicResultReport;
  result: FreeTopicScoreResult;
  scoringVersion: string;
  serverResultId: string;
  syncedAt: string;
}) {
  return {
    assessment: {
      categoryId: assessment.categoryId,
      categoryLabel: assessment.categoryLabel,
      slug: assessment.slug,
      title: assessment.title,
    },
    completedAt,
    ...(evidenceVersion ? { evidenceVersion } : {}),
    formatVersion,
    instrumentVersion,
    localResultId,
    ...(profileCodeAtCompletion
      ? {
          nuangCodeContext: {
            capturedAt: completedAt,
            code: profileCodeAtCompletion,
          },
        }
      : {}),
    reportContentVersion,
    reportSnapshot,
    result,
    scoringVersion,
    serverResultId,
    sync: { status: "synced", syncedAt },
  };
}

function serializeStoredFreeTopicResult(row: FreeTopicResultRow) {
  const assessment = getFreeTopicAssessment(row.topic_slug);

  if (!assessment) return null;

  const evidence = readRecord(row.evidence_payload);
  const evidenceVersion =
    typeof evidence.evidenceVersion === "string"
      ? evidence.evidenceVersion
      : undefined;
  const instrumentVersion =
    typeof evidence.instrumentVersion === "string"
      ? evidence.instrumentVersion
      : "";
  const scoringVersion =
    typeof evidence.scoringVersion === "string" ? evidence.scoringVersion : "";
  const reportContentVersion =
    typeof evidence.reportContentVersion === "string"
      ? evidence.reportContentVersion
      : "";
  const storedSnapshot = readReportSnapshot(evidence.reportSnapshot);
  const usesCurrentScoring =
    instrumentVersion === getFreeTopicInstrumentVersion(assessment.slug) &&
    scoringVersion === getFreeTopicScoringVersion(assessment.slug);

  // 과거 결과는 저장 당시 스냅샷이 있을 때만 보여 줍니다.
  // 현재 문항·채점 결과만 스냅샷이 없는 초기 기록을 한 번 복구할 수 있습니다.
  if (!storedSnapshot && !usesCurrentScoring) return null;

  const result: FreeTopicScoreResult = {
    observations: readObservations(row.evidence_payload),
    scaleStatisticsById: readScaleStatistics(row.evidence_payload),
    scoresByScaleId: readScaleScores(row.evidence_payload),
    scoresByQuestionId: readQuestionScores(row.evidence_payload),
    scoresByTargetId: readScores(row.evidence_payload),
    summary: readSummary(row.result_summary),
    validResponsesByScaleId: readValidResponseCounts(row.evidence_payload),
  };
  const reportSnapshot =
    storedSnapshot ?? buildFreeTopicResultReport({ assessment, result });

  return serializeFreeTopicResult({
    assessment,
    completedAt: row.completed_at,
    evidenceVersion,
    formatVersion:
      typeof evidence.formatVersion === "number"
        ? evidence.formatVersion
        : freeTopicResultFormatVersion,
    instrumentVersion,
    localResultId: row.local_result_id,
    profileCodeAtCompletion:
      typeof row.profile_code_at_completion === "string"
        ? row.profile_code_at_completion
        : null,
    reportContentVersion:
      reportContentVersion || getFreeTopicReportContentVersion(assessment.slug),
    reportSnapshot,
    result,
    scoringVersion,
    serverResultId: row.id,
    syncedAt: row.updated_at ?? row.completed_at,
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
    created_at: string;
    profile_code: string;
    report_kind: "full" | "quick";
  }>;
  const full = rows.find((row) => row.report_kind === "full");
  const selected = full ?? rows[0];

  return isCurrentNuangCode(selected?.profile_code)
    ? selected.profile_code
    : null;
}

function readSummary(value: unknown) {
  const summary = readRecord(value).summary;
  return typeof summary === "string"
    ? summary
    : "저장된 무료 주제 검사 결과예요.";
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

function readScaleScores(value: unknown) {
  const scoresByScaleId = readRecord(value).scoresByScaleId;
  return isRecord(scoresByScaleId)
    ? Object.fromEntries(
        Object.entries(scoresByScaleId).filter(
          (entry): entry is [string, number] => typeof entry[1] === "number",
        ),
      )
    : {};
}

function readQuestionScores(value: unknown) {
  const scoresByQuestionId = readRecord(value).scoresByQuestionId;
  return isRecord(scoresByQuestionId)
    ? Object.fromEntries(
        Object.entries(scoresByQuestionId).filter(
          (entry): entry is [string, number] => typeof entry[1] === "number",
        ),
      )
    : {};
}

function readScaleStatistics(
  value: unknown,
): Record<string, FreeTopicScaleStatistics> {
  const scaleStatisticsById = readRecord(value).scaleStatisticsById;
  if (!isRecord(scaleStatisticsById)) return {};

  return Object.fromEntries(
    Object.entries(scaleStatisticsById).flatMap(([scaleId, rawStatistics]) => {
      if (!isRecord(rawStatistics)) return [];
      const {
        dispersion,
        maxScore,
        meanScore,
        minScore,
        responsePattern,
        scoreRange,
        validResponses,
      } = rawStatistics;
      if (
        typeof dispersion !== "number" ||
        typeof maxScore !== "number" ||
        typeof meanScore !== "number" ||
        typeof minScore !== "number" ||
        (responsePattern !== "steady" && responsePattern !== "varied") ||
        typeof scoreRange !== "number" ||
        typeof validResponses !== "number"
      ) {
        return [];
      }

      const statistics: FreeTopicScaleStatistics = {
        dispersion,
        maxScore,
        meanScore,
        minScore,
        responsePattern,
        scoreRange,
        validResponses,
      };

      return [[scaleId, statistics]];
    }),
  );
}

function readValidResponseCounts(value: unknown) {
  const validResponsesByScaleId = readRecord(value).validResponsesByScaleId;
  return isRecord(validResponsesByScaleId)
    ? Object.fromEntries(
        Object.entries(validResponsesByScaleId).filter(
          (entry): entry is [string, number] => typeof entry[1] === "number",
        ),
      )
    : {};
}

function readReportSnapshot(value: unknown): FreeTopicResultReport | null {
  if (
    !isRecord(value) ||
    (typeof value.averageScore !== "number" && value.averageScore !== null) ||
    typeof value.confidenceCopy !== "string" ||
    typeof value.confidenceLabel !== "string" ||
    typeof value.headline !== "string" ||
    !Array.isArray(value.longReportSections) ||
    !Array.isArray(value.signals)
  ) {
    return null;
  }

  return value as unknown as FreeTopicResultReport;
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
