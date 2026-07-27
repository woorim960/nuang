import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const queue = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_SEVEN_ROLE_REVIEW_QUEUE_V2_1.json",
    ),
    "utf8",
  ),
);
const cab01 = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/review/TRAIT_MAP_SEVEN_ROLE_REVIEW_CAB_01_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map seven-role review queue v2.1", () => {
  it("queues the entire 705-entry canonical ledger", () => {
    expect(queue.queueScope).toBe("all_12_batches");
    expect(queue.summary.entries).toBe(705);
    expect(queue.summary.automatedScreeningPassed).toBe(705);
    expect(queue.summary.expertReviewed).toBe(0);
    expect(queue.summary.customerApproved).toBe(0);
  });

  it("places 36 editorially sensitive variants in P0", () => {
    expect(queue.summary.priorities.P0).toBe(36);
    expect(queue.summary.targetedAxisVariants).toBe(28);
    expect(
      queue.entries.filter(
        (entry: { priorityReasons: string[] }) =>
          entry.priorityReasons.includes(
            "axis_amendment_lineage_merge",
          ),
      ),
    ).toHaveLength(8);
  });

  it("refreshes CAB-01 with all 21 version-two revisions", () => {
    expect(cab01.summary.entries).toBe(93);
    expect(cab01.summary.priorities.P0).toBe(24);
    expect(
      cab01.entries.filter(
        (entry: { contentVersion: number }) =>
          entry.contentVersion === 2,
      ),
    ).toHaveLength(21);
  });

  it("keeps seven roles pending and publication blocked", () => {
    expect(queue.publicationState).toBe("research_only");
    for (const entry of queue.entries) {
      expect(Object.keys(entry.roleReviews)).toHaveLength(7);
      expect(entry.aggregateReview.expertReviewed).toBe(false);
      expect(entry.release.publicationState).toBe("research_only");
    }
  });
});
