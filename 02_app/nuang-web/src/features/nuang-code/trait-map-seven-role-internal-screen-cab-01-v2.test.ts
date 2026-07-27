import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/review/TRAIT_MAP_SEVEN_ROLE_INTERNAL_SCREEN_CAB_01_P0_V2.json",
    ),
    "utf8",
  ),
);
const queue = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_SEVEN_ROLE_REVIEW_QUEUE_V2.json",
    ),
    "utf8",
  ),
);

describe("trait-map CAB-01 P0 internal screen v2", () => {
  it("screens every P0 entry exactly once", () => {
    const cab01P0 = queue.entries.filter(
      (entry: { batchId: string; priority: string }) =>
        entry.batchId === "CAB-01" && entry.priority === "P0",
    );
    expect(report.summary.entries).toBe(24);
    expect(report.entries).toHaveLength(cab01P0.length);
    expect(
      new Set(
        report.entries.map(
          (entry: { canonicalVariantId: string }) =>
            entry.canonicalVariantId,
        ),
      ).size,
    ).toBe(24);
  });

  it("separates ready, revise, and construct-hold outcomes", () => {
    expect(report.summary.readyForRoleReview).toBe(4);
    expect(report.summary.reviseBeforeRoleReview).toBe(16);
    expect(report.summary.holdForConstructResolution).toBe(4);
    expect(
      report.entries
        .filter(
          (entry: {
            internalScreening: { decision: string };
          }) =>
            entry.internalScreening.decision ===
            "hold_for_construct_resolution",
        )
        .every(
          (entry: { internalScreening: { issueCodes: string[] } }) =>
            entry.internalScreening.issueCodes.includes(
              "MET_ITEM_CLAIM_MISMATCH",
            ),
        ),
    ).toBe(true);
  });

  it("does not convert an internal screen into expert or customer approval", () => {
    expect(report.summary.expertReviewed).toBe(0);
    expect(report.summary.customerApproved).toBe(0);
    for (const entry of report.entries) {
      expect(entry.internalScreening.state).toBe(
        "completed_internal_precheck_not_expert_approval",
      );
      expect(entry.independentRoleReviewState).toBe("pending");
      expect(entry.expertReviewed).toBe(false);
      expect(entry.publicationState).toBe("research_only");
    }
  });

  it("uses only issue codes declared by the locked review contract", () => {
    const declaredIssueCodes = new Set(Object.keys(queue.issueCatalog));
    for (const entry of report.entries) {
      for (const issueCode of entry.internalScreening.issueCodes) {
        expect(declaredIssueCodes.has(issueCode)).toBe(true);
      }
    }
  });
});
