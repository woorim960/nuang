import { describe, expect, it } from "vitest";
import {
  getCanonicalScenarioAssertionForCodeV2,
  getScenarioAxisCombinationsV2,
  getScenarioAxisSignatureForCodeV2,
  traitMapScenarioCanonicalCompositionContractVersion,
  traitMapScenarioCanonicalCompositionPacketV2Schema,
} from "@/features/nuang-code/trait-map-scenario-canonical-composition-v2";

const passedReviews = {
  personality_psychology: "passed",
  psychometrics: "passed",
  relationship_psychology: "passed",
  clinical_safety: "passed",
  plain_korean: "passed",
  product: "passed",
  design: "passed",
} as const;

function canonicalVariant(symbol: "G" | "A", sourceVariantId: string) {
  return {
    canonicalVariantId: `CAN-SCN-FAMILY-12-RO-${symbol}`,
    axisSignature: `RO=${symbol}`,
    axisValues: [{ axisRef: "RO", symbol }],
    assertion:
      symbol === "G"
        ? "가족 갈등 뒤 풀리지 않은 문제와 다음 해결 기준을 되짚어요."
        : "가족 갈등 뒤 남은 감정과 다시 정할 약속을 살펴요.",
    semanticUnitRefs: [
      "UNIT-SCN-FAMILY-12-CONTEXT",
      `UNIT-SCN-FAMILY-12-RO-${symbol}`,
    ],
    sourceVariantIds: [sourceVariantId],
    evidenceFindingRefs: ["FND-SUPPORT-MATCHING-CONTEXT"],
    independentSourceRefs: ["SRC-SUPPORT-1", "SRC-SUPPORT-2"],
    status: "approved",
    reviews: passedReviews,
    publicationState: "research_only",
  };
}

function buildApprovedPacket(overrides: Record<string, unknown> = {}) {
  return {
    contractVersion: traitMapScenarioCanonicalCompositionContractVersion,
    packetId: "COMPOSE-SCN-FAMILY-12-ATTENTION",
    claimKey: ".scenario.family.aftermath.attention",
    scenarioRef: "SCN-FAMILY-12",
    context: "family",
    claimKind: "attention",
    privacyScope: "self_only",
    riskDomains: ["relationship_outcome"],
    axisDecisionStatus: "approved_for_recomposition",
    semanticAxes: ["RO"],
    contextInvariantCore:
      "가족 갈등이나 큰일이 지나간 뒤 무엇이 남았는지 되짚어요.",
    sourceVariants: [
      {
        variantId: "1aec2e3995da",
        assertion:
          "가족 갈등이 지나간 뒤 실제로 일어난 순서와 풀리지 않은 문제를 되짚어요.",
        codes: ["IRGMC"],
        evidenceFindingRefs: ["FND-SUPPORT-MATCHING-CONTEXT"],
        independentSourceRefs: ["SRC-SUPPORT-1", "SRC-SUPPORT-2"],
      },
      {
        variantId: "e1b2bd08f6f5",
        assertion:
          "가족 갈등이 지나간 뒤 분위기와 남은 감정, 다시 정할 약속을 살펴요.",
        codes: ["ENAKQ"],
        evidenceFindingRefs: ["FND-SUPPORT-MATCHING-CONTEXT"],
        independentSourceRefs: ["SRC-SUPPORT-1", "SRC-SUPPORT-2"],
      },
    ],
    semanticUnits: [
      {
        semanticUnitId: "UNIT-SCN-FAMILY-12-CONTEXT",
        text: "가족 갈등이 지나간 뒤 남은 것을 되짚는다.",
        unitKind: "context_invariant",
        resolution: "rewrite_for_plain_korean",
        appliesToSignatures: ["RO=G", "RO=A"],
        sourceVariantIds: ["1aec2e3995da", "e1b2bd08f6f5"],
        evidenceFindingRefs: ["FND-SUPPORT-MATCHING-CONTEXT"],
        independentSourceRefs: ["SRC-SUPPORT-1", "SRC-SUPPORT-2"],
        rationale: "두 원문에 공통으로 남아야 하는 상황 핵심이에요.",
      },
      {
        semanticUnitId: "UNIT-SCN-FAMILY-12-RO-G",
        text: "풀리지 않은 문제와 해결 기준을 살핀다.",
        unitKind: "axis_pole",
        resolution: "retain",
        appliesToSignatures: ["RO=G"],
        sourceVariantIds: ["1aec2e3995da"],
        evidenceFindingRefs: ["FND-SUPPORT-MATCHING-CONTEXT"],
        independentSourceRefs: ["SRC-SUPPORT-1", "SRC-SUPPORT-2"],
        rationale: "G 방향의 문제 해결 초점을 보존해요.",
      },
      {
        semanticUnitId: "UNIT-SCN-FAMILY-12-RO-A",
        text: "남은 감정과 관계 회복 약속을 살핀다.",
        unitKind: "axis_pole",
        resolution: "retain",
        appliesToSignatures: ["RO=A"],
        sourceVariantIds: ["e1b2bd08f6f5"],
        evidenceFindingRefs: ["FND-SUPPORT-MATCHING-CONTEXT"],
        independentSourceRefs: ["SRC-SUPPORT-1", "SRC-SUPPORT-2"],
        rationale: "A 방향의 감정과 관계 초점을 보존해요.",
      },
    ],
    canonicalVariants: [
      canonicalVariant("G", "1aec2e3995da"),
      canonicalVariant("A", "e1b2bd08f6f5"),
    ],
    lineageResolutions: [
      {
        sourceVariantId: "1aec2e3995da",
        resolution: "rewritten",
        canonicalVariantIds: ["CAN-SCN-FAMILY-12-RO-G"],
        rationale: "문제 해결 초점을 쉬운 한국어로 다듬어 보존했어요.",
      },
      {
        sourceVariantId: "e1b2bd08f6f5",
        resolution: "rewritten",
        canonicalVariantIds: ["CAN-SCN-FAMILY-12-RO-A"],
        rationale: "관계 회복 초점을 쉬운 한국어로 다듬어 보존했어요.",
      },
    ],
    status: "approved_for_profile_regeneration",
    reviews: passedReviews,
    publicationState: "research_only",
    ...overrides,
  };
}

describe("trait-map canonical scenario composition v2", () => {
  it("enumerates binary combinations in the fixed five-axis order", () => {
    expect(getScenarioAxisCombinationsV2(["RO", "SE"])).toEqual([
      {
        axisSignature: "SE=E|RO=G",
        axisValues: [
          { axisRef: "SE", symbol: "E" },
          { axisRef: "RO", symbol: "G" },
        ],
      },
      {
        axisSignature: "SE=E|RO=A",
        axisValues: [
          { axisRef: "SE", symbol: "E" },
          { axisRef: "RO", symbol: "A" },
        ],
      },
      {
        axisSignature: "SE=I|RO=G",
        axisValues: [
          { axisRef: "SE", symbol: "I" },
          { axisRef: "RO", symbol: "G" },
        ],
      },
      {
        axisSignature: "SE=I|RO=A",
        axisValues: [
          { axisRef: "SE", symbol: "I" },
          { axisRef: "RO", symbol: "A" },
        ],
      },
    ]);
  });

  it("selects the same canonical assertion only from the code signature", () => {
    const packet = traitMapScenarioCanonicalCompositionPacketV2Schema.parse(
      buildApprovedPacket(),
    );

    expect(getScenarioAxisSignatureForCodeV2("ENAKQ", ["RO"])).toBe("RO=A");
    expect(
      getCanonicalScenarioAssertionForCodeV2(packet, "ENAKQ")
        ?.canonicalVariantId,
    ).toBe("CAN-SCN-FAMILY-12-RO-A");
    expect(
      getCanonicalScenarioAssertionForCodeV2(packet, "IRAMQ")
        ?.canonicalVariantId,
    ).toBe("CAN-SCN-FAMILY-12-RO-A");
  });

  it("accepts a fully traced and reviewed composition packet", () => {
    expect(() =>
      traitMapScenarioCanonicalCompositionPacketV2Schema.parse(
        buildApprovedPacket(),
      ),
    ).not.toThrow();
  });

  it("blocks approval when one binary combination is missing", () => {
    const packet = buildApprovedPacket();
    const result = traitMapScenarioCanonicalCompositionPacketV2Schema.safeParse(
      {
        ...packet,
        canonicalVariants: [packet.canonicalVariants[0]],
      },
    );

    expect(result.success).toBe(false);
  });

  it("blocks approval when a source variant has no lineage decision", () => {
    const packet = buildApprovedPacket();
    const result = traitMapScenarioCanonicalCompositionPacketV2Schema.safeParse(
      {
        ...packet,
        lineageResolutions: [packet.lineageResolutions[0]],
      },
    );

    expect(result.success).toBe(false);
  });

  it("blocks a high-risk canonical assertion with one independent source", () => {
    const packet = buildApprovedPacket();
    const result = traitMapScenarioCanonicalCompositionPacketV2Schema.safeParse(
      {
        ...packet,
        canonicalVariants: packet.canonicalVariants.map((variant) => ({
          ...variant,
          independentSourceRefs: ["SRC-SUPPORT-1"],
        })),
      },
    );

    expect(result.success).toBe(false);
  });
});
