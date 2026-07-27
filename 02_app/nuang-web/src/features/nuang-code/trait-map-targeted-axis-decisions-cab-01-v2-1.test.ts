import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const decisions = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/review/TRAIT_MAP_TARGETED_AXIS_REWRITE_DECISIONS_CAB_01_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map targeted axis decisions CAB-01 v2.1", () => {
  it("migrates exactly the eight still-valid decisions", () => {
    expect(decisions.summary.targetPairs).toBe(8);
    expect(decisions.summary.migratedDecisions).toBe(8);
    expect(decisions.decisions).toHaveLength(8);
    expect(
      new Set(
        decisions.decisions.map(
          (decision: { reviewId: string }) => decision.reviewId,
        ),
      ).size,
    ).toBe(8);
  });

  it("retires the four decisions attached to removed RO and ER branches", () => {
    expect(decisions.summary.retiredV2Decisions).toBe(4);
    expect(decisions.retiredV2Decisions).toHaveLength(4);
    expect(
      decisions.retiredV2Decisions.filter(
        (decision: { changedAxis: string }) =>
          decision.changedAxis === "RO",
      ),
    ).toHaveLength(2);
    expect(
      decisions.retiredV2Decisions.filter(
        (decision: { changedAxis: string }) =>
          decision.changedAxis === "ER",
      ),
    ).toHaveLength(2);
  });

  it("does not migrate the invalid C/Q authored paragraphs", () => {
    expect(decisions.summary.authoredParagraphs).toBe(1);
    expect(
      decisions.decisions.some(
        (decision: { authoredDirection: string | null }) =>
          decision.authoredDirection === "C" ||
          decision.authoredDirection === "Q",
      ),
    ).toBe(false);
  });

  it("keeps the migrated decisions internal and unpublished", () => {
    expect(decisions.publicationState).toBe("research_only");
    expect(decisions.approval.internalEditorialDecisionComplete).toBe(
      true,
    );
    expect(decisions.approval.sevenRoleReviewComplete).toBe(false);
    expect(
      decisions.approval.customerPublicationApproved,
    ).toBe(false);
  });
});
