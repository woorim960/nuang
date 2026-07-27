import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_RESEARCH_DRAFT_CAB_01_V2.json",
    ),
    "utf8",
  ),
);

const variants = report.scenarios.flatMap(
  (scenario: { claimSlots: Array<{ variants: unknown[] }> }) =>
    scenario.claimSlots.flatMap((claim) => claim.variants),
);

describe("trait-map canonical research draft CAB-01 v2", () => {
  it("assembles the complete first batch without missing variants", () => {
    expect(report.batchId).toBe("CAB-01");
    expect(report.scenarios).toHaveLength(6);
    expect(report.summary.claimSlots).toBe(24);
    expect(variants).toHaveLength(report.summary.canonicalVariants);
    expect(report.summary.missingSourceUnits).toBe(0);
  });

  it("accounts for every source unit as included or directionally excluded", () => {
    for (const variant of variants) {
      expect(variant.includedUnits.length + variant.excludedUnits.length).toBe(
        variant.sourceUnits.length,
      );
      expect(variant.includedUnits.length).toBeGreaterThan(0);
      expect(variant.researchDraftBlocks).toHaveLength(
        variant.includedUnits.length,
      );
      expect(
        variant.recompositionCheck.selectedPrimaryMatchesCollisionResolvedQueue,
      ).toBe(true);
    }
  });

  it("preserves two distinct units for information synthesis instead of concatenating them", () => {
    const synthesis = variants.filter(
      (variant: { semanticDecision: string }) =>
        variant.semanticDecision === "PRESERVE_BOTH_DISTINCT_SOURCE_UNITS",
    );
    expect(synthesis.length).toBeGreaterThan(0);
    for (const variant of synthesis) {
      expect(variant.sourceUnits).toHaveLength(2);
      expect(variant.includedUnits).toHaveLength(2);
      expect(variant.excludedUnits).toEqual([]);
      expect(variant.researchDraftBlocks).toHaveLength(2);
    }
  });

  it("keeps all assembled blocks research-only pending seven-role review", () => {
    expect(report.summary.customerApprovedVariants).toBe(0);
    for (const variant of variants) {
      expect(variant.publicationState).toBe("research_only");
      expect(variant.draftState).toBe("source_semantic_units_assembled");
      expect(
        Object.values(variant.expertReviewDecisions).every(
          (decision: unknown) =>
            (decision as { decision: string }).decision === "pending",
        ),
      ).toBe(true);
      expect(variant.recompositionCheck.finalBatchRecompositionPassed).toBe(
        false,
      );
    }
  });
});
