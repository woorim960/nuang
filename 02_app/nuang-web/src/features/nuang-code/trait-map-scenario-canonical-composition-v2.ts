import { z } from "zod";
import {
  traitMapScenarioAxisDefinitionsV2,
  traitMapScenarioSourceVariantV2Schema,
} from "@/features/nuang-code/trait-map-scenario-axis-contribution-v2";
import {
  traitMapV2RelationshipContexts,
  traitMapV2ReviewRoles,
} from "@/features/nuang-code/trait-map-data-center-v2";
import { nuangCodeSchema } from "@/features/nuang-code/trait-map-knowledge-contract";

export const traitMapScenarioCanonicalCompositionContractVersion =
  "nuang-trait-map-scenario-canonical-composition.v2";

const axisRefSchema = z.enum(["SE", "OE", "RO", "SM", "ER"]);
const relationshipContextSchema = z.enum(traitMapV2RelationshipContexts);
const claimKindSchema = z.enum([
  "attention",
  "first_thought",
  "actual_response",
  "communication",
]);
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
const privacyScopeSchema = z.enum([
  "self_only",
  "comparison_safe",
  "public_safe",
]);
const riskDomainSchema = z.enum([
  "relationship_outcome",
  "attraction",
  "mental_health",
  "clinical",
  "ability",
  "work_performance",
  "none",
]);
const axisSymbolSchema = z.discriminatedUnion("axisRef", [
  z.object({ axisRef: z.literal("SE"), symbol: z.enum(["E", "I"]) }),
  z.object({ axisRef: z.literal("OE"), symbol: z.enum(["R", "N"]) }),
  z.object({ axisRef: z.literal("RO"), symbol: z.enum(["G", "A"]) }),
  z.object({ axisRef: z.literal("SM"), symbol: z.enum(["K", "M"]) }),
  z.object({ axisRef: z.literal("ER"), symbol: z.enum(["C", "Q"]) }),
]);

export type TraitMapScenarioAxisRefV2 = z.infer<typeof axisRefSchema>;
export type TraitMapScenarioAxisValueV2 = z.infer<typeof axisSymbolSchema>;

export const traitMapScenarioSemanticUnitV2Schema = z
  .object({
    semanticUnitId: z.string().regex(/^UNIT-SCN-[A-Z0-9-]+$/),
    text: z.string().min(3),
    unitKind: z.enum([
      "context_invariant",
      "axis_pole",
      "axis_interaction",
      "safety_boundary",
    ]),
    resolution: z.enum([
      "retain",
      "rewrite_for_plain_korean",
      "drop_duplicate",
      "drop_unsupported",
    ]),
    appliesToSignatures: z.array(z.string().min(1)),
    sourceVariantIds: z.array(z.string().regex(/^[a-f0-9]{12}$/)).min(1),
    evidenceFindingRefs: z.array(z.string().regex(/^FND-/)),
    independentSourceRefs: z.array(z.string().regex(/^SRC-/)),
    rationale: z.string().min(10),
  })
  .superRefine((unit, context) => {
    const dropped =
      unit.resolution === "drop_duplicate" ||
      unit.resolution === "drop_unsupported";
    if (dropped && unit.appliesToSignatures.length > 0) {
      context.addIssue({
        code: "custom",
        message: "제외한 의미 단위는 canonical 조합에 적용할 수 없어요.",
        path: ["appliesToSignatures"],
      });
    }
    if (!dropped && unit.appliesToSignatures.length === 0) {
      context.addIssue({
        code: "custom",
        message: "유지한 의미 단위에는 적용할 축 조합이 필요해요.",
        path: ["appliesToSignatures"],
      });
    }
  });

export const traitMapScenarioCanonicalAssertionV2Schema = z.object({
  canonicalVariantId: z.string().regex(/^CAN-SCN-[A-Z0-9-]+$/),
  axisSignature: z.string().min(1),
  axisValues: z.array(axisSymbolSchema),
  assertion: z.string().min(10),
  semanticUnitRefs: z.array(z.string().regex(/^UNIT-SCN-/)).min(1),
  sourceVariantIds: z.array(z.string().regex(/^[a-f0-9]{12}$/)).min(1),
  evidenceFindingRefs: z.array(z.string().regex(/^FND-/)).min(1),
  independentSourceRefs: z.array(z.string().regex(/^SRC-/)).min(1),
  status: z.enum(["draft", "in_review", "approved", "rejected"]),
  reviews: reviewsSchema,
  publicationState: z.literal("research_only"),
});

export const traitMapScenarioVariantLineageResolutionV2Schema = z.object({
  sourceVariantId: z.string().regex(/^[a-f0-9]{12}$/),
  resolution: z.enum([
    "retained",
    "merged",
    "rewritten",
    "dropped_duplicate",
    "dropped_unsupported",
  ]),
  canonicalVariantIds: z.array(z.string().regex(/^CAN-SCN-/)),
  rationale: z.string().min(10),
});

export const traitMapScenarioCanonicalCompositionPacketV2Schema = z
  .object({
    contractVersion: z.literal(
      traitMapScenarioCanonicalCompositionContractVersion,
    ),
    packetId: z.string().regex(/^COMPOSE-SCN-[A-Z0-9-]+$/),
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
    axisDecisionStatus: z.literal("approved_for_recomposition"),
    semanticAxes: z.array(axisRefSchema),
    contextInvariantCore: z.string().min(10),
    sourceVariants: z.array(traitMapScenarioSourceVariantV2Schema).min(1),
    semanticUnits: z.array(traitMapScenarioSemanticUnitV2Schema).min(1),
    canonicalVariants: z.array(traitMapScenarioCanonicalAssertionV2Schema),
    lineageResolutions: z.array(
      traitMapScenarioVariantLineageResolutionV2Schema,
    ),
    status: z.enum([
      "draft",
      "in_review",
      "approved_for_profile_regeneration",
      "rejected",
    ]),
    reviews: reviewsSchema,
    publicationState: z.literal("research_only"),
  })
  .superRefine((packet, context) => {
    const semanticAxes = sortAxisRefsV2(packet.semanticAxes);
    const expectedCombinations = getScenarioAxisCombinationsV2(semanticAxes);
    const expectedSignatures = new Set(
      expectedCombinations.map((combination) => combination.axisSignature),
    );
    const sourceVariantIds = packet.sourceVariants.map(
      (variant) => variant.variantId,
    );
    const semanticUnitIds = packet.semanticUnits.map(
      (unit) => unit.semanticUnitId,
    );
    const canonicalVariantIds = packet.canonicalVariants.map(
      (variant) => variant.canonicalVariantId,
    );
    const canonicalSignatures = packet.canonicalVariants.map(
      (variant) => variant.axisSignature,
    );
    const highRisk = packet.riskDomains.some((risk) => risk !== "none");
    const approved = packet.status === "approved_for_profile_regeneration";

    addDuplicateIssue(packet.semanticAxes, context, ["semanticAxes"]);
    addDuplicateIssue(sourceVariantIds, context, ["sourceVariants"]);
    addDuplicateIssue(semanticUnitIds, context, ["semanticUnits"]);
    addDuplicateIssue(canonicalVariantIds, context, ["canonicalVariants"]);
    addDuplicateIssue(canonicalSignatures, context, ["canonicalVariants"]);

    if (
      packet.riskDomains.includes("none") &&
      packet.riskDomains.length !== 1
    ) {
      context.addIssue({
        code: "custom",
        message: "위험 없음(none)은 다른 위험 영역과 함께 기록할 수 없어요.",
        path: ["riskDomains"],
      });
    }
    if (
      (packet.claimKind === "first_thought" ||
        packet.claimKind === "actual_response") &&
      packet.privacyScope !== "self_only"
    ) {
      context.addIssue({
        code: "custom",
        message: "처음 드는 생각과 실제 나타나는 반응은 본인 전용이에요.",
        path: ["privacyScope"],
      });
    }

    for (const [unitIndex, unit] of packet.semanticUnits.entries()) {
      for (const signature of unit.appliesToSignatures) {
        if (!expectedSignatures.has(signature)) {
          context.addIssue({
            code: "custom",
            message: "확정된 축에서 만들 수 없는 조합 서명이에요.",
            path: ["semanticUnits", unitIndex, "appliesToSignatures"],
          });
        }
      }
      if (
        unit.sourceVariantIds.some(
          (variantId) => !sourceVariantIds.includes(variantId),
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "의미 단위는 이 패킷의 원문 변형만 참조할 수 있어요.",
          path: ["semanticUnits", unitIndex, "sourceVariantIds"],
        });
      }
    }

    for (const [variantIndex, variant] of packet.canonicalVariants.entries()) {
      if (!expectedSignatures.has(variant.axisSignature)) {
        context.addIssue({
          code: "custom",
          message: "확정된 축에서 만들 수 없는 canonical 조합이에요.",
          path: ["canonicalVariants", variantIndex, "axisSignature"],
        });
      }
      const normalizedValues = sortAxisValuesV2(variant.axisValues);
      const computedSignature = createScenarioAxisSignatureV2(normalizedValues);
      if (
        computedSignature !== variant.axisSignature ||
        normalizedValues.length !== semanticAxes.length ||
        !semanticAxes.every((axisRef) =>
          normalizedValues.some((value) => value.axisRef === axisRef),
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "축 값과 canonical 조합 서명이 일치하지 않아요.",
          path: ["canonicalVariants", variantIndex, "axisValues"],
        });
      }
      if (
        variant.semanticUnitRefs.some(
          (unitId) => !semanticUnitIds.includes(unitId),
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "등록되지 않은 의미 단위를 참조하고 있어요.",
          path: ["canonicalVariants", variantIndex, "semanticUnitRefs"],
        });
      }
      if (
        variant.sourceVariantIds.some(
          (variantId) => !sourceVariantIds.includes(variantId),
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "이 패킷에 없는 원문 변형을 참조하고 있어요.",
          path: ["canonicalVariants", variantIndex, "sourceVariantIds"],
        });
      }
      if (highRisk && approved && variant.independentSourceRefs.length < 2) {
        context.addIssue({
          code: "custom",
          message: "고위험 canonical 문장에는 독립 근거가 2개 이상 필요해요.",
          path: ["canonicalVariants", variantIndex, "independentSourceRefs"],
        });
      }
      if (
        approved &&
        (variant.status !== "approved" ||
          Object.values(variant.reviews).some((review) => review !== "passed"))
      ) {
        context.addIssue({
          code: "custom",
          message: "재생성 승인 전 canonical 문장 검토를 모두 끝내야 해요.",
          path: ["canonicalVariants", variantIndex],
        });
      }
    }

    const lineageIds = packet.lineageResolutions.map(
      (resolution) => resolution.sourceVariantId,
    );
    addDuplicateIssue(lineageIds, context, ["lineageResolutions"]);
    for (const [
      lineageIndex,
      resolution,
    ] of packet.lineageResolutions.entries()) {
      if (!sourceVariantIds.includes(resolution.sourceVariantId)) {
        context.addIssue({
          code: "custom",
          message: "이 패킷에 없는 원문 변형의 처리 기록이에요.",
          path: ["lineageResolutions", lineageIndex, "sourceVariantId"],
        });
      }
      if (
        resolution.canonicalVariantIds.some(
          (variantId) => !canonicalVariantIds.includes(variantId),
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "존재하지 않는 canonical 문장을 계보에 연결했어요.",
          path: ["lineageResolutions", lineageIndex, "canonicalVariantIds"],
        });
      }
      const dropped =
        resolution.resolution === "dropped_duplicate" ||
        resolution.resolution === "dropped_unsupported";
      if (
        (dropped && resolution.canonicalVariantIds.length > 0) ||
        (!dropped && resolution.canonicalVariantIds.length === 0)
      ) {
        context.addIssue({
          code: "custom",
          message: "원문 처리 방식과 canonical 연결이 일치하지 않아요.",
          path: ["lineageResolutions", lineageIndex],
        });
      }
    }

    if (approved) {
      if (
        packet.canonicalVariants.length !== expectedCombinations.length ||
        !expectedCombinations.every((combination) =>
          canonicalSignatures.includes(combination.axisSignature),
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "모든 이진 축 조합의 canonical 문장이 필요해요.",
          path: ["canonicalVariants"],
        });
      }
      if (
        packet.semanticAxes.length > 0 &&
        new Set(packet.canonicalVariants.map((variant) => variant.assertion))
          .size !== packet.canonicalVariants.length
      ) {
        context.addIssue({
          code: "custom",
          message: "서로 다른 축 조합을 같은 문장으로 승인할 수 없어요.",
          path: ["canonicalVariants"],
        });
      }
      if (
        sourceVariantIds.length !== lineageIds.length ||
        sourceVariantIds.some((variantId) => !lineageIds.includes(variantId))
      ) {
        context.addIssue({
          code: "custom",
          message: "모든 원문 변형의 유지·병합·수정·제외 기록이 필요해요.",
          path: ["lineageResolutions"],
        });
      }
      for (const unit of packet.semanticUnits) {
        const dropped =
          unit.resolution === "drop_duplicate" ||
          unit.resolution === "drop_unsupported";
        if (dropped) continue;
        for (const signature of unit.appliesToSignatures) {
          const canonical = packet.canonicalVariants.find(
            (variant) => variant.axisSignature === signature,
          );
          if (
            !canonical ||
            !canonical.semanticUnitRefs.includes(unit.semanticUnitId)
          ) {
            context.addIssue({
              code: "custom",
              message: "유지하기로 한 의미 단위가 canonical 문장에서 빠졌어요.",
              path: ["semanticUnits"],
            });
          }
        }
      }
      if (Object.values(packet.reviews).some((review) => review !== "passed")) {
        context.addIssue({
          code: "custom",
          message:
            "7개 필수 검토를 모두 통과해야 원장 재생성을 승인할 수 있어요.",
          path: ["reviews"],
        });
      }
    }
  });

export const traitMapScenarioCanonicalCompositionManifestV2Schema = z
  .object({
    contractVersion: z.literal(
      traitMapScenarioCanonicalCompositionContractVersion,
    ),
    manifestId: z.string().regex(/^TRAIT-MAP-CANONICAL-COMPOSITION\.[0-9.]+$/),
    sourceAxisManifestId: z.string().min(1),
    status: z.enum(["draft", "in_review", "approved_for_profile_regeneration"]),
    packets: z.array(traitMapScenarioCanonicalCompositionPacketV2Schema),
    publicationState: z.literal("research_only"),
  })
  .superRefine((manifest, context) => {
    const claimKeys = manifest.packets.map((packet) => packet.claimKey);
    addDuplicateIssue(claimKeys, context, ["packets"]);
    if (
      manifest.status === "approved_for_profile_regeneration" &&
      (manifest.packets.length !== 288 ||
        manifest.packets.some(
          (packet) => packet.status !== "approved_for_profile_regeneration",
        ))
    ) {
      context.addIssue({
        code: "custom",
        message: "288개 패킷이 모두 승인되어야 32개 원장을 재생성할 수 있어요.",
        path: ["status"],
      });
    }
  });

export function sortAxisRefsV2(axisRefs: readonly TraitMapScenarioAxisRefV2[]) {
  return [...axisRefs].sort(
    (left, right) => axisPosition(left) - axisPosition(right),
  );
}

export function sortAxisValuesV2(
  values: readonly TraitMapScenarioAxisValueV2[],
) {
  return [...values].sort(
    (left, right) => axisPosition(left.axisRef) - axisPosition(right.axisRef),
  );
}

export function createScenarioAxisSignatureV2(
  values: readonly TraitMapScenarioAxisValueV2[],
) {
  const normalized = sortAxisValuesV2(values);
  return normalized.length === 0
    ? "COMMON"
    : normalized.map((value) => `${value.axisRef}=${value.symbol}`).join("|");
}

export function getScenarioAxisCombinationsV2(
  axisRefs: readonly TraitMapScenarioAxisRefV2[],
) {
  const sortedAxes = sortAxisRefsV2(axisRefs);
  let combinations: TraitMapScenarioAxisValueV2[][] = [[]];
  for (const axisRef of sortedAxes) {
    const definition = traitMapScenarioAxisDefinitionsV2.find(
      (axis) => axis.axisRef === axisRef,
    );
    if (!definition) continue;
    combinations = combinations.flatMap((combination) =>
      definition.symbols.map((symbol) => [
        ...combination,
        { axisRef, symbol } as TraitMapScenarioAxisValueV2,
      ]),
    );
  }
  return combinations.map((axisValues) => ({
    axisSignature: createScenarioAxisSignatureV2(axisValues),
    axisValues,
  }));
}

export function getScenarioAxisSignatureForCodeV2(
  code: z.infer<typeof nuangCodeSchema>,
  axisRefs: readonly TraitMapScenarioAxisRefV2[],
) {
  const values = sortAxisRefsV2(axisRefs).map((axisRef) => {
    const definition = traitMapScenarioAxisDefinitionsV2.find(
      (axis) => axis.axisRef === axisRef,
    );
    return {
      axisRef,
      symbol: code[
        definition!.position - 1
      ] as TraitMapScenarioAxisValueV2["symbol"],
    } as TraitMapScenarioAxisValueV2;
  });
  return createScenarioAxisSignatureV2(values);
}

export function getCanonicalScenarioAssertionForCodeV2(
  packet: z.infer<typeof traitMapScenarioCanonicalCompositionPacketV2Schema>,
  code: z.infer<typeof nuangCodeSchema>,
) {
  const signature = getScenarioAxisSignatureForCodeV2(
    code,
    packet.semanticAxes,
  );
  return packet.canonicalVariants.find(
    (variant) => variant.axisSignature === signature,
  );
}

function axisPosition(axisRef: TraitMapScenarioAxisRefV2) {
  return (
    traitMapScenarioAxisDefinitionsV2.find((axis) => axis.axisRef === axisRef)
      ?.position ?? Number.MAX_SAFE_INTEGER
  );
}

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

export type TraitMapScenarioCanonicalCompositionPacketV2 = z.infer<
  typeof traitMapScenarioCanonicalCompositionPacketV2Schema
>;
export type TraitMapScenarioCanonicalCompositionManifestV2 = z.infer<
  typeof traitMapScenarioCanonicalCompositionManifestV2Schema
>;
