import {
  dynamicTraitSourceWeights,
  type TraitEvidenceObservation,
  type TraitEvidenceTarget,
} from "@/lib/scoring/dynamic-trait-evidence";
import { scoreResponse } from "@/lib/scoring/core";
import type { ResponseValue } from "@/lib/scoring/types";
import {
  coreDomainDefinitions,
  coreFacetDefinitions,
} from "@/features/assessment/quick-core-seed";

export type FreeTopicCategoryId =
  | "relationship"
  | "daily"
  | "emotion"
  | "social_energy"
  | "preference"
  | "growth";

export type FreeTopicImpactGrade = "A" | "B" | "C" | "D";

export type FreeTopicMappingRole = "primary" | "secondary";

export type FreeTopicEvidenceMapping = {
  target: TraitEvidenceTarget;
  role: FreeTopicMappingRole;
  constructDirectness: number;
  measurementAmount: number;
};

export type FreeTopicAssessment = {
  slug: string;
  title: string;
  categoryId: FreeTopicCategoryId;
  categoryLabel: string;
  caption: string;
  estimatedMinutes: number;
  impactGrade: FreeTopicImpactGrade;
  evidenceUse:
    | "dynamic_trait_evidence"
    | "interpretation_and_recommendation_only"
    | "blocked";
  comparisonUse: false;
  sourceWeight: typeof dynamicTraitSourceWeights.free_topic;
  mappings: FreeTopicEvidenceMapping[];
};

export type FreeTopicQuestion = {
  id: string;
  isReverse?: boolean;
  target: TraitEvidenceTarget;
  text: string;
};

export type FreeTopicAnswer = {
  answeredAt: string;
  questionId: string;
  value: ResponseValue;
};

export type FreeTopicScoreResult = {
  observations: TraitEvidenceObservation[];
  scoresByTargetId: Record<string, number>;
  summary: string;
};

export type FreeTopicReportSignal = {
  areaLabel: string;
  interpretation: string;
  label: string;
  levelLabel: string;
  roleLabel: string;
  score: number;
};

export type FreeTopicResultReport = {
  averageScore: number | null;
  confidenceCopy: string;
  confidenceLabel: string;
  headline: string;
  signals: FreeTopicReportSignal[];
};

export const freeTopicSourceWeight = dynamicTraitSourceWeights.free_topic;

export const freeTopicAssessments: FreeTopicAssessment[] = [
  topic({
    caption: "말을 꺼내는 속도와 온도",
    categoryId: "relationship",
    categoryLabel: "관계",
    mappings: [
      primaryFacet("RO-EC", 0.9),
      primaryFacet("RO-RN", 0.9),
      secondaryFacet("SE-AI", 0.65),
    ],
    slug: "conversation-temperature",
    title: "대화 온도",
  }),
  topic({
    caption: "미안함을 전하고 다시 맞추는 방식",
    categoryId: "relationship",
    categoryLabel: "관계",
    mappings: [
      primaryFacet("RO-EC", 0.9),
      primaryFacet("RO-RN", 0.85),
      secondaryFacet("ER-IR", 0.6),
    ],
    slug: "apology-style",
    title: "사과 방식",
  }),
  topic({
    caption: "가까움과 여백을 조절하는 리듬",
    categoryId: "relationship",
    categoryLabel: "관계",
    mappings: [
      primaryFacet("RO-RN", 0.9),
      primaryFacet("SE-RE", 0.8),
      secondaryFacet("ER-WD", 0.6),
    ],
    slug: "distance-rhythm",
    title: "거리감 리듬",
  }),
  topic({
    caption: "부딪힌 뒤 다시 연결되는 방법",
    categoryId: "relationship",
    categoryLabel: "관계",
    mappings: [
      primaryFacet("ER-WD", 0.85),
      primaryFacet("RO-EC", 0.85),
      secondaryFacet("SM-EP", 0.55),
    ],
    slug: "conflict-repair",
    title: "갈등 후 회복",
  }),
  topic({
    caption: "지친 뒤 다시 살아나는 방법",
    categoryId: "daily",
    categoryLabel: "일상",
    mappings: [
      primaryFacet("SM-EP", 0.75),
      primaryFacet("SE-RE", 0.75),
      secondaryFacet("ER-WD", 0.6),
    ],
    slug: "recharge-routine",
    title: "충전 루틴",
  }),
  topic({
    caption: "멈춘 생각을 다시 움직이는 방식",
    categoryId: "daily",
    categoryLabel: "일상",
    mappings: [
      primaryFacet("SM-EP", 0.85),
      primaryFacet("ER-WD", 0.75),
      secondaryFacet("OE-IE", 0.55),
    ],
    slug: "focus-switch",
    title: "집중 전환",
  }),
  topic({
    caption: "물건과 일정이 놓이는 방식",
    categoryId: "daily",
    categoryLabel: "일상",
    mappings: [primaryFacet("SM-OS", 0.95), secondaryFacet("OE-IE", 0.5)],
    slug: "organizing-style",
    title: "정리 방식",
  }),
  topic({
    caption: "가라앉는 기분을 바꾸는 방향",
    categoryId: "emotion",
    categoryLabel: "감정",
    mappings: [
      primaryFacet("ER-IR", 0.85),
      primaryFacet("ER-WD", 0.85),
      secondaryFacet("OE-AS", 0.55),
    ],
    slug: "mood-shift",
    title: "기분 전환 방식",
  }),
  topic({
    caption: "속상함을 말로 꺼내는 방식",
    categoryId: "emotion",
    categoryLabel: "감정",
    mappings: [
      primaryFacet("ER-IR", 0.85),
      primaryFacet("SE-AI", 0.8),
      secondaryFacet("RO-EC", 0.6),
    ],
    slug: "hurt-expression",
    title: "서운함 표현",
  }),
  topic({
    caption: "힘든 마음을 받을 때 편한 방식",
    categoryId: "emotion",
    categoryLabel: "감정",
    mappings: [
      primaryFacet("ER-WD", 0.8),
      primaryFacet("RO-EC", 0.75),
      secondaryFacet("RO-RN", 0.55),
    ],
    slug: "comfort-style",
    title: "위로 받는 방식",
  }),
  topic({
    caption: "사람을 만난 뒤 에너지가 돌아오는 속도",
    categoryId: "social_energy",
    categoryLabel: "사회적 에너지",
    mappings: [
      primaryFacet("SE-RE", 0.9),
      primaryFacet("ER-WD", 0.65),
      secondaryFacet("SM-EP", 0.5),
    ],
    slug: "after-gathering-recovery",
    title: "모임 후 회복",
  }),
  topic({
    caption: "처음 만난 사람과 온도를 맞추는 방식",
    categoryId: "social_energy",
    categoryLabel: "사회적 에너지",
    mappings: [
      primaryFacet("SE-RE", 0.9),
      primaryFacet("SE-AI", 0.8),
      secondaryFacet("RO-RN", 0.55),
    ],
    slug: "new-person-style",
    title: "새 사람 대하는 방식",
  }),
  topic({
    caption: "함께 일할 때 자연스럽게 맡는 자리",
    categoryId: "social_energy",
    categoryLabel: "사회적 에너지",
    mappings: [
      primaryFacet("SE-AI", 0.85),
      primaryFacet("SM-EP", 0.75),
      secondaryFacet("RO-EC", 0.55),
    ],
    slug: "team-role",
    title: "팀플 역할",
  }),
  topic({
    caption: "낯선 곳을 움직이는 계획 감각",
    categoryId: "preference",
    categoryLabel: "취향형 성향",
    mappings: [
      primaryFacet("SM-OS", 0.8),
      primaryFacet("OE-IE", 0.65),
      secondaryFacet("OE-AS", 0.5),
    ],
    slug: "travel-planning-style",
    title: "계획 여행과 즉흥 여행",
  }),
  topic({
    caption: "공간에서 편안함을 찾는 감각",
    categoryId: "preference",
    categoryLabel: "취향형 성향",
    impactGrade: "B",
    mappings: [
      primaryFacet("OE-AS", 0.6),
      primaryFacet("SE-RE", 0.45),
      secondaryFacet("ER-WD", 0.45),
    ],
    slug: "cafe-seat-style",
    title: "카페 자리 취향",
  }),
  topic({
    caption: "연락과 알림에 반응하는 리듬",
    categoryId: "preference",
    categoryLabel: "취향형 성향",
    mappings: [
      primaryFacet("SM-EP", 0.75),
      primaryFacet("ER-WD", 0.75),
      secondaryFacet("RO-RN", 0.55),
    ],
    slug: "notification-response",
    title: "알림 대응",
  }),
  topic({
    caption: "다른 의견을 받아들이는 방식",
    categoryId: "growth",
    categoryLabel: "성장",
    mappings: [
      primaryFacet("ER-IR", 0.75),
      primaryFacet("RO-EC", 0.7),
      secondaryFacet("OE-IE", 0.6),
    ],
    slug: "feedback-style",
    title: "피드백 받는 방식",
  }),
  topic({
    caption: "목표를 계속 붙잡는 방식",
    categoryId: "growth",
    categoryLabel: "성장",
    mappings: [
      primaryFacet("SM-EP", 0.9),
      primaryFacet("SM-OS", 0.8),
      secondaryFacet("ER-WD", 0.55),
    ],
    slug: "goal-maintenance",
    title: "목표 유지 방식",
  }),
  topic({
    caption: "미루는 순간에 자주 생기는 패턴",
    categoryId: "growth",
    categoryLabel: "성장",
    mappings: [
      primaryFacet("SM-EP", 0.9),
      primaryFacet("ER-WD", 0.75),
      secondaryFacet("SM-OS", 0.55),
    ],
    slug: "procrastination-pattern",
    title: "미루기 패턴",
  }),
];

export const featuredFreeTopicAssessments = freeTopicAssessments.slice(0, 3);

export const openFreeTopicSlugs = [
  "conversation-temperature",
  "apology-style",
  "distance-rhythm",
  "conflict-repair",
  "recharge-routine",
  "focus-switch",
  "organizing-style",
  "mood-shift",
  "hurt-expression",
  "comfort-style",
] as const;

const openFreeTopicSlugSet = new Set<string>(openFreeTopicSlugs);

export const openFreeTopicAssessments = freeTopicAssessments.filter((assessment) =>
  openFreeTopicSlugSet.has(assessment.slug),
);

export const plannedFreeTopicAssessments = freeTopicAssessments.filter(
  (assessment) => !openFreeTopicSlugSet.has(assessment.slug),
);

const freeTopicQuestionBank: Record<string, FreeTopicQuestion[]> = {
  "conversation-temperature": [
    question("ct-01", "중요한 이야기가 생기면 먼저 말문을 여는 편이다.", "RO-EC"),
    question("ct-02", "상대가 망설이면 선택지를 조심스럽게 좁혀주는 편이다.", "RO-RN"),
    question("ct-03", "분위기가 어색할 때 내가 먼저 질문을 던지는 편이다.", "SE-AI"),
  ],
  "apology-style": [
    question("as-01", "미안한 일이 생기면 상대의 마음을 먼저 확인하려고 한다.", "RO-EC"),
    question("as-02", "사과할 때 상대가 받아들일 시간을 존중하는 편이다.", "RO-RN"),
    question("as-03", "불편한 대화가 시작되면 감정이 빠르게 올라오는 편이다.", "ER-IR"),
  ],
  "distance-rhythm": [
    question("dr-01", "가까운 관계에서도 각자의 시간을 분명히 두고 싶다.", "RO-RN"),
    question("dr-02", "사람들과 자주 연결될수록 에너지가 살아나는 편이다.", "SE-RE"),
    question("dr-03", "관계의 거리가 애매해지면 걱정이 길어지는 편이다.", "ER-WD"),
  ],
  "conflict-repair": [
    question("cr-01", "갈등 후에는 다시 이야기하기 전 마음을 정리할 시간이 필요하다.", "ER-WD"),
    question("cr-02", "서로 무엇을 다르게 느꼈는지 이해하려고 한다.", "RO-EC"),
    question("cr-03", "불편함이 남으면 작은 행동이라도 먼저 해보는 편이다.", "SM-EP"),
  ],
  "recharge-routine": [
    question("rr-01", "지친 뒤에도 작은 루틴을 시작하면 회복이 빨라지는 편이다.", "SM-EP"),
    question("rr-02", "편한 사람과 가볍게 연결되면 에너지가 돌아오는 편이다.", "SE-RE"),
    question("rr-03", "충분히 쉬어도 해야 할 일이 남아 있으면 계속 마음에 걸린다.", "ER-WD"),
  ],
  "focus-switch": [
    question("fs-01", "멈춘 일을 다시 시작할 작은 첫 행동을 찾는 편이다.", "SM-EP"),
    question("fs-02", "집중이 흐트러지면 실패할 가능성을 여러 번 떠올린다.", "ER-WD"),
    question("fs-03", "막힐 때는 다른 관점이나 원리를 찾아보면 다시 움직인다.", "OE-IE"),
  ],
  "organizing-style": [
    question("os-01", "자주 쓰는 물건은 정해진 자리에 있어야 마음이 편하다.", "SM-OS"),
    question("os-02", "일정을 머릿속보다 목록이나 캘린더에 정리하는 편이다.", "SM-OS"),
    question("os-03", "정리 방식도 왜 그렇게 해야 하는지 원리를 알고 싶다.", "OE-IE"),
  ],
  "mood-shift": [
    question("ms-01", "기분이 흔들리면 표정이나 말투에 비교적 빨리 드러난다.", "ER-IR"),
    question("ms-02", "한 번 마음에 걸린 일은 쉽게 놓이지 않는 편이다.", "ER-WD"),
    question("ms-03", "음악, 빛, 장면 같은 감각 변화로 기분을 바꾸는 편이다.", "OE-AS"),
  ],
  "hurt-expression": [
    question("he-01", "서운함이 생기면 감정이 안쪽에서 크게 움직이는 편이다.", "ER-IR"),
    question("he-02", "상대에게 내 마음을 직접 말하는 편이다.", "SE-AI"),
    question("he-03", "내가 서운해도 상대 입장을 함께 보려고 한다.", "RO-EC"),
  ],
  "comfort-style": [
    question("cs-01", "힘든 일이 생기면 여러 가능성을 생각하며 오래 망설인다.", "ER-WD"),
    question("cs-02", "위로받을 때 내 마음을 먼저 이해해주는 말이 중요하다.", "RO-EC"),
    question("cs-03", "위로도 내가 받아들일 수 있는 속도로 다가오면 편하다.", "RO-RN"),
  ],
};

export const forbiddenFreeTopicKeywords = [
  "우울",
  "ADHD",
  "자살",
  "자해",
  "중독",
  "트라우마",
  "사이코패스",
  "소시오패스",
  "폭력 위험",
  "성적 지향",
  "약물 검사",
] as const;

export function getFreeTopicAssessment(slug: string) {
  return freeTopicAssessments.find((assessment) => assessment.slug === slug) ?? null;
}

export function isFreeTopicOpen(slug: string) {
  return openFreeTopicSlugSet.has(slug);
}

export function getFreeTopicQuestions(slug: string) {
  return freeTopicQuestionBank[slug] ?? [];
}

export function calculateFreeTopicResult({
  answers,
  assessment,
  observedAt,
}: {
  answers: Record<string, FreeTopicAnswer>;
  assessment: FreeTopicAssessment;
  observedAt: string;
}): FreeTopicScoreResult {
  const questions = getFreeTopicQuestions(assessment.slug);
  const scoresByTarget: Record<string, number[]> = {};

  questions.forEach((question) => {
    const answer = answers[question.id];

    if (!answer) return;

    const targetKey = buildTargetKey(question.target);
    const score = scoreResponse(answer.value, Boolean(question.isReverse));
    scoresByTarget[targetKey] = [...(scoresByTarget[targetKey] ?? []), score];
  });

  const scoresByTargetId = Object.fromEntries(
    Object.entries(scoresByTarget).map(([targetKey, scores]) => [
      targetKey,
      Math.round(mean(scores)),
    ]),
  );
  const observations = buildFreeTopicEvidenceObservations({
    assessment,
    observedAt,
    scoresByTargetId,
  });

  return {
    observations,
    scoresByTargetId,
    summary: buildResultSummary({ assessment, observations }),
  };
}

export function buildFreeTopicResultReport({
  assessment,
  result,
}: {
  assessment: FreeTopicAssessment;
  result: Pick<FreeTopicScoreResult, "observations" | "scoresByTargetId">;
}): FreeTopicResultReport {
  const signals = Object.entries(result.scoresByTargetId)
    .map(([targetKey, score]) => {
      const targetId = normalizeTargetId(targetKey);
      const signal = buildFreeTopicReportSignal({
        assessment,
        score,
        targetKey,
      });

      return signal
        ? {
            rank: getMappingRank(assessment, targetId),
            signal,
          }
        : null;
    })
    .filter(
      (entry): entry is { rank: number; signal: FreeTopicReportSignal } =>
        Boolean(entry),
    )
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => entry.signal);
  const averageScore =
    signals.length > 0
      ? Math.round(
          signals.reduce((sum, signal) => sum + signal.score, 0) / signals.length,
        )
      : null;

  return {
    averageScore,
    confidenceCopy: buildConfidenceCopy({ assessment, result, signals }),
    confidenceLabel: buildConfidenceLabel({ assessment, result, signals }),
    headline: buildReportHeadline({ assessment, signals }),
    signals,
  };
}

export function getFreeTopicTargetDisplay(targetKey: string) {
  const targetId = normalizeTargetId(targetKey);
  return (
    freeTopicTargetCopy[targetId] ??
    inferTargetDisplay(targetId) ?? {
      areaLabel: "성향 신호",
      highCopy: "이번 주제에서 비교적 뚜렷하게 나타난 방향이에요.",
      label: "세부 성향",
      lowCopy: "이번 주제에서는 낮게 나타난 방향이에요.",
      midCopy: "이번 주제에서는 균형에 가깝게 나타난 방향이에요.",
    }
  );
}

export function buildFreeTopicEvidenceObservations({
  assessment,
  observedAt,
  responseQuality = 1,
  scoresByTargetId,
}: {
  assessment: FreeTopicAssessment;
  observedAt: string;
  responseQuality?: number;
  scoresByTargetId: Record<string, number | null | undefined>;
}): TraitEvidenceObservation[] {
  if (assessment.impactGrade !== "A") return [];

  return assessment.mappings
    .map((mapping) => {
      const targetKey = buildTargetKey(mapping.target);
      const score = scoresByTargetId[targetKey] ?? scoresByTargetId[mapping.target.id];

      if (score === undefined || score === null) return null;

      const observation: TraitEvidenceObservation = {
        approvalStatus: "approved",
        constructDirectness: mapping.constructDirectness,
        id: `${assessment.slug}:${targetKey}`,
        measurementAmount: mapping.measurementAmount,
        observedAt,
        recency: 1,
        repetitionDiscount: 1,
        responseQuality,
        score,
        sourceKind: "free_topic",
        target: mapping.target,
      };

      return observation;
    })
    .filter((observation): observation is TraitEvidenceObservation => observation !== null);
}

export function buildTargetKey(target: TraitEvidenceTarget) {
  return `${target.kind}:${target.id}`;
}

function buildFreeTopicReportSignal({
  assessment,
  score,
  targetKey,
}: {
  assessment: FreeTopicAssessment;
  score: number;
  targetKey: string;
}) {
  const targetId = normalizeTargetId(targetKey);
  const display = getFreeTopicTargetDisplay(targetId);
  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const level = getSignalLevel(boundedScore);

  return {
    areaLabel: display.areaLabel,
    interpretation:
      level.kind === "high"
        ? display.highCopy
        : level.kind === "low"
          ? display.lowCopy
          : display.midCopy,
    label: display.label,
    levelLabel: level.label,
    roleLabel: getMappingRank(assessment, targetId) === 1 ? "보조 참고" : "핵심 반영",
    score: boundedScore,
  };
}

function normalizeTargetId(targetKey: string) {
  const parts = targetKey.split(":");
  return parts[parts.length - 1] ?? targetKey;
}

function getMappingRank(assessment: FreeTopicAssessment, targetId: string) {
  const mapping = assessment.mappings.find(
    (item) => item.target.id === normalizeTargetId(targetId),
  );

  if (!mapping) return 2;
  return mapping.role === "primary" ? 0 : 1;
}

function getSignalLevel(score: number) {
  if (score >= 70) return { kind: "high" as const, label: "뚜렷함" };
  if (score >= 56) return { kind: "middle" as const, label: "조금 드러남" };
  if (score >= 45) return { kind: "middle" as const, label: "균형에 가까움" };
  return { kind: "low" as const, label: "낮게 나타남" };
}

function buildReportHeadline({
  assessment,
  signals,
}: {
  assessment: FreeTopicAssessment;
  signals: FreeTopicReportSignal[];
}) {
  const strongestSignal = signals[0];

  if (!strongestSignal) {
    return "이번 결과는 취향과 추천을 더 섬세하게 만드는 참고 자료로만 사용돼요.";
  }

  return `${assessment.title}에서는 ${strongestSignal.label}이 가장 선명하게 나타났어요. 이 결과는 단독 판단이 아니라, 코어 검사와 다른 주제 검사 결과가 쌓일수록 더 정확하게 해석돼요.`;
}

function buildConfidenceLabel({
  assessment,
  result,
  signals,
}: {
  assessment: FreeTopicAssessment;
  result: Pick<FreeTopicScoreResult, "observations">;
  signals: FreeTopicReportSignal[];
}) {
  if (assessment.impactGrade !== "A") return "참고용 결과";
  if (result.observations.length >= 3 && signals.length >= 3) return "누적 반영 가능";
  return "참고 신호";
}

function buildConfidenceCopy({
  assessment,
  result,
  signals,
}: {
  assessment: FreeTopicAssessment;
  result: Pick<FreeTopicScoreResult, "observations">;
  signals: FreeTopicReportSignal[];
}) {
  if (assessment.impactGrade !== "A") {
    return "이 주제는 대표 성향을 바꾸기보다 취향과 추천을 더 섬세하게 만드는 자료로만 사용돼요.";
  }

  return `${signals.length}개 세부 신호와 ${result.observations.length}개 승인된 관찰값을 참고했어요. 대표 성향은 여러 검사에서 같은 방향이 반복될 때만 조심스럽게 업데이트돼요.`;
}

const freeTopicTargetCopy: Record<
  string,
  {
    areaLabel: string;
    highCopy: string;
    label: string;
    lowCopy: string;
    midCopy: string;
  }
> = {
  "ER-IR": {
    areaLabel: "마음의 반응",
    highCopy:
      "감정이 비교적 빠르게 올라오고, 그 변화가 표정이나 말투에 드러나기 쉬운 흐름이에요.",
    label: "감정 반응의 크기",
    lowCopy:
      "감정이 바로 커지기보다 한 박자 늦게 정리되거나, 겉으로는 차분하게 유지되는 흐름이에요.",
    midCopy:
      "감정 반응이 한쪽으로 치우치기보다 상황에 따라 커졌다가 가라앉는 흐름이에요.",
  },
  "ER-WD": {
    areaLabel: "마음의 반응",
    highCopy:
      "결정하거나 관계를 정리하기 전에 여러 가능성을 오래 생각하는 경향이 선명해요.",
    label: "걱정과 망설임",
    lowCopy:
      "걱정이 길어지기보다 필요한 만큼 보고 빠르게 다음 행동으로 넘어가는 흐름이에요.",
    midCopy:
      "걱정과 실행 사이에서 균형을 찾으려는 흐름이에요.",
  },
  "OE-AS": {
    areaLabel: "감각과 생각",
    highCopy:
      "분위기, 장면, 소리처럼 감각적인 단서로 기분과 판단이 움직이는 편이에요.",
    label: "감각으로 분위기 읽기",
    lowCopy:
      "감각적인 인상보다 필요한 정보와 실제 조건을 먼저 보는 흐름이에요.",
    midCopy:
      "감각적인 인상과 현실적인 정보를 함께 참고하는 흐름이에요.",
  },
  "OE-IE": {
    areaLabel: "감각과 생각",
    highCopy:
      "막혔을 때 원리, 관점, 새로운 아이디어를 찾아보며 다시 움직이는 힘이 보여요.",
    label: "아이디어로 풀어가기",
    lowCopy:
      "새 관점보다 지금 확인 가능한 방법과 익숙한 절차를 더 신뢰하는 흐름이에요.",
    midCopy:
      "새로운 아이디어와 검증된 방법을 함께 놓고 보는 흐름이에요.",
  },
  "RO-EC": {
    areaLabel: "관계 방식",
    highCopy:
      "대화에서 상대의 마음과 맥락을 먼저 살피려는 흐름이 선명하게 나타나요.",
    label: "상대 마음 살피기",
    lowCopy:
      "상대 감정보다 대화의 핵심, 기준, 해결 방향을 먼저 잡으려는 흐름이에요.",
    midCopy:
      "상대 마음을 살피면서도 내 기준과 상황 판단을 함께 두는 흐름이에요.",
  },
  "RO-RN": {
    areaLabel: "관계 방식",
    highCopy:
      "가까운 관계에서도 속도, 거리, 선택권을 존중하려는 흐름이 뚜렷해요.",
    label: "기준과 선택 존중",
    lowCopy:
      "관계의 여백보다 빠른 연결감이나 즉시 조율을 더 편하게 느끼는 흐름이에요.",
    midCopy:
      "가까움과 여백을 상황에 맞춰 조절하려는 흐름이에요.",
  },
  "SE-AI": {
    areaLabel: "사람 사이 에너지",
    highCopy:
      "어색한 상황이나 중요한 대화에서 먼저 말문을 열고 흐름을 만드는 편이에요.",
    label: "먼저 말 꺼내기",
    lowCopy:
      "먼저 나서기보다 상대의 반응을 보고 자연스럽게 맞춰가는 흐름이에요.",
    midCopy:
      "필요할 때는 먼저 표현하지만, 평소에는 흐름을 보고 움직이는 편이에요.",
  },
  "SE-RE": {
    areaLabel: "사람 사이 에너지",
    highCopy:
      "편한 사람들과 연결될수록 에너지가 살아나는 흐름이 비교적 선명해요.",
    label: "함께하며 충전하기",
    lowCopy:
      "사람과 연결된 뒤에는 혼자 정리하고 회복하는 시간이 더 중요하게 나타나요.",
    midCopy:
      "함께하는 시간과 혼자 회복하는 시간을 함께 필요로 하는 흐름이에요.",
  },
  "SM-EP": {
    areaLabel: "일상 리듬",
    highCopy:
      "멈춘 일을 다시 시작할 작은 행동을 찾고, 실제로 움직이는 힘이 보여요.",
    label: "작게 시작해 마무리하기",
    lowCopy:
      "바로 움직이기보다 충분히 생각하고 조건이 맞을 때 시작하려는 흐름이에요.",
    midCopy:
      "상황이 정리되면 실행으로 넘어가지만, 준비가 필요할 때는 속도를 늦추는 흐름이에요.",
  },
  "SM-OS": {
    areaLabel: "일상 리듬",
    highCopy:
      "물건, 일정, 생각을 정해진 구조 안에 두면 마음이 안정되는 흐름이에요.",
    label: "정리와 계획",
    lowCopy:
      "정해진 구조보다 상황에 맞춰 유연하게 움직이는 편이 더 자연스러운 흐름이에요.",
    midCopy:
      "큰 틀은 정리하되, 세부는 상황에 맞춰 조정하는 흐름이에요.",
  },
};

function inferTargetDisplay(targetId: string) {
  const facet = coreFacetDefinitions.find((item) => item.facetId === targetId);

  if (facet) {
    return {
      areaLabel: "세부 성향",
      highCopy: "이번 주제에서 비교적 뚜렷하게 나타난 세부 성향이에요.",
      label: facet.label,
      lowCopy: "이번 주제에서는 낮게 나타난 세부 성향이에요.",
      midCopy: "이번 주제에서는 균형에 가깝게 나타난 세부 성향이에요.",
    };
  }

  const domain = coreDomainDefinitions.find((item) => item.domainId === targetId);

  if (!domain) return null;

  return {
    areaLabel: "코드 자리",
    highCopy: "이번 주제에서 비교적 뚜렷하게 나타난 코드 자리예요.",
    label: domain.label,
    lowCopy: "이번 주제에서는 낮게 나타난 코드 자리예요.",
    midCopy: "이번 주제에서는 두 모습이 비슷하게 나타난 코드 자리예요.",
  };
}

function topic(
  assessment: Omit<
    FreeTopicAssessment,
    "comparisonUse" | "estimatedMinutes" | "evidenceUse" | "impactGrade" | "sourceWeight"
  > &
    Partial<
      Pick<
        FreeTopicAssessment,
        "estimatedMinutes" | "evidenceUse" | "impactGrade"
      >
    >,
): FreeTopicAssessment {
  const impactGrade = assessment.impactGrade ?? "A";

  return {
    comparisonUse: false,
    estimatedMinutes: assessment.estimatedMinutes ?? 3,
    evidenceUse:
      assessment.evidenceUse ??
      (impactGrade === "A"
        ? "dynamic_trait_evidence"
        : "interpretation_and_recommendation_only"),
    impactGrade,
    sourceWeight: freeTopicSourceWeight,
    ...assessment,
  };
}

function primaryFacet(
  facetId: string,
  constructDirectness: number,
): FreeTopicEvidenceMapping {
  return {
    constructDirectness,
    measurementAmount: 1,
    role: "primary",
    target: { kind: "facet", id: facetId },
  };
}

function secondaryFacet(
  facetId: string,
  constructDirectness: number,
): FreeTopicEvidenceMapping {
  return {
    constructDirectness,
    measurementAmount: 0.65,
    role: "secondary",
    target: { kind: "facet", id: facetId },
  };
}

function question(
  id: string,
  text: string,
  facetId: string,
  isReverse = false,
): FreeTopicQuestion {
  return {
    id,
    isReverse,
    target: { kind: "facet", id: facetId },
    text,
  };
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildResultSummary({
  assessment,
  observations,
}: {
  assessment: FreeTopicAssessment;
  observations: TraitEvidenceObservation[];
}) {
  if (assessment.impactGrade !== "A" || observations.length === 0) {
    return "이 결과는 취향과 추천을 더 섬세하게 만드는 참고 신호로만 사용돼요.";
  }

  return "이 결과는 여러 검사와 함께 누적되어 현재 대표 성향을 더 정교하게 이해하는 데 사용돼요.";
}
