import {
  buildTopicDomainObservations,
  type TopicTraitEvidenceResult,
} from "@/features/assessment/account-dynamic-trait-profile";
import type { AccountTraitProfile } from "@/features/assessment/account-trait-profile-contract";
import { candidateFullScoringRelease } from "@/features/assessment/candidate-full-core-seed";
import {
  buildFreeTopicResultReport,
  calculateFreeTopicResult,
  type FreeTopicAnswer,
  type FreeTopicAssessment,
  type FreeTopicQuestion,
} from "@/features/assessment/free-topic-assessments";
import {
  freeTopicResultFormatVersion,
  getFreeTopicEvidenceVersion,
  getFreeTopicInstrumentVersion,
  getFreeTopicReportContentVersion,
  getFreeTopicScoringVersion,
} from "@/features/assessment/free-topic-result-version";
import type { StoredFreeTopicResult } from "@/features/assessment/free-topic-storage";
import { buildTopicTraitImpactSnapshot } from "@/features/assessment/topic-trait-impact";
import type { ResponseValue } from "@/lib/scoring/types";

const previewCompletedAt = "2026-08-03T12:00:00.000Z";
const previewReleaseId = "00000000-0000-4000-8000-000000000001";

export type FreeTopicPreviewTraitImpactScenario =
  | "clearer"
  | "small"
  | "large"
  | "unchanged"
  | "more_balanced"
  | "opposite_seen"
  | "multiple"
  | "code_changed"
  | "retest"
  | "no_baseline"
  | "insufficient_evidence"
  | "not_selected_as_latest"
  | "syncing"
  | "login_required"
  | "connection_failed";

export function buildFreeTopicPreviewResult({
  assessment,
  questions,
  traitImpactScenario = "clearer",
}: {
  assessment: FreeTopicAssessment;
  questions: FreeTopicQuestion[];
  traitImpactScenario?: FreeTopicPreviewTraitImpactScenario;
}): StoredFreeTopicResult {
  const scaleOrder = new Map(
    (assessment.reportScales ?? []).map((scale, index) => [scale.id, index]),
  );
  const answers = Object.fromEntries(
    questions.map((question, index) => {
      const scaleIndex = question.reportScaleId
        ? (scaleOrder.get(question.reportScaleId) ?? index)
        : index;
      const value = [5, 4, 3, 4][scaleIndex % 4] as ResponseValue;
      const answer: FreeTopicAnswer = {
        answeredAt: previewCompletedAt,
        questionId: question.id,
        value,
      };
      return [question.id, answer];
    }),
  );
  const result = calculateFreeTopicResult({
    answers,
    assessment,
    observedAt: previewCompletedAt,
    questions,
  });
  const topicEvidenceResult: TopicTraitEvidenceResult = {
    assessment,
    completedAt: previewCompletedAt,
    questions,
    resultId: "00000000-0000-4000-8000-000000000002",
    scoresByQuestionId: result.scoresByQuestionId ?? {},
    scoresByTargetId: result.scoresByTargetId,
    slug: assessment.slug,
  };
  const affectedDomainIds = buildTopicDomainObservations(
    topicEvidenceResult,
    new Date(previewCompletedAt),
  ).map((observation) => observation.target.id);
  const isPendingScenario = [
    "syncing",
    "login_required",
    "connection_failed",
  ].includes(traitImpactScenario);
  const traitImpactSnapshot = isPendingScenario
    ? undefined
    : buildPreviewTraitImpact({
        affectedDomainIds,
        scenario: traitImpactScenario,
      });
  const sync: StoredFreeTopicResult["sync"] =
    traitImpactScenario === "syncing"
      ? { status: "queued" }
      : traitImpactScenario === "login_required"
        ? { lastError: "login_required", status: "failed" }
        : traitImpactScenario === "connection_failed"
          ? { lastError: "network_unavailable", status: "failed" }
          : { status: "synced", syncedAt: previewCompletedAt };

  return {
    answers,
    assessment: {
      categoryId: assessment.categoryId,
      categoryLabel: assessment.categoryLabel,
      slug: assessment.slug,
      title: assessment.title,
    },
    assessmentSnapshot: structuredClone(assessment),
    completedAt: previewCompletedAt,
    evidenceVersion: getFreeTopicEvidenceVersion(assessment.slug),
    expiresAt: "2027-08-03T12:00:00.000Z",
    formatVersion: freeTopicResultFormatVersion,
    instrumentVersion: getFreeTopicInstrumentVersion(assessment.slug),
    localResultId: `preview-${assessment.slug}`,
    nuangCodeContext: {
      capturedAt: previewCompletedAt,
      code: "ENAKQ",
    },
    productReleaseId: previewReleaseId,
    questionsSnapshot: structuredClone(questions),
    reportContentVersion: getFreeTopicReportContentVersion(assessment.slug),
    reportSnapshot: buildFreeTopicResultReport({
      assessment,
      questions,
      result,
    }),
    result,
    scoringVersion: getFreeTopicScoringVersion(assessment.slug),
    serverResultId: "00000000-0000-4000-8000-000000000002",
    ...(traitImpactSnapshot ? { traitImpactSnapshot } : {}),
    sync,
  };
}

function buildPreviewTraitImpact({
  affectedDomainIds,
  scenario,
}: {
  affectedDomainIds: string[];
  scenario: FreeTopicPreviewTraitImpactScenario;
}) {
  const scenarioDomainIds =
    scenario === "multiple" ? affectedDomainIds : affectedDomainIds.slice(0, 1);
  const primaryDomainId = scenarioDomainIds[0];
  const affectedSet = new Set(scenarioDomainIds);
  const beforeScores: Record<string, number> = {};
  const afterScores: Record<string, number> = {};
  scenarioDomainIds.forEach((domainId) => {
    beforeScores[domainId] = scenario === "more_balanced" ? 68 : 60;
    afterScores[domainId] =
      scenario === "unchanged"
        ? beforeScores[domainId]
        : scenario === "small"
          ? 61.5
          : scenario === "large"
            ? 69
            : scenario === "more_balanced"
              ? 52
              : 64;
  });

  let beforeCode = "ENAKQ";
  const afterCode = "ENAKQ";
  if (scenario === "code_changed" && primaryDomainId) {
    const position = candidateFullScoringRelease.domains.findIndex(
      (domain) => domain.domainId === primaryDomainId,
    );
    const definition = candidateFullScoringRelease.domains[position];
    if (definition && position >= 0) {
      beforeCode = `${beforeCode.slice(0, position)}${definition.lowSymbol}${beforeCode.slice(position + 1)}`;
      beforeScores[primaryDomainId] = 42;
      afterScores[primaryDomainId] = 58;
    }
  }

  const afterRawSymbols: Record<string, string> = {};
  if (scenario === "opposite_seen" && primaryDomainId) {
    const definition = candidateFullScoringRelease.domains.find(
      (domain) => domain.domainId === primaryDomainId,
    );
    if (definition) {
      beforeScores[primaryDomainId] = 56;
      afterScores[primaryDomainId] = 48;
      afterRawSymbols[primaryDomainId] = definition.lowSymbol;
    }
  }

  return buildTopicTraitImpactSnapshot({
    affectedDomainIds: scenarioDomainIds,
    after:
      scenario === "no_baseline"
        ? null
        : buildPreviewProfile({
            code: afterCode,
            emphasizedDomainIds: affectedSet,
            rawSymbolsByDomainId: afterRawSymbols,
            scoresByDomainId: afterScores,
          }),
    before:
      scenario === "no_baseline"
        ? null
        : buildPreviewProfile({
            code: beforeCode,
            scoresByDomainId: beforeScores,
          }),
    calculatedAt: previewCompletedAt,
    evidenceApplied:
      scenario !== "insufficient_evidence" && affectedDomainIds.length > 0,
    isRetest: scenario === "retest",
    selectedAsLatest: scenario !== "not_selected_as_latest",
  });
}

function buildPreviewProfile({
  code = "ENAKQ",
  emphasizedDomainIds = new Set<string>(),
  rawSymbolsByDomainId = {},
  scoresByDomainId = {},
}: {
  code?: string;
  emphasizedDomainIds?: Set<string>;
  rawSymbolsByDomainId?: Record<string, string>;
  scoresByDomainId?: Record<string, number>;
} = {}): AccountTraitProfile {
  return {
    alternativeCodes: [],
    baseResultReportId: "00000000-0000-4000-8000-000000000003",
    code,
    domains: candidateFullScoringRelease.domains.map((domain, index) => ({
      change: emphasizedDomainIds.has(domain.domainId) ? "clearer" : "stable",
      domainId: domain.domainId,
      evidenceCount: emphasizedDomainIds.has(domain.domainId) ? 2 : 1,
      evidenceWeight: emphasizedDomainIds.has(domain.domainId) ? 1.25 : 1,
      isBoundary:
        (scoresByDomainId[domain.domainId] ?? 60) >= 45 &&
        (scoresByDomainId[domain.domainId] ?? 60) <= 55,
      label: domain.label,
      rawSymbol: rawSymbolsByDomainId[domain.domainId] ?? code[index],
      score: scoresByDomainId[domain.domainId] ?? 60,
      status: "valid",
      symbol: code[index],
    })),
    evidenceCount: 8,
    profileName: "관계를 여는 선도자",
    source: emphasizedDomainIds.size > 0 ? "core_and_topics" : "core_only",
    topicCount: emphasizedDomainIds.size > 0 ? 1 : 0,
    updatedAt: previewCompletedAt,
    version: "dynamic-trait-evidence.v0.1",
  };
}
