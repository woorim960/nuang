import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_CORRECTED_DRAFT_CAB_01_V2.json",
    ),
    "utf8",
  ),
);

describe("trait-map canonical corrected draft CAB-01 v2", () => {
  it("keeps the complete batch while correcting all targeted pairs", () => {
    expect(report.batchId).toBe("CAB-01");
    expect(report.summary.canonicalVariants).toBe(101);
    expect(report.variants).toHaveLength(101);
    expect(report.summary.targetedNeighborPairs).toBe(12);
    expect(
      report.summary.targetedNeighborPairsWithBothUniqueDirections,
    ).toBe(12);
  });

  it("adds only the four evidence-bounded paragraphs that were actually needed", () => {
    expect(report.summary.authoredDirectionalParagraphs).toBe(4);
    for (const decision of report.appliedDecisions.filter(
      (item: { authoredParagraph: unknown }) => item.authoredParagraph,
    )) {
      expect(decision.authoredParagraph.sourceCandidateRefs).toHaveLength(2);
      expect(
        decision.authoredParagraph.evidenceFindingRefs.length,
      ).toBeGreaterThan(0);
      expect(
        decision.authoredParagraph.independentSourceRefs.length,
      ).toBeGreaterThan(0);
    }
  });

  it("preserves removed text in lineage instead of silently deleting it", () => {
    expect(report.summary.lineageExclusions).toBeGreaterThan(0);
    for (const decision of report.appliedDecisions) {
      for (const exclusion of decision.lineageExclusions) {
        expect(exclusion.canonicalVariantId).toBeTruthy();
        expect(exclusion.text).toBeTruthy();
        expect(exclusion.reason).toBeTruthy();
      }
    }
  });

  it("keeps the corrected draft safe, private, and unapproved", () => {
    expect(report.summary.unsafeLanguageFlags).toBe(0);
    expect(report.summary.customerApprovedVariants).toBe(0);
    expect(report.summary.pendingSevenRoleReviews).toBe(101);
    expect(report.publicationState).toBe("research_only");
    for (const variant of report.variants) {
      expect(variant.privacyScope).toBe("self_only");
      expect(variant.publicationState).toBe("research_only");
      expect(variant.sevenRoleReviewState).toBe("pending");
    }
  });
});
