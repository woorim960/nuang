import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_CONTENT_LEDGER_V2.json",
    ),
    "utf8",
  ),
);

describe("trait-map canonical content ledger v2", () => {
  it("creates one versioned entry for every canonical variant", () => {
    expect(report.summary.entries).toBe(713);
    expect(report.summary.uniqueContentKeys).toBe(713);
    expect(report.summary.uniqueCanonicalVariantIds).toBe(713);
    expect(report.summary.claimKeys).toBe(288);
    expect(report.summary.duplicateContentKeys).toBe(0);
    expect(report.summary.duplicateCanonicalIds).toBe(0);
  });

  it("resolves all 32-profile refs without same-claim identical output", () => {
    expect(report.summary.profileClaimRefsResolved).toBe(32 * 288);
    expect(report.summary.unresolvedProfileRefs).toBe(0);
    expect(report.summary.duplicateOutputWithinClaim).toBe(0);
  });

  it("preserves authored and excluded lineage with automated gates", () => {
    expect(report.summary.authoredDirectionalParagraphs).toBe(6);
    expect(report.summary.lineageExclusions).toBeGreaterThan(0);
    expect(report.summary.automatedGatePassedEntries).toBe(713);
    for (const entry of report.entries) {
      expect(entry.content.summaryText).toBeTruthy();
      expect(entry.content.detailParagraphs.length).toBeGreaterThan(0);
      expect(entry.provenance.sourceUnitIds.length).toBeGreaterThan(0);
      expect(
        Object.values(entry.automatedGates).every(
          (state) => state === "passed",
        ),
      ).toBe(true);
    }
  });

  it("keeps seven-role, empirical, and customer approval states separate", () => {
    expect(report.summary.sevenRoleReviewedEntries).toBe(0);
    expect(report.summary.customerApprovedEntries).toBe(0);
    expect(report.publicationState).toBe("research_only");
    for (const entry of report.entries) {
      expect(
        Object.values(entry.reviewLedger).every(
          (review) =>
            (review as { state: string }).state === "pending",
        ),
      ).toBe(true);
      expect(entry.release.publicationState).toBe("research_only");
      if (entry.privacyScope === "self_only") {
        expect(entry.release.prohibitedSurfaces).toEqual([
          "public_profile",
          "share_card",
          "comparison_report",
        ]);
      }
    }
  });
});
