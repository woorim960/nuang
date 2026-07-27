import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_ALL_BATCH_AUDIT_V2.json",
    ),
    "utf8",
  ),
);

describe("trait-map canonical all-batch audit v2", () => {
  it("covers the complete 72-scenario, 288-slot, 713-variant lattice", () => {
    expect(report.summary.batches).toBe(12);
    expect(report.summary.batchesPassingStructuralAudit).toBe(12);
    expect(report.summary.scenarios).toBe(72);
    expect(report.summary.claimSlots).toBe(288);
    expect(report.summary.canonicalVariants).toBe(713);
    expect(report.summary.allBatchesPassed).toBe(true);
  });

  it("recomposes every batch across all 32 codes", () => {
    expect(report.summary.profileClaimReferences).toBe(32 * 288);
    expect(report.summary.neighborEdges).toBe(12 * 80);
    expect(report.summary.neighborEdgesPassed).toBe(12 * 80);
    expect(report.summary.unexpectedClaimChanges).toBe(0);
    expect(report.summary.indistinguishableExpectedChanges).toBe(0);
  });

  it("keeps correction minimal and traceable", () => {
    expect(report.summary.targetedNeighborPairs).toBe(18);
    expect(report.summary.authoredDirectionalParagraphs).toBe(6);
    expect(report.summary.preflightHardFailures).toBe(0);
    expect(report.summary.unsafeLanguageFlags).toBe(0);
  });

  it("does not confuse structural completion with expert or customer approval", () => {
    expect(report.summary.pendingSevenRoleReviews).toBe(713);
    expect(report.summary.customerApprovedVariants).toBe(0);
    expect(report.publicationState).toBe("research_only");
    expect(report.status).toContain("SEVEN_ROLE_REVIEW_REQUIRED");
  });
});
