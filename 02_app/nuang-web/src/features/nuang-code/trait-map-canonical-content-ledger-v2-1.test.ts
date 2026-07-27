import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_CONTENT_LEDGER_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map canonical content ledger v2.1", () => {
  it("creates one versioned entry for all 705 variants", () => {
    expect(report.summary.entries).toBe(705);
    expect(report.summary.uniqueContentKeys).toBe(705);
    expect(report.summary.uniqueCanonicalVariantIds).toBe(705);
    expect(report.summary.claimKeys).toBe(288);
    expect(report.summary.duplicateContentKeys).toBe(0);
    expect(report.summary.duplicateCanonicalIds).toBe(0);
  });

  it("resolves all 9,216 refs with distinguishable claim output", () => {
    expect(report.summary.profileClaimRefsResolved).toBe(32 * 288);
    expect(report.summary.unresolvedProfileRefs).toBe(0);
    expect(report.summary.duplicateOutputWithinClaim).toBe(0);
  });

  it("versions all 21 CAB-01 P0 revisions separately", () => {
    expect(report.summary.versionTwoRevisedEntries).toBe(21);
    const revised = report.entries.filter(
      (entry: { version: number }) => entry.version === 2,
    );
    expect(revised).toHaveLength(21);
    for (const entry of revised) {
      expect(entry.provenance.internalRevision).toBeTruthy();
      expect(
        entry.provenance.internalRevision.previousContent,
      ).toBeTruthy();
    }
  });

  it("preserves three authored paragraphs and automated gates", () => {
    expect(report.summary.authoredDirectionalParagraphs).toBe(3);
    expect(report.summary.lineageExclusions).toBeGreaterThan(0);
    expect(report.summary.automatedGatePassedEntries).toBe(705);
    for (const entry of report.entries) {
      expect(entry.content.summaryText).toBeTruthy();
      expect(entry.content.detailParagraphs.length).toBeGreaterThan(0);
      expect(entry.provenance.sourceUnitIds.length).toBeGreaterThan(0);
    }
  });

  it("keeps expert, empirical, and publication gates pending", () => {
    expect(report.summary.sevenRoleReviewedEntries).toBe(0);
    expect(report.summary.customerApprovedEntries).toBe(0);
    expect(report.publicationState).toBe("research_only");
    for (const entry of report.entries) {
      expect(entry.release.publicationState).toBe("research_only");
    }
  });
});
