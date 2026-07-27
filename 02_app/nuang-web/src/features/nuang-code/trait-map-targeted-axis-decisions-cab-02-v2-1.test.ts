import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/review/TRAIT_MAP_TARGETED_AXIS_REWRITE_DECISIONS_CAB_02_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map targeted decisions CAB-02 v2.1", () => {
  it("migrates only six exact canonical pair matches", () => {
    expect(report.batchId).toBe("CAB-02");
    expect(report.summary.targetPairs).toBe(6);
    expect(report.summary.migratedDecisions).toBe(6);
    expect(report.summary.retiredV2Decisions).toBe(0);
    expect(report.summary.authoredParagraphs).toBe(2);
  });

  it("keeps migrated editorial decisions research-only", () => {
    expect(report.publicationState).toBe("research_only");
    expect(report.approval.sevenRoleReviewComplete).toBe(false);
    expect(report.approval.customerPublicationApproved).toBe(false);
    for (const decision of report.decisions) {
      expect(decision.migrationBasis).toContain("정확히 일치");
    }
  });
});
