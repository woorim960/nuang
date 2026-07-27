import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_RESEARCH_DRAFT_CAB_01_V2_1.json",
    ),
    "utf8",
  ),
) as {
  reportId: string;
  scenarios: Array<{
    claimSlots: Array<{
      variants: Array<{
        axisSignature: string;
        claimKey: string;
        excludedUnits: unknown[];
        includedUnits: unknown[];
        publicationState: string;
        recompositionCheck: {
          finalBatchRecompositionPassed: boolean;
        };
        sourceUnits: unknown[];
      }>;
    }>;
  }>;
  summary: {
    canonicalVariants: number;
    claimSlots: number;
    customerApprovedVariants: number;
    missingSourceUnits: number;
    pendingExpertReviews: number;
    scenarios: number;
  };
};

describe("trait-map canonical research draft CAB-01 v2.1", () => {
  it("assembles 93 variants across the unchanged 24 claim slots", () => {
    expect(report.reportId).toBe(
      "TRAIT-MAP-CANONICAL-RESEARCH-DRAFT-CAB-01.0.2",
    );
    expect(report.summary.scenarios).toBe(6);
    expect(report.summary.claimSlots).toBe(24);
    expect(report.summary.canonicalVariants).toBe(93);
    expect(report.summary.missingSourceUnits).toBe(0);
  });

  it("removes unsupported RO and ER branches from the amended claims", () => {
    const variants = report.scenarios.flatMap((scenario) =>
      scenario.claimSlots.flatMap((claim) => claim.variants),
    );
    const ordinaryChoice = variants.filter(
      (variant) =>
        variant.claimKey ===
        ".scenario.general.ordinary_choice.attention",
    );
    const newEncounter = variants.filter(
      (variant) =>
        variant.claimKey ===
        ".scenario.general.new_encounter.response",
    );
    expect(ordinaryChoice).toHaveLength(4);
    expect(newEncounter).toHaveLength(4);
    expect(
      ordinaryChoice.every(
        (variant) => !variant.axisSignature.includes("RO="),
      ),
    ).toBe(true);
    expect(
      newEncounter.every(
        (variant) => !variant.axisSignature.includes("ER="),
      ),
    ).toBe(true);
  });

  it("preserves all source units and keeps review pending", () => {
    const variants = report.scenarios.flatMap((scenario) =>
      scenario.claimSlots.flatMap((claim) => claim.variants),
    );
    for (const variant of variants) {
      expect(variant.sourceUnits.length).toBeGreaterThan(0);
      expect(
        variant.includedUnits.length + variant.excludedUnits.length,
      ).toBe(variant.sourceUnits.length);
      expect(variant.publicationState).toBe("research_only");
      expect(
        variant.recompositionCheck.finalBatchRecompositionPassed,
      ).toBe(false);
    }
    expect(report.summary.pendingExpertReviews).toBe(93);
    expect(report.summary.customerApprovedVariants).toBe(0);
  });
});
