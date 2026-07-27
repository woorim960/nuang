import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_SEMANTIC_RESOLUTION_CAB_01_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map canonical semantic resolution CAB-01 v2.1", () => {
  it("structures all 93 variants without losing source paragraphs", () => {
    expect(report.reportId).toBe(
      "TRAIT-MAP-CANONICAL-SEMANTIC-RESOLUTION-CAB-01.0.2",
    );
    expect(report.summary.canonicalVariants).toBe(93);
    expect(report.summary.singleCoreVariants).toBe(42);
    expect(report.summary.corePlusNuanceVariants).toBe(51);
    expect(
      report.summary.singleCoreVariants +
        report.summary.corePlusNuanceVariants,
    ).toBe(93);
    for (const variant of report.variants) {
      expect(variant.canonicalDisplayDraft.summaryText).toBeTruthy();
      expect(
        variant.canonicalDisplayDraft.detailParagraphs,
      ).toHaveLength(variant.provenance.sourceBlockCount);
    }
  });

  it("isolates only the remaining eight neighbor pairs", () => {
    expect(
      report.summary.variantsRequiringAxisDifferentiationReview,
    ).toBe(16);
    expect(report.targetedRewriteQueue).toHaveLength(16);
    expect(
      report.targetedRewriteQueue.every(
        (entry: { overlapReviews: unknown[] }) =>
          entry.overlapReviews.length >= 1,
      ),
    ).toBe(true);
  });

  it("keeps removed RO and ER branches absent and review pending", () => {
    for (const variant of report.variants) {
      if (
        variant.claimKey ===
        ".scenario.general.ordinary_choice.attention"
      ) {
        expect(variant.axisSignature).not.toContain("RO=");
      }
      if (
        variant.claimKey ===
        ".scenario.general.new_encounter.response"
      ) {
        expect(variant.axisSignature).not.toContain("ER=");
      }
      expect(variant.sevenRoleReviewState).toBe("pending");
      expect(variant.publicationState).toBe("research_only");
    }
    expect(report.summary.pendingSevenRoleReviews).toBe(93);
    expect(report.summary.customerApprovedVariants).toBe(0);
  });
});
