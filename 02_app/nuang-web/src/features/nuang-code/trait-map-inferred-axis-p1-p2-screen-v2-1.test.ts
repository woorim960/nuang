import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/review/TRAIT_MAP_INFERRED_AXIS_SCOPE_INTERNAL_SCREEN_P1_P2_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map inferred-axis P1/P2 internal screen v2.1", () => {
  it("classifies all remaining 85 inferred axes", () => {
    expect(report.summary.entries).toBe(85);
    expect(report.summary.p1Entries).toBe(50);
    expect(report.summary.p2Entries).toBe(35);
    expect(report.summary.retainCandidates).toBe(57);
    expect(report.summary.removeProposals).toBe(28);
  });

  it("removes every non-P0 inferred ER decision", () => {
    expect(report.summary.byAxis.ER.entries).toBe(9);
    expect(report.summary.byAxis.ER.retain).toBe(0);
    expect(report.summary.byAxis.ER.remove).toBe(9);
  });

  it("records the expected removal counts for the other axes", () => {
    expect(report.summary.byAxis.SE.remove).toBe(1);
    expect(report.summary.byAxis.OE.remove).toBe(7);
    expect(report.summary.byAxis.RO.remove).toBe(6);
    expect(report.summary.byAxis.SM.remove).toBe(5);
  });

  it("keeps all decisions internal and research-only", () => {
    expect(report.summary.expertReviewed).toBe(0);
    expect(report.summary.customerApproved).toBe(0);
    expect(report.publicationState).toBe("research_only");
    for (const entry of report.entries) {
      expect(entry.independentRoleReviewState).toBe("pending");
      expect(entry.expertReviewed).toBe(false);
    }
  });
});
