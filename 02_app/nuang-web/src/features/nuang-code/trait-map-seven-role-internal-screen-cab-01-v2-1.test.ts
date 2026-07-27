import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/review/TRAIT_MAP_SEVEN_ROLE_INTERNAL_SCREEN_CAB_01_P0_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map CAB-01 P0 internal screen v2.1", () => {
  it("screens all 24 high-priority variants", () => {
    expect(report.summary.entries).toBe(24);
    expect(report.summary.readyForRoleReview).toBe(3);
    expect(report.summary.reviseBeforeRoleReview).toBe(21);
    expect(report.summary.holdForConstructResolution).toBe(0);
  });

  it("finds residual removed-axis meaning in all eight amended merges", () => {
    const amendedEntries = report.entries.filter(
      (entry: {
        evidencePacket: { axisAmendment: unknown };
      }) => Boolean(entry.evidencePacket.axisAmendment),
    );
    expect(amendedEntries).toHaveLength(8);
    expect(
      amendedEntries.every(
        (entry: {
          internalScreening: { decision: string };
        }) =>
          entry.internalScreening.decision ===
          "revise_before_role_review",
      ),
    ).toBe(true);
  });

  it("keeps internal screening separate from expert and customer approval", () => {
    expect(report.summary.expertReviewed).toBe(0);
    expect(report.summary.customerApproved).toBe(0);
    expect(report.publicationState).toBe("research_only");
    for (const entry of report.entries) {
      expect(entry.independentRoleReviewState).toBe("pending");
      expect(entry.expertReviewed).toBe(false);
    }
  });
});
