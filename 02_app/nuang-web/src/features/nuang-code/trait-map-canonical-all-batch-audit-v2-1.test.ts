import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_ALL_BATCH_AUDIT_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map canonical all-batch audit v2.1", () => {
  it("covers all 72 scenarios and 705 final-axis variants", () => {
    expect(report.summary.batches).toBe(12);
    expect(report.summary.batchesPassingStructuralAudit).toBe(12);
    expect(report.summary.scenarios).toBe(72);
    expect(report.summary.claimSlots).toBe(288);
    expect(report.summary.canonicalVariants).toBe(705);
    expect(report.summary.allBatchesPassed).toBe(true);
  });

  it("recomposes all 9,216 profile references", () => {
    expect(report.summary.profileClaimReferences).toBe(32 * 288);
    expect(report.summary.neighborEdges).toBe(12 * 80);
    expect(report.summary.neighborEdgesPassed).toBe(12 * 80);
    expect(report.summary.unexpectedClaimChanges).toBe(0);
    expect(report.summary.indistinguishableExpectedChanges).toBe(0);
  });

  it("tracks the reduced v2.1 correction scope", () => {
    expect(report.summary.targetedNeighborPairs).toBe(14);
    expect(report.summary.authoredDirectionalParagraphs).toBe(3);
    expect(report.summary.preflightHardFailures).toBe(0);
    expect(report.summary.unsafeLanguageFlags).toBe(0);
  });

  it("keeps all content pending independent review", () => {
    expect(report.summary.pendingSevenRoleReviews).toBe(705);
    expect(report.summary.customerApprovedVariants).toBe(0);
    expect(report.publicationState).toBe("research_only");
    expect(report.status).toContain("SEVEN_ROLE_REVIEW_REQUIRED");
  });
});
