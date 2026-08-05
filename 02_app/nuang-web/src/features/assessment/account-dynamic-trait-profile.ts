import { candidateFullScoringRelease } from "@/features/assessment/candidate-full-core-seed";
import {
  resolveFreeTopicTraitRule,
  type FreeTopicAssessment,
  type FreeTopicQuestion,
} from "@/features/assessment/free-topic-assessments";
import type { AccountTraitProfile } from "@/features/assessment/account-trait-profile-contract";
import {
  calculateDynamicTraitSnapshot,
  dynamicTraitEvidenceVersion,
  type PreviousTraitSnapshot,
  type TraitEvidenceObservation,
  type TraitEvidenceTarget,
} from "@/lib/scoring/dynamic-trait-evidence";

export type CoreTraitEvidenceResult = {
  completedAt: string;
  domains: Array<{
    domainId: string;
    score: number | null;
    symbol?: string | null;
  }>;
  kind: "full" | "quick";
  profileCode: string;
  resultReportId: string;
};

export type TopicTraitEvidenceResult = {
  assessment: FreeTopicAssessment;
  completedAt: string;
  questions: FreeTopicQuestion[];
  resultId: string;
  scoresByQuestionId: Record<string, number>;
  scoresByTargetId?: Record<string, number>;
  slug: string;
};

export function buildAccountDynamicTraitProfile({
  coreResults,
  now = new Date(),
  topicResults,
}: {
  coreResults: CoreTraitEvidenceResult[];
  now?: Date;
  topicResults: TopicTraitEvidenceResult[];
}): AccountTraitProfile | null {
  const base = selectBaseCoreResult(coreResults);
  if (!base) return null;

  const baseObservation = buildCoreObservations(base, now);
  const latestTopicResults = selectLatestTopicResults(topicResults);
  const topicObservations = latestTopicResults.flatMap((result) =>
    buildTopicDomainObservations(result, now),
  );
  const previous = buildCoreBaseline(base);
  const snapshot = calculateDynamicTraitSnapshot({
    domains: candidateFullScoringRelease.domains,
    observations: [...baseObservation, ...topicObservations],
    options: { minValidWeight: 0.05 },
    previous,
    profileNames: candidateFullScoringRelease.profileNames,
  });

  if (!snapshot.code || !snapshot.profileName) return null;

  const updatedAt = [
    base.completedAt,
    ...latestTopicResults.map((result) => result.completedAt),
  ].sort((left, right) => right.localeCompare(left))[0];

  return {
    alternativeCodes: snapshot.alternativeCodes,
    baseResultReportId: base.resultReportId,
    code: snapshot.code,
    domains: snapshot.domains,
    evidenceCount: baseObservation.length + topicObservations.length,
    profileName: snapshot.profileName,
    source: topicObservations.length > 0 ? "core_and_topics" : "core_only",
    topicCount: latestTopicResults.filter((result) =>
      topicObservations.some((observation) =>
        observation.id.startsWith(`topic:${result.slug}:${result.resultId}:`),
      ),
    ).length,
    updatedAt,
    version: dynamicTraitEvidenceVersion,
  };
}

export function buildTopicDomainObservations(
  result: TopicTraitEvidenceResult,
  now = new Date(),
): TraitEvidenceObservation[] {
  if (result.assessment.evidenceUse === "blocked") return [];

  const scoreGroups = new Map<
    string,
    { scores: number[]; targets: TraitEvidenceTarget[] }
  >();
  const answeredScaleCounts = result.questions.reduce<Record<string, number>>(
    (counts, question) => {
      if (
        question.reportScaleId &&
        Number.isFinite(result.scoresByQuestionId[question.id])
      ) {
        counts[question.reportScaleId] =
          (counts[question.reportScaleId] ?? 0) + 1;
      }
      return counts;
    },
    {},
  );
  const validQuestionCount = Object.values(result.scoresByQuestionId).filter(
    Number.isFinite,
  ).length;

  if (validQuestionCount < 3) return [];

  for (const question of result.questions) {
    const score = result.scoresByQuestionId[question.id];
    if (!Number.isFinite(score)) continue;
    if (
      question.reportScaleId &&
      (answeredScaleCounts[question.reportScaleId] ?? 0) < 3
    ) {
      continue;
    }
    const rule = resolveFreeTopicTraitRule(result.slug, question);
    if (rule.scoring === "excluded") continue;
    const domainId = targetDomainId(rule.target);
    if (!domainId) continue;
    const traitScore = rule.scoring === "reverse" ? 100 - score : score;
    const current = scoreGroups.get(domainId) ?? { scores: [], targets: [] };
    current.scores.push(traitScore);
    current.targets.push(rule.target);
    scoreGroups.set(domainId, current);
  }

  // Early stored topic results may not have per-question trait scores. Their
  // target aggregates remain usable without involving lab or together data.
  if (scoreGroups.size === 0) {
    for (const [key, score] of Object.entries(result.scoresByTargetId ?? {})) {
      if (!Number.isFinite(score)) continue;
      const target = parseTargetKey(key);
      if (!target) continue;
      const domainId = targetDomainId(target);
      if (!domainId) continue;
      const current = scoreGroups.get(domainId) ?? { scores: [], targets: [] };
      current.scores.push(score);
      current.targets.push(target);
      scoreGroups.set(domainId, current);
    }
  }

  return [...scoreGroups.entries()].map(([domainId, group]) => ({
    approvalStatus: "approved",
    constructDirectness: averageDirectness(group.targets),
    id: `topic:${result.slug}:${result.resultId}:${domainId}`,
    measurementAmount: Math.min(1, group.scores.length / 4),
    observedAt: result.completedAt,
    recency: calculateRecency(result.completedAt, now),
    repetitionDiscount: 1,
    responseQuality: 1,
    score: Math.round(mean(group.scores)),
    sourceKind: "free_topic",
    target: { id: domainId, kind: "domain" },
  }));
}

function selectBaseCoreResult(results: CoreTraitEvidenceResult[]) {
  const usable = [...results]
    .filter((result) => result.domains.some((domain) => domain.score !== null))
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt));
  return usable.find((result) => result.kind === "full") ?? usable[0] ?? null;
}

function selectLatestTopicResults(results: TopicTraitEvidenceResult[]) {
  const latest = new Map<string, TopicTraitEvidenceResult>();
  [...results]
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
    .forEach((result) => {
      if (!latest.has(result.slug)) latest.set(result.slug, result);
    });
  return [...latest.values()];
}

function buildCoreObservations(
  result: CoreTraitEvidenceResult,
  now: Date,
): TraitEvidenceObservation[] {
  return result.domains.flatMap((domain) =>
    domain.score === null
      ? []
      : [
          {
            approvalStatus: "approved" as const,
            constructDirectness: 1,
            id: `core:${result.resultReportId}:${domain.domainId}`,
            measurementAmount: 1,
            observedAt: result.completedAt,
            recency: calculateRecency(result.completedAt, now),
            repetitionDiscount: 1,
            responseQuality: 1,
            score: domain.score,
            sourceKind:
              result.kind === "full"
                ? ("full_core" as const)
                : ("quick_core" as const),
            target: { id: domain.domainId, kind: "domain" as const },
          },
        ],
  );
}

function buildCoreBaseline(
  result: CoreTraitEvidenceResult,
): PreviousTraitSnapshot {
  const definitionById = new Map(
    candidateFullScoringRelease.domains.map((domain) => [
      domain.domainId,
      domain,
    ]),
  );
  return {
    code: result.profileCode,
    domains: result.domains.map((domain) => {
      const definition = definitionById.get(domain.domainId);
      const symbol =
        domain.symbol ??
        (domain.score === null || !definition
          ? null
          : domain.score >= 50
            ? definition.highSymbol
            : definition.lowSymbol);
      return { domainId: domain.domainId, score: domain.score, symbol };
    }),
  };
}

function targetDomainId(target: TraitEvidenceTarget) {
  if (target.kind === "domain") {
    return candidateFullScoringRelease.domains.some(
      (domain) => domain.domainId === target.id,
    )
      ? target.id
      : null;
  }

  return (
    candidateFullScoringRelease.domains.find((domain) =>
      domain.facetIds.includes(target.id),
    )?.domainId ?? null
  );
}

function averageDirectness(targets: TraitEvidenceTarget[]) {
  if (targets.length === 0) return 0.7;
  return (
    targets.reduce(
      (total, target) => total + (target.kind === "facet" ? 0.8 : 0.65),
      0,
    ) / targets.length
  );
}

function calculateRecency(observedAt: string, now: Date) {
  const observed = new Date(observedAt).getTime();
  if (!Number.isFinite(observed)) return 0.5;
  const days = Math.max(0, (now.getTime() - observed) / 86_400_000);
  if (days <= 90) return 1;
  if (days <= 180) return 0.8;
  if (days <= 365) return 0.6;
  return 0.4;
}

function parseTargetKey(value: string): TraitEvidenceTarget | null {
  const separator = value.indexOf(":");
  if (separator < 1) return null;
  const kind = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if ((kind !== "domain" && kind !== "facet") || !id) return null;
  return { id, kind };
}

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}
