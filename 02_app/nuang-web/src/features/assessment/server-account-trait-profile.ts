import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildAccountDynamicTraitProfile,
  type CoreTraitEvidenceResult,
  type TopicTraitEvidenceResult,
} from "@/features/assessment/account-dynamic-trait-profile";
import type { AccountTraitProfile } from "@/features/assessment/account-trait-profile-contract";
import type {
  FreeTopicAssessment,
  FreeTopicQuestion,
} from "@/features/assessment/free-topic-assessments";
import {
  getFreeTopicAssessment,
  getFreeTopicQuestions,
} from "@/features/assessment/free-topic-assessments";
import { isCurrentNuangCode } from "@/features/nuang-code/profile-name-resolution";

type ServiceClient = SupabaseClient;

type CoreRow = {
  created_at: string;
  id: string;
  profile_code: string;
  report_kind: "full" | "quick";
  summary: unknown;
};

type TopicRow = {
  completed_at: string;
  evidence_payload: unknown;
  id: string;
  topic_slug: string;
};

export type AccountTraitProfileTransition = {
  after: AccountTraitProfile | null;
  before: AccountTraitProfile | null;
  isRetest: boolean;
  replacedResultId: string | null;
  selectedAsLatest: boolean;
};

export async function calculateAccountTraitProfileTransition({
  accountId,
  candidateTopicResult,
  client,
  now,
}: {
  accountId: string;
  candidateTopicResult: TopicTraitEvidenceResult;
  client: ServiceClient;
  now: Date;
}): Promise<AccountTraitProfileTransition | null> {
  const evidence = await readAccountTraitEvidence({ accountId, client });
  if (!evidence) return null;

  const previousSameTopic = [...evidence.topicResults]
    .filter((result) => result.slug === candidateTopicResult.slug)
    .sort((left, right) =>
      right.completedAt.localeCompare(left.completedAt),
    )[0];
  const selectedAsLatest =
    !previousSameTopic ||
    candidateTopicResult.completedAt >= previousSameTopic.completedAt;

  return {
    after: buildAccountDynamicTraitProfile({
      coreResults: evidence.coreResults,
      now,
      // 후보를 먼저 두어 완료 시각이 같은 재검사도 새 결과를 선택합니다.
      topicResults: [candidateTopicResult, ...evidence.topicResults],
    }),
    before: buildAccountDynamicTraitProfile({
      coreResults: evidence.coreResults,
      now,
      topicResults: evidence.topicResults,
    }),
    isRetest: Boolean(previousSameTopic),
    replacedResultId: selectedAsLatest
      ? (previousSameTopic?.resultId ?? null)
      : null,
    selectedAsLatest,
  };
}

export async function rebuildAccountTraitProfile({
  accountId,
  client,
  now = new Date(),
}: {
  accountId: string;
  client: ServiceClient;
  now?: Date;
}): Promise<AccountTraitProfile | null> {
  const evidence = await readAccountTraitEvidence({ accountId, client });
  if (!evidence) return null;

  const profile = buildAccountDynamicTraitProfile({
    coreResults: evidence.coreResults,
    now,
    topicResults: evidence.topicResults,
  });

  if (!profile) {
    const profileTable = client.schema("scoring").from("account_trait_profile");
    if ("delete" in profileTable && typeof profileTable.delete === "function") {
      await profileTable.delete().eq("account_id", accountId);
    }
    return null;
  }

  const response = await client
    .schema("scoring")
    .from("account_trait_profile")
    .upsert(
      {
        account_id: accountId,
        alternative_codes: profile.alternativeCodes,
        base_result_report_id: profile.baseResultReportId,
        domains: profile.domains,
        evidence_count: profile.evidenceCount,
        profile_code: profile.code,
        profile_name: profile.profileName,
        source: profile.source,
        topic_count: profile.topicCount,
        updated_at: profile.updatedAt,
        version: profile.version,
      },
      { onConflict: "account_id" },
    );

  return response.error ? null : profile;
}

async function readAccountTraitEvidence({
  accountId,
  client,
}: {
  accountId: string;
  client: ServiceClient;
}) {
  const [coreResponse, topicResponse] = await Promise.all([
    client
      .schema("report")
      .from("result_report")
      .select("id, report_kind, profile_code, summary, created_at")
      .eq("account_id", accountId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30),
    client
      .schema("assessment")
      .from("free_topic_result")
      .select("id, topic_slug, completed_at, evidence_payload")
      .eq("account_id", accountId)
      .is("deleted_at", null)
      .order("completed_at", { ascending: false })
      .limit(100),
  ]);

  if (coreResponse.error || topicResponse.error) return null;

  const coreResults = ((coreResponse.data ?? []) as CoreRow[]).flatMap(
    parseCoreResult,
  );
  const topicResults = ((topicResponse.data ?? []) as TopicRow[]).flatMap(
    parseTopicResult,
  );
  return { coreResults, topicResults };
}

function parseCoreResult(row: CoreRow): CoreTraitEvidenceResult[] {
  const summary = asRecord(row.summary);
  const domains = Array.isArray(summary.domains)
    ? summary.domains.flatMap((value) => {
        const domain = asRecord(value);
        if (typeof domain.domainId !== "string") return [];
        const score =
          typeof domain.score === "number" && Number.isFinite(domain.score)
            ? domain.score
            : null;
        return [
          {
            domainId: domain.domainId,
            score,
            symbol: typeof domain.symbol === "string" ? domain.symbol : null,
          },
        ];
      })
    : [];
  const completedAt =
    typeof summary.completedAt === "string"
      ? summary.completedAt
      : row.created_at;

  if (!isCurrentNuangCode(row.profile_code) || domains.length === 0) return [];

  return [
    {
      completedAt,
      domains,
      kind: row.report_kind,
      profileCode: row.profile_code,
      resultReportId: row.id,
    },
  ];
}

function parseTopicResult(row: TopicRow): TopicTraitEvidenceResult[] {
  const evidence = asRecord(row.evidence_payload);
  const assessmentSnapshot = asRecord(evidence.assessmentSnapshot);
  const builtinAssessment = getFreeTopicAssessment(row.topic_slug);
  const assessment =
    typeof assessmentSnapshot.slug === "string"
      ? (assessmentSnapshot as unknown as FreeTopicAssessment)
      : builtinAssessment;
  const snapshotQuestions = Array.isArray(evidence.questionsSnapshot)
    ? evidence.questionsSnapshot.filter(isFreeTopicQuestion)
    : [];
  const questions =
    snapshotQuestions.length > 0
      ? snapshotQuestions
      : getFreeTopicQuestions(row.topic_slug);
  const scoresByQuestionId = numberRecord(evidence.scoresByQuestionId);
  const scoresByTargetId = numberRecord(evidence.scoresByTargetId);

  if (
    !assessment ||
    questions.length === 0 ||
    (Object.keys(scoresByQuestionId).length === 0 &&
      Object.keys(scoresByTargetId).length === 0)
  ) {
    return [];
  }

  return [
    {
      assessment,
      completedAt: row.completed_at,
      questions,
      resultId: row.id,
      scoresByQuestionId,
      scoresByTargetId,
      slug: row.topic_slug,
    },
  ];
}

function isFreeTopicQuestion(value: unknown): value is FreeTopicQuestion {
  const question = asRecord(value);
  const target = asRecord(question.target);
  return (
    typeof question.id === "string" &&
    typeof question.text === "string" &&
    typeof question.contextLabel === "string" &&
    (target.kind === "domain" || target.kind === "facet") &&
    typeof target.id === "string"
  );
}

function numberRecord(value: unknown) {
  const record = asRecord(value);
  return Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1]),
    ),
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
