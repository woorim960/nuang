import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const baseline = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_FINAL_AXIS_DECISIONS_V2.json",
    ),
    "utf8",
  ),
);
const amended = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map final axis decisions v2.1", () => {
  it("preserves 288 slots while applying exactly two amendments", () => {
    expect(amended.summary.totalSlots).toBe(288);
    expect(amended.summary.amendedSlots).toBe(2);
    expect(amended.summary.unchangedSlots).toBe(286);
    expect(amended.summary.structuralIssueCount).toBe(0);
    expect(amended.preservesBaselineForAudit).toBe(true);
  });

  it("removes only RO from ordinary choice attention", () => {
    const slot = amended.slots.find(
      (candidate: { claimKey: string }) =>
        candidate.claimKey ===
        ".scenario.general.ordinary_choice.attention",
    );
    expect(slot.baselineFinalSemanticAxes).toEqual([
      "OE",
      "RO",
      "SM",
    ]);
    expect(slot.finalSemanticAxes).toEqual(["OE", "SM"]);
    expect(slot.expectedCanonicalVariantCount).toBe(4);
  });

  it("removes only ER from new encounter response", () => {
    const slot = amended.slots.find(
      (candidate: { claimKey: string }) =>
        candidate.claimKey ===
        ".scenario.general.new_encounter.response",
    );
    expect(slot.baselineFinalSemanticAxes).toEqual([
      "SE",
      "OE",
      "ER",
    ]);
    expect(slot.finalSemanticAxes).toEqual(["SE", "OE"]);
    expect(slot.expectedCanonicalVariantCount).toBe(4);
  });

  it("creates the 705-variant rebuild baseline without customer approval", () => {
    expect(
      baseline.summary.expectedCanonicalDraftVariantCount,
    ).toBe(713);
    expect(amended.summary.canonicalVariants).toBe(705);
    expect(amended.summary.removedUnsupportedVariants).toBe(8);
    expect(amended.summary.sevenRoleApprovedAmendments).toBe(0);
    expect(amended.summary.customerApprovedSlots).toBe(0);
    expect(amended.publicationState).toBe("research_only");
    expect(amended.axisUsage.RO).toBe(baseline.axisUsage.RO - 1);
    expect(amended.axisUsage.ER).toBe(baseline.axisUsage.ER - 1);
  });
});
