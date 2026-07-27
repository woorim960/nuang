import { z } from "zod";
import { candidateRoleNames } from "@/features/nuang-code/candidate-profile-names";
import { nuangCodeSchema } from "@/features/nuang-code/trait-map-knowledge-contract";

export const traitMapDataCenterContractVersion =
  "nuang-trait-map-data-center.v2";

export const traitMapLongformCharacterPolicy = {
  minimum: 50_000,
} as const;

export const traitMapResearchStreams = [
  "personality_structure",
  "personality_facets",
  "person_situation_process",
  "family_relationships",
  "friendship",
  "romantic_relationships",
  "work_and_study",
  "emotion_stress_recovery",
  "measurement_and_validity",
  "language_and_culture",
] as const;

export const traitMapEvidenceGrades = ["A", "B", "C", "D"] as const;

export const traitMapV2RelationshipContexts = [
  "general",
  "family",
  "friend",
  "partner",
  "person_of_interest",
  "work",
] as const;

export const traitMapScenarioMoments = [
  "ordinary_choice",
  "new_encounter",
  "group_participation",
  "plan_change",
  "uncertainty",
  "disagreement",
  "support_requested",
  "need_expression",
  "boundary",
  "success",
  "setback",
  "aftermath",
] as const;

export const traitMapScenarioSettings = [
  "alone",
  "home",
  "offline_gathering",
  "private_conversation",
  "online_conversation",
  "workplace",
  "school",
  "public_space",
] as const;

export const traitMapScenarioTasks = [
  "choose",
  "initiate_contact",
  "join_group",
  "adapt_plan",
  "explore_information",
  "resolve_disagreement",
  "respond_to_support_need",
  "express_need",
  "set_or_respect_boundary",
  "respond_to_success",
  "respond_to_setback",
  "recover_and_reconnect",
] as const;

export const traitMapObservationChannels = [
  "attention",
  "first_thought",
  "actual_response",
  "communication",
  "decision",
  "follow_through",
  "emotional_activation",
  "recovery",
] as const;

export const traitMapWhyLenses = [
  "SE_energy_and_expression",
  "OE_exploration_and_interest",
  "RO_relational_attention",
  "SM_execution_and_structure",
  "ER_emotional_activation_and_worry",
] as const;

export const traitMapV2ChapterIds = [
  "overview",
  "role_name_and_values",
  "five_code_positions",
  "code_interactions",
  "first_thought_and_actual_response",
  "daily_choice_and_change",
  "family",
  "friend",
  "partner",
  "person_of_interest",
  "work_and_study",
  "conflict_stress_and_recovery",
  "strength_overuse_and_growth",
  "misunderstanding_and_communication",
  "neighbor_contrasts",
  "evidence_and_method",
] as const;

export const traitMapV2ReviewRoles = [
  "personality_psychology",
  "psychometrics",
  "relationship_psychology",
  "clinical_safety",
  "plain_korean",
  "product",
  "design",
] as const;

const researchStreamSchema = z.enum(traitMapResearchStreams);
const evidenceGradeSchema = z.enum(traitMapEvidenceGrades);
const relationshipContextV2Schema = z.enum(traitMapV2RelationshipContexts);
const scenarioMomentSchema = z.enum(traitMapScenarioMoments);
const scenarioSettingSchema = z.enum(traitMapScenarioSettings);
const scenarioTaskSchema = z.enum(traitMapScenarioTasks);
const observationChannelSchema = z.enum(traitMapObservationChannels);
const whyLensSchema = z.enum(traitMapWhyLenses);
const chapterIdSchema = z.enum(traitMapV2ChapterIds);
const reviewStateSchema = z.enum([
  "not_started",
  "in_review",
  "passed",
  "failed",
]);

export const traitMapEvidenceSourceSchema = z
  .object({
    sourceId: z
      .string()
      .regex(/^SRC-[A-Z0-9][A-Z0-9-]*$/, "근거 자료 ID 형식이 아니에요."),
    title: z.string().min(1),
    authors: z.array(z.string().min(1)).min(1),
    year: z.number().int().min(1900).max(2100),
    researchStream: researchStreamSchema,
    sourceType: z.enum([
      "standard",
      "instrument_manual",
      "meta_analysis",
      "systematic_review",
      "longitudinal_study",
      "experience_sampling_study",
      "cross_cultural_study",
      "measurement_study",
      "peer_reviewed_study",
      "registered_report",
    ]),
    peerReviewStatus: z.enum([
      "peer_reviewed",
      "official_standard",
      "official_manual",
      "not_peer_reviewed",
    ]),
    doi: z.string().min(1).optional(),
    url: z.string().url().optional(),
    languages: z.array(z.string().min(2)).min(1),
    countries: z.array(z.string().min(2)).min(1),
    populationSummary: z.string().min(1),
    sampleSize: z.number().int().positive().nullable(),
    screeningStatus: z.enum(["candidate", "included", "excluded", "replaced"]),
    exclusionReason: z.string().min(1).optional(),
    quality: z.object({
      directness: z.enum(["direct", "partial", "indirect", "method_only"]),
      riskOfBias: z.enum(["low", "some_concerns", "high", "not_applicable"]),
      culturalFit: z.enum([
        "korean_direct",
        "cross_cultural",
        "non_korean",
        "method_only",
      ]),
      replication: z.enum([
        "replicated",
        "multiple_samples",
        "single_sample",
        "not_applicable",
      ]),
    }),
  })
  .superRefine((source, context) => {
    if (!source.doi && !source.url) {
      context.addIssue({
        code: "custom",
        message: "근거 자료에는 DOI 또는 확인 가능한 URL이 필요해요.",
        path: ["url"],
      });
    }
    if (
      source.screeningStatus === "excluded" &&
      source.exclusionReason === undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "제외한 자료에는 제외 이유가 필요해요.",
        path: ["exclusionReason"],
      });
    }
    if (
      source.screeningStatus !== "excluded" &&
      source.exclusionReason !== undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "포함 후보 자료에는 제외 이유를 기록하지 않아요.",
        path: ["exclusionReason"],
      });
    }
  });

export const traitMapEvidenceFindingSchema = z.object({
  findingId: z
    .string()
    .regex(/^FND-[A-Z0-9][A-Z0-9-]*$/, "근거 결과 ID 형식이 아니에요."),
  sourceId: z.string().regex(/^SRC-[A-Z0-9][A-Z0-9-]*$/),
  constructRefs: z.array(z.string().min(1)).min(1),
  contexts: z.array(relationshipContextV2Schema).min(1),
  direction: z.enum([
    "supports",
    "qualifies",
    "contradicts",
    "null_finding",
    "method_only",
  ]),
  evidenceGrade: evidenceGradeSchema,
  populationSummary: z.string().min(1),
  resultSummary: z.string().min(1),
  effect: z
    .object({
      metric: z.string().min(1),
      estimate: z.number(),
      lowerBound: z.number().optional(),
      upperBound: z.number().optional(),
    })
    .optional(),
  limitations: z.array(z.string().min(1)).min(1),
  extractedBy: z.string().min(1),
  verifiedBy: z.array(z.string().min(1)).min(1),
});

export const traitMapConstructMappingSchema = z.object({
  mappingId: z
    .string()
    .regex(/^MAP-[A-Z0-9][A-Z0-9-]*$/, "구성개념 매핑 ID 형식이 아니에요."),
  externalConstruct: z.string().min(1),
  nuangTarget: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("axis"),
      ref: z.enum(["SE", "OE", "RO", "SM", "ER"]),
    }),
    z.object({
      kind: z.literal("facet"),
      ref: z.enum([
        "SE-RE",
        "SE-AI",
        "OE-AE",
        "OE-CI",
        "OE-IE",
        "RO-EC",
        "SM-EP",
        "SM-OS",
        "ER-IR",
        "ER-WD",
      ]),
    }),
  ]),
  relation: z.enum(["partial", "adjacent", "non_equivalent"]),
  rationale: z.string().min(1),
  prohibitedEquivalences: z.array(z.string().min(1)).min(1),
  evidenceFindingRefs: z.array(z.string().regex(/^FND-/)).min(1),
  status: z.enum(["research_candidate", "reviewed", "retired"]),
});

const scenarioActorSchema = z.enum([
  "self",
  "family_member",
  "friend",
  "partner",
  "person_of_interest",
  "colleague",
  "manager",
  "direct_report",
  "unfamiliar_person",
  "group",
]);

export const traitMapScenarioSchema = z.object({
  scenarioId: z
    .string()
    .regex(/^SCN-[A-Z0-9][A-Z0-9-]*$/, "상황 ID 형식이 아니에요."),
  relationshipContext: relationshipContextV2Schema,
  who: z.array(scenarioActorSchema).min(1),
  when: scenarioMomentSchema,
  where: scenarioSettingSchema,
  what: scenarioTaskSchema,
  observeHow: z.array(observationChannelSchema).min(2),
  whyLenses: z.array(whyLensSchema).min(1),
  customerPrompt: z.string().min(1),
  prohibitedInferences: z.array(z.string().min(1)).min(1),
  status: z.enum(["canonical", "supplemental", "retired"]),
});

export const traitMapRequiredSignalV2Schema = z.enum([
  "representative_code",
  "domain_scores",
  "facet_scores",
  "scenario_context",
  "relationship_context",
  "private_process_signals",
  "response_history",
  "current_state",
  "recovery_preference",
]);

export const traitMapClaimV2Schema = z
  .object({
    claimId: z
      .string()
      .regex(
        /^(?:COMMON|[EI][RN][GA][KM][CQ])(?:\.[A-Za-z0-9_-]+)+$/,
        "v2 claim ID 형식이 아니에요.",
      ),
    entity: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("profile"), ref: nuangCodeSchema }),
      z.object({
        kind: z.literal("axis"),
        ref: z.enum(["SE", "OE", "RO", "SM", "ER"]),
      }),
      z.object({
        kind: z.literal("facet"),
        ref: z.enum([
          "SE-RE",
          "SE-AI",
          "OE-AE",
          "OE-CI",
          "OE-IE",
          "RO-EC",
          "SM-EP",
          "SM-OS",
          "ER-IR",
          "ER-WD",
        ]),
      }),
      z.object({ kind: z.literal("interaction"), ref: z.string().min(3) }),
    ]),
    scope: z.enum([
      "definition",
      "single_direction",
      "facet",
      "interaction",
      "whole_profile",
      "scenario",
      "contrast",
      "method_boundary",
    ]),
    claimKind: z.enum([
      "attention",
      "first_thought",
      "actual_response",
      "communication",
      "decision",
      "follow_through",
      "emotional_activation",
      "recovery",
      "strength",
      "overuse",
      "misunderstanding",
      "conversation_guide",
      "evidence_statement",
    ]),
    assertion: z.string().min(1),
    contexts: z.array(relationshipContextV2Schema).min(1),
    scenarioRefs: z.array(z.string().regex(/^SCN-/)),
    requiredSignals: z.array(traitMapRequiredSignalV2Schema),
    evidenceFindingRefs: z.array(z.string().regex(/^FND-/)),
    independentSourceRefs: z.array(z.string().regex(/^SRC-/)),
    evidenceStatus: z.enum([
      "unmapped",
      "mapped_provisional",
      "external_supported",
      "nuang_validation_required",
      "supported",
      "validated",
      "hold",
      "rejected",
    ]),
    evidenceGrade: evidenceGradeSchema,
    privacyScope: z.enum(["self_only", "comparison_safe", "public_safe"]),
    riskDomains: z.array(
      z.enum([
        "relationship_outcome",
        "attraction",
        "mental_health",
        "clinical",
        "ability",
        "work_performance",
        "none",
      ]),
    ),
    publicationState: z.enum([
      "research_only",
      "review_candidate",
      "approved",
      "published",
      "retired",
    ]),
    customerCopy: z
      .object({
        short: z.string().min(1),
        standard: z.string().min(1),
        long: z.string().min(1),
      })
      .optional(),
    reviews: z.record(z.enum(traitMapV2ReviewRoles), reviewStateSchema),
  })
  .superRefine((claim, context) => {
    const customerVisible =
      claim.publicationState === "approved" ||
      claim.publicationState === "published";
    const highRisk = claim.riskDomains.some((risk) => risk !== "none");

    if (customerVisible && !claim.customerCopy) {
      context.addIssue({
        code: "custom",
        message: "승인·게시 claim에는 고객용 문구가 필요해요.",
        path: ["customerCopy"],
      });
    }
    if (
      customerVisible &&
      claim.evidenceStatus !== "supported" &&
      claim.evidenceStatus !== "validated"
    ) {
      context.addIssue({
        code: "custom",
        message: "지지되거나 검증된 claim만 고객용으로 승인할 수 있어요.",
        path: ["evidenceStatus"],
      });
    }
    if (customerVisible && claim.evidenceFindingRefs.length === 0) {
      context.addIssue({
        code: "custom",
        message: "고객용 claim에는 추적 가능한 근거 결과가 필요해요.",
        path: ["evidenceFindingRefs"],
      });
    }
    if (
      customerVisible &&
      Object.values(claim.reviews).some((review) => review !== "passed")
    ) {
      context.addIssue({
        code: "custom",
        message: "모든 필수 검토를 통과해야 claim을 승인할 수 있어요.",
        path: ["reviews"],
      });
    }
    if (highRisk && customerVisible && claim.independentSourceRefs.length < 2) {
      context.addIssue({
        code: "custom",
        message: "고위험 해석에는 서로 독립적인 근거 자료가 2개 이상 필요해요.",
        path: ["independentSourceRefs"],
      });
    }
    if (
      (claim.claimKind === "first_thought" ||
        claim.claimKind === "actual_response") &&
      claim.privacyScope !== "self_only"
    ) {
      context.addIssue({
        code: "custom",
        message: "내적 과정과 실제 반응 정보는 본인 전용으로 시작해요.",
        path: ["privacyScope"],
      });
    }
    if (
      claim.scope === "scenario" &&
      (claim.scenarioRefs.length === 0 ||
        !claim.requiredSignals.includes("scenario_context"))
    ) {
      context.addIssue({
        code: "custom",
        message: "상황 claim에는 상황 ID와 상황 신호가 필요해요.",
        path: ["scenarioRefs"],
      });
    }
    if (
      claim.contexts.some((item) => item !== "general") &&
      !claim.requiredSignals.includes("relationship_context")
    ) {
      context.addIssue({
        code: "custom",
        message: "관계별 claim에는 관계 맥락 신호가 필요해요.",
        path: ["requiredSignals"],
      });
    }
  });

export const traitMapChapterManifestV2Schema = z.object({
  chapterId: chapterIdSchema,
  title: z.string().min(1),
  nonWhitespaceCharacters: z.number().int().nonnegative(),
  sourceFiles: z.array(z.string().min(1)).min(1),
  claimRefs: z.array(z.string().min(1)),
});

const profilePackageReviewSchema = z.object({
  contradictionAudit: reviewStateSchema,
  deduplication: reviewStateSchema,
  evidenceAudit: reviewStateSchema,
  measurement: reviewStateSchema,
  plainLanguage: reviewStateSchema,
  productSafety: reviewStateSchema,
  psychology: reviewStateSchema,
  scenarioCoverage: reviewStateSchema,
});

export const traitMapProfilePackageV2Schema = z
  .object({
    packageId: z.string().min(1),
    code: nuangCodeSchema,
    profileName: z.string().min(1),
    releaseVersion: z.string().min(1),
    status: z.enum([
      "scaffold",
      "research_draft",
      "in_review",
      "approved",
      "published",
    ]),
    chapters: z.array(traitMapChapterManifestV2Schema),
    totalNonWhitespaceCharacters: z.number().int().nonnegative(),
    claimRefs: z.array(z.string().min(1)),
    evidenceSourceRefs: z.array(z.string().regex(/^SRC-/)),
    scenarioRefs: z.array(z.string().regex(/^SCN-/)),
    neighborContrastCodes: z.array(nuangCodeSchema),
    reviews: profilePackageReviewSchema,
  })
  .superRefine((profile, context) => {
    addDuplicateIssue(
      profile.chapters.map((item) => item.chapterId),
      "chapters",
      context,
    );
    addDuplicateIssue(profile.claimRefs, "claimRefs", context);
    addDuplicateIssue(
      profile.evidenceSourceRefs,
      "evidenceSourceRefs",
      context,
    );
    addDuplicateIssue(profile.scenarioRefs, "scenarioRefs", context);
    addDuplicateIssue(
      profile.neighborContrastCodes,
      "neighborContrastCodes",
      context,
    );

    const chapterCharacterTotal = profile.chapters.reduce(
      (total, chapter) => total + chapter.nonWhitespaceCharacters,
      0,
    );
    if (chapterCharacterTotal !== profile.totalNonWhitespaceCharacters) {
      context.addIssue({
        code: "custom",
        message: "장별 글자 수 합계와 전체 글자 수가 일치해야 해요.",
        path: ["totalNonWhitespaceCharacters"],
      });
    }

    const complete =
      profile.status === "approved" || profile.status === "published";
    if (!complete) return;

    if (
      profile.totalNonWhitespaceCharacters <
      traitMapLongformCharacterPolicy.minimum
    ) {
      context.addIssue({
        code: "custom",
        message: "승인 원문은 공백 제외 50,000자 이상이어야 해요.",
        path: ["totalNonWhitespaceCharacters"],
      });
    }

    addExactInventoryIssue(
      profile.chapters.map((item) => item.chapterId),
      traitMapV2ChapterIds,
      "chapters",
      context,
    );

    if (new Set(profile.scenarioRefs).size < 72) {
      context.addIssue({
        code: "custom",
        message: "승인 성향지도에는 최소 72개 기준 상황이 연결되어야 해요.",
        path: ["scenarioRefs"],
      });
    }
    if (profile.claimRefs.length < 100) {
      context.addIssue({
        code: "custom",
        message: "승인 성향지도에는 최소 100개의 canonical claim이 필요해요.",
        path: ["claimRefs"],
      });
    }
    if (profile.evidenceSourceRefs.length < 30) {
      context.addIssue({
        code: "custom",
        message: "승인 성향지도에는 최소 30개의 근거 자료가 연결되어야 해요.",
        path: ["evidenceSourceRefs"],
      });
    }

    const expectedNeighbors = getOneLetterNeighborCodes(profile.code);
    addExactInventoryIssue(
      profile.neighborContrastCodes,
      expectedNeighbors,
      "neighborContrastCodes",
      context,
    );

    if (Object.values(profile.reviews).some((review) => review !== "passed")) {
      context.addIssue({
        code: "custom",
        message: "모든 패키지 검토를 통과해야 성향지도를 승인할 수 있어요.",
        path: ["reviews"],
      });
    }
  });

export const traitMapDataCenterManifestV2Schema = z
  .object({
    contractVersion: z.literal(traitMapDataCenterContractVersion),
    releaseId: z.string().min(1),
    status: z.enum([
      "design_contract",
      "research_build",
      "in_review",
      "active",
      "retired",
    ]),
    evidenceSources: z.array(traitMapEvidenceSourceSchema),
    evidenceFindings: z.array(traitMapEvidenceFindingSchema),
    constructMappings: z.array(traitMapConstructMappingSchema),
    scenarioCatalog: z.array(traitMapScenarioSchema),
    claims: z.array(traitMapClaimV2Schema),
    profiles: z.array(traitMapProfilePackageV2Schema),
  })
  .superRefine((manifest, context) => {
    addDuplicateIssue(
      manifest.evidenceSources.map((item) => item.sourceId),
      "evidenceSources",
      context,
    );
    addDuplicateIssue(
      manifest.evidenceFindings.map((item) => item.findingId),
      "evidenceFindings",
      context,
    );
    addDuplicateIssue(
      manifest.constructMappings.map((item) => item.mappingId),
      "constructMappings",
      context,
    );
    addDuplicateIssue(
      manifest.scenarioCatalog.map((item) => item.scenarioId),
      "scenarioCatalog",
      context,
    );
    addDuplicateIssue(
      manifest.claims.map((item) => item.claimId),
      "claims",
      context,
    );
    addDuplicateIssue(
      manifest.profiles.map((item) => item.code),
      "profiles",
      context,
    );

    const active = manifest.status === "active";
    if (active) {
      if (manifest.scenarioCatalog.length < 72) {
        context.addIssue({
          code: "custom",
          message: "활성 데이터센터에는 72개 이상의 기준 상황이 필요해요.",
          path: ["scenarioCatalog"],
        });
      }
      if (
        manifest.profiles.length !== 32 ||
        manifest.profiles.some((profile) => profile.status !== "published")
      ) {
        context.addIssue({
          code: "custom",
          message:
            "전체 활성 릴리스에는 32개 게시 성향 패키지가 정확히 필요해요.",
          path: ["profiles"],
        });
      }
    }
  });

type RelationshipContext = (typeof traitMapV2RelationshipContexts)[number];
type ScenarioMoment = (typeof traitMapScenarioMoments)[number];
type ScenarioSetting = (typeof traitMapScenarioSettings)[number];
type ScenarioTask = (typeof traitMapScenarioTasks)[number];
type ObservationChannel = (typeof traitMapObservationChannels)[number];

const contextDefinitions: ReadonlyArray<{
  id: RelationshipContext;
  label: string;
  who: z.infer<typeof scenarioActorSchema>[];
  where: ScenarioSetting;
}> = [
  {
    id: "general",
    label: "혼자 또는 일상에서",
    who: ["self"],
    where: "alone",
  },
  {
    id: "family",
    label: "가족과 있을 때",
    who: ["self", "family_member"],
    where: "home",
  },
  {
    id: "friend",
    label: "친구와 있을 때",
    who: ["self", "friend"],
    where: "offline_gathering",
  },
  {
    id: "partner",
    label: "연인과 있을 때",
    who: ["self", "partner"],
    where: "private_conversation",
  },
  {
    id: "person_of_interest",
    label: "마음 가는 사람을 알아갈 때",
    who: ["self", "person_of_interest"],
    where: "online_conversation",
  },
  {
    id: "work",
    label: "일하거나 공부할 때",
    who: ["self", "colleague", "group"],
    where: "workplace",
  },
];

const momentDefinitions: ReadonlyArray<{
  id: ScenarioMoment;
  label: string;
  task: ScenarioTask;
  observeHow: ObservationChannel[];
}> = [
  {
    id: "ordinary_choice",
    label: "평소 선택을 할 때",
    task: "choose",
    observeHow: ["attention", "decision", "actual_response"],
  },
  {
    id: "new_encounter",
    label: "새로운 사람이나 일을 마주할 때",
    task: "initiate_contact",
    observeHow: ["attention", "first_thought", "communication"],
  },
  {
    id: "group_participation",
    label: "여러 사람과 함께 움직일 때",
    task: "join_group",
    observeHow: ["attention", "communication", "actual_response"],
  },
  {
    id: "plan_change",
    label: "계획이 갑자기 바뀔 때",
    task: "adapt_plan",
    observeHow: ["first_thought", "decision", "emotional_activation"],
  },
  {
    id: "uncertainty",
    label: "앞일이 분명하지 않을 때",
    task: "explore_information",
    observeHow: ["attention", "first_thought", "emotional_activation"],
  },
  {
    id: "disagreement",
    label: "의견이 다르거나 갈등이 생길 때",
    task: "resolve_disagreement",
    observeHow: ["attention", "communication", "actual_response"],
  },
  {
    id: "support_requested",
    label: "상대가 힘든 일을 이야기할 때",
    task: "respond_to_support_need",
    observeHow: ["attention", "first_thought", "actual_response"],
  },
  {
    id: "need_expression",
    label: "내가 원하는 것을 말해야 할 때",
    task: "express_need",
    observeHow: ["first_thought", "communication", "actual_response"],
  },
  {
    id: "boundary",
    label: "부탁을 거절하거나 선을 정해야 할 때",
    task: "set_or_respect_boundary",
    observeHow: ["attention", "decision", "communication"],
  },
  {
    id: "success",
    label: "좋은 결과나 기쁜 일이 생겼을 때",
    task: "respond_to_success",
    observeHow: ["emotional_activation", "communication", "actual_response"],
  },
  {
    id: "setback",
    label: "실수하거나 기대한 결과가 나오지 않을 때",
    task: "respond_to_setback",
    observeHow: ["first_thought", "emotional_activation", "actual_response"],
  },
  {
    id: "aftermath",
    label: "부담스러운 일이 지나간 뒤",
    task: "recover_and_reconnect",
    observeHow: ["recovery", "follow_through", "communication"],
  },
];

export const traitMapScenarioCatalogV2 = contextDefinitions
  .flatMap((relationship) =>
    momentDefinitions.map((moment, momentIndex) => ({
      scenarioId: `SCN-${relationship.id.toUpperCase().replaceAll("_", "-")}-${
        momentIndex + 1
      }`,
      relationshipContext: relationship.id,
      who: relationship.who,
      when: moment.id,
      where: relationship.where,
      what: moment.task,
      observeHow: moment.observeHow,
      whyLenses: [...traitMapWhyLenses],
      customerPrompt: `${relationship.label} ${moment.label}, 무엇을 먼저 살피고 어떻게 행동하는지 확인해요.`,
      prohibitedInferences: [
        "대표 코드만으로 개인의 생각이나 행동을 확정하지 않아요.",
        "능력, 도덕성, 호감, 관계 성공 또는 정신건강을 추정하지 않아요.",
      ],
      status: "canonical" as const,
    })),
  );

export const traitMapDataCenterV2Scaffold = {
  contractVersion: traitMapDataCenterContractVersion,
  releaseId: "NUANG-TRAIT-MAP-DATA-CENTER-2.0-FOUNDATION",
  status: "design_contract",
  evidenceSources: [],
  evidenceFindings: [],
  constructMappings: [],
  scenarioCatalog: traitMapScenarioCatalogV2,
  claims: [],
  profiles: [],
} as const;

export function getOneLetterNeighborCodes(code: string) {
  const pairs: ReadonlyArray<readonly [string, string]> = [
    ["E", "I"],
    ["R", "N"],
    ["G", "A"],
    ["K", "M"],
    ["C", "Q"],
  ];

  return code.split("").map((symbol, index) => {
    const pair = pairs[index];
    const replacement = pair[0] === symbol ? pair[1] : pair[0];
    return `${code.slice(0, index)}${replacement}${code.slice(index + 1)}`;
  });
}

export function getCandidateProfileInventoryV2() {
  return Object.entries(candidateRoleNames)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([code, profileName]) => ({
      code,
      profileName,
      neighborCodes: getOneLetterNeighborCodes(code),
    }));
}

function addDuplicateIssue(
  values: readonly string[],
  path: string,
  context: z.RefinementCtx,
) {
  if (new Set(values).size === values.length) return;
  context.addIssue({
    code: "custom",
    message: `${path}에는 중복 ID가 있을 수 없어요.`,
    path: [path],
  });
}

function addExactInventoryIssue(
  actual: readonly string[],
  expected: readonly string[],
  path: string,
  context: z.RefinementCtx,
) {
  const actualSorted = [...new Set(actual)].sort();
  const expectedSorted = [...new Set(expected)].sort();
  if (
    actualSorted.length === expectedSorted.length &&
    actualSorted.every((value, index) => value === expectedSorted[index])
  ) {
    return;
  }

  context.addIssue({
    code: "custom",
    message: `${path}의 필수 목록이 정확하지 않아요.`,
    path: [path],
  });
}
