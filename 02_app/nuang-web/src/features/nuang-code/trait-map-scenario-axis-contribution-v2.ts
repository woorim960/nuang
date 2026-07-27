import { z } from "zod";
import {
  traitMapScenarioCatalogV2,
  traitMapV2RelationshipContexts,
  traitMapV2ReviewRoles,
} from "@/features/nuang-code/trait-map-data-center-v2";
import { nuangCodeSchema } from "@/features/nuang-code/trait-map-knowledge-contract";

export const traitMapScenarioAxisContributionContractVersion =
  "nuang-trait-map-scenario-axis-contribution.v2";

export const traitMapScenarioAxisDefinitionsV2 = [
  {
    axisRef: "SE",
    position: 1,
    construct: "SE_energy_and_expression",
    symbols: ["E", "I"],
  },
  {
    axisRef: "OE",
    position: 2,
    construct: "OE_exploration_and_interest",
    symbols: ["R", "N"],
  },
  {
    axisRef: "RO",
    position: 3,
    construct: "RO_relational_attention",
    symbols: ["G", "A"],
  },
  {
    axisRef: "SM",
    position: 4,
    construct: "SM_execution_and_structure",
    symbols: ["K", "M"],
  },
  {
    axisRef: "ER",
    position: 5,
    construct: "ER_emotional_activation_and_worry",
    symbols: ["C", "Q"],
  },
] as const;

export const traitMapScenarioClaimKindsV2 = [
  "attention",
  "first_thought",
  "actual_response",
  "communication",
] as const;

export const traitMapScenarioClassificationStatusesV2 = [
  "unreviewed",
  "candidate_generated",
  "expert_review_required",
  "approved_for_recomposition",
  "rewrite_required",
  "rejected",
] as const;

export const traitMapScenarioLineageResolutionsV2 = [
  "pending",
  "merge_wording",
  "reclassify_axis",
  "author_interaction",
  "preserve_context_variant",
  "reject_variant",
] as const;

const axisRefSchema = z.enum(["SE", "OE", "RO", "SM", "ER"]);
const relationshipContextSchema = z.enum(traitMapV2RelationshipContexts);
const claimKindSchema = z.enum(traitMapScenarioClaimKindsV2);
const reviewStateSchema = z.enum([
  "not_started",
  "in_review",
  "passed",
  "failed",
]);
const reviewsSchema = z.record(
  z.enum(traitMapV2ReviewRoles),
  reviewStateSchema,
);
const riskDomainSchema = z.enum([
  "relationship_outcome",
  "attraction",
  "mental_health",
  "clinical",
  "ability",
  "work_performance",
  "none",
]);
const privacyScopeSchema = z.enum([
  "self_only",
  "comparison_safe",
  "public_safe",
]);

const axisSymbolSchema = z.discriminatedUnion("axisRef", [
  z.object({ axisRef: z.literal("SE"), symbol: z.enum(["E", "I"]) }),
  z.object({ axisRef: z.literal("OE"), symbol: z.enum(["R", "N"]) }),
  z.object({ axisRef: z.literal("RO"), symbol: z.enum(["G", "A"]) }),
  z.object({ axisRef: z.literal("SM"), symbol: z.enum(["K", "M"]) }),
  z.object({ axisRef: z.literal("ER"), symbol: z.enum(["C", "Q"]) }),
]);

export const traitMapScenarioAxisCandidateV2Schema = z.object({
  axisRef: axisRefSchema,
  contribution: z.enum(["primary", "secondary"]),
  confidence: z.enum(["low", "medium", "high"]),
  rationale: z.string().min(10),
  cueEvidence: z.array(z.string().min(1)),
  evidenceFindingRefs: z.array(z.string().regex(/^FND-/)),
  independentSourceRefs: z.array(z.string().regex(/^SRC-/)),
});

export const traitMapScenarioAxisInteractionV2Schema = z
  .object({
    interactionId: z.string().regex(/^INT-SCN-[A-Z0-9-]+$/),
    axisRefs: z.array(axisRefSchema).min(2),
    confidence: z.enum(["low", "medium", "high"]),
    rationale: z.string().min(10),
    evidenceFindingRefs: z.array(z.string().regex(/^FND-/)),
    independentSourceRefs: z.array(z.string().regex(/^SRC-/)),
  })
  .superRefine((interaction, context) => {
    if (new Set(interaction.axisRefs).size !== interaction.axisRefs.length) {
      context.addIssue({
        code: "custom",
        message: "복합축에는 같은 축을 두 번 기록할 수 없어요.",
        path: ["axisRefs"],
      });
    }
  });

export const traitMapScenarioSourceVariantV2Schema = z.object({
  variantId: z.string().regex(/^[a-f0-9]{12}$/),
  assertion: z.string().min(10),
  codes: z.array(nuangCodeSchema).min(1),
  evidenceFindingRefs: z.array(z.string().regex(/^FND-/)),
  independentSourceRefs: z.array(z.string().regex(/^SRC-/)),
});

export const traitMapScenarioCanonicalVariantV2Schema = z.object({
  canonicalVariantId: z.string().regex(/^CAN-SCN-[A-Z0-9-]+$/),
  axisSignature: z.string().min(1),
  axisValues: z.array(axisSymbolSchema),
  assertion: z.string().min(10),
  evidenceFindingRefs: z.array(z.string().regex(/^FND-/)).min(1),
  independentSourceRefs: z.array(z.string().regex(/^SRC-/)).min(1),
  sourceVariantIds: z.array(z.string().regex(/^[a-f0-9]{12}$/)).min(1),
  status: z.enum(["draft", "in_review", "approved", "rejected"]),
  reviews: reviewsSchema,
  publicationState: z.literal("research_only"),
});

export const traitMapScenarioClassificationSignalV2Schema = z.object({
  signalType: z.enum([
    "existing_controlled_pair",
    "lexical_cue",
    "behavioral_contrast",
    "evidence_mapping",
    "profile_distribution",
    "manual_review_note",
  ]),
  axisRef: axisRefSchema.optional(),
  variantIds: z.array(z.string().regex(/^[a-f0-9]{12}$/)),
  detail: z.string().min(1),
});

export const traitMapScenarioAxisDecisionV2Schema = z.object({
  status: z.enum(traitMapScenarioClassificationStatusesV2),
  lineageResolution: z.enum(traitMapScenarioLineageResolutionsV2),
  rationale: z.string().min(1),
  canonicalVariants: z.array(traitMapScenarioCanonicalVariantV2Schema),
  decidedBy: z.array(z.string().min(1)),
  decidedAt: z.string().datetime().optional(),
});

export const traitMapScenarioAxisContributionSlotV2Schema = z
  .object({
    claimKey: z
      .string()
      .regex(
        /^\.scenario\.[a-z_]+\.[a-z_]+\.(attention|communication|process|response)$/,
      ),
    scenarioRef: z.string().regex(/^SCN-[A-Z0-9-]+$/),
    context: relationshipContextSchema,
    claimKind: claimKindSchema,
    privacyScope: privacyScopeSchema,
    riskDomains: z.array(riskDomainSchema).min(1),
    currentControlledAxes: z.array(axisRefSchema),
    candidateSemanticAxes: z.array(traitMapScenarioAxisCandidateV2Schema),
    candidateInteractions: z.array(traitMapScenarioAxisInteractionV2Schema),
    classificationSignals: z.array(
      traitMapScenarioClassificationSignalV2Schema,
    ),
    anchorVariants: z.array(traitMapScenarioSourceVariantV2Schema).min(1),
    decision: traitMapScenarioAxisDecisionV2Schema,
    reviews: reviewsSchema,
    publicationState: z.literal("research_only"),
  })
  .superRefine((slot, context) => {
    const currentAxes = slot.currentControlledAxes;
    const semanticAxes = slot.candidateSemanticAxes.map(
      (candidate) => candidate.axisRef,
    );
    const sourceVariantIds = new Set(
      slot.anchorVariants.map((variant) => variant.variantId),
    );
    const highRisk = slot.riskDomains.some((risk) => risk !== "none");
    const approved = slot.decision.status === "approved_for_recomposition";

    addDuplicateIssue(currentAxes, context, ["currentControlledAxes"]);
    addDuplicateIssue(semanticAxes, context, ["candidateSemanticAxes"]);

    if (slot.riskDomains.includes("none") && slot.riskDomains.length !== 1) {
      context.addIssue({
        code: "custom",
        message: "위험 없음(none)은 다른 위험 영역과 함께 기록할 수 없어요.",
        path: ["riskDomains"],
      });
    }
    if (
      (slot.claimKind === "first_thought" ||
        slot.claimKind === "actual_response") &&
      slot.privacyScope !== "self_only"
    ) {
      context.addIssue({
        code: "custom",
        message:
          "처음 드는 생각과 실제 나타나는 반응은 본인 전용으로 시작해요.",
        path: ["privacyScope"],
      });
    }
    for (const interaction of slot.candidateInteractions) {
      for (const axisRef of interaction.axisRefs) {
        if (!semanticAxes.includes(axisRef)) {
          context.addIssue({
            code: "custom",
            message: "복합축은 먼저 의미 축 후보에 포함되어야 해요.",
            path: ["candidateInteractions"],
          });
        }
      }
    }

    const expectedCanonicalVariants = Math.max(1, 2 ** semanticAxes.length);
    const canonicalSignatures = slot.decision.canonicalVariants.map(
      (variant) => variant.axisSignature,
    );
    addDuplicateIssue(canonicalSignatures, context, [
      "decision",
      "canonicalVariants",
    ]);

    for (const [
      variantIndex,
      variant,
    ] of slot.decision.canonicalVariants.entries()) {
      const variantAxes = variant.axisValues.map((value) => value.axisRef);
      addDuplicateIssue(variantAxes, context, [
        "decision",
        "canonicalVariants",
        variantIndex,
        "axisValues",
      ]);
      if (
        variantAxes.length !== semanticAxes.length ||
        !semanticAxes.every((axisRef) => variantAxes.includes(axisRef))
      ) {
        context.addIssue({
          code: "custom",
          message:
            "canonical 문장은 확정된 의미 축의 조합을 정확히 기록해야 해요.",
          path: ["decision", "canonicalVariants", variantIndex, "axisValues"],
        });
      }
      if (
        variant.sourceVariantIds.some(
          (variantId) => !sourceVariantIds.has(variantId),
        )
      ) {
        context.addIssue({
          code: "custom",
          message:
            "canonical 문장은 이 슬롯의 원문 변형만 계보로 참조할 수 있어요.",
          path: [
            "decision",
            "canonicalVariants",
            variantIndex,
            "sourceVariantIds",
          ],
        });
      }
      if (highRisk && approved && variant.independentSourceRefs.length < 2) {
        context.addIssue({
          code: "custom",
          message:
            "고위험 canonical 문장에는 독립 근거 자료가 2개 이상 필요해요.",
          path: [
            "decision",
            "canonicalVariants",
            variantIndex,
            "independentSourceRefs",
          ],
        });
      }
      if (
        approved &&
        (variant.status !== "approved" ||
          Object.values(variant.reviews).some((review) => review !== "passed"))
      ) {
        context.addIssue({
          code: "custom",
          message: "재합성 승인 시 모든 canonical 문장 검토가 끝나야 해요.",
          path: ["decision", "canonicalVariants", variantIndex],
        });
      }
    }

    if (approved) {
      if (slot.decision.lineageResolution === "pending") {
        context.addIssue({
          code: "custom",
          message: "계보 변형 처리 방식을 결정해야 재합성을 승인할 수 있어요.",
          path: ["decision", "lineageResolution"],
        });
      }
      if (
        slot.anchorVariants.length > 1 &&
        semanticAxes.length === 0 &&
        slot.decision.lineageResolution !== "merge_wording" &&
        slot.decision.lineageResolution !== "reject_variant" &&
        slot.decision.lineageResolution !== "preserve_context_variant"
      ) {
        context.addIssue({
          code: "custom",
          message:
            "축이 없는 복수 원문은 병합·제외·맥락 보존 중 하나를 명시해야 해요.",
          path: ["decision", "lineageResolution"],
        });
      }
      if (
        slot.decision.canonicalVariants.length !== expectedCanonicalVariants
      ) {
        context.addIssue({
          code: "custom",
          message: `확정된 ${semanticAxes.length}개 축에는 ${expectedCanonicalVariants}개 조합 문장이 필요해요.`,
          path: ["decision", "canonicalVariants"],
        });
      }
      if (Object.values(slot.reviews).some((review) => review !== "passed")) {
        context.addIssue({
          code: "custom",
          message: "7개 필수 검토를 모두 통과해야 재합성을 승인할 수 있어요.",
          path: ["reviews"],
        });
      }
      if (
        highRisk &&
        (slot.reviews.clinical_safety !== "passed" ||
          slot.reviews.relationship_psychology !== "passed")
      ) {
        context.addIssue({
          code: "custom",
          message: "고위험 슬롯에는 임상 안전과 관계 심리 검토가 필요해요.",
          path: ["reviews"],
        });
      }
    }
  });

export const traitMapScenarioAxisContributionManifestV2Schema = z
  .object({
    contractVersion: z.literal(traitMapScenarioAxisContributionContractVersion),
    manifestId: z.string().regex(/^TRAIT-MAP-AXIS-CONTRIBUTION\.[0-9.]+$/),
    sourceQueueId: z.string().min(1),
    status: z.enum([
      "classification_in_progress",
      "expert_review_required",
      "approved_for_recomposition",
    ]),
    generatedAt: z.string().datetime(),
    slots: z.array(traitMapScenarioAxisContributionSlotV2Schema).length(288),
    publicationState: z.literal("research_only"),
  })
  .superRefine((manifest, context) => {
    const claimKeys = manifest.slots.map((slot) => slot.claimKey);
    addDuplicateIssue(claimKeys, context, ["slots"]);

    const canonicalScenarioIds = new Set(
      traitMapScenarioCatalogV2.map((scenario) => scenario.scenarioId),
    );
    const slotsByScenario = new Map<
      string,
      (typeof manifest.slots)[number][]
    >();
    for (const [slotIndex, slot] of manifest.slots.entries()) {
      if (!canonicalScenarioIds.has(slot.scenarioRef)) {
        context.addIssue({
          code: "custom",
          message: "정식 72개 상황에 없는 상황 ID예요.",
          path: ["slots", slotIndex, "scenarioRef"],
        });
      }
      const scenario = traitMapScenarioCatalogV2.find(
        (item) => item.scenarioId === slot.scenarioRef,
      );
      if (scenario && scenario.relationshipContext !== slot.context) {
        context.addIssue({
          code: "custom",
          message: "상황 ID와 관계 맥락이 일치하지 않아요.",
          path: ["slots", slotIndex, "context"],
        });
      }
      const items = slotsByScenario.get(slot.scenarioRef) ?? [];
      items.push(slot);
      slotsByScenario.set(slot.scenarioRef, items);
    }

    for (const scenario of traitMapScenarioCatalogV2) {
      const scenarioSlots = slotsByScenario.get(scenario.scenarioId) ?? [];
      const kinds = scenarioSlots.map((slot) => slot.claimKind);
      if (
        scenarioSlots.length !== traitMapScenarioClaimKindsV2.length ||
        !traitMapScenarioClaimKindsV2.every((kind) => kinds.includes(kind))
      ) {
        context.addIssue({
          code: "custom",
          message: `${scenario.scenarioId}에는 4개 관찰 채널이 모두 필요해요.`,
          path: ["slots"],
        });
      }
    }

    if (
      manifest.status === "approved_for_recomposition" &&
      manifest.slots.some(
        (slot) => slot.decision.status !== "approved_for_recomposition",
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "288개 슬롯이 모두 승인되어야 재합성 manifest를 승인할 수 있어요.",
        path: ["status"],
      });
    }
  });

function addDuplicateIssue(
  values: readonly string[],
  context: z.RefinementCtx,
  path: (string | number)[],
) {
  if (new Set(values).size !== values.length) {
    context.addIssue({
      code: "custom",
      message: "같은 값을 중복 기록할 수 없어요.",
      path,
    });
  }
}

export type TraitMapScenarioAxisCandidateV2 = z.infer<
  typeof traitMapScenarioAxisCandidateV2Schema
>;
export type TraitMapScenarioAxisContributionSlotV2 = z.infer<
  typeof traitMapScenarioAxisContributionSlotV2Schema
>;
export type TraitMapScenarioAxisContributionManifestV2 = z.infer<
  typeof traitMapScenarioAxisContributionManifestV2Schema
>;
