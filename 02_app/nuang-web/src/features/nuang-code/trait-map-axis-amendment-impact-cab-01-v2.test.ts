import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const impact = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_AXIS_AMENDMENT_IMPACT_CAB_01_V2.json",
    ),
    "utf8",
  ),
);
const decision = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/review/TRAIT_MAP_AXIS_DECISION_AMENDMENT_CAB_01_V2.json",
    ),
    "utf8",
  ),
);

describe("trait-map CAB-01 axis amendment impact v2", () => {
  it("proposes two evidence-bounded axis removals without applying them", () => {
    expect(decision.amendments).toHaveLength(2);
    expect(decision.status).toBe(
      "PROPOSED_PENDING_SEVEN_ROLE_REVIEW_NOT_APPLIED",
    );
    expect(decision.publicationState).toBe("research_only");
    expect(
      decision.amendments.map(
        (amendment: { removeAxes: string[] }) =>
          amendment.removeAxes[0],
      ),
    ).toEqual(["RO", "ER"]);
  });

  it("reduces canonical variants while preserving all profile slots", () => {
    expect(impact.summary.currentCanonicalVariants).toBe(713);
    expect(impact.summary.proposedCanonicalVariants).toBe(705);
    expect(impact.summary.removedRedundantVariants).toBe(8);
    expect(impact.summary.currentProfileClaimRefs).toBe(32 * 288);
    expect(impact.summary.proposedProfileClaimRefs).toBe(32 * 288);
    expect(impact.summary.impactedProfileRefs).toBe(64);
  });

  it("collapses only the removed-axis claim differences", () => {
    expect(impact.summary.intendedCollapsedNeighborDifferences).toBe(32);
    expect(impact.summary.unexpectedNeighborChanges).toBe(0);
    for (const amendment of impact.amendments) {
      expect(amendment.currentCanonicalVariants).toBe(8);
      expect(amendment.proposedCanonicalVariants).toBe(4);
      expect(amendment.mergeGroups).toHaveLength(4);
      expect(
        amendment.mergeGroups.every(
          (group: {
            currentCanonicalVariantIds: string[];
            mergeState: string;
          }) =>
            group.currentCanonicalVariantIds.length === 2 &&
            group.mergeState ===
              "meaning_preserving_merge_required",
        ),
      ).toBe(true);
      expect(amendment.removedAxisNeighborChecks).toHaveLength(16);
      expect(
        amendment.removedAxisNeighborChecks.every(
          (check: {
            currentCanonicalRefsDiffer: boolean;
            proposedCanonicalSignatureMatches: boolean;
          }) =>
            check.currentCanonicalRefsDiffer &&
            check.proposedCanonicalSignatureMatches,
        ),
      ).toBe(true);
    }
  });

  it("keeps the amendment research-only and unapproved", () => {
    expect(impact.summary.expertApprovedAmendments).toBe(0);
    expect(impact.summary.customerApprovedContent).toBe(0);
    expect(impact.publicationState).toBe("research_only");
    expect(
      impact.amendments.every(
        (amendment: { applicationState: string }) =>
          amendment.applicationState ===
          "not_applied_pending_independent_review",
      ),
    ).toBe(true);
  });
});
