import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workbook = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/review/TRAIT_MAP_SEVEN_ROLE_REVIEW_CAB_01_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map seven-role review CAB-01 v2.1", () => {
  it("queues all 93 v2.1 variants without pretending approval", () => {
    expect(workbook.summary.entries).toBe(93);
    expect(workbook.summary.automatedScreeningPassed).toBe(93);
    expect(workbook.summary.expertReviewed).toBe(0);
    expect(workbook.summary.customerApproved).toBe(0);
    expect(workbook.publicationState).toBe("research_only");
  });

  it("prioritizes both targeted rewrites and amended lineage merges", () => {
    const p0 = workbook.entries.filter(
      (entry: { priority: string }) => entry.priority === "P0",
    );
    expect(p0).toHaveLength(24);
    expect(
      p0.filter((entry: { priorityReasons: string[] }) =>
        entry.priorityReasons.includes("targeted_axis_rewrite"),
      ),
    ).toHaveLength(16);
    expect(
      p0.filter((entry: { priorityReasons: string[] }) =>
        entry.priorityReasons.includes("axis_amendment_lineage_merge"),
      ),
    ).toHaveLength(8);
  });

  it("keeps seven independent review roles pending on every entry", () => {
    for (const entry of workbook.entries) {
      expect(Object.keys(entry.roleReviews)).toHaveLength(7);
      expect(entry.aggregateReview.decisionCounts.pending).toBe(7);
      expect(entry.aggregateReview.expertReviewed).toBe(false);
    }
  });
});
