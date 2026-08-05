import type { AccountTraitProfile } from "@/features/assessment/account-trait-profile-contract";
import {
  candidateAxisCopy,
  getCandidateDirectionCopy,
} from "@/features/nuang-code/candidate-profile-names";
import { nextNuangCodeScheme } from "@/features/nuang-code/next-code-scheme";

export const topicTraitImpactVersion = "topic-trait-impact.v1" as const;

export type TopicTraitImpactState =
  "ready" | "no_baseline" | "insufficient_evidence" | "not_selected_as_latest";

export type TopicTraitImpactDegree =
  "none" | "small" | "clear" | "large" | "code_changed";

export type TopicTraitDomainPresentation =
  | "unchanged"
  | "small"
  | "clearer"
  | "more_balanced"
  | "opposite_seen"
  | "code_changed";

export type TopicTraitProfileDomainSnapshot = {
  domainId: string;
  score: number | null;
  symbol: string | null;
  rawSymbol: string | null;
  isBoundary: boolean;
  evidenceWeight: number;
  evidenceCount: number;
};

export type TopicTraitProfileSnapshot = {
  code: string;
  profileName: string;
  domains: TopicTraitProfileDomainSnapshot[];
};

export type TopicTraitDomainImpact = {
  afterBoundary: boolean;
  afterRawSymbol: string | null;
  afterScore: number | null;
  afterSymbol: string | null;
  beforeBoundary: boolean;
  beforeRawSymbol: string | null;
  beforeScore: number | null;
  beforeSymbol: string | null;
  delta: number;
  domainId: string;
  label: string;
  presentation: TopicTraitDomainPresentation;
};

export type TopicTraitImpactSnapshot = {
  affectedDomains: TopicTraitDomainImpact[];
  after: TopicTraitProfileSnapshot | null;
  before: TopicTraitProfileSnapshot | null;
  calculatedAt: string;
  codeChanged: boolean;
  degree: TopicTraitImpactDegree;
  isRetest: boolean;
  state: TopicTraitImpactState;
  version: typeof topicTraitImpactVersion;
};

export type TopicTraitImpactPresentation = {
  badge: string;
  body: string;
  changedDomainCount: number;
  items: Array<{
    detail: string;
    domainId: string;
    label: string;
  }>;
  note: string;
  title: string;
};

const zeroDeltaTolerance = 0.05;
const meaningfulDelta = 3;
const largeDelta = 7;

export function buildTopicTraitImpactSnapshot({
  affectedDomainIds,
  after,
  before,
  calculatedAt,
  evidenceApplied,
  isRetest,
  selectedAsLatest = true,
}: {
  affectedDomainIds: string[];
  after: AccountTraitProfile | null;
  before: AccountTraitProfile | null;
  calculatedAt: string;
  evidenceApplied: boolean;
  isRetest: boolean;
  selectedAsLatest?: boolean;
}): TopicTraitImpactSnapshot {
  if (!before || !after) {
    return {
      affectedDomains: [],
      after: after ? freezeProfile(after) : null,
      before: before ? freezeProfile(before) : null,
      calculatedAt,
      codeChanged: false,
      degree: "none",
      isRetest,
      state: "no_baseline",
      version: topicTraitImpactVersion,
    };
  }

  if (!evidenceApplied) {
    return {
      affectedDomains: [],
      after: freezeProfile(after),
      before: freezeProfile(before),
      calculatedAt,
      codeChanged: false,
      degree: "none",
      isRetest,
      state: "insufficient_evidence",
      version: topicTraitImpactVersion,
    };
  }

  const beforeDomainById = new Map(
    before.domains.map((domain) => [domain.domainId, domain]),
  );
  const afterDomainById = new Map(
    after.domains.map((domain) => [domain.domainId, domain]),
  );
  const codeChangedDomainIds = candidateAxisCopy.flatMap((axis) => {
    const beforeSymbol = beforeDomainById.get(axis.domainId)?.symbol;
    const afterSymbol = afterDomainById.get(axis.domainId)?.symbol;
    return beforeSymbol && afterSymbol && beforeSymbol !== afterSymbol
      ? [axis.domainId]
      : [];
  });
  const uniqueAffectedIds = [
    ...new Set([...affectedDomainIds, ...codeChangedDomainIds]),
  ];
  const affectedDomains = candidateAxisCopy.flatMap((axis) => {
    if (!uniqueAffectedIds.includes(axis.domainId)) return [];
    const beforeDomain = beforeDomainById.get(axis.domainId);
    const afterDomain = afterDomainById.get(axis.domainId);
    const beforeScore = finiteScore(beforeDomain?.score);
    const afterScore = finiteScore(afterDomain?.score);
    if (beforeScore === null || afterScore === null) return [];
    const delta = roundOne(afterScore - beforeScore);
    const codeLetterChanged = beforeDomain?.symbol !== afterDomain?.symbol;

    return [
      {
        afterBoundary: Boolean(afterDomain?.isBoundary),
        afterRawSymbol: afterDomain?.rawSymbol ?? null,
        afterScore: roundOne(afterScore),
        afterSymbol: afterDomain?.symbol ?? null,
        beforeBoundary: Boolean(beforeDomain?.isBoundary),
        beforeRawSymbol: beforeDomain?.rawSymbol ?? null,
        beforeScore: roundOne(beforeScore),
        beforeSymbol: beforeDomain?.symbol ?? null,
        delta,
        domainId: axis.domainId,
        label: axis.label,
        presentation: classifyDomainPresentation({
          afterRawSymbol: afterDomain?.rawSymbol ?? null,
          afterScore,
          beforeRawSymbol: beforeDomain?.rawSymbol ?? null,
          beforeScore,
          codeLetterChanged,
          delta,
        }),
      } satisfies TopicTraitDomainImpact,
    ];
  });
  const codeChanged = before.code !== after.code;
  const largestDelta = Math.max(
    0,
    ...affectedDomains.map((domain) => Math.abs(domain.delta)),
  );

  return {
    affectedDomains,
    after: freezeProfile(after),
    before: freezeProfile(before),
    calculatedAt,
    codeChanged,
    degree: codeChanged
      ? "code_changed"
      : largestDelta <= zeroDeltaTolerance
        ? "none"
        : largestDelta < meaningfulDelta
          ? "small"
          : largestDelta < largeDelta
            ? "clear"
            : "large",
    isRetest,
    state: selectedAsLatest ? "ready" : "not_selected_as_latest",
    version: topicTraitImpactVersion,
  };
}

export function getTopicTraitImpactPresentation(
  snapshot: TopicTraitImpactSnapshot,
): TopicTraitImpactPresentation {
  const changedNote = snapshot.isRetest
    ? "지난번 같은 주제 결과를 이번 답으로 바꿔 반영했어요. 성격이 갑자기 바뀌었다는 뜻은 아니에요."
    : "이번 답을 더해 뉴앙이 이해한 내 모습이 조금 조정된 거예요. 성격이 갑자기 바뀌었다는 뜻은 아니에요.";

  if (snapshot.state === "no_baseline") {
    return {
      badge: "비교 준비 중",
      body: "코어 검사를 마치면 이번 답도 함께 살펴 내 뉴앙코드를 만들어요.",
      changedDomainCount: 0,
      items: [],
      note: "코어 검사를 마치면 이번 답도 함께 살펴 내 뉴앙코드를 만들어요.",
      title: "아직 비교할 뉴앙코드가 없어요",
    };
  }

  if (snapshot.state === "insufficient_evidence") {
    return {
      badge: "이번 결과만 확인",
      body: "검사 결과는 그대로 볼 수 있고, 현재 뉴앙코드는 달라지지 않았어요.",
      changedDomainCount: 0,
      items: [],
      note: "답하기 어려웠던 항목은 억지로 코드 점수로 바꾸지 않았어요.",
      title: "이번 검사에서는 코드에 반영할 내용이 충분하지 않았어요",
    };
  }

  if (snapshot.state === "not_selected_as_latest") {
    return {
      badge: "현재 코드 유지",
      body: "이 검사보다 나중에 완료한 같은 주제의 결과가 있어 현재 뉴앙코드는 그대로 유지했어요.",
      changedDomainCount: 0,
      items: [],
      note: "검사 결과는 보관하고, 뉴앙코드에는 가장 최근에 마친 같은 주제 결과를 사용해요.",
      title: "더 최근의 같은 주제 결과를 반영하고 있어요",
    };
  }

  const changedDomains = [...snapshot.affectedDomains]
    .filter(
      (domain) =>
        domain.presentation === "code_changed" ||
        Math.abs(domain.delta) > zeroDeltaTolerance,
    )
    .sort(compareDomainImpact);
  const items = changedDomains.slice(0, 3).map((domain) => ({
    detail: buildDomainDetail(domain),
    domainId: domain.domainId,
    label: domain.label,
  }));

  if (snapshot.degree === "none") {
    return {
      badge: "변화 없음",
      body: snapshot.isRetest
        ? `지난번 같은 주제 결과와 비슷한 흐름이에요. 현재 뉴앙코드${snapshot.after?.code ? ` ${snapshot.after.code}` : ""}는 그대로예요.`
        : `이번 답은 지금까지 나타난 성향 흐름과 비슷했어요. 현재 뉴앙코드${snapshot.after?.code ? ` ${snapshot.after.code}` : ""}는 그대로예요.`,
      changedDomainCount: 0,
      items: [],
      note: snapshot.isRetest
        ? "지난번 같은 주제 결과를 이번 답으로 바꿔 확인했지만, 성향 설명에는 달라진 부분이 없었어요."
        : "이번 답은 지금까지 나타난 모습과 비슷했어요.",
      title: "이번에는 달라진 부분이 없어요",
    };
  }

  if (snapshot.codeChanged) {
    const letterChanges = snapshot.affectedDomains.filter(
      (domain) =>
        domain.beforeSymbol &&
        domain.afterSymbol &&
        domain.beforeSymbol !== domain.afterSymbol,
    );
    const count = letterChanges.length;
    const primaryLetterChange = letterChanges[0];
    return {
      badge: "코드가 조정됐어요",
      body:
        count === 1 && primaryLetterChange
          ? `${primaryLetterChange.label}의 코드 글자 한 개가 달라졌어요. 함께 달라진 성향 설명을 아래에서 확인해 보세요.`
          : `이번 답을 반영한 뒤 뉴앙코드 ${count}글자가 달라졌어요. 함께 달라진 성향 설명을 아래에서 확인해 보세요.`,
      changedDomainCount: changedDomains.length,
      items,
      note: changedNote,
      title:
        count === 1
          ? "뉴앙코드 한 글자가 달라졌어요"
          : `뉴앙코드 ${count}글자가 달라졌어요`,
    };
  }

  const primary = changedDomains[0];
  const body = primary
    ? `전체 뉴앙코드${snapshot.after?.code ? ` ${snapshot.after.code}` : ""}는 그대로지만, 아래 성향 설명이 더 구체적으로 바뀌었어요.`
    : "현재 뉴앙코드는 그대로예요.";
  const allBalanced = changedDomains.every(
    (domain) => domain.presentation === "more_balanced",
  );
  const singleOpposite =
    changedDomains.length === 1 && primary?.presentation === "opposite_seen";

  return {
    badge:
      snapshot.degree === "small"
        ? "조금 반영됐어요"
        : singleOpposite
          ? "코드 유지"
          : allBalanced
            ? "두 모습이 함께 보여요"
            : snapshot.degree === "large"
              ? "비교적 크게 반영됐어요"
              : "더 또렷해졌어요",
    body,
    changedDomainCount: changedDomains.length,
    items,
    note: changedNote,
    title:
      snapshot.degree === "small"
        ? "뉴앙코드는 그대로예요"
        : singleOpposite
          ? "반대쪽 모습도 함께 보였어요"
          : allBalanced
            ? "두 모습의 차이가 줄었어요"
            : changedDomains.length > 1
              ? `${changedDomains.length}가지 모습이 더 구체적으로 보였어요`
              : "한 가지 모습이 더 뚜렷해졌어요",
  };
}

export function readTopicTraitImpactSnapshot(
  value: unknown,
): TopicTraitImpactSnapshot | null {
  if (!isRecord(value)) return null;
  if (value.version !== topicTraitImpactVersion) return null;
  if (
    !isImpactState(value.state) ||
    !isImpactDegree(value.degree) ||
    typeof value.calculatedAt !== "string" ||
    typeof value.codeChanged !== "boolean" ||
    typeof value.isRetest !== "boolean" ||
    !Array.isArray(value.affectedDomains)
  ) {
    return null;
  }

  const before = readProfileSnapshot(value.before);
  const after = readProfileSnapshot(value.after);
  if ((value.before !== null && !before) || (value.after !== null && !after)) {
    return null;
  }
  const affectedDomains = value.affectedDomains.map(readDomainImpact);
  if (affectedDomains.some((domain) => !domain)) return null;
  if (Number.isNaN(Date.parse(value.calculatedAt))) return null;

  return {
    affectedDomains: affectedDomains as TopicTraitDomainImpact[],
    after,
    before,
    calculatedAt: value.calculatedAt,
    codeChanged: value.codeChanged,
    degree: value.degree,
    isRetest: value.isRetest,
    state: value.state,
    version: topicTraitImpactVersion,
  };
}

function readProfileSnapshot(value: unknown): TopicTraitProfileSnapshot | null {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    typeof value.code !== "string" ||
    !/^[A-Z]{5}$/.test(value.code) ||
    typeof value.profileName !== "string" ||
    !Array.isArray(value.domains)
  ) {
    return null;
  }
  const domains = value.domains.map(readProfileDomainSnapshot);
  if (domains.some((domain) => !domain)) return null;
  return {
    code: value.code,
    domains: domains as TopicTraitProfileDomainSnapshot[],
    profileName: value.profileName,
  };
}

function readProfileDomainSnapshot(
  value: unknown,
): TopicTraitProfileDomainSnapshot | null {
  if (
    !isRecord(value) ||
    typeof value.domainId !== "string" ||
    !isNullableFiniteNumber(value.score) ||
    !isNullableSymbol(value.symbol) ||
    !isNullableSymbol(value.rawSymbol) ||
    typeof value.isBoundary !== "boolean" ||
    !isFiniteNumber(value.evidenceWeight) ||
    !isFiniteNumber(value.evidenceCount)
  ) {
    return null;
  }
  return {
    domainId: value.domainId,
    evidenceCount: value.evidenceCount,
    evidenceWeight: value.evidenceWeight,
    isBoundary: value.isBoundary,
    rawSymbol: value.rawSymbol,
    score: value.score,
    symbol: value.symbol,
  };
}

function readDomainImpact(value: unknown): TopicTraitDomainImpact | null {
  if (
    !isRecord(value) ||
    typeof value.domainId !== "string" ||
    typeof value.label !== "string" ||
    !isFiniteNumber(value.delta) ||
    !isNullableFiniteNumber(value.beforeScore) ||
    !isNullableFiniteNumber(value.afterScore) ||
    !isNullableSymbol(value.beforeSymbol) ||
    !isNullableSymbol(value.afterSymbol) ||
    !isNullableSymbol(value.beforeRawSymbol) ||
    !isNullableSymbol(value.afterRawSymbol) ||
    typeof value.beforeBoundary !== "boolean" ||
    typeof value.afterBoundary !== "boolean" ||
    !isDomainPresentation(value.presentation)
  ) {
    return null;
  }
  return value as TopicTraitDomainImpact;
}

function freezeProfile(
  profile: AccountTraitProfile,
): TopicTraitProfileSnapshot {
  return {
    code: profile.code,
    domains: profile.domains.map((domain) => ({
      domainId: domain.domainId,
      evidenceCount: domain.evidenceCount,
      evidenceWeight: domain.evidenceWeight,
      isBoundary: domain.isBoundary,
      rawSymbol: domain.rawSymbol,
      score: finiteScore(domain.score),
      symbol: domain.symbol,
    })),
    profileName: profile.profileName,
  };
}

function classifyDomainPresentation({
  afterRawSymbol,
  afterScore,
  beforeRawSymbol,
  beforeScore,
  codeLetterChanged,
  delta,
}: {
  afterRawSymbol: string | null;
  afterScore: number;
  beforeRawSymbol: string | null;
  beforeScore: number;
  codeLetterChanged: boolean;
  delta: number;
}): TopicTraitDomainPresentation {
  if (codeLetterChanged) return "code_changed";
  if (Math.abs(delta) <= zeroDeltaTolerance) return "unchanged";
  if (afterRawSymbol !== beforeRawSymbol) return "opposite_seen";
  if (Math.abs(afterScore - 50) < Math.abs(beforeScore - 50)) {
    return "more_balanced";
  }
  return Math.abs(delta) < meaningfulDelta ? "small" : "clearer";
}

function compareDomainImpact(
  left: TopicTraitDomainImpact,
  right: TopicTraitDomainImpact,
) {
  const priority: Record<TopicTraitDomainPresentation, number> = {
    code_changed: 0,
    opposite_seen: 1,
    more_balanced: 2,
    clearer: 3,
    small: 4,
    unchanged: 5,
  };
  return (
    priority[left.presentation] - priority[right.presentation] ||
    Math.abs(right.delta) - Math.abs(left.delta)
  );
}

function buildDomainDetail(domain: TopicTraitDomainImpact) {
  if (
    domain.presentation === "code_changed" &&
    domain.beforeSymbol &&
    domain.afterSymbol
  ) {
    return `${domain.beforeSymbol}에서 ${domain.afterSymbol}로 달라졌고, ${quoteDirection(getDirectionName(domain.domainId, domain.afterSymbol))} 모습이 성향 설명에 더 뚜렷하게 반영됐어요.`;
  }
  const movementSymbol = getMovementSymbol(domain);
  const directionName = getDirectionName(domain.domainId, movementSymbol);
  if (domain.presentation === "more_balanced") {
    const [lowDirection, highDirection] = getAxisDirectionNames(
      domain.domainId,
    );
    return `${quoteDirection(lowDirection)} 모습과 ${quoteDirection(highDirection)} 모습의 차이가 전보다 조금 줄었어요.`;
  }
  if (domain.presentation === "opposite_seen") {
    return `이번 답에서는 ${quoteDirection(directionName)} 모습도 더 보였지만 현재 코드 글자는 그대로예요.`;
  }
  if (domain.presentation === "small") {
    return `${quoteDirection(directionName)} 모습이 아주 조금 더 나타났어요.`;
  }
  return `${quoteDirection(directionName)} 모습이 전보다 더 뚜렷하게 나타났어요.`;
}

function getMovementSymbol(domain: TopicTraitDomainImpact) {
  const scheme = nextNuangCodeScheme.positions.find(
    (position) => position.domainId === domain.domainId,
  );
  if (!scheme) return domain.afterSymbol ?? "";
  return domain.delta >= 0 ? scheme.highSymbol : scheme.lowSymbol;
}

function getDirectionName(domainId: string, symbol: string) {
  const axisIndex = candidateAxisCopy.findIndex(
    (axis) => axis.domainId === domainId,
  );
  return (
    getCandidateDirectionCopy(axisIndex + 1, symbol)?.shortToken ??
    `${symbol} 방향`
  );
}

function quoteDirection(value: string) {
  return `‘${value}’`;
}

function getAxisDirectionNames(domainId: string) {
  const scheme = nextNuangCodeScheme.positions.find(
    (position) => position.domainId === domainId,
  );
  if (!scheme) return ["두 모습", "서로 다른 모습"] as const;
  return [
    getDirectionName(domainId, scheme.lowSymbol),
    getDirectionName(domainId, scheme.highSymbol),
  ] as const;
}

function finiteScore(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isImpactState(value: unknown): value is TopicTraitImpactState {
  return (
    value === "ready" ||
    value === "no_baseline" ||
    value === "insufficient_evidence" ||
    value === "not_selected_as_latest"
  );
}

function isImpactDegree(value: unknown): value is TopicTraitImpactDegree {
  return (
    value === "none" ||
    value === "small" ||
    value === "clear" ||
    value === "large" ||
    value === "code_changed"
  );
}

function isDomainPresentation(
  value: unknown,
): value is TopicTraitDomainPresentation {
  return (
    value === "unchanged" ||
    value === "small" ||
    value === "clearer" ||
    value === "more_balanced" ||
    value === "opposite_seen" ||
    value === "code_changed"
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isNullableSymbol(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.length === 1);
}
