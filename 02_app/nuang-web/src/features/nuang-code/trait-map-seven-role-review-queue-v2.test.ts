import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const queue = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_SEVEN_ROLE_REVIEW_QUEUE_V2.json",
    ),
    "utf8",
  ),
);
const cab01 = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/review/TRAIT_MAP_SEVEN_ROLE_REVIEW_CAB_01_V2.json",
    ),
    "utf8",
  ),
);

describe("trait-map seven-role review queue v2", () => {
  it("queues all canonical entries without treating automation as approval", () => {
    expect(queue.summary.entries).toBe(713);
    expect(queue.summary.automatedScreeningPassed).toBe(713);
    expect(queue.summary.expertReviewed).toBe(0);
    expect(queue.summary.customerApproved).toBe(0);
    expect(queue.publicationState).toBe("research_only");
  });

  it("locks seven distinct role contracts and four explicit decisions", () => {
    expect(queue.roleContracts).toHaveLength(7);
    expect(new Set(queue.roleContracts.map((role: { role: string }) => role.role)).size).toBe(7);
    expect(queue.decisionValues).toEqual([
      "approve",
      "revise",
      "hold",
      "reject",
    ]);
    for (const role of queue.roleContracts) {
      expect(role.requiredChecks.length).toBeGreaterThanOrEqual(5);
      expect(role.issueCodePrefixes.length).toBeGreaterThan(0);
    }
  });

  it("prioritizes CAB-01 authored and targeted-axis variants", () => {
    expect(cab01.summary.entries).toBe(101);
    expect(cab01.summary.authoredParagraphs).toBe(4);
    expect(cab01.summary.targetedAxisVariants).toBe(24);
    expect(cab01.summary.priorities.P0).toBe(24);
    expect(
      cab01.entries
        .filter((entry: { priority: string }) => entry.priority === "P0")
        .every(
          (entry: { priorityReasons: string[] }) =>
            entry.priorityReasons.includes("targeted_axis_rewrite") ||
            entry.priorityReasons.includes(
              "authored_evidence_bounded_paragraph",
            ),
        ),
    ).toBe(true);
  });

  it("prefills evidence but leaves every independent role pending", () => {
    for (const entry of cab01.entries) {
      expect(entry.evidencePacket.sourceUnitIds.length).toBeGreaterThan(0);
      expect(entry.automatedScreening.state).toBe(
        "passed_not_an_expert_approval",
      );
      expect(Object.keys(entry.roleReviews)).toHaveLength(7);
      expect(
        Object.values(entry.roleReviews).every(
          (review) =>
            (review as { state: string; decision: null }).state ===
              "pending" &&
            (review as { decision: null }).decision === null,
        ),
      ).toBe(true);
      expect(entry.aggregateReview.expertReviewed).toBe(false);
      expect(entry.release.publicationState).toBe("research_only");
    }
  });
});
