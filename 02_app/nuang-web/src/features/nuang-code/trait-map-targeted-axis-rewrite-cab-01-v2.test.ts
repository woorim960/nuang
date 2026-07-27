import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/review/TRAIT_MAP_TARGETED_AXIS_REWRITE_CAB_01_V2.json",
    ),
    "utf8",
  ),
);

describe("trait-map targeted axis rewrite CAB-01 v2", () => {
  it("creates a bounded packet for every flagged neighbor pair", () => {
    expect(report.batchId).toBe("CAB-01");
    expect(report.summary.neighborPairs).toBe(12);
    expect(report.summary.affectedVariants).toBe(24);
    expect(report.pairs).toHaveLength(12);
  });

  it("diagnoses one-sided differentiation instead of calling all output identical", () => {
    expect(report.summary.oneSidedDifferentiationPairs).toBe(12);
    expect(report.summary.pairsMissingBothDirections).toBe(0);
    for (const pair of report.pairs) {
      expect(pair.automatedDiagnosis.missingDirection).toBeTruthy();
      expect(
        pair.automatedDiagnosis.leftHasUniqueDirectionBlock,
      ).not.toBe(pair.automatedDiagnosis.rightHasUniqueDirectionBlock);
    }
  });

  it("provides traceable same-claim candidates for each missing direction", () => {
    expect(
      report.summary.pairsWithTraceableAlternativeCandidatesOnMissingSide,
    ).toBe(12);
    for (const pair of report.pairs) {
      const missing =
        pair.automatedDiagnosis.missingDirection === pair.left.axisDirection
          ? pair.left
          : pair.right;
      expect(missing.sourceCandidates.length).toBeGreaterThan(0);
      for (const candidate of missing.sourceCandidates) {
        expect(candidate.sourceUnitId).toBeTruthy();
        expect(candidate.evidenceFindingRefs.length).toBeGreaterThan(0);
        expect(candidate.independentSourceRefs.length).toBeGreaterThan(0);
      }
    }
  });

  it("does not pre-approve or publish generated rewrites", () => {
    expect(report.summary.completedRewrites).toBe(0);
    expect(report.summary.customerApprovedPairs).toBe(0);
    expect(report.publicationState).toBe("research_only");
    for (const pair of report.pairs) {
      expect(pair.proposedRewrite.state).toBe(
        "pending_evidence_bounded_authoring",
      );
      expect(pair.proposedRewrite.leftUniqueParagraph).toBeNull();
      expect(pair.proposedRewrite.rightUniqueParagraph).toBeNull();
      expect(pair.publicationState).toBe("research_only");
    }
  });
});
