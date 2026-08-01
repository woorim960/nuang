import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import {
  getFreeTopicAssessment,
  type FreeTopicResultReport,
  type FreeTopicScoreResult,
} from "@/features/assessment/free-topic-assessments";
import {
  freeTopicResultFormatVersion,
  getFreeTopicInstrumentVersion,
  getFreeTopicReportContentVersion,
  getFreeTopicScoringVersion,
} from "@/features/assessment/free-topic-result-version";
import type { StoredFreeTopicResult } from "@/features/assessment/free-topic-storage";
import {
  getLabAssessment,
  type LabScoreResult,
} from "@/features/lab/lab-assessments";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";
import {
  createProfileReportKey,
  parseProfileReportKey,
  type OriginalProfileReportSummary,
  type ProfileReportKind,
  type ProfileReportVisibility,
} from "@/features/public-profile/profile-report-contract";

type ProfileReportVisibilityRow = {
  source_id: string;
  source_kind: ProfileReportKind;
  visibility: ProfileReportVisibility;
};

export type OriginalProfileReport =
  | {
      kind: "core";
      result: AccountResultSummary;
      summary: OriginalProfileReportSummary;
    }
  | {
      kind: "topic";
      result: StoredFreeTopicResult;
      summary: OriginalProfileReportSummary;
    }
  | {
      answeredCount: number;
      kind: "lab";
      localResultId: string;
      result: LabScoreResult;
      summary: OriginalProfileReportSummary;
    };

export async function readOriginalProfileReportSummaries({
  client,
  ownerAccountId,
  viewerAccountId,
}: {
  client: SupabaseClient;
  ownerAccountId: string;
  viewerAccountId: string | null;
}) {
  const viewerCanManage = ownerAccountId === viewerAccountId;
  const [coreRows, topicRows, labRows, visibilityRead] = await Promise.all([
    readCoreRows(client, ownerAccountId),
    readTopicRows(client, ownerAccountId),
    readLabRows(client, ownerAccountId),
    readVisibilityRows(client, ownerAccountId),
  ]);
  if (!viewerCanManage && !visibilityRead.ok) return [];
  const visibilityBySource = new Map(
    visibilityRead.rows.map((row) => [
      `${row.source_kind}:${row.source_id}`,
      row.visibility,
    ]),
  );
  const summaries: OriginalProfileReportSummary[] = [
    ...coreRows.flatMap((row) => {
      const result = mapCoreRow(row);
      if (!result) return [];
      const profile = getCandidateProfileDefinition(result.profileCode);
      return [
        {
          assessmentSlug:
            result.kind === "full" ? "nu-core-full" : "nu-core-quick",
          assessmentTitle:
            result.kind === "full" ? "정밀 코어 검사" : "빠른 코어 검사",
          completedAt: result.completedAt,
          reportKey: createProfileReportKey("core", result.resultReportId),
          resultName: profile?.displayName ?? result.profileName,
          summary:
            profile?.summary ??
            "다섯 가지 성향 방향에서 이번 답에 더 자주 나타난 모습을 정리했어요.",
          type: "core" as const,
          viewerCanManage,
          visibility:
            visibilityBySource.get(`core:${result.resultReportId}`) ??
            "profile_public",
        },
      ];
    }),
    ...topicRows.flatMap((row) => {
      const result = mapTopicRow(row);
      if (!result) return [];
      return [
        {
          assessmentSlug: result.assessment.slug,
          assessmentTitle: result.assessment.title,
          completedAt: result.completedAt,
          reportKey: createProfileReportKey("topic", String(row.id)),
          resultName:
            result.reportSnapshot.personalizedSummary?.title ??
            result.reportSnapshot.headline,
          summary:
            result.reportSnapshot.personalizedSummary?.body ??
            result.reportSnapshot.headline,
          type: "topic" as const,
          viewerCanManage,
          visibility:
            visibilityBySource.get(`topic:${String(row.id)}`) ??
            "profile_public",
        },
      ];
    }),
    ...labRows.flatMap((row) => {
      const result = mapLabRow(row);
      const assessment = getLabAssessment(String(row.lab_slug));
      if (!result || !assessment) return [];
      return [
        {
          assessmentSlug: assessment.slug,
          assessmentTitle: assessment.title,
          completedAt: String(row.completed_at),
          reportKey: createProfileReportKey("lab", String(row.id)),
          resultName: result.profile.title,
          summary: result.profile.summary,
          type: "lab" as const,
          viewerCanManage,
          visibility:
            visibilityBySource.get(`lab:${String(row.id)}`) ??
            "profile_public",
        },
      ];
    }),
  ];

  return summaries
    .filter(
      (report) =>
        viewerCanManage || report.visibility === ("profile_public" as const),
    )
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt));
}

export async function readOriginalProfileReport({
  client,
  ownerAccountId,
  reportKey,
  viewerAccountId,
}: {
  client: SupabaseClient;
  ownerAccountId: string;
  reportKey: string;
  viewerAccountId: string | null;
}): Promise<OriginalProfileReport | null> {
  const parsedKey = parseProfileReportKey(reportKey);
  if (!parsedKey) return null;
  const viewerCanManage = ownerAccountId === viewerAccountId;
  const visibility = await readVisibility({
    client,
    kind: parsedKey.kind,
    ownerAccountId,
    sourceId: parsedKey.sourceId,
  });
  if (!viewerCanManage && visibility !== "profile_public") return null;
  const effectiveVisibility: ProfileReportVisibility =
    visibility === "unavailable" ? "profile_public" : visibility;

  if (parsedKey.kind === "core") {
    const response = await client
      .schema("report")
      .from("result_report")
      .select(
        "id, attempt_id, report_kind, profile_code, profile_name, summary, created_at",
      )
      .eq("id", parsedKey.sourceId)
      .eq("account_id", ownerAccountId)
      .is("deleted_at", null)
      .maybeSingle();
    if (response.error || !response.data) return null;
    const attemptResponse = await client
      .schema("assessment")
      .from("assessment_attempt")
      .select("id, local_result_id, completed_at, claimed_at")
      .eq("id", String(response.data.attempt_id))
      .eq("account_id", ownerAccountId)
      .maybeSingle();
    const result = mapCoreRow({
      ...response.data,
      attempt: attemptResponse.data ?? null,
    });
    if (!result) return null;
    const summary = (
      await readOriginalProfileReportSummaries({
        client,
        ownerAccountId,
        viewerAccountId,
      })
    ).find((item) => item.reportKey === reportKey);
    return summary ? { kind: "core", result, summary } : null;
  }

  if (parsedKey.kind === "topic") {
    const response = await client
      .schema("assessment")
      .from("free_topic_result")
      .select(
        "id, local_result_id, topic_slug, category_id, category_label, completed_at, profile_code_at_completion, result_summary, evidence_payload",
      )
      .eq("id", parsedKey.sourceId)
      .eq("account_id", ownerAccountId)
      .is("deleted_at", null)
      .maybeSingle();
    const result = response.data ? mapTopicRow(response.data) : null;
    if (!result) return null;
    return {
      kind: "topic",
      result,
      summary: {
        assessmentSlug: result.assessment.slug,
        assessmentTitle: result.assessment.title,
        completedAt: result.completedAt,
        reportKey,
        resultName:
          result.reportSnapshot.personalizedSummary?.title ??
          result.reportSnapshot.headline,
        summary:
          result.reportSnapshot.personalizedSummary?.body ??
          result.reportSnapshot.headline,
        type: "topic",
        viewerCanManage,
        visibility: effectiveVisibility,
      },
    };
  }

  const response = await client
    .schema("assessment")
    .from("lab_result")
    .select(
      "id, local_result_id, lab_slug, content_version, completed_at, answers, result_payload",
    )
    .eq("id", parsedKey.sourceId)
    .eq("account_id", ownerAccountId)
    .is("deleted_at", null)
    .maybeSingle();
  const result = response.data ? mapLabRow(response.data) : null;
  const assessment = response.data
    ? getLabAssessment(String(response.data.lab_slug))
    : null;
  if (!result || !assessment || !response.data) return null;

  return {
    answeredCount: Object.keys(readRecord(response.data.answers)).length,
    kind: "lab",
    localResultId: String(response.data.local_result_id),
    result,
    summary: {
      assessmentSlug: assessment.slug,
      assessmentTitle: assessment.title,
      completedAt: String(response.data.completed_at),
      reportKey,
      resultName: result.profile.title,
      summary: result.profile.summary,
      type: "lab",
      viewerCanManage,
      visibility: effectiveVisibility,
    },
  };
}

export async function resolveProfileOwnerAccountId({
  client,
  profileId,
}: {
  client: SupabaseClient;
  profileId: string;
}) {
  const communityProfile = await client
    .schema("profile")
    .from("community_profile")
    .select("account_id")
    .eq("id", profileId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (!communityProfile.error && communityProfile.data?.account_id) {
    return String(communityProfile.data.account_id);
  }

  const snapshot = await client
    .schema("profile")
    .from("profile_public_snapshot")
    .select("account_id")
    .eq("id", profileId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  return snapshot.data?.account_id ? String(snapshot.data.account_id) : null;
}

async function readCoreRows(client: SupabaseClient, accountId: string) {
  const reports = await client
    .schema("report")
    .from("result_report")
    .select(
      "id, attempt_id, report_kind, profile_code, profile_name, summary, created_at",
    )
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (reports.error || !reports.data?.length) return [];
  const attempts = await client
    .schema("assessment")
    .from("assessment_attempt")
    .select("id, local_result_id, completed_at, claimed_at")
    .eq("account_id", accountId)
    .in(
      "id",
      reports.data.map((report) => String(report.attempt_id)),
    );
  const attemptById = new Map(
    (attempts.data ?? []).map((attempt) => [String(attempt.id), attempt]),
  );
  return reports.data.map((report) => ({
    ...report,
    attempt: attemptById.get(String(report.attempt_id)) ?? null,
  }));
}

async function readTopicRows(client: SupabaseClient, accountId: string) {
  const response = await client
    .schema("assessment")
    .from("free_topic_result")
    .select(
      "id, local_result_id, topic_slug, category_id, category_label, completed_at, profile_code_at_completion, result_summary, evidence_payload",
    )
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .order("completed_at", { ascending: false });
  return response.error ? [] : (response.data ?? []);
}

async function readLabRows(client: SupabaseClient, accountId: string) {
  const response = await client
    .schema("assessment")
    .from("lab_result")
    .select(
      "id, lab_slug, content_version, completed_at, answers, result_payload",
    )
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .order("completed_at", { ascending: false });
  return response.error ? [] : (response.data ?? []);
}

async function readVisibilityRows(client: SupabaseClient, accountId: string) {
  const response = await client
    .schema("profile")
    .from("profile_report_visibility")
    .select("source_kind, source_id, visibility")
    .eq("account_id", accountId);
  return response.error
    ? { ok: false as const, rows: [] as ProfileReportVisibilityRow[] }
    : {
        ok: true as const,
        rows: (response.data ?? []) as ProfileReportVisibilityRow[],
      };
}

async function readVisibility({
  client,
  kind,
  ownerAccountId,
  sourceId,
}: {
  client: SupabaseClient;
  kind: ProfileReportKind;
  ownerAccountId: string;
  sourceId: string;
}) {
  const response = await client
    .schema("profile")
    .from("profile_report_visibility")
    .select("visibility")
    .eq("account_id", ownerAccountId)
    .eq("source_kind", kind)
    .eq("source_id", sourceId)
    .maybeSingle();
  if (response.error) return "unavailable";
  return response.data?.visibility === "private"
    ? "private"
    : "profile_public";
}

function mapCoreRow(row: Record<string, unknown>) {
  const attempt = readRecord(row.attempt);
  const stored = readRecord(row.summary);
  const domains = Array.isArray(stored.domains) ? stored.domains : [];
  const facets = Array.isArray(stored.facets) ? stored.facets : [];
  if (
    typeof row.id !== "string" ||
    typeof row.attempt_id !== "string" ||
    (row.report_kind !== "quick" && row.report_kind !== "full") ||
    typeof row.profile_code !== "string" ||
    typeof row.profile_name !== "string"
  ) {
    return null;
  }

  return {
    assessmentAttemptId: row.attempt_id,
    completedAt:
      stringValue(stored.completedAt) ??
      stringValue(attempt.completed_at) ??
      stringValue(attempt.claimed_at) ??
      stringValue(row.created_at) ??
      new Date(0).toISOString(),
    createdAt: stringValue(row.created_at) ?? new Date(0).toISOString(),
    domains: domains as AccountResultSummary["domains"],
    facets: facets as AccountResultSummary["facets"],
    kind: row.report_kind,
    localResultId: stringValue(attempt.local_result_id),
    profileCode: row.profile_code,
    profileName: row.profile_name,
    resultLabel:
      stringValue(stored.resultLabel) ??
      (row.report_kind === "full" ? "현재 대표 성향" : "첫 성향"),
    resultReportId: row.id,
  } satisfies AccountResultSummary;
}

function mapTopicRow(row: Record<string, unknown>) {
  const assessment = getFreeTopicAssessment(String(row.topic_slug ?? ""));
  const evidence = readRecord(row.evidence_payload);
  const reportSnapshot = readReportSnapshot(evidence.reportSnapshot);
  const result = readTopicScoreResult(evidence);
  if (!assessment || !reportSnapshot || !result || typeof row.id !== "string") {
    return null;
  }
  const completedAt = String(row.completed_at);

  return {
    answers: {},
    assessment: {
      categoryId: assessment.categoryId,
      categoryLabel: assessment.categoryLabel,
      slug: assessment.slug,
      title: assessment.title,
    },
    completedAt,
    expiresAt: addDays(new Date(completedAt), 365).toISOString(),
    formatVersion: freeTopicResultFormatVersion,
    instrumentVersion:
      stringValue(evidence.instrumentVersion) ??
      getFreeTopicInstrumentVersion(assessment.slug),
    localResultId: String(row.local_result_id),
    ...(typeof row.profile_code_at_completion === "string"
      ? {
          nuangCodeContext: {
            capturedAt: completedAt,
            code: row.profile_code_at_completion,
          },
        }
      : {}),
    reportContentVersion:
      stringValue(evidence.reportContentVersion) ??
      getFreeTopicReportContentVersion(assessment.slug),
    reportSnapshot,
    result,
    scoringVersion:
      stringValue(evidence.scoringVersion) ??
      getFreeTopicScoringVersion(assessment.slug),
    serverResultId: row.id,
    sync: { status: "synced", syncedAt: completedAt },
  } satisfies StoredFreeTopicResult;
}

function mapLabRow(row: Record<string, unknown>) {
  const raw = readRecord(row.result_payload);
  const profile = readRecord(raw.profile);
  const assessment = getLabAssessment(String(row.lab_slug ?? ""));
  const canonicalProfile = assessment?.profiles.find(
    (item) => item.id === profile.id,
  );
  if (!canonicalProfile) return null;
  const scores = readNumberRecord(raw.scores);
  const tiedProfileIds = Array.isArray(raw.tiedProfileIds)
    ? raw.tiedProfileIds.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  return {
    profile: canonicalProfile,
    scores,
    tiedProfileIds,
  } satisfies LabScoreResult;
}

function readTopicScoreResult(
  evidence: Record<string, unknown>,
): FreeTopicScoreResult | null {
  const scoresByScaleId = readNumberRecord(evidence.scoresByScaleId);
  const scoresByQuestionId = readNumberRecord(evidence.scoresByQuestionId);
  const scoresByTargetId = readNumberRecord(evidence.scoresByTargetId);
  const validResponsesByScaleId = readNumberRecord(
    evidence.validResponsesByScaleId,
  );
  return {
    observations: Array.isArray(evidence.observations)
      ? evidence.observations
      : [],
    scaleStatisticsById: readRecord(
      evidence.scaleStatisticsById,
    ) as FreeTopicScoreResult["scaleStatisticsById"],
    scoresByQuestionId,
    scoresByScaleId,
    scoresByTargetId,
    summary:
      stringValue(readRecord(evidence.reportSnapshot).headline) ??
      "저장된 검사 결과예요.",
    validResponsesByScaleId,
  };
}

function readReportSnapshot(value: unknown): FreeTopicResultReport | null {
  const record = readRecord(value);
  return typeof record.headline === "string" &&
    Array.isArray(record.signals) &&
    Array.isArray(record.longReportSections)
    ? (record as unknown as FreeTopicResultReport)
    : null;
}

function readNumberRecord(value: unknown) {
  const record = readRecord(value);
  return Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    ),
  );
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function addDays(date: Date, days: number) {
  const next = Number.isNaN(date.getTime()) ? new Date() : new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
