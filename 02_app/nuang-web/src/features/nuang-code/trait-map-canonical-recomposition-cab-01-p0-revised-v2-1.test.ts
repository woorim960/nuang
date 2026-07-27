import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_RECOMPOSITION_AUDIT_CAB_01_P0_REVISED_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map CAB-01 P0-revised recomposition v2.1", () => {
  it("preserves all profile references after the 21 revisions", () => {
    expect(report.summary.canonicalVariants).toBe(93);
    expect(report.summary.profiles).toBe(32);
    expect(report.summary.profileClaimReferences).toBe(768);
    expect(report.summary.unresolvedReferences).toBe(0);
    expect(report.summary.pathIndependentReferences).toBe(true);
  });

  it("preserves intended one-letter neighbor differences only", () => {
    expect(report.summary.neighborEdgesPassed).toBe(80);
    expect(report.summary.unexpectedClaimChanges).toBe(0);
    expect(report.summary.missingExpectedClaimChanges).toBe(0);
    expect(report.summary.indistinguishableExpectedChanges).toBe(0);
    expect(report.summary.recompositionPassed).toBe(true);
  });

  it("remains research-only pending all 93 role reviews", () => {
    expect(report.summary.pendingSevenRoleReviews).toBe(93);
    expect(report.summary.customerApprovedVariants).toBe(0);
    expect(report.publicationState).toBe("research_only");
  });
});
