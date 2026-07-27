import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_CORRECTED_DRAFT_CAB_01_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map canonical corrected draft CAB-01 v2.1", () => {
  it("corrects all eight target pairs across 93 variants", () => {
    expect(report.reportId).toBe(
      "TRAIT-MAP-CANONICAL-CORRECTED-DRAFT-CAB-01.0.2",
    );
    expect(report.summary.canonicalVariants).toBe(93);
    expect(report.summary.targetedNeighborPairs).toBe(8);
    expect(
      report.summary.targetedNeighborPairsWithBothUniqueDirections,
    ).toBe(8);
    expect(report.appliedDecisions).toHaveLength(8);
  });

  it("keeps only one traceable authored paragraph", () => {
    expect(report.summary.authoredDirectionalParagraphs).toBe(1);
    const authored = report.appliedDecisions
      .map(
        (decision: {
          authoredParagraph: {
            axisDirection: string;
            sourceCandidateRefs: string[];
          } | null;
        }) => decision.authoredParagraph,
      )
      .filter(Boolean);
    expect(authored).toHaveLength(1);
    expect(authored[0].axisDirection).toBe("I");
    expect(authored[0].sourceCandidateRefs.length).toBeGreaterThan(0);
  });

  it("contains no invalid C/Q authored copy or unsupported signatures", () => {
    expect(
      report.appliedDecisions.some(
        (decision: {
          authoredParagraph: { axisDirection: string } | null;
        }) =>
          decision.authoredParagraph?.axisDirection === "C" ||
          decision.authoredParagraph?.axisDirection === "Q",
      ),
    ).toBe(false);
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
    }
  });

  it("passes language safety while staying research-only", () => {
    expect(report.summary.unsafeLanguageFlags).toBe(0);
    expect(report.summary.pendingSevenRoleReviews).toBe(93);
    expect(report.summary.customerApprovedVariants).toBe(0);
    expect(report.publicationState).toBe("research_only");
  });
});
