import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_PREFLIGHT_CAB_01_V2.json",
    ),
    "utf8",
  ),
);

describe("trait-map canonical preflight CAB-01 v2", () => {
  it("passes automated integrity and safety without pretending expert approval", () => {
    expect(report.batchId).toBe("CAB-01");
    expect(report.summary.canonicalVariants).toBe(101);
    expect(report.summary.automatedPreflightPassed).toBe(true);
    expect(report.summary.automatedHardFailures).toBe(0);
    expect(report.summary.customerApprovedVariants).toBe(0);
    expect(report.summary.pendingSevenRoleReviews).toBe(101);
    expect(report.publicationState).toBe("research_only");
  });

  it("keeps source, primary direction, privacy, and unsafe-language checks clean", () => {
    expect(report.summary.sourceTraceabilityFailures).toBe(0);
    expect(report.summary.sourceAccountingFailures).toBe(0);
    expect(report.summary.selectedPrimaryFailures).toBe(0);
    expect(report.summary.privacyScopeFailures).toBe(0);
    expect(report.summary.overclaimFlags).toBe(0);
    expect(report.summary.diagnosticOrStigmaFlags).toBe(0);
    expect(report.summary.vagueHedgeFlags).toBe(0);
    expect(report.summary.blocksOverRecommendedLength).toBe(0);
  });

  it("records semantic rewrite work instead of hiding duplicated neighbor outputs", () => {
    expect(report.summary.informationPreservingRewriteVariants).toBe(47);
    expect(report.summary.fullyIdenticalNeighborOutputPairs).toBe(0);
    expect(report.summary.neighborPairsSharingExactBlock).toBe(12);
    expect(report.summary.semanticDifferentiationVariants).toBeGreaterThan(0);
    expect(
      report.summary.variantsReadyForSevenRoleReview +
        report.summary.variantsRequiringSemanticRewrite,
    ).toBe(101);
    expect(
      report.editorialQueues.semanticDifferentiation.every(
        (item: { changedAxis?: string; sharedOutput?: string[] }) =>
          Boolean(item.changedAxis) && (item.sharedOutput?.length ?? 0) > 0,
      ),
    ).toBe(true);
  });

  it("keeps every audited variant out of customer publication", () => {
    for (const audit of report.variantAudits) {
      expect(audit.hardFailures).toEqual([]);
      expect(audit.expertApprovalState).toBe("pending");
      expect(audit.publicationState).toBe("research_only");
      expect(Object.values(audit.checks).every(Boolean)).toBe(true);
    }
  });
});
