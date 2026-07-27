import type { z } from "zod";
import { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";

type TraitMapClaimV2 = z.infer<typeof traitMapClaimV2Schema>;

const reviews = {
  personality_psychology: "not_started",
  psychometrics: "not_started",
  relationship_psychology: "not_started",
  clinical_safety: "not_started",
  plain_korean: "not_started",
  product: "not_started",
  design: "not_started",
} as const;

export const irgmcFoundationClaimsV2 = [
  {
    claimId: "IRGMC.general.definition.I",
    entity: { kind: "profile", ref: "IRGMC" },
    scope: "single_direction",
    claimKind: "attention",
    assertion:
      "I는 사람을 싫어하는 성향이 아니라, 에너지를 다시 채우고 생각을 정리할 때 혼자 있는 시간이 더 잘 맞는 방향이다. 말을 꺼내기 전에는 주변 상황과 자신의 생각을 먼저 살피는 경향이 있다.",
    contexts: ["general"],
    scenarioRefs: [],
    requiredSignals: ["representative_code", "domain_scores", "facet_scores"],
    evidenceFindingRefs: [
      "FND-BFI2-HIERARCHICAL-FACETS",
      "FND-STATE-DISTRIBUTION-STABILITY-VARIABILITY",
    ],
    independentSourceRefs: [
      "SRC-BFI2-2017",
      "SRC-STATE-DISTRIBUTION-2001",
    ],
    evidenceStatus: "nuang_validation_required",
    evidenceGrade: "C",
    privacyScope: "self_only",
    riskDomains: ["none"],
    publicationState: "research_only",
    reviews,
  },
  {
    claimId: "IRGMC.general.definition.R",
    entity: { kind: "profile", ref: "IRGMC" },
    scope: "single_direction",
    claimKind: "attention",
    assertion:
      "R은 이미 확인된 사실, 직접 겪은 경험, 지금 바로 적용할 수 있는 구체적인 정보에서 생각을 시작하는 방향이다. 가능성을 넓히기 전 현재 무엇을 알고 있는지와 실제로 쓸 수 있는지를 먼저 확인하는 경향이 있다.",
    contexts: ["general"],
    scenarioRefs: [],
    requiredSignals: ["representative_code", "domain_scores", "facet_scores"],
    evidenceFindingRefs: [
      "FND-BFI2-HIERARCHICAL-FACETS",
      "FND-OPENNESS-INTELLECT-DISTINCTION",
    ],
    independentSourceRefs: [
      "SRC-BFI2-2017",
      "SRC-OPENNESS-INTELLECT-2009",
    ],
    evidenceStatus: "nuang_validation_required",
    evidenceGrade: "C",
    privacyScope: "self_only",
    riskDomains: ["none"],
    publicationState: "research_only",
    reviews,
  },
  {
    claimId: "IRGMC.general.definition.G",
    entity: { kind: "profile", ref: "IRGMC" },
    scope: "single_direction",
    claimKind: "attention",
    assertion:
      "G는 관계에서 문제가 생기면 어떤 일이 있었고 왜 생겼는지, 무엇을 바꾸면 풀리는지에 주의가 먼저 가는 방향이다. 상대 마음도 살피지만 생각의 출발점은 원인과 해결할 부분에 더 가깝다.",
    contexts: ["general"],
    scenarioRefs: [],
    requiredSignals: ["representative_code", "domain_scores", "facet_scores"],
    evidenceFindingRefs: [
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
      "FND-INTENTION-BEHAVIOR-SEPARATION",
    ],
    independentSourceRefs: ["SRC-IPC-2013", "SRC-INTENTION-BEHAVIOR-2016"],
    evidenceStatus: "nuang_validation_required",
    evidenceGrade: "C",
    privacyScope: "self_only",
    riskDomains: ["relationship_outcome"],
    publicationState: "research_only",
    reviews,
  },
  {
    claimId: "IRGMC.general.definition.M",
    entity: { kind: "profile", ref: "IRGMC" },
    scope: "single_direction",
    claimKind: "follow_through",
    assertion:
      "M은 일을 시작하고 이어가는 흐름이 현재의 흥미, 마감, 에너지, 주변 도움 같은 상황 조건에 더 민감한 방향이다. 조건이 맞을 때 집중이 빠르게 올라가고, 조건이 달라지면 실행 방식도 함께 바뀌는 경향이 있다.",
    contexts: ["general"],
    scenarioRefs: [],
    requiredSignals: [
      "representative_code",
      "domain_scores",
      "facet_scores",
      "current_state",
    ],
    evidenceFindingRefs: [
      "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
      "FND-TRAIT-ENACTMENT-STABILITY-AND-VARIABILITY",
    ],
    independentSourceRefs: [
      "SRC-SITUATION-CONTINGENCY-2007",
      "SRC-TRAIT-ENACTMENT-2015",
    ],
    evidenceStatus: "nuang_validation_required",
    evidenceGrade: "C",
    privacyScope: "self_only",
    riskDomains: ["none"],
    publicationState: "research_only",
    reviews,
  },
  {
    claimId: "IRGMC.general.definition.C",
    entity: { kind: "profile", ref: "IRGMC" },
    scope: "single_direction",
    claimKind: "emotional_activation",
    assertion:
      "C는 불편한 일이 생겨도 걱정과 감정이 비교적 천천히 커지는 방향이다. 감정이 크게 올라오기 전 사실과 대응 방법을 살필 여유가 생기고, 겉으로도 차분한 반응이 이어지는 경향이 있다.",
    contexts: ["general"],
    scenarioRefs: [],
    requiredSignals: [
      "representative_code",
      "domain_scores",
      "facet_scores",
      "current_state",
    ],
    evidenceFindingRefs: [
      "FND-BFI2-HIERARCHICAL-FACETS",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: ["SRC-BFI2-2017", "SRC-EMOTION-PROCESS-1998"],
    evidenceStatus: "nuang_validation_required",
    evidenceGrade: "C",
    privacyScope: "self_only",
    riskDomains: ["mental_health"],
    publicationState: "research_only",
    reviews,
  },
  {
    claimId: "IRGMC.general.profile.hypothesis",
    entity: { kind: "profile", ref: "IRGMC" },
    scope: "whole_profile",
    claimKind: "evidence_statement",
    assertion:
      "IRGMC는 혼자 생각을 정리한 뒤 확인된 사실에서 원인과 해결할 부분을 찾고, 그날의 조건에 맞춰 움직이며, 부담스러운 상황에서도 감정이 천천히 커지는 조합으로 연구한다.",
    contexts: ["general"],
    scenarioRefs: [],
    requiredSignals: [
      "representative_code",
      "domain_scores",
      "facet_scores",
      "response_history",
      "current_state",
    ],
    evidenceFindingRefs: [
      "FND-WHOLE-TRAIT-DESCRIPTION-EXPLANATION",
      "FND-PERSON-SITUATION-INDEPENDENT-REALTIME",
    ],
    independentSourceRefs: [
      "SRC-WHOLE-TRAIT-2015",
      "SRC-REALTIME-PERSON-SITUATION-2015",
    ],
    evidenceStatus: "nuang_validation_required",
    evidenceGrade: "D",
    privacyScope: "self_only",
    riskDomains: ["none"],
    publicationState: "research_only",
    reviews,
  },
] as const satisfies readonly TraitMapClaimV2[];

export const irgmcResearchQuestionsByChapterV2 = [
  ["overview", "다섯 방향이 함께 나타날 때 가장 먼저 보이는 핵심 모습은 무엇인가?"],
  ["role_name_and_values", "‘단서로 답을 찾는 탐구자’라는 이름이 어떤 행동을 설명하고 어떤 오해를 만드는가?"],
  ["five_code_positions", "I·R·G·M·C 각 방향과 세부 성향은 어떻게 구분되는가?"],
  ["code_interactions", "다섯 방향의 조합이 단일 방향 설명을 넘어서는 증분 정보를 주는가?"],
  ["first_thought_and_actual_response", "원인·해결을 먼저 생각해도 실제로는 어떻게 말하고 행동하는가?"],
  ["daily_choice_and_change", "평소 선택·새 만남·계획 변화에서 무엇을 먼저 확인하는가?"],
  ["family", "가족 역할과 의무를 걷어냈을 때 반복되는 생각과 행동은 무엇인가?"],
  ["friend", "친구의 친숙도와 모임 크기에 따라 참여·연락·지원이 어떻게 달라지는가?"],
  ["partner", "연인과의 갈등·지원·회복에서 원인 탐색과 감정 확인의 순서는 어떠한가?"],
  ["person_of_interest", "호감과 불확실성이 생겨도 사실과 추측을 어떻게 구분하는가?"],
  ["work_and_study", "규칙·재량·마감·자원이 실행 방식과 의견 표현을 어떻게 바꾸는가?"],
  ["conflict_stress_and_recovery", "감정이 천천히 커지는 것과 회복 속도·방법은 어떻게 다른가?"],
  ["strength_overuse_and_growth", "구체성·차분함·상황 적응이 도움이 되는 조건과 과해지는 조건은 무엇인가?"],
  ["misunderstanding_and_communication", "무관심·수동성·창의성 부족으로 오해받지 않도록 무엇을 보여줘야 하는가?"],
  ["neighbor_contrasts", "한 글자만 다른 5개 코드와 어떤 장면에서 가장 분명히 구분되는가?"],
  ["evidence_and_method", "어떤 근거와 뉴앙 자료가 각 문장을 승인하거나 기각하는가?"],
] as const;

export const irgmcNeighborCodesV2 = [
  "ERGMC",
  "INGMC",
  "IRAMC",
  "IRGKC",
  "IRGMQ",
] as const;
