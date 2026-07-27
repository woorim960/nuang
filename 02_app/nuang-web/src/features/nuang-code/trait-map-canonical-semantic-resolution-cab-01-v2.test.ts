import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_SEMANTIC_RESOLUTION_CAB_01_V2.json",
    ),
    "utf8",
  ),
);

describe("trait-map canonical semantic resolution CAB-01 v2", () => {
  it("preserves all canonical variants and keeps them research-only", () => {
    expect(report.batchId).toBe("CAB-01");
    expect(report.summary.canonicalVariants).toBe(101);
    expect(report.variants).toHaveLength(101);
    expect(report.summary.customerApprovedVariants).toBe(0);
    expect(report.publicationState).toBe("research_only");
  });

  it("preserves distinct source meaning as core plus nuance", () => {
    expect(report.summary.corePlusNuanceVariants).toBe(47);
    expect(report.summary.singleCoreVariants).toBe(54);
    expect(report.summary.maximumCoreNuanceSimilarity).toBeLessThan(0.5);
    for (const variant of report.variants) {
      expect(variant.canonicalDisplayDraft.summaryText).toBe(
        variant.canonicalDisplayDraft.detailParagraphs[0],
      );
      expect(variant.canonicalDisplayDraft.detailParagraphs).toHaveLength(
        variant.provenance.sourceBlockCount,
      );
      expect(variant.sevenRoleReviewState).toBe("pending");
      expect(variant.publicationState).toBe("research_only");
    }
  });

  it("isolates exact-block neighbor overlap for targeted review", () => {
    expect(report.summary.variantsRequiringAxisDifferentiationReview).toBe(24);
    expect(report.summary.variantsReadyForSevenRoleReview).toBe(77);
    expect(report.targetedRewriteQueue).toHaveLength(24);
    expect(
      report.targetedRewriteQueue.every(
        (item: { overlapReviews?: unknown[] }) =>
          (item.overlapReviews?.length ?? 0) > 0,
      ),
    ).toBe(true);
  });

  it("prevents self-only thought and response copy from leaking into public surfaces", () => {
    expect(report.surfaceContract.publicProfile).toContain("사용 금지");
    expect(report.surfaceContract.shareCard).toContain("사용 금지");
    expect(
      report.variants.every(
        (variant: { privacyScope: string }) =>
          variant.privacyScope === "self_only",
      ),
    ).toBe(true);
  });
});
