import type { z } from "zod";
import type { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";

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

export const ergmcFoundationClaimsV2 = [
  {
    claimId: "ERGMC.general.definition.E",
    entity: { kind: "profile", ref: "ERGMC" },
    scope: "single_direction",
    claimKind: "attention",
    assertion:
      "E는 사람들과 말하고 움직이는 과정에서 에너지와 생각이 살아나는 방향이다. 새로운 자리에서 대화를 먼저 열고, 질문과 반응을 주고받으며 자신의 역할과 다음 행동을 찾는 경향이 있다.",
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
    claimId: "ERGMC.general.definition.R",
    entity: { kind: "profile", ref: "ERGMC" },
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
    claimId: "ERGMC.general.definition.G",
    entity: { kind: "profile", ref: "ERGMC" },
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
    claimId: "ERGMC.general.definition.M",
    entity: { kind: "profile", ref: "ERGMC" },
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
    claimId: "ERGMC.general.definition.C",
    entity: { kind: "profile", ref: "ERGMC" },
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
    claimId: "ERGMC.general.profile.hypothesis",
    entity: { kind: "profile", ref: "ERGMC" },
    scope: "whole_profile",
    claimKind: "evidence_statement",
    assertion:
      "ERGMC는 사람들과 대화하며 확인된 사실과 역할을 빠르게 파악하고, 원인과 해결할 부분을 찾아 그날의 조건에 맞춰 움직이며, 부담스러운 상황에서도 감정이 비교적 천천히 커지는 조합으로 연구한다.",
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

export const ergmcFoundationLineageV2 = [
  ["ERGMC.general.definition.E", "IRGMC.general.definition.I", "axis_override"],
  ["ERGMC.general.definition.R", "IRGMC.general.definition.R", "inherited"],
  ["ERGMC.general.definition.G", "IRGMC.general.definition.G", "inherited"],
  ["ERGMC.general.definition.M", "IRGMC.general.definition.M", "inherited"],
  ["ERGMC.general.definition.C", "IRGMC.general.definition.C", "inherited"],
  [
    "ERGMC.general.profile.hypothesis",
    "IRGMC.general.profile.hypothesis",
    "axis_override",
  ],
] as const;
