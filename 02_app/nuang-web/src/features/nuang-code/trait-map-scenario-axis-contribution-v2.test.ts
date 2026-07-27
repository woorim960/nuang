import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  traitMapScenarioAxisContributionContractVersion,
  traitMapScenarioAxisContributionManifestV2Schema,
  traitMapScenarioAxisContributionSlotV2Schema,
  traitMapScenarioClaimKindsV2,
} from "@/features/nuang-code/trait-map-scenario-axis-contribution-v2";
import { traitMapScenarioCatalogV2 } from "@/features/nuang-code/trait-map-data-center-v2";

const passedReviews = {
  personality_psychology: "passed",
  psychometrics: "passed",
  relationship_psychology: "passed",
  clinical_safety: "passed",
  plain_korean: "passed",
  product: "passed",
  design: "passed",
} as const;

const pendingReviews = {
  personality_psychology: "not_started",
  psychometrics: "not_started",
  relationship_psychology: "not_started",
  clinical_safety: "not_started",
  plain_korean: "not_started",
  product: "not_started",
  design: "not_started",
} as const;

function buildSlot(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    claimKey: ".scenario.family.aftermath.attention",
    scenarioRef: "SCN-FAMILY-12",
    context: "family",
    claimKind: "attention",
    privacyScope: "self_only",
    riskDomains: ["relationship_outcome"],
    currentControlledAxes: [],
    candidateSemanticAxes: [
      {
        axisRef: "RO",
        contribution: "primary",
        confidence: "high",
        rationale: "문제 해결과 관계 회복을 어디에 먼저 두는지 대비돼요.",
        cueEvidence: ["풀리지 않은 문제", "남은 감정"],
        evidenceFindingRefs: ["FND-SUPPORT-MATCHING-CONTEXT"],
        independentSourceRefs: ["SRC-SUPPORT-MATCHING-2007"],
      },
    ],
    candidateInteractions: [],
    classificationSignals: [
      {
        signalType: "behavioral_contrast",
        axisRef: "RO",
        variantIds: ["1aec2e3995da", "e1b2bd08f6f5"],
        detail: "문제 해결과 관계 회복의 주의 초점이 대비돼요.",
      },
    ],
    anchorVariants: [
      {
        variantId: "1aec2e3995da",
        assertion:
          "가족 갈등이 지나간 뒤 실제로 일어난 순서와 풀리지 않은 문제를 되짚어요.",
        codes: ["IRGMC"],
        evidenceFindingRefs: ["FND-SUPPORT-MATCHING-CONTEXT"],
        independentSourceRefs: ["SRC-SUPPORT-MATCHING-2007"],
      },
      {
        variantId: "e1b2bd08f6f5",
        assertion:
          "가족 갈등이 지나간 뒤 분위기와 남은 감정, 다시 정할 약속을 살펴요.",
        codes: ["ENAKQ"],
        evidenceFindingRefs: ["FND-SUPPORT-MATCHING-CONTEXT"],
        independentSourceRefs: ["SRC-SUPPORT-MATCHING-2007"],
      },
    ],
    decision: {
      status: "candidate_generated",
      lineageResolution: "reclassify_axis",
      rationale: "RO축 후보를 전문 검토하기 전 단계예요.",
      canonicalVariants: [],
      decidedBy: ["deterministic_candidate_generator.v2"],
    },
    reviews: pendingReviews,
    publicationState: "research_only",
    ...overrides,
  };
}

describe("trait-map scenario axis contribution v2", () => {
  it("accepts a traceable research-only axis candidate", () => {
    expect(() =>
      traitMapScenarioAxisContributionSlotV2Schema.parse(buildSlot()),
    ).not.toThrow();
  });

  it("requires every interaction axis to exist in semantic candidates", () => {
    const result = traitMapScenarioAxisContributionSlotV2Schema.safeParse(
      buildSlot({
        candidateInteractions: [
          {
            interactionId: "INT-SCN-FAMILY-12-RO-ER",
            axisRefs: ["RO", "ER"],
            confidence: "medium",
            rationale: "관계 초점과 정서 활성화가 함께 문장을 바꿔요.",
            evidenceFindingRefs: [],
            independentSourceRefs: [],
          },
        ],
      }),
    );

    expect(result.success).toBe(false);
  });

  it("keeps first thought and actual response private", () => {
    const result = traitMapScenarioAxisContributionSlotV2Schema.safeParse(
      buildSlot({
        claimKey: ".scenario.family.aftermath.first_thought",
        claimKind: "first_thought",
        privacyScope: "comparison_safe",
      }),
    );

    expect(result.success).toBe(false);
  });

  it("blocks recomposition approval until every binary combination is reviewed", () => {
    const result = traitMapScenarioAxisContributionSlotV2Schema.safeParse(
      buildSlot({
        decision: {
          status: "approved_for_recomposition",
          lineageResolution: "reclassify_axis",
          rationale: "RO축으로 승인해요.",
          canonicalVariants: [
            {
              canonicalVariantId: "CAN-SCN-FAMILY-12-RO-G",
              axisSignature: "RO=G",
              axisValues: [{ axisRef: "RO", symbol: "G" }],
              assertion:
                "가족 갈등 뒤 풀리지 않은 문제와 다음 해결 기준을 되짚어요.",
              evidenceFindingRefs: ["FND-SUPPORT-MATCHING-CONTEXT"],
              independentSourceRefs: ["SRC-SUPPORT-MATCHING-2007"],
              sourceVariantIds: ["1aec2e3995da"],
              status: "approved",
              reviews: passedReviews,
              publicationState: "research_only",
            },
          ],
          decidedBy: ["expert-panel"],
          decidedAt: "2026-07-23T00:00:00.000Z",
        },
        reviews: passedReviews,
      }),
    );

    expect(result.success).toBe(false);
  });

  it("blocks high-risk approval with only one independent source", () => {
    const canonicalVariant = (
      canonicalVariantId: string,
      symbol: "G" | "A",
      sourceVariantId: string,
    ) => ({
      canonicalVariantId,
      axisSignature: `RO=${symbol}`,
      axisValues: [{ axisRef: "RO", symbol }],
      assertion:
        symbol === "G"
          ? "가족 갈등 뒤 풀리지 않은 문제와 다음 해결 기준을 되짚어요."
          : "가족 갈등 뒤 남은 감정과 다시 정할 약속을 살펴요.",
      evidenceFindingRefs: ["FND-SUPPORT-MATCHING-CONTEXT"],
      independentSourceRefs: ["SRC-SUPPORT-MATCHING-2007"],
      sourceVariantIds: [sourceVariantId],
      status: "approved",
      reviews: passedReviews,
      publicationState: "research_only",
    });
    const result = traitMapScenarioAxisContributionSlotV2Schema.safeParse(
      buildSlot({
        decision: {
          status: "approved_for_recomposition",
          lineageResolution: "reclassify_axis",
          rationale: "RO축으로 승인해요.",
          canonicalVariants: [
            canonicalVariant("CAN-SCN-FAMILY-12-RO-G", "G", "1aec2e3995da"),
            canonicalVariant("CAN-SCN-FAMILY-12-RO-A", "A", "e1b2bd08f6f5"),
          ],
          decidedBy: ["expert-panel"],
          decidedAt: "2026-07-23T00:00:00.000Z",
        },
        reviews: passedReviews,
      }),
    );

    expect(result.success).toBe(false);
  });

  it("locks 72 scenarios times four observation channels without omissions", () => {
    const slots = traitMapScenarioCatalogV2.flatMap((scenario) =>
      traitMapScenarioClaimKindsV2.map((claimKind) => {
        const claimSuffix = {
          attention: "attention",
          first_thought: "process",
          actual_response: "response",
          communication: "communication",
        }[claimKind];
        return buildSlot({
          claimKey: `.scenario.${scenario.relationshipContext}.${scenario.when}.${claimSuffix}`,
          scenarioRef: scenario.scenarioId,
          context: scenario.relationshipContext,
          claimKind,
          privacyScope:
            claimKind === "first_thought" || claimKind === "actual_response"
              ? "self_only"
              : "comparison_safe",
          riskDomains: ["none"],
          candidateSemanticAxes: [],
          classificationSignals: [],
          anchorVariants: [
            {
              variantId: "1aec2e3995da",
              assertion:
                "현재는 축 후보를 만들기 전이며 원문 문장을 연구 전용으로 보존해요.",
              codes: ["ENAKQ"],
              evidenceFindingRefs: [],
              independentSourceRefs: [],
            },
          ],
          decision: {
            status: "unreviewed",
            lineageResolution: "pending",
            rationale: "의미 기반 축 분류 전 단계예요.",
            canonicalVariants: [],
            decidedBy: [],
          },
        });
      }),
    );

    expect(slots).toHaveLength(288);
    expect(() =>
      traitMapScenarioAxisContributionManifestV2Schema.parse({
        contractVersion: traitMapScenarioAxisContributionContractVersion,
        manifestId: "TRAIT-MAP-AXIS-CONTRIBUTION.0.1",
        sourceQueueId: "TRAIT-MAP-LATTICE-RECONCILIATION.0.1",
        status: "classification_in_progress",
        generatedAt: "2026-07-23T00:00:00.000Z",
        slots,
        publicationState: "research_only",
      }),
    ).not.toThrow();
  });

  it("validates all 288 generated research candidates against the contract", () => {
    const generated = JSON.parse(
      fs.readFileSync(
        path.join(
          process.cwd(),
          "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_AXIS_CONTRIBUTION_CANDIDATES_V2.json",
        ),
        "utf8",
      ),
    );

    expect(() =>
      traitMapScenarioAxisContributionManifestV2Schema.parse(generated),
    ).not.toThrow();
    expect(generated.summary).toMatchObject({
      totalSlots: 288,
      approvedSlots: 0,
    });
  });
});
