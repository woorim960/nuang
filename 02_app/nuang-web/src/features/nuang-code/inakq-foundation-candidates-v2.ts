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

export const inakqFoundationClaimsV2 = [
  {
    claimId: "INAKQ.general.definition.I",
    entity: { kind: "profile", ref: "INAKQ" },
    scope: "single_direction",
    claimKind: "attention",
    assertion:
      "I는 혼자 생각을 정리하는 동안 에너지가 돌아오고, 상황과 상대 반응을 충분히 살핀 뒤 필요한 표현을 시작하는 방향이다. 말의 양보다 참여 전 정리 시간과 만남 뒤 회복 방식에서 더 분명하게 나타난다.",
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
    claimId: "INAKQ.general.definition.N",
    entity: { kind: "profile", ref: "INAKQ" },
    scope: "single_direction",
    claimKind: "attention",
    assertion:
      "N은 지금 보이는 사실에서 멈추지 않고 앞으로 펼쳐질 가능성, 숨어 있는 의미, 서로 다른 생각의 연결을 먼저 살피는 방향이다. 하나의 답보다 여러 관점을 탐색할 때 생각이 넓어지는 경향이 있다.",
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
    claimId: "INAKQ.general.definition.A",
    entity: { kind: "profile", ref: "INAKQ" },
    scope: "single_direction",
    claimKind: "attention",
    assertion:
      "A는 관계에서 일이 생기면 상대가 어떤 마음일지, 그 경험이 관계에 어떤 흔적을 남길지에 주의가 먼저 가는 방향이다. 사람의 경험을 알아준 뒤 함께할 방법을 찾으려는 경향이 있다.",
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
    claimId: "INAKQ.general.definition.K",
    entity: { kind: "profile", ref: "INAKQ" },
    scope: "single_direction",
    claimKind: "follow_through",
    assertion:
      "K는 목표와 다음 순서가 정해지면 시작한 흐름을 이어가고, 약속한 일을 다시 확인해 마무리하려는 방향이다. 사람들과 정한 계획을 행동과 일정으로 연결할 때 안정감을 느끼는 경향이 있다.",
    contexts: ["general"],
    scenarioRefs: [],
    requiredSignals: [
      "representative_code",
      "domain_scores",
      "facet_scores",
      "current_state",
    ],
    evidenceFindingRefs: [
      "FND-INTENTION-BEHAVIOR-SEPARATION",
      "FND-TRAIT-ENACTMENT-STABILITY-AND-VARIABILITY",
    ],
    independentSourceRefs: [
      "SRC-INTENTION-BEHAVIOR-2016",
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
    claimId: "INAKQ.general.definition.Q",
    entity: { kind: "profile", ref: "INAKQ" },
    scope: "single_direction",
    claimKind: "emotional_activation",
    assertion:
      "Q는 결과가 불확실하거나 관계에 이상 신호가 보일 때 걱정과 불편한 감정이 비교적 빠르게 올라오는 방향이다. 놓치면 안 될 위험과 사람에게 미칠 영향을 일찍 알아차려 대비하려는 경향이 있다.",
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
    claimId: "INAKQ.general.profile.hypothesis",
    entity: { kind: "profile", ref: "INAKQ" },
    scope: "whole_profile",
    claimKind: "evidence_statement",
    assertion:
      "INAKQ는 혼자 생각을 정리한 뒤 관계에 들어가고, 보이는 내용 너머의 가능성과 상대 마음을 함께 살피며, 정한 계획을 이어가고, 놓칠 수 있는 위험과 걱정을 빠르게 알아차리는 조합으로 연구한다.",
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

export const inakqFoundationLineageV2 = [
  {
    claimId: "INAKQ.general.definition.I",
    sourceClaimId: "ENAKQ.general.definition.E",
    derivationMode: "axis_override",
  },
  {
    claimId: "INAKQ.general.definition.N",
    sourceClaimId: "ENAKQ.general.definition.N",
    derivationMode: "inherited",
  },
  {
    claimId: "INAKQ.general.definition.A",
    sourceClaimId: "ENAKQ.general.definition.A",
    derivationMode: "inherited",
  },
  {
    claimId: "INAKQ.general.definition.K",
    sourceClaimId: "ENAKQ.general.definition.K",
    derivationMode: "inherited",
  },
  {
    claimId: "INAKQ.general.definition.Q",
    sourceClaimId: "ENAKQ.general.definition.Q",
    derivationMode: "inherited",
  },
  {
    claimId: "INAKQ.general.profile.hypothesis",
    sourceClaimId: "ENAKQ.general.profile.hypothesis",
    derivationMode: "axis_override",
  },
] as const;
