import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_P0_REVISED_DRAFT_CAB_01_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map canonical P0 revision CAB-01 v2.1", () => {
  it("applies exactly the 21 required revisions", () => {
    expect(report.summary.canonicalVariants).toBe(93);
    expect(report.summary.p0Entries).toBe(24);
    expect(report.summary.revisedVariants).toBe(21);
    expect(report.summary.unchangedP0ReadyVariants).toBe(3);
    expect(report.summary.revisionCoverageComplete).toBe(true);
  });

  it("removes residual amended-axis cues and unsafe language", () => {
    expect(report.summary.revisionAuditsPassed).toBe(21);
    expect(report.summary.removedAxisResidualFlags).toBe(0);
    expect(report.summary.unsafeLanguageFlags).toBe(0);
  });

  it("preserves rollback lineage and pending review state", () => {
    const revised = report.variants.filter(
      (variant: {
        provenance: { internalRevision?: unknown };
      }) => Boolean(variant.provenance.internalRevision),
    );
    expect(revised).toHaveLength(21);
    for (const variant of revised) {
      expect(
        variant.provenance.internalRevision.previousContent,
      ).toBeTruthy();
      expect(variant.sevenRoleReviewState).toBe("pending");
      expect(variant.publicationState).toBe("research_only");
    }
    expect(report.summary.expertReviewedVariants).toBe(0);
    expect(report.summary.customerApprovedVariants).toBe(0);
  });
});
