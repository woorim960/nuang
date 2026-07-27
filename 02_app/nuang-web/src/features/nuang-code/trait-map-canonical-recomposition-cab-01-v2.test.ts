import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_RECOMPOSITION_AUDIT_CAB_01_V2.json",
    ),
    "utf8",
  ),
);

describe("trait-map canonical recomposition CAB-01 v2", () => {
  it("recomposes the first batch across all 32 profiles without unresolved refs", () => {
    expect(report.batchId).toBe("CAB-01");
    expect(report.summary.profiles).toBe(32);
    expect(report.summary.claimSlots).toBe(24);
    expect(report.summary.profileClaimReferences).toBe(32 * 24);
    expect(report.summary.pathIndependentReferences).toBe(true);
    expect(report.summary.unresolvedReferences).toBe(0);
  });

  it("changes only claims that use the one changed axis", () => {
    expect(report.summary.neighborEdges).toBe(80);
    expect(report.summary.neighborEdgesPassed).toBe(80);
    expect(report.summary.unexpectedClaimChanges).toBe(0);
    expect(report.summary.missingExpectedClaimChanges).toBe(0);
    expect(report.summary.indistinguishableExpectedChanges).toBe(0);
    expect(report.summary.recompositionPassed).toBe(true);
  });

  it("keeps all five axes represented by sixteen passing neighbor edges", () => {
    expect(Object.keys(report.countsByChangedAxis).sort()).toEqual([
      "ER",
      "OE",
      "RO",
      "SE",
      "SM",
    ]);
    for (const counts of Object.values(report.countsByChangedAxis) as Array<{
      edges: number;
      passed: number;
      expectedChangedClaims: number;
    }>) {
      expect(counts.edges).toBe(16);
      expect(counts.passed).toBe(16);
      expect(counts.expectedChangedClaims).toBeGreaterThan(0);
    }
  });

  it("does not promote a structural pass to expert or customer approval", () => {
    expect(report.summary.pendingSevenRoleReviews).toBe(101);
    expect(report.summary.customerApprovedVariants).toBe(0);
    expect(report.publicationState).toBe("research_only");
    expect(report.status).toContain("SEVEN_ROLE_REVIEW_REQUIRED");
  });
});
