import type { DomainDefinition, ScoreStatus } from "@/lib/scoring/types";

export const dynamicTraitEvidenceVersion = "dynamic-trait-evidence.v0.1";

export type TraitEvidenceSourceKind =
  | "quick_core"
  | "full_core"
  | "free_topic"
  | "odd_lab"
  | "detailed"
  | "help"
  | "group";

export type TraitEvidenceApprovalStatus =
  | "approved"
  | "provisional"
  | "experimental"
  | "blocked";

export type TraitEvidenceTarget = {
  kind: "domain" | "facet";
  id: string;
};

export type TraitEvidenceObservation = {
  id: string;
  sourceKind: TraitEvidenceSourceKind;
  target: TraitEvidenceTarget;
  score: number | null;
  observedAt: string;
  measurementAmount: number;
  constructDirectness: number;
  responseQuality: number;
  approvalStatus: TraitEvidenceApprovalStatus;
  recency: number;
  repetitionDiscount: number;
};

export type PreviousTraitDomainSnapshot = {
  domainId: string;
  score: number | null;
  symbol: string | null;
};

export type PreviousTraitSnapshot = {
  code: string | null;
  domains: PreviousTraitDomainSnapshot[];
};

export type DynamicTraitChangeType =
  | "insufficient"
  | "stable"
  | "clearer"
  | "boundary"
  | "code_changed"
  | "held_for_stability";

export type DynamicTraitDomainScore = {
  domainId: string;
  label: string;
  score: number | null;
  symbol: string | null;
  rawSymbol: string | null;
  isBoundary: boolean;
  status: ScoreStatus;
  evidenceWeight: number;
  evidenceCount: number;
  change: DynamicTraitChangeType;
};

export type DynamicTraitChange = {
  domainId: string;
  fromSymbol: string | null;
  toSymbol: string | null;
  type: DynamicTraitChangeType;
};

export type DynamicTraitSnapshot = {
  version: typeof dynamicTraitEvidenceVersion;
  domains: DynamicTraitDomainScore[];
  code: string | null;
  profileName: string | null;
  alternativeCodes: string[];
  changes: DynamicTraitChange[];
};

export type DynamicTraitEvidenceOptions = {
  boundaryMin: number;
  boundaryMax: number;
  minValidWeight: number;
  minCodeChangeWeight: number;
  minOpposingEvidenceCountForCodeChange: number;
  minMeaningfulDelta: number;
};

export const dynamicTraitSourceWeights: Record<TraitEvidenceSourceKind, number> = {
  quick_core: 0.2,
  full_core: 1,
  free_topic: 0.35,
  odd_lab: 0.1,
  detailed: 0.8,
  help: 0,
  group: 0,
};

const approvalStatusWeights: Record<TraitEvidenceApprovalStatus, number> = {
  approved: 1,
  provisional: 0.6,
  experimental: 0.25,
  blocked: 0,
};

const defaultDynamicTraitEvidenceOptions: DynamicTraitEvidenceOptions = {
  boundaryMin: 45,
  boundaryMax: 55,
  minValidWeight: 0.25,
  minCodeChangeWeight: 1.2,
  minOpposingEvidenceCountForCodeChange: 2,
  minMeaningfulDelta: 3,
};

export function calculateEffectiveTraitEvidenceWeight(
  observation: TraitEvidenceObservation,
) {
  return (
    dynamicTraitSourceWeights[observation.sourceKind] *
    clampUnit(observation.measurementAmount) *
    clampUnit(observation.constructDirectness) *
    clampUnit(observation.responseQuality) *
    approvalStatusWeights[observation.approvalStatus] *
    clampUnit(observation.recency) *
    clampUnit(observation.repetitionDiscount)
  );
}

export function calculateDynamicTraitSnapshot({
  domains,
  observations,
  previous,
  profileNames,
  options,
}: {
  domains: DomainDefinition[];
  observations: TraitEvidenceObservation[];
  previous?: PreviousTraitSnapshot | null;
  profileNames: Record<string, string>;
  options?: Partial<DynamicTraitEvidenceOptions>;
}): DynamicTraitSnapshot {
  const resolvedOptions = {
    ...defaultDynamicTraitEvidenceOptions,
    ...options,
  };
  const previousDomainById = new Map(
    (previous?.domains ?? []).map((domain) => [domain.domainId, domain]),
  );

  const scoredDomains = domains.map((domain): DynamicTraitDomainScore => {
    const domainEvidence = observations
      .filter((observation) => observationTargetsDomain(observation, domain))
      .map((observation) => ({
        observation,
        score: clampScore(observation.score),
        weight: calculateEffectiveTraitEvidenceWeight(observation),
      }))
      .filter((evidence) => evidence.score !== null && evidence.weight > 0);

    const evidenceWeight = sum(domainEvidence.map((evidence) => evidence.weight));
    const score =
      evidenceWeight > 0
        ? sum(
            domainEvidence.map(
              (evidence) => (evidence.score as number) * evidence.weight,
            ),
          ) / evidenceWeight
        : null;
    const status = getEvidenceStatus(evidenceWeight, resolvedOptions);
    const rawSymbol = score === null ? null : getRawSymbol(domain, score);
    const isBoundary =
      score !== null &&
      score >= resolvedOptions.boundaryMin &&
      score <= resolvedOptions.boundaryMax;
    const previousDomain = previousDomainById.get(domain.domainId);
    const stableSymbol = stabilizeSymbol({
      domain,
      domainEvidence,
      isBoundary,
      options: resolvedOptions,
      previousDomain,
      rawSymbol,
      score,
      status,
      totalWeight: evidenceWeight,
    });

    return {
      domainId: domain.domainId,
      label: domain.label,
      score,
      symbol: stableSymbol.symbol,
      rawSymbol,
      isBoundary,
      status,
      evidenceWeight: roundEvidenceWeight(evidenceWeight),
      evidenceCount: domainEvidence.length,
      change: stableSymbol.change,
    };
  });

  const code = scoredDomains.every((domain) => domain.symbol)
    ? scoredDomains.map((domain) => domain.symbol).join("")
    : null;

  return {
    version: dynamicTraitEvidenceVersion,
    domains: scoredDomains,
    code,
    profileName: code ? (profileNames[code] ?? null) : null,
    alternativeCodes: code
      ? buildAlternativeCodes(code, scoredDomains, domains)
      : [],
    changes: scoredDomains.map((domain) => ({
      domainId: domain.domainId,
      fromSymbol: previousDomainById.get(domain.domainId)?.symbol ?? null,
      toSymbol: domain.symbol,
      type: domain.change,
    })),
  };
}

function observationTargetsDomain(
  observation: TraitEvidenceObservation,
  domain: DomainDefinition,
) {
  if (observation.target.kind === "domain") {
    return observation.target.id === domain.domainId;
  }

  return domain.facetIds.includes(observation.target.id);
}

function getEvidenceStatus(
  evidenceWeight: number,
  options: DynamicTraitEvidenceOptions,
): ScoreStatus {
  if (evidenceWeight >= options.minValidWeight) return "valid";
  if (evidenceWeight > 0) return "partial";
  return "insufficient";
}

function stabilizeSymbol({
  domain,
  domainEvidence,
  isBoundary,
  options,
  previousDomain,
  rawSymbol,
  score,
  status,
  totalWeight,
}: {
  domain: DomainDefinition;
  domainEvidence: Array<{
    observation: TraitEvidenceObservation;
    score: number | null;
    weight: number;
  }>;
  isBoundary: boolean;
  options: DynamicTraitEvidenceOptions;
  previousDomain: PreviousTraitDomainSnapshot | undefined;
  rawSymbol: string | null;
  score: number | null;
  status: ScoreStatus;
  totalWeight: number;
}): { symbol: string | null; change: DynamicTraitChangeType } {
  if (status === "insufficient" || rawSymbol === null || score === null) {
    return { symbol: null, change: "insufficient" };
  }

  if (!previousDomain?.symbol) {
    return { symbol: rawSymbol, change: isBoundary ? "boundary" : "stable" };
  }

  if (rawSymbol !== previousDomain.symbol) {
    const opposingCount = countOpposingEvidence({
      domain,
      evidence: domainEvidence,
      previousSymbol: previousDomain.symbol,
    });
    const canChangeCode =
      !isBoundary &&
      totalWeight >= options.minCodeChangeWeight &&
      opposingCount >= options.minOpposingEvidenceCountForCodeChange;

    return canChangeCode
      ? { symbol: rawSymbol, change: "code_changed" }
      : { symbol: previousDomain.symbol, change: "held_for_stability" };
  }

  if (isBoundary) {
    return { symbol: rawSymbol, change: "boundary" };
  }

  if (
    previousDomain.score !== null &&
    Math.abs(score - previousDomain.score) >= options.minMeaningfulDelta &&
    Math.abs(score - 50) > Math.abs(previousDomain.score - 50)
  ) {
    return { symbol: rawSymbol, change: "clearer" };
  }

  return { symbol: rawSymbol, change: "stable" };
}

function countOpposingEvidence({
  domain,
  evidence,
  previousSymbol,
}: {
  domain: DomainDefinition;
  evidence: Array<{ score: number | null; weight: number }>;
  previousSymbol: string;
}) {
  const previousWasHigh = previousSymbol === domain.highSymbol;

  return evidence.filter((item) => {
    if (item.score === null || item.weight <= 0) return false;
    return previousWasHigh ? item.score < 50 : item.score >= 50;
  }).length;
}

function getRawSymbol(domain: DomainDefinition, score: number) {
  return score >= 50 ? domain.highSymbol : domain.lowSymbol;
}

function buildAlternativeCodes(
  code: string,
  scoredDomains: DynamicTraitDomainScore[],
  definitions: DomainDefinition[],
) {
  return scoredDomains
    .flatMap((domain, index) => {
      if (!domain.isBoundary) return [];

      const definition = definitions[index];
      const nextSymbol =
        code[index] === definition.highSymbol
          ? definition.lowSymbol
          : definition.highSymbol;
      return `${code.slice(0, index)}${nextSymbol}${code.slice(index + 1)}`;
    })
    .filter((alternativeCode, index, list) => list.indexOf(alternativeCode) === index);
}

function clampScore(score: number | null) {
  if (score === null || Number.isNaN(score)) return null;
  return Math.min(100, Math.max(0, score));
}

function clampUnit(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function roundEvidenceWeight(weight: number) {
  return Math.round(weight * 1000) / 1000;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
