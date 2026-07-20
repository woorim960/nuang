import { z } from "zod";

export const traitMapKnowledgeContractVersion =
  "nuang-trait-map-knowledge.v0.1";
export const comparisonKnowledgeContractVersion =
  "nuang-comparison-knowledge.v0.1";
export const traitClaimRegistryContractVersion =
  "nuang-trait-claim-registry.v0.1";
export const traitProfileFixtureContractVersion =
  "nuang-trait-profile-fixture.v0.1";

export const nuangCodeSchema = z
  .string()
  .regex(/^[EI][RN][GA][KM][CQ]$/, "현재 뉴앙 5자리 코드 형식이 아니에요.");

export const relationshipContextSchema = z.enum([
  "general",
  "family",
  "friend",
  "partner",
  "person_of_interest",
  "work",
]);

export const knowledgeEvidenceSchema = z.object({
  evidenceId: z.string().min(1),
  locator: z.string().min(1),
  note: z.string().min(1),
  sourceType: z.enum([
    "meta_analysis",
    "systematic_review",
    "peer_reviewed_study",
    "instrument_manual",
    "measurement_analysis",
    "expert_review",
    "nuang_observation",
  ]),
});

export const traitContentKeySchema = z
  .string()
  .regex(
    /^trait-map\.[a-z0-9-]+\.[a-z0-9._-]+$/,
    "contentKey는 trait-map.{code}.{stable-meaning-key} 형식이어야 해요.",
  );

export const traitKnowledgeClaimSchema = z.object({
  claimId: z.string().min(1),
  claimKind: z.enum([
    "definition",
    "inner_thought",
    "observable_response",
    "strength",
    "friction",
    "possible_misread",
    "support_preference",
    "conversation_prompt",
    "growth_practice",
    "boundary",
  ]),
  confidence: z.enum([
    "theory_informed",
    "preliminary",
    "supported",
    "validated",
  ]),
  contentKey: traitContentKeySchema,
  contexts: z.array(relationshipContextSchema).min(1),
  evidenceRefs: z.array(z.string().min(1)).min(1),
  longCopy: z.string().min(1),
  shortCopy: z.string().min(1),
});

const traitMapReviewSchema = z.object({
  contradictionAudit: z.enum(["not_started", "in_review", "passed"]),
  deduplication: z.enum(["not_started", "in_review", "passed"]),
  measurement: z.enum(["not_started", "in_review", "passed"]),
  plainLanguage: z.enum(["not_started", "in_review", "passed"]),
  productSafety: z.enum(["not_started", "in_review", "passed"]),
  psychology: z.enum(["not_started", "in_review", "passed"]),
});

export const traitMapSectionIdSchema = z.enum([
  "overview",
  "role_name",
  "five_code_positions",
  "code_interactions",
  "inner_thought_and_response",
  "daily_life",
  "family",
  "friend",
  "partner",
  "person_of_interest",
  "work",
  "stress_and_recovery",
  "strengths_and_growth",
  "misunderstandings",
  "communication_guide",
  "limitations_and_evidence",
]);

const traitMapSectionSchema = z.object({
  body: z.string().min(1),
  claimRefs: z.array(z.string().min(1)),
  sectionId: traitMapSectionIdSchema,
  title: z.string().min(1),
});

export const traitClaimEvidenceStatusSchema = z.enum([
  "EXTERNAL_SUPPORTED",
  "EXTERNAL_SUPPORTED_BOUNDARY",
  "EXTERNAL_SUPPORTED_METHOD",
  "NUANG_MAPPED_PROVISIONAL",
  "COGNITIVE_REVIEW_REQUIRED",
  "QUANT_VALIDATION_REQUIRED",
  "DESIGN_APPROVED_NOT_EXECUTED",
  "EVIDENCE_DOCUMENTED",
  "SAFETY_POLICY",
  "HOLD",
  "APPROVED",
]);

export const traitClaimRegistryKindSchema = z.enum([
  "definition",
  "inner_thought",
  "observable_response",
  "strength",
  "friction",
  "possible_misread",
  "support_preference",
  "conversation_prompt",
  "growth_practice",
  "boundary",
  "context_hypothesis",
  "interaction_hypothesis",
  "evidence_statement",
]);

export const traitKnowledgeSurfaceSchema = z.enum([
  "trait_map",
  "personal_report",
  "comparison_report",
  "public_profile",
  "evidence_page",
]);

export const traitRequiredSignalSchema = z.enum([
  "domain_scores",
  "facet_scores",
  "relationship_context",
  "private_process_signals",
  "recovery_preference",
  "current_state",
]);

export const traitClaimRegistryEntrySchema = z
  .object({
    canonicalSectionId: traitMapSectionIdSchema,
    candidateSurfaces: z.array(traitKnowledgeSurfaceSchema).min(1),
    claimId: z
      .string()
      .regex(
        /^[A-Z]{5}(?:\.[A-Za-z0-9_]+)+$/,
        "claimId 형식이 올바르지 않아요.",
      ),
    claimKind: traitClaimRegistryKindSchema,
    contentKey: traitContentKeySchema,
    contexts: z.array(relationshipContextSchema).min(1),
    evidenceStatus: traitClaimEvidenceStatusSchema,
    externalEvidence: z.array(z.string().min(1)).min(1),
    internalEvidence: z.array(z.string().min(1)).min(1),
    privacyScope: z.enum(["self_only", "comparison_safe", "public_safe"]),
    publicationState: z.enum(["research_only", "review_candidate", "approved"]),
    requiredSignals: z.array(traitRequiredSignalSchema),
    sourceBlockRefs: z
      .array(z.string().regex(/^ENAKQ-P[0-9]+-[A-Z0-9*-]+$/))
      .min(1),
    sourceParts: z.array(z.number().int().min(1).max(5)).min(1),
  })
  .superRefine((claim, context) => {
    if (
      claim.publicationState === "approved" &&
      claim.evidenceStatus !== "APPROVED"
    ) {
      context.addIssue({
        code: "custom",
        message: "근거 상태가 APPROVED인 claim만 운영 승인할 수 있어요.",
        path: ["publicationState"],
      });
    }

    if (
      claim.evidenceStatus === "HOLD" &&
      claim.publicationState !== "research_only"
    ) {
      context.addIssue({
        code: "custom",
        message: "HOLD claim은 연구용으로만 유지해야 해요.",
        path: ["publicationState"],
      });
    }

    if (
      claim.privacyScope === "self_only" &&
      claim.candidateSurfaces.some(
        (surface) =>
          surface === "comparison_report" || surface === "public_profile",
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "본인 전용 과정 정보는 비교·공개 프로필 후보가 될 수 없어요.",
        path: ["candidateSurfaces"],
      });
    }
  });

export const traitClaimRegistrySchema = z
  .object({
    code: nuangCodeSchema,
    contractVersion: z.literal(traitClaimRegistryContractVersion),
    entries: z.array(traitClaimRegistryEntrySchema).min(1),
    generatedFrom: z.object({
      draftParts: z.array(z.string().min(1)).length(5),
      evidenceLedgers: z.array(z.string().min(1)).length(5),
    }),
    mapVersion: z.string().min(1),
    status: z.literal("research_draft_not_for_production"),
  })
  .superRefine((registry, context) => {
    addDuplicateIssues(
      registry.entries.map((claim) => claim.claimId),
      "entries",
      "claimId",
      context,
    );
    addDuplicateIssues(
      registry.entries.map((claim) => claim.contentKey),
      "entries",
      "contentKey",
      context,
    );
  });

export const traitDomainScoreFixtureSchema = z
  .object({
    domainId: z.enum(["SE", "OE", "RO", "SM", "ER"]),
    highSymbol: z.enum(["E", "N", "A", "K", "Q"]),
    highPercent: z.number().min(0).max(100),
    isBoundary: z.boolean(),
    lowSymbol: z.enum(["I", "R", "G", "M", "C"]),
    lowPercent: z.number().min(0).max(100),
    selectedSymbol: z.enum(["E", "I", "N", "R", "A", "G", "K", "M", "Q", "C"]),
  })
  .superRefine((score, context) => {
    if (score.highPercent + score.lowPercent !== 100) {
      context.addIssue({
        code: "custom",
        message: "축 양쪽 비율의 합은 100이어야 해요.",
        path: ["highPercent"],
      });
    }

    const expectedSymbol =
      score.highPercent >= score.lowPercent
        ? score.highSymbol
        : score.lowSymbol;
    if (score.selectedSymbol !== expectedSymbol) {
      context.addIssue({
        code: "custom",
        message: "selectedSymbol은 더 가까운 방향과 같아야 해요.",
        path: ["selectedSymbol"],
      });
    }
  });

export const traitFacetScoreFixtureSchema = z.object({
  direction: z.enum(["high", "low"]),
  facetId: z.string().regex(/^(SE|OE|RO|SM|ER)-[A-Z]{2}$/),
  highPercent: z.number().min(0).max(100),
  isBoundary: z.boolean(),
});

export const traitProfileFixtureSchema = z
  .object({
    availableSignals: z.array(traitRequiredSignalSchema),
    code: nuangCodeSchema,
    contractVersion: z.literal(traitProfileFixtureContractVersion),
    domainScores: z.array(traitDomainScoreFixtureSchema).length(5),
    expectedSuppressedClaimIds: z.array(z.string().min(1)),
    facetScores: z.array(traitFacetScoreFixtureSchema),
    fixtureId: z.string().min(1),
    kind: z.enum(["clear", "boundary", "facet_split"]),
    mapVersion: z.string().min(1),
    privacy: z.object({
      synthetic: z.literal(true),
      includesDirectResponses: z.literal(false),
      includesRawScorePayload: z.literal(false),
    }),
  })
  .superRefine((fixture, context) => {
    addDuplicateIssues(
      fixture.domainScores.map((score) => score.domainId),
      "domainScores",
      "domainId",
      context,
    );
    addDuplicateIssues(
      fixture.facetScores.map((score) => score.facetId),
      "facetScores",
      "facetId",
      context,
    );

    const domainOrder = ["SE", "OE", "RO", "SM", "ER"] as const;
    const scoresByDomain = new Map(
      fixture.domainScores.map((score) => [score.domainId, score]),
    );
    const derivedCode = domainOrder
      .map((domainId) => scoresByDomain.get(domainId)?.selectedSymbol ?? "")
      .join("");
    if (derivedCode !== fixture.code) {
      context.addIssue({
        code: "custom",
        message: `축 점수에서 계산한 코드 ${derivedCode}가 fixture 코드와 달라요.`,
        path: ["code"],
      });
    }

    fixture.domainScores.forEach((score, index) => {
      const expectedBoundary = Math.abs(score.highPercent - 50) <= 5;
      if (score.isBoundary !== expectedBoundary) {
        context.addIssue({
          code: "custom",
          message: "경계 여부는 50%에서 5%p 이내인지와 일치해야 해요.",
          path: ["domainScores", index, "isBoundary"],
        });
      }
    });

    const boundaryCount = fixture.domainScores.filter(
      (score) => score.isBoundary,
    ).length;
    if (fixture.kind === "clear" && boundaryCount > 0) {
      context.addIssue({
        code: "custom",
        message: "선명형 fixture에는 경계 축이 없어야 해요.",
        path: ["kind"],
      });
    }
    if (fixture.kind === "boundary" && boundaryCount === 0) {
      context.addIssue({
        code: "custom",
        message: "경계형 fixture에는 경계 축이 하나 이상 있어야 해요.",
        path: ["kind"],
      });
    }
    if (
      fixture.kind === "facet_split" &&
      !fixture.facetScores.some((score) => score.direction === "low")
    ) {
      context.addIssue({
        code: "custom",
        message: "세부 성향 분화형 fixture에는 반대 방향 facet이 필요해요.",
        path: ["facetScores"],
      });
    }

    if (!fixture.availableSignals.includes("domain_scores")) {
      context.addIssue({
        code: "custom",
        message: "모든 성향 fixture에는 domain_scores가 필요해요.",
        path: ["availableSignals"],
      });
    }
    if (
      fixture.facetScores.length > 0 &&
      !fixture.availableSignals.includes("facet_scores")
    ) {
      context.addIssue({
        code: "custom",
        message: "facet 점수가 있으면 facet_scores 신호를 선언해야 해요.",
        path: ["availableSignals"],
      });
    }
  });

export const traitMapEntrySchema = z
  .object({
    claims: z.array(traitKnowledgeClaimSchema).min(1),
    code: nuangCodeSchema,
    contractVersion: z.literal(traitMapKnowledgeContractVersion),
    evidence: z.array(knowledgeEvidenceSchema).min(1),
    longFormCharacterTarget: z.literal(50_000),
    mapVersion: z.string().min(1),
    profileName: z.string().min(1),
    reviews: traitMapReviewSchema,
    sections: z.array(traitMapSectionSchema).min(1),
    status: z.enum(["draft", "in_review", "approved", "published"]),
    updatedAt: z.string().datetime(),
  })
  .superRefine((entry, context) => {
    addDuplicateIssues(
      entry.claims.map((claim) => claim.claimId),
      "claims",
      "claimId",
      context,
    );
    addDuplicateIssues(
      entry.claims.map((claim) => claim.contentKey),
      "claims",
      "contentKey",
      context,
    );
    addDuplicateIssues(
      entry.evidence.map((evidence) => evidence.evidenceId),
      "evidence",
      "evidenceId",
      context,
    );
    addDuplicateIssues(
      entry.sections.map((section) => section.sectionId),
      "sections",
      "sectionId",
      context,
    );

    const claimIds = new Set(entry.claims.map((claim) => claim.claimId));
    const evidenceIds = new Set(
      entry.evidence.map((evidence) => evidence.evidenceId),
    );
    entry.claims.forEach((claim, claimIndex) => {
      claim.evidenceRefs.forEach((evidenceRef) => {
        if (!evidenceIds.has(evidenceRef)) {
          context.addIssue({
            code: "custom",
            message: `claim이 존재하지 않는 evidence ${evidenceRef}을 참조해요.`,
            path: ["claims", claimIndex, "evidenceRefs"],
          });
        }
      });
    });
    entry.sections.forEach((section, sectionIndex) => {
      section.claimRefs.forEach((claimRef) => {
        if (!claimIds.has(claimRef)) {
          context.addIssue({
            code: "custom",
            message: `성향지도 섹션이 존재하지 않는 claim ${claimRef}을 참조해요.`,
            path: ["sections", sectionIndex, "claimRefs"],
          });
        }
      });
    });

    if (entry.status === "approved" || entry.status === "published") {
      const characterCount = entry.sections.reduce(
        (total, section) => total + section.body.replace(/\s/g, "").length,
        0,
      );
      if (characterCount < 45_000 || characterCount > 60_000) {
        context.addIssue({
          code: "custom",
          message: "승인된 성향지도 원문은 공백 제외 45,000~60,000자여야 해요.",
          path: ["sections"],
        });
      }

      const reviewsPassed = Object.values(entry.reviews).every(
        (review) => review === "passed",
      );
      if (!reviewsPassed) {
        context.addIssue({
          code: "custom",
          message: "모든 전문 검토를 통과해야 성향지도를 승인할 수 있어요.",
          path: ["reviews"],
        });
      }
    }
  });

export const pairInteractionRuleSchema = z
  .object({
    comparisonContractVersion: z.literal(comparisonKnowledgeContractVersion),
    contexts: z.array(relationshipContextSchema).min(1),
    derivedFromMapVersions: z.array(z.string().min(1)).min(2),
    frictionClaimRefs: z.array(z.string().min(1)),
    interactionVersion: z.string().min(1),
    promptClaimRefs: z.array(z.string().min(1)),
    ruleId: z.string().min(1),
    strengthClaimRefs: z.array(z.string().min(1)),
    targetCode: nuangCodeSchema,
    viewerCode: nuangCodeSchema,
  })
  .superRefine((rule, context) => {
    const claimRefs = [
      ...rule.strengthClaimRefs,
      ...rule.frictionClaimRefs,
      ...rule.promptClaimRefs,
    ];
    addDuplicateIssues(claimRefs, "claimRefs", "claimRef", context);
  });

function addDuplicateIssues(
  values: string[],
  path: string,
  label: string,
  context: z.RefinementCtx,
) {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      context.addIssue({
        code: "custom",
        message: `중복 ${label}: ${value}`,
        path: [path, index],
      });
    }
    seen.add(value);
  });
}

export type TraitMapEntry = z.infer<typeof traitMapEntrySchema>;
export type PairInteractionRule = z.infer<typeof pairInteractionRuleSchema>;
export type TraitClaimRegistry = z.infer<typeof traitClaimRegistrySchema>;
export type TraitClaimRegistryEntry = z.infer<
  typeof traitClaimRegistryEntrySchema
>;
export type TraitClaimEvidenceStatus = z.infer<
  typeof traitClaimEvidenceStatusSchema
>;
export type TraitKnowledgeSurface = z.infer<typeof traitKnowledgeSurfaceSchema>;
export type TraitProfileFixture = z.infer<typeof traitProfileFixtureSchema>;
export type TraitRequiredSignal = z.infer<typeof traitRequiredSignalSchema>;
