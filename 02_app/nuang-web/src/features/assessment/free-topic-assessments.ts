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
import {
  buildFreeTopicLongReportSections,
  buildFreeTopicPersonalizedSummary,
} from "@/features/assessment/free-topic-long-report";
import type { AssessmentUnsureReason } from "@/features/assessment/types";
import { canTopicEvidenceUpdateRepresentativeCode } from "@/features/assessment/topic-representative-code-policy";
import { nextNuangCodeScheme } from "@/features/nuang-code/next-code-scheme";

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
  recallPeriodLabel?: string;
  recallPrompt?: string;
  reportMode?: "bipolar_dimensions" | "independent_dimensions";
  reportScales?: FreeTopicReportScale[];
  responseScale?: "frequency_5" | "helpfulness_5" | "need_5";
};

export type FreeTopicReportScale = {
  areaLabel: string;
  groupLabel?: string;
  highCopy: string;
  highLabel: string;
  id: string;
  lowCopy: string;
  lowLabel: string;
  lowAction?: string;
  lowStrength?: string;
  lowWatch?: string;
  midCopy: string;
  midLabel: string;
  midAction?: string;
  midStrength?: string;
  midWatch?: string;
  highAction?: string;
  highStrength?: string;
  highWatch?: string;
};

export type FreeTopicQuestion = {
  contextLabel: string;
  id: string;
  isReverse?: boolean;
  reportScaleId?: string;
  target: TraitEvidenceTarget;
  text: string;
  /**
   * Controls only the representative NUANG-code evidence direction.
   * Topic-report scoring continues to use `isReverse` so a report dimension
   * can keep its natural wording while contributing the opposite core-axis
   * direction (or no core evidence at all).
   */
  traitScoring?: "same" | "reverse" | "excluded";
};

export type FreeTopicAnswer = {
  answeredAt: string;
  questionId: string;
  unsureReason?: AssessmentUnsureReason;
  value?: ResponseValue;
};

export type FreeTopicScoreResult = {
  observations: TraitEvidenceObservation[];
  scaleStatisticsById?: Record<string, FreeTopicScaleStatistics>;
  scoresByScaleId?: Record<string, number>;
  scoresByQuestionId?: Record<string, number>;
  scoresByTargetId: Record<string, number>;
  summary: string;
  validResponsesByScaleId?: Record<string, number>;
};

export type FreeTopicScaleStatistics = {
  dispersion: number;
  maxScore: number;
  meanScore: number;
  minScore: number;
  responsePattern: "steady" | "varied";
  scoreRange: number;
  validResponses: number;
};

export type FreeTopicReportSignal = {
  areaLabel: string;
  groupLabel?: string;
  interpretation: string;
  label: string;
  levelLabel: string;
  roleLabel: string;
  score: number;
};

export type FreeTopicPersonalizedSummary = {
  body: string;
  eyebrow: string;
  steps: Array<{
    label: string;
    text: string;
  }>;
  title: string;
};

export type FreeTopicResultReport = {
  averageScore: number | null;
  confidenceCopy: string;
  confidenceLabel: string;
  headline: string;
  longReportSections: FreeTopicLongReportSection[];
  nuangCodeSection?: FreeTopicLongReportSection;
  personalizedSummary?: FreeTopicPersonalizedSummary;
  signals: FreeTopicReportSignal[];
};

export type FreeTopicLongReportSection = {
  blocks?: FreeTopicLongReportBlock[];
  body: string;
  claimIds: string[];
  role?: "close_person_script";
  title: string;
};

export type FreeTopicLongReportBlock =
  | {
      kind: "paragraph";
      text: string;
    }
  | {
      items: string[];
      kind: "ordered_list";
    }
  | {
      items: Array<{
        label: string;
        text: string;
      }>;
      kind: "labeled_list";
    };

export const freeTopicSourceWeight = dynamicTraitSourceWeights.free_topic;
export const defaultFreeTopicRecallPrompt =
  "최근 4주간의 평소 모습을 떠올려 주세요.";

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
    caption:
      "책임을 말하고, 상대의 마음을 듣고, 다음 행동을 정하는 모습을 알아봐요.",
    categoryId: "relationship",
    categoryLabel: "관계",
    mappings: [],
    reportScales: [
      {
        areaLabel: "내가 놓친 점 인정하기",
        highCopy:
          "내가 놓친 사실과 책임을 구체적으로 인정하는 행동이 자주 나타났어요.",
        highLabel: "내가 놓친 점을 자주 인정했어요",
        id: "responsibility_acknowledgement",
        lowCopy: "내가 놓친 사실과 책임을 구체적으로 인정한 경우가 적었어요.",
        lowLabel: "내가 놓친 점을 인정한 경우가 적었어요",
        midCopy: "상황에 따라 내가 놓친 사실을 인정하는 정도가 달라졌어요.",
        midLabel: "상황에 따라 달랐어요",
      },
      {
        areaLabel: "상대의 마음 듣기",
        highCopy:
          "내 설명 전에 상대가 불편하거나 상처받은 점을 듣는 행동이 자주 나타났어요.",
        highLabel: "상대의 마음을 자주 들었어요",
        id: "impact_listening",
        lowCopy: "상대가 불편하거나 상처받은 점을 들은 경우가 적었어요.",
        lowLabel: "상대의 마음을 들은 경우가 적었어요",
        midCopy: "상황에 따라 상대의 마음을 듣는 정도가 달라졌어요.",
        midLabel: "상황에 따라 달랐어요",
      },
      {
        areaLabel: "다음 행동 정하기",
        highCopy:
          "바로잡을 일과 다음 행동을 구체적으로 정하는 모습이 자주 나타났어요.",
        highLabel: "다음 행동을 자주 정했어요",
        id: "repair_planning",
        lowCopy:
          "사과 뒤에 바로잡을 일과 다음 행동을 구체적으로 정한 경우가 적었어요.",
        lowLabel: "다음 행동을 정한 경우가 적었어요",
        midCopy: "상황에 따라 사과 뒤에 다음 행동을 정하는 정도가 달라졌어요.",
        midLabel: "상황에 따라 달랐어요",
      },
    ],
    recallPrompt:
      "최근 6개월간 미안했던 일을 떠올리며, 실제로 한 행동을 기준으로 답해 주세요.",
    recallPeriodLabel: "최근 6개월",
    reportMode: "independent_dimensions",
    responseScale: "frequency_5",
    estimatedMinutes: 4,
    slug: "apology-style",
    title: "사과할 때 나는 어떻게 풀어갈까?",
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
    caption:
      "지친 순간에 자극을 낮추고, 편한 사람과 연결하고, 작은 행동으로 리듬을 되찾는 모습을 알아봐요.",
    categoryId: "daily",
    categoryLabel: "일상",
    estimatedMinutes: 4,
    mappings: [],
    recallPrompt:
      "최근 4주간 지쳤던 순간을 떠올리며, 회복을 위해 실제로 한 행동을 답해 주세요.",
    reportMode: "independent_dimensions",
    reportScales: [
      {
        areaLabel: "자극 낮추기",
        highCopy:
          "지친 순간에 소리·화면·해야 할 생각에서 잠시 떨어져 조용히 쉬는 행동이 자주 나타났어요.",
        highLabel: "자극을 낮추고 자주 쉬었어요",
        id: "quiet_detachment",
        lowCopy:
          "지친 순간에 자극을 줄이고 조용히 쉬는 행동은 비교적 드물게 나타났어요.",
        lowLabel: "자극을 낮춰 쉰 경우가 적었어요",
        midCopy: "자극을 낮추고 조용히 쉬는 정도는 상황에 따라 달라졌어요.",
        midLabel: "자극을 낮춰 쉬는 정도는 상황에 따라 달랐어요",
      },
      {
        areaLabel: "편한 사람과 연결하기",
        highCopy:
          "지친 순간에 부담 없이 함께 있거나 이야기할 수 있는 사람과 연결하는 행동이 자주 나타났어요.",
        highLabel: "편한 사람과 자주 연결했어요",
        id: "supportive_connection",
        lowCopy:
          "지친 순간에 편한 사람과 연락하거나 함께 있는 행동은 비교적 드물게 나타났어요.",
        lowLabel: "편한 사람과 연결한 경우가 적었어요",
        midCopy: "편한 사람과 연결해 회복하는 정도는 상황에 따라 달라졌어요.",
        midLabel: "사람과 연결하는 정도는 상황에 따라 달랐어요",
      },
      {
        areaLabel: "작은 행동으로 리듬 찾기",
        highCopy:
          "지친 순간에 부담이 적은 활동이나 작은 움직임으로 리듬을 바꾸는 행동이 자주 나타났어요.",
        highLabel: "작은 행동으로 자주 리듬을 바꿨어요",
        id: "gentle_reactivation",
        lowCopy:
          "지친 순간에 작은 활동이나 움직임으로 리듬을 바꾸는 행동은 비교적 드물게 나타났어요.",
        lowLabel: "작은 행동으로 리듬을 바꾼 경우가 적었어요",
        midCopy: "작은 행동으로 리듬을 바꾸는 정도는 상황에 따라 달라졌어요.",
        midLabel: "작은 행동의 정도는 상황에 따라 달랐어요",
      },
    ],
    responseScale: "frequency_5",
    slug: "recharge-routine",
    title: "지칠 때 나는 어떻게 충전할까?",
  }),
  topic({
    caption: "중단했던 일에 다시 집중하는 세 가지 행동",
    categoryId: "daily",
    categoryLabel: "일상",
    estimatedMinutes: 4,
    mappings: [],
    recallPrompt:
      "최근 4주간 집중이 끊기거나 일을 바꿨던 순간을 떠올리며, 실제로 한 행동을 답해 주세요.",
    reportMode: "independent_dimensions",
    reportScales: [
      {
        areaLabel: "다시 시작할 지점 남기기",
        highCopy:
          "집중이 끊기기 전 다시 볼 지점이나 다음 행동을 남기는 모습이 자주 나타났어요.",
        highLabel: "다시 시작할 지점을 자주 남겼어요",
        id: "resumption_cue",
        lowCopy:
          "집중이 끊기기 전 다시 볼 지점이나 다음 행동을 남기는 모습은 비교적 드물게 나타났어요.",
        lowLabel: "다시 시작할 지점을 남긴 경우가 적었어요",
        midCopy:
          "다시 시작할 지점을 남기는 정도는 집중이 끊긴 상황에 따라 달라졌어요.",
        midLabel: "상황에 따라 다시 시작할 지점을 남겼어요",
      },
      {
        areaLabel: "지금 할 일 다시 잡기",
        highCopy:
          "중단했던 일을 다시 시작할 때 지금 다룰 목표나 범위를 한 가지로 잡는 모습이 자주 나타났어요.",
        highLabel: "지금 할 일을 자주 다시 잡았어요",
        id: "goal_reorientation",
        lowCopy:
          "중단했던 일을 다시 시작할 때 지금 다룰 목표나 범위를 잡는 모습은 비교적 드물게 나타났어요.",
        lowLabel: "지금 할 일을 다시 잡은 경우가 적었어요",
        midCopy:
          "지금 할 일을 다시 잡는 정도는 집중이 끊긴 상황에 따라 달라졌어요.",
        midLabel: "상황에 따라 지금 할 일을 다시 잡았어요",
      },
      {
        areaLabel: "작은 첫 행동 시작하기",
        highCopy:
          "집중을 완전히 되찾으려 하기보다 바로 할 수 있는 작은 행동부터 시작하는 모습이 자주 나타났어요.",
        highLabel: "작은 첫 행동을 자주 시작했어요",
        id: "small_reentry",
        lowCopy:
          "바로 할 수 있는 작은 행동부터 시작하는 모습은 비교적 드물게 나타났어요.",
        lowLabel: "작은 첫 행동을 시작한 경우가 적었어요",
        midCopy:
          "작은 첫 행동을 시작하는 정도는 집중이 끊긴 상황에 따라 달라졌어요.",
        midLabel: "상황에 따라 작은 첫 행동을 시작했어요",
      },
    ],
    responseScale: "frequency_5",
    slug: "focus-switch",
    title: "집중이 끊기면 나는 어떻게 다시 시작할까?",
  }),
  topic({
    caption: "물건·일정·정보를 정리하고 유지하는 네 가지 방식",
    categoryId: "daily",
    categoryLabel: "일상",
    estimatedMinutes: 5,
    mappings: [],
    recallPrompt:
      "최근 4주간 물건·일정·정보를 정리했던 실제 장면을 떠올려 주세요.",
    reportMode: "independent_dimensions",
    reportScales: [
      {
        areaLabel: "자리와 분류 정하기",
        highCopy:
          "물건·일정·정보가 들어갈 자리나 분류를 정하는 행동이 자주 나타났어요.",
        highLabel: "자리와 분류를 자주 정했어요",
        id: "stable_structure",
        lowCopy:
          "물건·일정·정보가 들어갈 자리나 분류를 정하는 행동은 비교적 드물게 나타났어요.",
        lowLabel: "자리와 분류를 정한 경우가 적었어요",
        midCopy: "자리와 분류를 정하는 정도는 정리 상황에 따라 달라졌어요.",
        midLabel: "상황에 따라 자리와 분류를 정했어요",
      },
      {
        areaLabel: "기억할 것 남기기",
        highCopy:
          "나중에 찾거나 해야 할 내용을 이름·목록·알림으로 남기는 행동이 자주 나타났어요.",
        highLabel: "기억할 것을 자주 남겼어요",
        id: "visible_capture",
        lowCopy:
          "나중에 찾거나 해야 할 내용을 바깥에 남기는 행동은 비교적 드물게 나타났어요.",
        lowLabel: "기억할 것을 남긴 경우가 적었어요",
        midCopy:
          "기억할 것을 바깥에 남기는 정도는 정리 상황에 따라 달라졌어요.",
        midLabel: "상황에 따라 기억할 것을 남겼어요",
      },
      {
        areaLabel: "정리 방식 다시 맞추기",
        highCopy:
          "생활과 우선순위가 달라지면 기존 정리 방식을 다시 맞추는 행동이 자주 나타났어요.",
        highLabel: "정리 방식을 자주 다시 맞췄어요",
        id: "adaptive_reset",
        lowCopy:
          "생활과 우선순위에 맞춰 정리 방식을 바꾸는 행동은 비교적 드물게 나타났어요.",
        lowLabel: "정리 방식을 다시 맞춘 경우가 적었어요",
        midCopy: "정리 방식을 다시 맞추는 정도는 정리 상황에 따라 달라졌어요.",
        midLabel: "상황에 따라 정리 방식을 다시 맞췄어요",
      },
      {
        areaLabel: "시간을 잡아 한꺼번에 정리하기",
        highCopy:
          "정리할 것을 모아두었다가 시간을 따로 잡아 한꺼번에 처리하는 모습이 자주 나타났어요.",
        highLabel: "시간을 잡아 한꺼번에 정리했어요",
        id: "batch_reset",
        lowCopy:
          "정리할 것을 모아두었다가 한꺼번에 처리하는 모습은 비교적 드물게 나타났어요.",
        lowLabel: "한꺼번에 정리한 경우가 적었어요",
        midCopy: "한꺼번에 정리하는 정도는 대상과 상황에 따라 달라졌어요.",
        midLabel: "상황에 따라 한꺼번에 정리했어요",
      },
    ],
    responseScale: "frequency_5",
    slug: "organizing-style",
    title: "나는 일상을 어떻게 정리할까?",
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
    caption:
      "무엇이 서운했는지 말하고, 내 마음과 바라는 점을 전하는 모습을 알아봐요.",
    categoryId: "emotion",
    categoryLabel: "감정",
    estimatedMinutes: 4,
    mappings: [],
    recallPrompt:
      "최근 6개월간 서운했던 일을 떠올리며, 실제로 한 말을 기준으로 답해 주세요.",
    recallPeriodLabel: "최근 6개월",
    reportMode: "independent_dimensions",
    reportScales: [
      {
        areaLabel: "무엇이 서운했는지 말하기",
        highCopy:
          "마음에 걸린 말이나 행동이 무엇인지 구체적으로 말하는 행동이 자주 나타났어요.",
        highLabel: "서운했던 일을 구체적으로 말했어요",
        id: "specific_event_expression",
        lowCopy:
          "무엇이 마음에 걸렸는지 구체적으로 말한 경우가 비교적 적었어요.",
        lowLabel: "서운했던 일을 말한 경우가 적었어요",
        midCopy: "무엇이 마음에 걸렸는지 말하는 정도는 상황에 따라 달랐어요.",
        midLabel: "상황에 따라 달랐어요",
      },
      {
        areaLabel: "내 마음 말하기",
        highCopy:
          "그 일로 내가 어떤 마음이 들었는지 말하는 행동이 자주 나타났어요.",
        highLabel: "내 마음을 자주 말했어요",
        id: "feeling_expression",
        lowCopy: "그 일로 든 내 마음을 상대에게 말한 경우가 비교적 적었어요.",
        lowLabel: "내 마음을 말한 경우가 적었어요",
        midCopy: "내 마음을 말하는 정도는 상황에 따라 달랐어요.",
        midLabel: "상황에 따라 달랐어요",
      },
      {
        areaLabel: "바라는 점 부탁하기",
        highCopy:
          "다음에 어떻게 해 주면 좋을지 구체적으로 부탁하는 행동이 자주 나타났어요.",
        highLabel: "바라는 점을 자주 부탁했어요",
        id: "change_request",
        lowCopy:
          "다음에 바라는 행동을 구체적으로 부탁한 경우가 비교적 적었어요.",
        lowLabel: "바라는 점을 부탁한 경우가 적었어요",
        midCopy: "바라는 점을 부탁하는 정도는 상황에 따라 달랐어요.",
        midLabel: "상황에 따라 달랐어요",
      },
    ],
    responseScale: "frequency_5",
    slug: "hurt-expression",
    title: "서운할 때 나는 어떻게 말할까?",
  }),
  topic({
    caption: "힘든 순간에 어떤 도움이 필요한지",
    categoryId: "emotion",
    categoryLabel: "감정",
    estimatedMinutes: 4,
    mappings: [],
    recallPrompt:
      "최근 6개월간 힘들었던 순간에 각 도움이 얼마나 필요했는지 답해 주세요.",
    recallPeriodLabel: "최근 6개월",
    reportMode: "independent_dimensions",
    reportScales: [
      {
        areaLabel: "마음 알아주기",
        groupLabel: "어떤 도움이 필요했나요?",
        highCopy:
          "내 마음을 알아주거나 부담 없이 곁에 있어 주는 연결이 크게 필요했어요.",
        highLabel: "마음을 알아주는 도움이 필요했어요",
        id: "emotional_acknowledgement",
        lowCopy:
          "최근에는 마음을 알아주거나 곁에 있어 주는 연결이 필요했던 정도가 비교적 낮았어요.",
        lowLabel: "마음을 알아주는 필요는 낮았어요",
        midCopy:
          "마음을 알아주거나 곁에 있어 주는 연결이 필요한 정도는 상황에 따라 달랐어요.",
        midLabel: "마음을 알아주는 필요는 상황에 따라 달랐어요",
      },
      {
        areaLabel: "방법과 실질 도움",
        groupLabel: "어떤 도움이 필요했나요?",
        highCopy:
          "방법을 함께 찾거나 실제 할 일을 나누는 도움이 크게 필요했어요.",
        highLabel: "방법과 실질 도움이 필요했어요",
        id: "collaborative_problem_solving",
        lowCopy:
          "최근에는 방법을 찾거나 실제 할 일을 나누는 도움이 필요했던 정도가 낮았어요.",
        lowLabel: "방법과 실질 도움의 필요는 낮았어요",
        midCopy:
          "방법을 찾거나 실제 할 일을 나누는 도움이 필요한 정도는 상황에 따라 달랐어요.",
        midLabel: "방법과 실질 도움의 필요는 상황에 따라 달랐어요",
      },
      {
        areaLabel: "내 속도와 공간",
        groupLabel: "어떻게 도움받고 싶었나요?",
        highCopy:
          "말할 시점과 도움의 종류, 쉬거나 주의를 돌릴 공간을 직접 고르는 방식이 크게 필요했어요.",
        highLabel: "내 속도와 공간을 지켜주는 방식이 필요했어요",
        id: "autonomy_pacing",
        lowCopy:
          "최근에는 도움의 속도나 공간을 직접 정해야 할 필요가 비교적 낮았어요.",
        lowLabel: "내 속도와 공간을 지켜줄 필요는 낮았어요",
        midCopy:
          "내 속도와 공간을 지켜주는 방식이 필요한 정도는 상황에 따라 달랐어요.",
        midLabel: "내 속도와 공간의 필요는 상황에 따라 달랐어요",
      },
    ],
    responseScale: "need_5",
    slug: "comfort-style",
    title: "위로받을 때 필요한 것",
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

export const openFreeTopicAssessments = freeTopicAssessments.filter(
  (assessment) => openFreeTopicSlugSet.has(assessment.slug),
);

export const plannedFreeTopicAssessments = freeTopicAssessments.filter(
  (assessment) => !openFreeTopicSlugSet.has(assessment.slug),
);

const freeTopicQuestionBank: Record<string, FreeTopicQuestion[]> = {
  "conversation-temperature": [
    question(
      "ct-01",
      "중요한 말을 꺼낼 때",
      "중요한 이야기가 생기면 먼저 말문을 여는 편이다.",
      "RO-EC",
    ),
    question(
      "ct-02",
      "상대가 망설일 때",
      "상대가 망설이면 선택지를 조심스럽게 좁혀주는 편이다.",
      "RO-RN",
    ),
    question(
      "ct-03",
      "분위기가 어색할 때",
      "분위기가 어색하면 내가 먼저 질문을 던지는 편이다.",
      "SE-AI",
    ),
  ],
  "apology-style": [
    scaledQuestion(
      "ap2-s1-r",
      "약속 시간이나 연락을 놓쳤을 때",
      "약속이나 연락을 지키지 못했다는 사실을 분명히 말했다.",
      "RO-EC",
      "responsibility_acknowledgement",
    ),
    scaledQuestion(
      "ap2-s1-l",
      "약속 시간이나 연락을 놓쳤을 때",
      "내 사정을 설명하기 전에 상대가 겪은 불편을 들었다.",
      "RO-RN",
      "impact_listening",
    ),
    scaledQuestion(
      "ap2-s1-f",
      "약속 시간이나 연락을 놓쳤을 때",
      "다음에는 연락이나 약속을 어떻게 지킬지 구체적으로 정했다.",
      "ER-IR",
      "repair_planning",
    ),
    scaledQuestion(
      "ap2-s2-r",
      "내 말이나 행동으로 가까운 사람이 상처받았을 때",
      "상처가 된 내 말이나 행동을 구체적으로 짚어 말했다.",
      "RO-EC",
      "responsibility_acknowledgement",
    ),
    scaledQuestion(
      "ap2-s2-l",
      "내 말이나 행동으로 가까운 사람이 상처받았을 때",
      "내 의도를 설명하기 전에 상대가 상처받은 점을 들었다.",
      "RO-RN",
      "impact_listening",
    ),
    scaledQuestion(
      "ap2-s2-f",
      "내 말이나 행동으로 가까운 사람이 상처받았을 때",
      "같은 방식으로 상처 주지 않기 위해 바꿀 행동을 정했다.",
      "ER-IR",
      "repair_planning",
    ),
    scaledQuestion(
      "ap2-s3-r",
      "학교·팀·업무에서 내 몫을 제대로 하지 못했을 때",
      "내가 맡은 몫을 하지 못한 책임을 분명히 말했다.",
      "RO-EC",
      "responsibility_acknowledgement",
    ),
    scaledQuestion(
      "ap2-s3-l",
      "학교·팀·업무에서 내 몫을 제대로 하지 못했을 때",
      "내 이유를 설명하기 전에, 내가 하지 못한 일 때문에 상대가 무엇을 더 해야 했는지 들었다.",
      "RO-RN",
      "impact_listening",
    ),
    scaledQuestion(
      "ap2-s3-f",
      "학교·팀·업무에서 내 몫을 제대로 하지 못했을 때",
      "다시 맡을 일과 마칠 시점을 구체적으로 정했다.",
      "ER-IR",
      "repair_planning",
    ),
    scaledQuestion(
      "ap2-s4-r",
      "같은 문제로 다시 미안한 일이 생겼을 때",
      "이전에도 비슷한 문제가 있었다는 점을 인정했다.",
      "RO-EC",
      "responsibility_acknowledgement",
    ),
    scaledQuestion(
      "ap2-s4-l",
      "같은 문제로 다시 미안한 일이 생겼을 때",
      "반복된 일 때문에 상대가 답답했던 점을 들었다.",
      "RO-RN",
      "impact_listening",
    ),
    scaledQuestion(
      "ap2-s4-f",
      "같은 문제로 다시 미안한 일이 생겼을 때",
      "같은 문제가 또 생기지 않도록 바꿀 행동을 정했다.",
      "ER-IR",
      "repair_planning",
    ),
  ],
  "distance-rhythm": [
    question(
      "dr-01",
      "가까운 사람과 지낼 때",
      "가까운 관계에서도 각자의 시간을 분명히 두고 싶다.",
      "RO-RN",
    ),
    question(
      "dr-02",
      "사람들과 자주 연락할 때",
      "사람들과 자주 연결될수록 에너지가 살아나는 편이다.",
      "SE-RE",
    ),
    question(
      "dr-03",
      "관계가 애매해졌을 때",
      "관계의 거리가 애매해지면 걱정이 길어지는 편이다.",
      "ER-WD",
    ),
  ],
  "conflict-repair": [
    question(
      "cr-01",
      "다툰 직후",
      "다시 이야기하기 전에 마음을 정리할 시간이 필요하다.",
      "ER-WD",
    ),
    question(
      "cr-02",
      "서로 다르게 느낀 것 같을 때",
      "서로 무엇을 다르게 느꼈는지 이해하려고 한다.",
      "RO-EC",
    ),
    question(
      "cr-03",
      "불편함이 남아 있을 때",
      "관계를 다시 풀기 위해 작은 행동이라도 먼저 해보는 편이다.",
      "SM-EP",
    ),
  ],
  "recharge-routine": [
    scaledQuestion(
      "rr-01",
      "머리를 오래 써서 지쳤을 때",
      "화면이나 소리를 줄이고 조용히 쉬는 편이다.",
      "ER-WD",
      "quiet_detachment",
    ),
    scaledQuestion(
      "rr-02",
      "머리를 오래 써서 지쳤을 때",
      "편한 사람에게 지금 지쳤다고 짧게 이야기하는 편이다.",
      "SE-RE",
      "supportive_connection",
    ),
    scaledQuestion(
      "rr-03",
      "머리를 오래 써서 지쳤을 때",
      "부담이 적고 내가 고른 활동 하나로 리듬을 바꾸는 편이다.",
      "SM-EP",
      "gentle_reactivation",
    ),
    scaledQuestion(
      "rr-04",
      "사람들과 오래 함께해 지쳤을 때",
      "말하거나 반응하지 않아도 되는 조용한 시간을 갖는 편이다.",
      "ER-WD",
      "quiet_detachment",
    ),
    scaledQuestion(
      "rr-05",
      "사람들과 오래 함께해 지쳤을 때",
      "부담 없이 함께 있을 수 있는 사람과 시간을 보내는 편이다.",
      "SE-RE",
      "supportive_connection",
    ),
    scaledQuestion(
      "rr-06",
      "사람들과 오래 함께해 지쳤을 때",
      "혼자 할 수 있는 작은 취미나 움직임으로 리듬을 바꾸는 편이다.",
      "SM-EP",
      "gentle_reactivation",
    ),
    scaledQuestion(
      "rr-07",
      "예상과 다른 일을 처리해 지쳤을 때",
      "새로운 정보를 더 보지 않고 잠시 쉬는 편이다.",
      "ER-WD",
      "quiet_detachment",
    ),
    scaledQuestion(
      "rr-08",
      "예상과 다른 일을 처리해 지쳤을 때",
      "믿을 수 있는 사람과 있었던 일을 나누는 편이다.",
      "SE-RE",
      "supportive_connection",
    ),
    scaledQuestion(
      "rr-09",
      "예상과 다른 일을 처리해 지쳤을 때",
      "금방 끝낼 수 있는 작은 일을 하나 마무리하는 편이다.",
      "SM-EP",
      "gentle_reactivation",
    ),
    scaledQuestion(
      "rr-10",
      "하루 일정을 마치고 기운이 남지 않았을 때",
      "해야 할 생각에서 잠시 떨어져 몸의 긴장을 푸는 편이다.",
      "ER-WD",
      "quiet_detachment",
    ),
    scaledQuestion(
      "rr-11",
      "하루 일정을 마치고 기운이 남지 않았을 때",
      "편한 사람과 가벼운 연락이나 대화를 나누는 편이다.",
      "SE-RE",
      "supportive_connection",
    ),
    scaledQuestion(
      "rr-12",
      "하루 일정을 마치고 기운이 남지 않았을 때",
      "짧게 몸을 움직이며 기운을 깨우는 편이다.",
      "SM-EP",
      "gentle_reactivation",
    ),
  ],
  "focus-switch": [
    scaledQuestion(
      "fs-01",
      "연락이나 요청으로 하던 일을 멈췄다가 다시 시작할 때",
      "다시 볼 수 있게 다음 할 일을 짧게 남기는 편이다.",
      "SM-OS",
      "resumption_cue",
    ),
    scaledQuestion(
      "fs-02",
      "연락이나 요청으로 하던 일을 멈췄다가 다시 시작할 때",
      "지금 마칠 한 가지를 먼저 정하는 편이다.",
      "SM-OS",
      "goal_reorientation",
    ),
    scaledQuestion(
      "fs-03",
      "연락이나 요청으로 하던 일을 멈췄다가 다시 시작할 때",
      "완성하려 하기보다 바로 할 수 있는 한 동작부터 시작하는 편이다.",
      "SM-EP",
      "small_reentry",
    ),
    scaledQuestion(
      "fs-04",
      "하던 일을 끝내지 못한 채 다른 일을 한 뒤 다시 시작할 때",
      "원래 일의 다음 지점을 알아볼 수 있게 표시하는 편이다.",
      "SM-OS",
      "resumption_cue",
    ),
    scaledQuestion(
      "fs-05",
      "하던 일을 끝내지 못한 채 다른 일을 한 뒤 다시 시작할 때",
      "이번에 다룰 범위를 한 가지로 좁히는 편이다.",
      "SM-OS",
      "goal_reorientation",
    ),
    scaledQuestion(
      "fs-06",
      "하던 일을 끝내지 못한 채 다른 일을 한 뒤 다시 시작할 때",
      "필요한 자료 하나를 열거나 놓는 동작부터 시작하는 편이다.",
      "SM-EP",
      "small_reentry",
    ),
    scaledQuestion(
      "fs-07",
      "쉬는 시간을 보낸 뒤 하던 일을 다시 시작할 때",
      "쉬기 전, 다시 시작할 지점을 남기는 편이다.",
      "SM-OS",
      "resumption_cue",
    ),
    scaledQuestion(
      "fs-08",
      "쉬는 시간을 보낸 뒤 하던 일을 다시 시작할 때",
      "지금 할 일을 한 문장으로 다시 정리하는 편이다.",
      "SM-OS",
      "goal_reorientation",
    ),
    scaledQuestion(
      "fs-09",
      "쉬는 시간을 보낸 뒤 하던 일을 다시 시작할 때",
      "2~5분 안에 끝낼 수 있는 첫 행동부터 하는 편이다.",
      "SM-EP",
      "small_reentry",
    ),
    scaledQuestion(
      "fs-10",
      "여러 일을 오가다 무엇을 하던 중인지 헷갈렸을 때",
      "각 일의 현재 지점을 짧게 적거나 표시하는 편이다.",
      "SM-OS",
      "resumption_cue",
    ),
    scaledQuestion(
      "fs-11",
      "여러 일을 오가다 무엇을 하던 중인지 헷갈렸을 때",
      "가장 먼저 이어갈 한 가지를 고르는 편이다.",
      "SM-OS",
      "goal_reorientation",
    ),
    scaledQuestion(
      "fs-12",
      "여러 일을 오가다 무엇을 하던 중인지 헷갈렸을 때",
      "고른 일에서 바로 확인하거나 고칠 한 부분부터 시작하는 편이다.",
      "SM-EP",
      "small_reentry",
    ),
  ],
  "organizing-style": [
    scaledQuestion(
      "os-01",
      "자주 쓰는 물건이 늘어나 제자리를 정해야 할 때",
      "용도가 비슷한 물건끼리 돌아갈 자리를 정하는 편이다.",
      "SM-OS",
      "stable_structure",
    ),
    scaledQuestion(
      "os-02",
      "자주 쓰는 물건이 늘어나 제자리를 정해야 할 때",
      "어디에 뒀는지 잊기 쉬운 물건은 위치를 메모하거나 표시하는 편이다.",
      "SM-OS",
      "visible_capture",
    ),
    scaledQuestion(
      "os-03",
      "자주 쓰는 물건이 늘어나 제자리를 정해야 할 때",
      "자주 쓰는 물건은 손이 닿기 쉬운 곳으로 옮기는 편이다.",
      "SM-OS",
      "adaptive_reset",
    ),
    scaledQuestion(
      "os-13",
      "자주 쓰는 물건이 늘어나 제자리를 정해야 할 때",
      "물건이 생길 때마다 자리를 정하기보다 한곳에 모아두었다가 한꺼번에 정리하는 편이다.",
      "SM-OS",
      "batch_reset",
    ),
    scaledQuestion(
      "os-04",
      "해야 할 일과 약속이 같은 시기에 몰렸을 때",
      "목록이나 달력에서 종류·마감일·날짜에 따라 나누어 정리하는 편이다.",
      "SM-OS",
      "stable_structure",
    ),
    scaledQuestion(
      "os-05",
      "해야 할 일과 약속이 같은 시기에 몰렸을 때",
      "머릿속에만 두지 않고 해야 할 내용과 시점을 목록이나 알림에 적는 편이다.",
      "SM-OS",
      "visible_capture",
    ),
    scaledQuestion(
      "os-06",
      "해야 할 일과 약속이 같은 시기에 몰렸을 때",
      "새 약속이나 급한 일이 생기면 기존 목록과 시간 순서를 다시 조정하는 편이다.",
      "SM-OS",
      "adaptive_reset",
    ),
    scaledQuestion(
      "os-14",
      "해야 할 일과 약속이 같은 시기에 몰렸을 때",
      "일과 약속이 생길 때마다 적기보다 시간을 따로 잡아 목록과 달력을 한꺼번에 정리하는 편이다.",
      "SM-OS",
      "batch_reset",
    ),
    scaledQuestion(
      "os-07",
      "파일·메모·정보를 나중에 다시 찾아야 할 때",
      "폴더·노트·목록에서 비슷한 내용끼리 저장할 위치나 분류를 정하는 편이다.",
      "SM-OS",
      "stable_structure",
    ),
    scaledQuestion(
      "os-08",
      "파일·메모·정보를 나중에 다시 찾아야 할 때",
      "파일이나 메모에 나중에 검색할 이름·태그·표시를 남기는 편이다.",
      "SM-OS",
      "visible_capture",
    ),
    scaledQuestion(
      "os-09",
      "파일·메모·정보를 나중에 다시 찾아야 할 때",
      "두 번 이상 찾기 어려웠던 폴더·노트의 위치나 분류를 바꾸는 편이다.",
      "SM-OS",
      "adaptive_reset",
    ),
    scaledQuestion(
      "os-15",
      "파일·메모·정보를 나중에 다시 찾아야 할 때",
      "파일과 메모가 생길 때마다 분류하기보다 일정량이 쌓인 뒤 한꺼번에 정리하는 편이다.",
      "SM-OS",
      "batch_reset",
    ),
    scaledQuestion(
      "os-10",
      "방이나 책상에 물건이 쌓여 한눈에 찾기 어려울 때",
      "먼저 자주 쓰는 물건부터 돌아갈 자리를 다시 정하는 편이다.",
      "SM-OS",
      "stable_structure",
    ),
    scaledQuestion(
      "os-11",
      "방이나 책상에 물건이 쌓여 한눈에 찾기 어려울 때",
      "바로 버리거나 옮기기 어려운 물건은 나중에 할 일을 메모하거나 표시하는 편이다.",
      "SM-OS",
      "visible_capture",
    ),
    scaledQuestion(
      "os-12",
      "방이나 책상에 물건이 쌓여 한눈에 찾기 어려울 때",
      "기존 수납 위치가 맞지 않으면 물건의 자리나 분류를 바꾸는 편이다.",
      "SM-OS",
      "adaptive_reset",
    ),
    scaledQuestion(
      "os-16",
      "방이나 책상에 물건이 쌓여 한눈에 찾기 어려울 때",
      "조금씩 손보기보다 시간을 따로 잡아 한 번에 크게 정리하는 편이다.",
      "SM-OS",
      "batch_reset",
    ),
  ],
  "mood-shift": [
    question(
      "ms-01",
      "기분이 흔들릴 때",
      "마음의 변화가 표정이나 말투에 비교적 빨리 드러난다.",
      "ER-IR",
    ),
    question(
      "ms-02",
      "마음에 걸리는 일이 생겼을 때",
      "한 번 신경 쓰이기 시작한 일은 쉽게 놓이지 않는 편이다.",
      "ER-WD",
    ),
    question(
      "ms-03",
      "기분 전환이 필요할 때",
      "음악이나 조명, 공간 같은 감각을 바꾸는 편이다.",
      "OE-AS",
    ),
  ],
  "hurt-expression": [
    scaledQuestion(
      "he2-s1-d",
      "가까운 사람이 약속을 갑자기 바꾸거나 잊었을 때",
      "상대의 어떤 행동이 마음에 걸렸는지 구체적으로 말했다.",
      "RO-EC",
      "specific_event_expression",
    ),
    scaledQuestion(
      "he2-s1-f",
      "가까운 사람이 약속을 갑자기 바꾸거나 잊었을 때",
      "그 일로 내가 어떤 마음이 들었는지 말했다.",
      "SE-AI",
      "feeling_expression",
    ),
    scaledQuestion(
      "he2-s1-r",
      "가까운 사람이 약속을 갑자기 바꾸거나 잊었을 때",
      "다음에는 어떻게 해 주면 좋을지 구체적으로 부탁했다.",
      "RO-RN",
      "change_request",
    ),
    scaledQuestion(
      "he2-s2-f",
      "대화 중 내 말이나 의견이 가볍게 넘어갔다고 느꼈을 때",
      "그 순간 내가 어떤 마음이 들었는지 말했다.",
      "SE-AI",
      "feeling_expression",
    ),
    scaledQuestion(
      "he2-s2-r",
      "대화 중 내 말이나 의견이 가볍게 넘어갔다고 느꼈을 때",
      "다음 대화에서는 어떻게 해 주면 좋을지 구체적으로 부탁했다.",
      "RO-RN",
      "change_request",
    ),
    scaledQuestion(
      "he2-s2-d",
      "대화 중 내 말이나 의견이 가볍게 넘어갔다고 느꼈을 때",
      "마음에 걸린 말이나 행동이 무엇인지 구체적으로 말했다.",
      "RO-EC",
      "specific_event_expression",
    ),
    scaledQuestion(
      "he2-s3-r",
      "모임·학교·팀에서 나만 중요한 내용을 늦게 알았을 때",
      "다음에는 어떻게 알려 주면 좋을지 구체적으로 부탁했다.",
      "RO-RN",
      "change_request",
    ),
    scaledQuestion(
      "he2-s3-d",
      "모임·학교·팀에서 나만 중요한 내용을 늦게 알았을 때",
      "어떤 상황이 마음에 걸렸는지 구체적으로 말했다.",
      "RO-EC",
      "specific_event_expression",
    ),
    scaledQuestion(
      "he2-s3-f",
      "모임·학교·팀에서 나만 중요한 내용을 늦게 알았을 때",
      "그 일로 내가 어떤 마음이 들었는지 말했다.",
      "SE-AI",
      "feeling_expression",
    ),
    scaledQuestion(
      "he2-s4-d",
      "이미 서운하다고 말한 일이 다시 반복됐을 때",
      "다시 반복된 행동이 무엇인지 구체적으로 말했다.",
      "RO-EC",
      "specific_event_expression",
    ),
    scaledQuestion(
      "he2-s4-f",
      "이미 서운하다고 말한 일이 다시 반복됐을 때",
      "반복된 일로 내가 어떤 마음이 들었는지 말했다.",
      "SE-AI",
      "feeling_expression",
    ),
    scaledQuestion(
      "he2-s4-r",
      "이미 서운하다고 말한 일이 다시 반복됐을 때",
      "앞으로 바라는 행동을 구체적으로 부탁했다.",
      "RO-RN",
      "change_request",
    ),
  ],
  "comfort-style": [
    scaledQuestion(
      "cv2-r1-e",
      "가까운 사람과 오해가 생겨 마음이 복잡했을 때",
      "상대가 내 마음을 판단하거나 결론내리지 않고 들어주는 도움이 필요했다.",
      "RO-EC",
      "emotional_acknowledgement",
    ),
    scaledQuestion(
      "cv2-r1-p",
      "가까운 사람과 오해가 생겨 마음이 복잡했을 때",
      "상대와 무엇이 어긋났는지 확인하고, 필요한 연락이나 할 일을 함께 정리하는 도움이 필요했다.",
      "ER-WD",
      "collaborative_problem_solving",
    ),
    scaledQuestion(
      "cv2-r1-a",
      "가까운 사람과 오해가 생겨 마음이 복잡했을 때",
      "내가 편한 방식으로 말하거나 잠시 혼자 정리할 수 있게 해 주는 방식이 필요했다.",
      "RO-RN",
      "autonomy_pacing",
    ),
    scaledQuestion(
      "cv2-r2-e",
      "해야 할 일이 겹쳐 무엇부터 할지 막막했을 때",
      "상대가 지치고 답답한 마음을 알아주며 잠깐 함께 있어 주는 도움이 필요했다.",
      "RO-EC",
      "emotional_acknowledgement",
    ),
    scaledQuestion(
      "cv2-r2-p",
      "해야 할 일이 겹쳐 무엇부터 할지 막막했을 때",
      "무엇부터 할지 함께 정하고, 가능한 일 하나를 같이 하거나 나누어 맡는 도움이 필요했다.",
      "ER-WD",
      "collaborative_problem_solving",
    ),
    scaledQuestion(
      "cv2-r2-a",
      "해야 할 일이 겹쳐 무엇부터 할지 막막했을 때",
      "조용한 곳에서 쉬거나 잠깐 다른 데로 주의를 돌릴지 먼저 물어보는 방식이 필요했다.",
      "RO-RN",
      "autonomy_pacing",
    ),
    scaledQuestion(
      "cv2-r3-e",
      "중요한 결정을 앞두고 걱정이 많아졌을 때",
      "결정을 대신하지 않으면서 내 걱정을 가볍게 여기지 않고 들어주는 도움이 필요했다.",
      "RO-EC",
      "emotional_acknowledgement",
    ),
    scaledQuestion(
      "cv2-r3-p",
      "중요한 결정을 앞두고 걱정이 많아졌을 때",
      "상대와 필요한 정보를 찾고 선택지의 장단점을 함께 정리하는 도움이 필요했다.",
      "ER-WD",
      "collaborative_problem_solving",
    ),
    scaledQuestion(
      "cv2-r3-a",
      "중요한 결정을 앞두고 걱정이 많아졌을 때",
      "상대가 결정을 재촉하지 않고, 생각을 멈추고 쉴 시간도 주는 방식이 필요했다.",
      "RO-RN",
      "autonomy_pacing",
    ),
    scaledQuestion(
      "cv2-r4-e",
      "실수해 자신감이 떨어졌을 때",
      "말을 많이 하지 않아도 상대가 내 편이라는 느낌을 주는 도움이 필요했다.",
      "RO-EC",
      "emotional_acknowledgement",
    ),
    scaledQuestion(
      "cv2-r4-p",
      "실수해 자신감이 떨어졌을 때",
      "상대와 다음에 해볼 일을 하나 정하고, 필요하면 첫 단계는 같이 해보는 도움이 필요했다.",
      "ER-WD",
      "collaborative_problem_solving",
    ),
    scaledQuestion(
      "cv2-r4-a",
      "실수해 자신감이 떨어졌을 때",
      "바로 조언하기보다 혼자 있기, 함께 있기, 다른 활동하기 중 무엇이 편한지 물어보는 방식이 필요했다.",
      "RO-RN",
      "autonomy_pacing",
    ),
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
  return (
    freeTopicAssessments.find((assessment) => assessment.slug === slug) ?? null
  );
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
  questions: suppliedQuestions,
}: {
  answers: Record<string, FreeTopicAnswer>;
  assessment: FreeTopicAssessment;
  observedAt: string;
  questions?: FreeTopicQuestion[];
}): FreeTopicScoreResult {
  const questions = suppliedQuestions ?? getFreeTopicQuestions(assessment.slug);
  const scoresByTarget: Record<string, number[]> = {};
  const scoresByScale: Record<string, number[]> = {};
  const scoresByQuestionId: Record<string, number> = {};
  const completeContextLabels =
    assessment.reportMode === "independent_dimensions"
      ? new Set(
          Array.from(
            new Set(questions.map((question) => question.contextLabel)),
          ).filter((contextLabel) =>
            questions
              .filter((question) => question.contextLabel === contextLabel)
              .every((question) => answers[question.id]?.value !== undefined),
          ),
        )
      : null;

  questions.forEach((question) => {
    const answer = answers[question.id];

    if (!answer || answer.value === undefined) return;
    if (
      completeContextLabels &&
      !completeContextLabels.has(question.contextLabel)
    ) {
      return;
    }

    const score = scoreResponse(answer.value, Boolean(question.isReverse));
    scoresByQuestionId[question.id] = score;
    if (question.reportScaleId) {
      scoresByScale[question.reportScaleId] = [
        ...(scoresByScale[question.reportScaleId] ?? []),
        score,
      ];
    }
  });

  const validScaleIds = new Set(
    Object.entries(scoresByScale)
      .filter(([, scores]) => scores.length >= 3)
      .map(([scaleId]) => scaleId),
  );

  questions.forEach((question) => {
    const score = scoresByQuestionId[question.id];
    if (!Number.isFinite(score)) return;
    if (question.reportScaleId && !validScaleIds.has(question.reportScaleId)) {
      return;
    }

    const traitRule = resolveFreeTopicTraitRule(assessment.slug, question);
    if (traitRule.scoring === "excluded") return;
    const targetKey = buildTargetKey(traitRule.target);
    const traitScore = traitRule.scoring === "reverse" ? 100 - score : score;
    scoresByTarget[targetKey] = [
      ...(scoresByTarget[targetKey] ?? []),
      traitScore,
    ];
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

  const validResponsesByScaleId = Object.fromEntries(
    Object.entries(scoresByScale).map(([scaleId, scores]) => [
      scaleId,
      scores.length,
    ]),
  );
  const scaleStatisticsById = Object.fromEntries(
    Object.entries(scoresByScale).map(([scaleId, scores]) => {
      const meanScore = mean(scores);
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);

      return [
        scaleId,
        {
          dispersion: Math.round(populationStandardDeviation(scores) * 10) / 10,
          maxScore,
          meanScore: Math.round(meanScore),
          minScore,
          responsePattern: maxScore - minScore >= 50 ? "varied" : "steady",
          scoreRange: maxScore - minScore,
          validResponses: scores.length,
        } satisfies FreeTopicScaleStatistics,
      ];
    }),
  );

  return {
    observations,
    scaleStatisticsById,
    scoresByScaleId: Object.fromEntries(
      Object.entries(scoresByScale)
        .filter(([, scores]) => scores.length >= 3)
        .map(([scaleId, scores]) => [scaleId, Math.round(mean(scores))]),
    ),
    scoresByTargetId,
    scoresByQuestionId,
    summary: buildResultSummary({ assessment, observations }),
    validResponsesByScaleId,
  };
}

export function buildFreeTopicResultReport({
  assessment,
  questions,
  result,
}: {
  assessment: FreeTopicAssessment;
  questions?: FreeTopicQuestion[];
  result: Pick<
    FreeTopicScoreResult,
    | "observations"
    | "scaleStatisticsById"
    | "scoresByScaleId"
    | "scoresByQuestionId"
    | "scoresByTargetId"
    | "validResponsesByScaleId"
  >;
}): FreeTopicResultReport {
  const scaleSignals = (assessment.reportScales ?? [])
    .map<FreeTopicReportSignal | null>((scale) => {
      const score = result.scoresByScaleId?.[scale.id];

      if (score === undefined) return null;

      const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
      const level = getFreeTopicReportScaleLevel(assessment, boundedScore);
      const independentMiddleCopy =
        assessment.reportMode === "independent_dimensions" &&
        level.kind === "middle" &&
        result.scaleStatisticsById?.[scale.id]?.responsePattern !== "varied"
          ? getSteadyIndependentMiddleCopy(
              scale.id,
              assessment.responseScale ?? "frequency_5",
            )
          : null;
      return {
        areaLabel: scale.areaLabel,
        groupLabel: scale.groupLabel,
        interpretation:
          independentMiddleCopy?.interpretation ??
          (level.kind === "high"
            ? scale.highCopy
            : level.kind === "low"
              ? scale.lowCopy
              : scale.midCopy),
        label:
          independentMiddleCopy?.label ??
          (level.kind === "high"
            ? scale.highLabel
            : level.kind === "low"
              ? scale.lowLabel
              : scale.midLabel),
        levelLabel: level.label,
        roleLabel: "검사 세부 결과",
        score: boundedScore,
      };
    })
    .filter((signal): signal is FreeTopicReportSignal => signal !== null);
  const facetSignals = Object.entries(result.scoresByTargetId)
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
    .filter((entry): entry is { rank: number; signal: FreeTopicReportSignal } =>
      Boolean(entry),
    )
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => entry.signal);
  const signals = scaleSignals.length > 0 ? scaleSignals : facetSignals;
  const averageScore =
    assessment.reportMode === "independent_dimensions"
      ? null
      : signals.length > 0
        ? Math.round(
            signals.reduce((sum, signal) => sum + signal.score, 0) /
              signals.length,
          )
        : null;
  const reportInput = {
    assessment,
    questions: questions ?? getFreeTopicQuestions(assessment.slug),
    scaleStatisticsById: result.scaleStatisticsById,
    scoresByQuestionId: result.scoresByQuestionId,
    scoresByScaleId: result.scoresByScaleId,
    validResponsesByScaleId: result.validResponsesByScaleId,
  };
  const personalizedSummary = buildFreeTopicPersonalizedSummary(reportInput);

  return {
    averageScore,
    confidenceCopy: buildConfidenceCopy({ assessment }),
    confidenceLabel: buildConfidenceLabel({ assessment }),
    headline:
      personalizedSummary?.title ??
      buildReportHeadline({ assessment, signals }),
    longReportSections: [
      ...buildOperatorFreeTopicReportSections({
        assessment,
        scoresByScaleId: result.scoresByScaleId,
      }),
      ...buildFreeTopicLongReportSections(reportInput),
    ],
    personalizedSummary,
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
      lowLabel: "반대 방향",
      lowCopy: "이번 주제에서는 낮게 나타난 방향이에요.",
      midCopy: "이번 주제에서는 균형에 가깝게 나타난 방향이에요.",
    }
  );
}

export function buildOperatorFreeTopicReportSections({
  assessment,
  scoresByScaleId,
}: {
  assessment: FreeTopicAssessment;
  scoresByScaleId?: Record<string, number>;
}): FreeTopicLongReportSection[] {
  return (assessment.reportScales ?? []).flatMap((scale) => {
    const score = scoresByScaleId?.[scale.id];
    if (score === undefined) return [];
    const level = getFreeTopicReportScaleLevel(
      assessment,
      Math.max(0, Math.min(100, Math.round(score))),
    ).kind;
    const levelKey = level === "middle" ? "mid" : level;
    const strength = scale[`${levelKey}Strength`];
    const watch = scale[`${levelKey}Watch`];
    const action = scale[`${levelKey}Action`];
    const body = scale[`${levelKey}Copy`];
    const items = [
      strength ? { label: "드러나는 강점", text: strength } : null,
      watch ? { label: "주의할 점", text: watch } : null,
      action ? { label: "바로 해볼 행동", text: action } : null,
    ].filter((item): item is { label: string; text: string } => item !== null);
    if (items.length === 0) return [];
    return [
      {
        blocks: [{ items, kind: "labeled_list" }],
        body,
        claimIds: [`studio:${assessment.slug}:${scale.id}:${levelKey}`],
        title: `${scale.areaLabel}에서 보이는 강점과 보완점`,
      },
    ];
  });
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
  if (
    assessment.evidenceUse === "blocked" ||
    !canTopicEvidenceUpdateRepresentativeCode({ slug: assessment.slug })
  ) {
    return [];
  }

  const mappingByTarget = new Map(
    assessment.mappings.map((mapping) => [
      buildTargetKey(mapping.target),
      mapping,
    ]),
  );

  return Object.entries(scoresByTargetId)
    .map(([targetKey, score]) => {
      if (score === undefined || score === null) return null;
      const target = parseTargetKey(targetKey);
      if (!target || !isRepresentativeTraitTarget(target)) return null;
      const mapping = mappingByTarget.get(targetKey);

      const observation: TraitEvidenceObservation = {
        approvalStatus: "approved",
        constructDirectness: mapping?.constructDirectness ?? 0.75,
        id: `${assessment.slug}:${targetKey}`,
        measurementAmount: mapping?.measurementAmount ?? 0.75,
        observedAt,
        recency: 1,
        repetitionDiscount: 1,
        responseQuality,
        score,
        sourceKind: "free_topic",
        target,
      };

      return observation;
    })
    .filter(
      (observation): observation is TraitEvidenceObservation =>
        observation !== null,
    );
}

export function buildTargetKey(target: TraitEvidenceTarget) {
  return `${target.kind}:${target.id}`;
}

function parseTargetKey(value: string): TraitEvidenceTarget | null {
  const separator = value.indexOf(":");
  if (separator < 1) return null;
  const kind = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if ((kind !== "domain" && kind !== "facet") || !id) return null;
  return { id, kind };
}

type ResolvedFreeTopicTraitRule = {
  scoring: NonNullable<FreeTopicQuestion["traitScoring"]>;
  target: TraitEvidenceTarget;
};

/**
 * Older published releases do not yet carry `traitScoring`. These reviewed
 * fallbacks keep report-only dimensions out of the core code and correct the
 * few deep-topic scales whose report direction differs from a core axis.
 * Once an operator publishes an explicit value, that release value wins.
 */
export function resolveFreeTopicTraitRule(
  assessmentSlug: string,
  question: FreeTopicQuestion,
): ResolvedFreeTopicTraitRule {
  if (question.traitScoring) {
    return {
      scoring:
        question.traitScoring === "excluded" ||
        isRepresentativeTraitTarget(question.target)
          ? question.traitScoring
          : "excluded",
      target: question.target,
    };
  }

  const scaleId = question.reportScaleId;
  const fallback = scaleId
    ? legacyDeepTopicTraitRules[assessmentSlug]?.[scaleId]
    : undefined;

  return (
    fallback ?? {
      scoring: isRepresentativeTraitTarget(question.target)
        ? "same"
        : "excluded",
      target: question.target,
    }
  );
}

export function isRepresentativeTraitTarget(target: TraitEvidenceTarget) {
  if (target.kind === "domain") {
    return nextNuangCodeScheme.positions.some(
      (position) => position.domainId === target.id,
    );
  }

  return nextNuangCodeScheme.positions.some((position) =>
    position.publicFacetIds.some((facetId) => facetId === target.id),
  );
}

const legacyDeepTopicTraitRules: Record<
  string,
  Record<string, ResolvedFreeTopicTraitRule>
> = {
  "apology-style": {
    impact_listening: {
      scoring: "same",
      target: { kind: "facet", id: "RO-EC" },
    },
    repair_planning: {
      scoring: "same",
      target: { kind: "facet", id: "SM-EP" },
    },
    responsibility_acknowledgement: {
      scoring: "excluded",
      target: { kind: "facet", id: "RO-EC" },
    },
  },
  "recharge-routine": {
    gentle_reactivation: {
      scoring: "same",
      target: { kind: "facet", id: "SM-EP" },
    },
    quiet_detachment: {
      scoring: "excluded",
      target: { kind: "facet", id: "ER-WD" },
    },
    supportive_connection: {
      scoring: "same",
      target: { kind: "facet", id: "SE-RE" },
    },
  },
  "focus-switch": {
    goal_reorientation: {
      scoring: "same",
      target: { kind: "facet", id: "SM-OS" },
    },
    resumption_cue: {
      scoring: "same",
      target: { kind: "facet", id: "SM-OS" },
    },
    small_reentry: {
      scoring: "same",
      target: { kind: "facet", id: "SM-EP" },
    },
  },
  "organizing-style": {
    adaptive_reset: {
      scoring: "same",
      target: { kind: "facet", id: "SM-OS" },
    },
    batch_reset: {
      scoring: "reverse",
      target: { kind: "facet", id: "SM-OS" },
    },
    stable_structure: {
      scoring: "same",
      target: { kind: "facet", id: "SM-OS" },
    },
    visible_capture: {
      scoring: "same",
      target: { kind: "facet", id: "SM-OS" },
    },
  },
  "hurt-expression": {
    change_request: {
      scoring: "same",
      target: { kind: "facet", id: "SE-AI" },
    },
    feeling_expression: {
      scoring: "same",
      target: { kind: "facet", id: "SE-AI" },
    },
    specific_event_expression: {
      scoring: "same",
      target: { kind: "facet", id: "SE-AI" },
    },
  },
  "comfort-style": {
    autonomy_pacing: {
      scoring: "excluded",
      target: { kind: "facet", id: "RO-RN" },
    },
    collaborative_problem_solving: {
      scoring: "reverse",
      target: { kind: "facet", id: "RO-EC" },
    },
    emotional_acknowledgement: {
      scoring: "same",
      target: { kind: "facet", id: "RO-EC" },
    },
  },
};

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
    label: boundedScore < 45 ? display.lowLabel : display.label,
    levelLabel: level.label,
    roleLabel:
      getMappingRank(assessment, targetId) === 1 ? "함께 본 모습" : "주요 모습",
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

export function getFreeTopicReportScaleLevel(
  assessment: Pick<FreeTopicAssessment, "reportMode" | "responseScale">,
  score: number,
) {
  return assessment.reportMode === "independent_dimensions"
    ? getIndependentSignalLevel(
        score,
        assessment.responseScale ?? "frequency_5",
      )
    : getSignalLevel(score);
}

export function getIndependentSignalLevel(
  score: number,
  responseScale: NonNullable<FreeTopicAssessment["responseScale"]>,
) {
  if (responseScale === "frequency_5") {
    if (score >= 88) {
      return { kind: "high" as const, label: "거의 항상 했어요" };
    }
    if (score >= 63) {
      return { kind: "high" as const, label: "자주 했어요" };
    }
    if (score >= 38) {
      return { kind: "middle" as const, label: "때때로 했어요" };
    }
    if (score >= 13) {
      return { kind: "low" as const, label: "드물게 했어요" };
    }
    return { kind: "low" as const, label: "거의 하지 않았어요" };
  }

  if (responseScale === "need_5") {
    if (score >= 88) {
      return { kind: "high" as const, label: "매우 필요했어요" };
    }
    if (score >= 63) {
      return { kind: "high" as const, label: "꽤 필요했어요" };
    }
    if (score >= 38) {
      return { kind: "middle" as const, label: "어느 정도 필요했어요" };
    }
    if (score >= 13) {
      return { kind: "low" as const, label: "별로 필요하지 않았어요" };
    }
    return { kind: "low" as const, label: "전혀 필요하지 않았어요" };
  }

  if (score >= 88) {
    return { kind: "high" as const, label: "매우 도움이 됐어요" };
  }
  if (score >= 63) {
    return { kind: "high" as const, label: "꽤 도움이 됐어요" };
  }
  if (score >= 38) {
    return { kind: "middle" as const, label: "적당히 도움이 됐어요" };
  }
  if (score >= 13) {
    return { kind: "low" as const, label: "도움이 적었어요" };
  }
  return { kind: "low" as const, label: "거의 도움이 되지 않았어요" };
}

function getSteadyIndependentMiddleCopy(
  scaleId: string,
  responseScale: NonNullable<FreeTopicAssessment["responseScale"]>,
) {
  const subjectByScaleId: Record<string, string> = {
    autonomy_pacing: "내 속도를 지켜주는 태도",
    change_request: "바라는 점을 부탁하는 행동",
    collaborative_problem_solving: "함께 방법을 찾는 일",
    emotional_acknowledgement: "마음을 알아주는 말",
    feeling_expression: "내 마음을 말하는 행동",
    gentle_reactivation: "작은 행동으로 리듬을 바꾸는 일",
    goal_reorientation: "지금 할 일을 다시 잡는 행동",
    impact_listening: "상대의 마음을 듣는 행동",
    quiet_detachment: "자극을 낮추고 쉬는 행동",
    repair_planning: "사과 뒤에 다음 행동을 정하는 일",
    resumption_cue: "다시 시작할 지점을 남기는 행동",
    responsibility_acknowledgement: "내 잘못을 인정하는 행동",
    small_reentry: "작은 첫 행동을 시작하는 일",
    specific_event_expression: "서운했던 일을 말하는 행동",
    stable_structure: "자리와 분류를 정하는 행동",
    supportive_connection: "편한 사람과 연결하는 행동",
    visible_capture: "기억할 것을 바깥에 남기는 행동",
    adaptive_reset: "정리 방식을 다시 맞추는 행동",
  };
  const subject = subjectByScaleId[scaleId] ?? "이 도움";
  const isFrequencyBehaviorScale = [
    "adaptive_reset",
    "change_request",
    "feeling_expression",
    "goal_reorientation",
    "impact_listening",
    "gentle_reactivation",
    "quiet_detachment",
    "repair_planning",
    "resumption_cue",
    "responsibility_acknowledgement",
    "small_reentry",
    "specific_event_expression",
    "stable_structure",
    "supportive_connection",
    "visible_capture",
  ].includes(scaleId);

  if (isFrequencyBehaviorScale) {
    return {
      interpretation: `${subject}은 답한 장면들에서 대체로 비슷한 정도로 나타났어요.`,
      label: `${subject}을 때때로 했어요`,
    };
  }

  if (responseScale === "need_5") {
    return {
      interpretation: `${subject}은 답한 상황들에서 대체로 비슷한 정도로 필요했어요.`,
      label: `${subject}이 어느 정도 필요했어요`,
    };
  }

  return {
    interpretation: `${subject}은 답한 장면들에서 대체로 비슷한 정도로 도움이 됐어요.`,
    label: `${subject}이 적당히 도움이 됐어요`,
  };
}

function buildReportHeadline({
  assessment,
  signals,
}: {
  assessment: FreeTopicAssessment;
  signals: FreeTopicReportSignal[];
}) {
  const strongestSignal = [...signals].sort((left, right) =>
    assessment.reportMode === "independent_dimensions"
      ? right.score - left.score
      : Math.abs(right.score - 50) - Math.abs(left.score - 50),
  )[0];

  if (!strongestSignal) {
    return "이번 결과는 취향과 추천을 더 섬세하게 만드는 참고 자료로만 사용돼요.";
  }

  const itemCount = getFreeTopicQuestions(assessment.slug).length;
  if (assessment.reportMode === "independent_dimensions") {
    if (assessment.responseScale === "frequency_5") {
      return `${itemCount}개의 질문으로 세 행동이 나타난 정도를 각각 살펴봤어요. 세 행동은 서로 반대가 아니어서 함께 높거나 낮게 나타날 수 있어요.`;
    }
    if (assessment.responseScale === "need_5") {
      return `${itemCount}개의 질문으로 세 가지 도움이 필요했던 정도를 각각 살펴봤어요. 각 도움은 서로 반대가 아니어서 함께 높거나 낮게 나타날 수 있어요.`;
    }
    return `${itemCount}개의 질문에서 ‘${strongestSignal.label}’ 흐름이 자주 도움이 됐어요. 세 가지 도움은 서로 반대가 아니어서 함께 높게 나타날 수 있어요.`;
  }

  return `${itemCount}개의 질문에서 ‘${strongestSignal.label}’ 흐름이 가장 뚜렷하게 나타났어요. 최근의 내 모습을 돌아보는 참고 자료로 활용해 주세요.`;
}

function buildConfidenceLabel({
  assessment,
}: {
  assessment: FreeTopicAssessment;
}) {
  if (assessment.reportMode === "independent_dimensions") {
    if (assessment.responseScale === "need_5") return "최근 필요 기록";
    if (assessment.responseScale === "helpfulness_5") return "최근 도움 기록";
    return "최근 행동 기록";
  }
  return "주제별 결과";
}

function buildConfidenceCopy({
  assessment,
}: {
  assessment: FreeTopicAssessment;
}) {
  if (
    assessment.reportMode === "independent_dimensions" &&
    assessment.responseScale === "need_5"
  ) {
    return "최근 6개월의 힘든 상황에서 어떤 도움이 필요했는지 정리한 결과예요. 이번 결과는 현재 뉴앙 코드를 바꾸지 않고, 이 주제를 이해하는 데 사용해요.";
  }
  if (
    assessment.reportMode === "independent_dimensions" &&
    assessment.responseScale === "frequency_5"
  ) {
    return `${assessment.recallPeriodLabel ?? "최근 4주"}의 실제 행동을 정리한 결과예요. 이번 결과는 현재 뉴앙 코드를 바꾸지 않고, 이 주제를 이해하는 데 사용해요.`;
  }

  return "이번 답에서 보인 모습을 이 주제 안에서 정리했어요. 현재 뉴앙 코드는 그대로 유지돼요.";
}

const freeTopicTargetCopy: Record<
  string,
  {
    areaLabel: string;
    highCopy: string;
    label: string;
    lowLabel: string;
    lowCopy: string;
    midCopy: string;
  }
> = {
  "ER-IR": {
    areaLabel: "걱정과 감정 반응",
    highCopy:
      "감정이 비교적 빠르게 올라오고, 그 변화가 표정이나 말투에 드러나기 쉬운 흐름이에요.",
    label: "감정 반응의 크기",
    lowLabel: "차분하게 정리하기",
    lowCopy:
      "감정이 바로 커지기보다 한 박자 늦게 정리되거나, 겉으로는 차분하게 유지되는 흐름이에요.",
    midCopy:
      "감정 반응이 한쪽으로 치우치기보다 상황에 따라 커졌다가 가라앉는 흐름이에요.",
  },
  "ER-WD": {
    areaLabel: "걱정과 감정 반응",
    highCopy:
      "결정하거나 관계를 정리하기 전에 여러 가능성을 오래 생각하는 경향이 선명해요.",
    label: "걱정과 망설임",
    lowLabel: "걱정을 놓고 움직이기",
    lowCopy:
      "걱정이 길어지기보다 필요한 만큼 보고 빠르게 다음 행동으로 넘어가는 흐름이에요.",
    midCopy: "걱정과 실행 사이에서 균형을 찾으려는 흐름이에요.",
  },
  "OE-AS": {
    areaLabel: "생각과 탐색",
    highCopy:
      "분위기, 장면, 소리처럼 감각적인 단서로 기분과 판단이 움직이는 편이에요.",
    label: "감각으로 분위기 읽기",
    lowLabel: "조건과 정보 살피기",
    lowCopy:
      "감각적인 인상보다 필요한 정보와 실제 조건을 먼저 보는 흐름이에요.",
    midCopy: "감각적인 인상과 현실적인 정보를 함께 참고하는 흐름이에요.",
  },
  "OE-IE": {
    areaLabel: "생각과 탐색",
    highCopy:
      "막혔을 때 원리, 관점, 새로운 아이디어를 찾아보며 다시 움직이는 힘이 보여요.",
    label: "아이디어로 풀어가기",
    lowLabel: "익숙한 방법으로 풀기",
    lowCopy:
      "새 관점보다 지금 확인 가능한 방법과 익숙한 절차를 더 신뢰하는 흐름이에요.",
    midCopy: "새로운 아이디어와 검증된 방법을 함께 놓고 보는 흐름이에요.",
  },
  "RO-EC": {
    areaLabel: "관계 방식",
    highCopy:
      "대화에서 상대의 마음과 맥락을 먼저 살피려는 흐름이 선명하게 나타나요.",
    label: "상대 마음 살피기",
    lowLabel: "핵심과 해결 먼저 보기",
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
    lowLabel: "빠르게 연결하고 맞추기",
    lowCopy:
      "관계의 여백보다 빠른 연결감이나 즉시 조율을 더 편하게 느끼는 흐름이에요.",
    midCopy: "가까움과 여백을 상황에 맞춰 조절하려는 흐름이에요.",
  },
  "SE-AI": {
    areaLabel: "사람 사이 에너지",
    highCopy:
      "어색한 상황이나 중요한 대화에서 먼저 말문을 열고 흐름을 만드는 편이에요.",
    label: "먼저 말 꺼내기",
    lowLabel: "흐름을 보고 말하기",
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
    lowLabel: "혼자 쉬며 충전하기",
    lowCopy:
      "사람과 연결된 뒤에는 혼자 정리하고 회복하는 시간이 더 중요하게 나타나요.",
    midCopy:
      "함께하는 시간과 혼자 회복하는 시간을 함께 필요로 하는 흐름이에요.",
  },
  "SM-EP": {
    areaLabel: "일상을 꾸리는 방식",
    highCopy:
      "멈춘 일을 다시 시작할 작은 행동을 찾고, 실제로 움직이는 힘이 보여요.",
    label: "작게 시작해 마무리하기",
    lowLabel: "준비한 뒤 시작하기",
    lowCopy:
      "바로 움직이기보다 충분히 생각하고 조건이 맞을 때 시작하려는 흐름이에요.",
    midCopy:
      "상황이 정리되면 실행으로 넘어가지만, 준비가 필요할 때는 속도를 늦추는 흐름이에요.",
  },
  "SM-OS": {
    areaLabel: "일상을 꾸리는 방식",
    highCopy:
      "물건, 일정, 생각을 정해진 구조 안에 두면 마음이 안정되는 흐름이에요.",
    label: "정리와 계획",
    lowLabel: "상황에 맞춰 유연하게 움직이기",
    lowCopy:
      "정해진 구조보다 상황에 맞춰 유연하게 움직이는 편이 더 자연스러운 흐름이에요.",
    midCopy: "큰 틀은 정리하되, 세부는 상황에 맞춰 조정하는 흐름이에요.",
  },
};

function inferTargetDisplay(targetId: string) {
  const facet = coreFacetDefinitions.find((item) => item.facetId === targetId);

  if (facet) {
    return {
      areaLabel: "세부 성향",
      highCopy: "이번 주제에서 비교적 뚜렷하게 나타난 세부 성향이에요.",
      label: facet.label,
      lowLabel: `${facet.label}의 반대 방향`,
      lowCopy: "이번 주제에서는 낮게 나타난 세부 성향이에요.",
      midCopy: "이번 주제에서는 균형에 가깝게 나타난 세부 성향이에요.",
    };
  }

  const domain = coreDomainDefinitions.find(
    (item) => item.domainId === targetId,
  );

  if (!domain) return null;

  return {
    areaLabel: "코드 자리",
    highCopy: "이번 주제에서 비교적 뚜렷하게 나타난 코드 자리예요.",
    label: domain.label,
    lowLabel: `${domain.label}의 반대 방향`,
    lowCopy: "이번 주제에서는 낮게 나타난 코드 자리예요.",
    midCopy: "이번 주제에서는 두 모습이 비슷하게 나타난 코드 자리예요.",
  };
}

function topic(
  assessment: Omit<
    FreeTopicAssessment,
    | "comparisonUse"
    | "estimatedMinutes"
    | "evidenceUse"
    | "impactGrade"
    | "sourceWeight"
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
    recallPeriodLabel: "최근 4주",
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
  contextLabel: string,
  text: string,
  facetId: string,
  isReverse = false,
): FreeTopicQuestion {
  return {
    contextLabel,
    id,
    isReverse,
    target: { kind: "facet", id: facetId },
    text,
  };
}

function scaledQuestion(
  id: string,
  contextLabel: string,
  text: string,
  facetId: string,
  reportScaleId: string,
  isReverse = false,
): FreeTopicQuestion {
  return {
    ...question(id, contextLabel, text, facetId, isReverse),
    reportScaleId,
  };
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function populationStandardDeviation(values: number[]) {
  if (values.length === 0) return 0;
  const average = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    values.length;
  return Math.sqrt(variance);
}

function buildResultSummary({
  assessment,
  observations,
}: {
  assessment: FreeTopicAssessment;
  observations: TraitEvidenceObservation[];
}) {
  if (assessment.evidenceUse === "blocked" || observations.length === 0) {
    return "이 결과는 현재 뉴앙 코드를 바꾸지 않고, 이 주제 안에서 내 모습을 이해하는 데 사용돼요.";
  }

  return "이 결과는 여러 검사와 함께 누적되어 현재 대표 성향을 더 정교하게 이해하는 데 사용돼요.";
}
