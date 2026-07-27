import { describe, expect, it } from "vitest";
import copyAudit from "../../../docs/research/trait-map-data-center-v2/generated/IRGMC_SCENARIO_COPY_AUDIT_V2.json";
import coverage from "../../../docs/research/trait-map-data-center-v2/generated/IRGMC_SCENARIO_RESEARCH_COVERAGE_V2.json";
import review from "../../../docs/research/trait-map-data-center-v2/generated/IRGMC_SCENARIO_REVIEW_V2.json";
import { traitMapScenarioCatalogV2 } from "@/features/nuang-code/trait-map-data-center-v2";

describe("IRGMC scenario research coverage v2", () => {
  it("covers all 72 canonical scenarios with four research claims", () => {
    expect(coverage.canonicalScenarioCount).toBe(72);
    expect(coverage.totalResearchCandidateCovered).toBe(72);
    expect(coverage.remainingResearchGaps).toBe(0);
    expect(coverage.researchCandidateClaims).toBe(288);
    expect(coverage.rows.every((row) => row.claimCount === 4)).toBe(true);
  });

  it("matches the canonical scenario catalog exactly", () => {
    const canonicalIds = new Set(
      traitMapScenarioCatalogV2.map((scenario) => scenario.scenarioId),
    );
    const researchIds = new Set(coverage.rows.map((row) => row.scenarioId));
    expect(researchIds).toEqual(canonicalIds);
  });

  it("keeps every claim unpublished until the validation gates pass", () => {
    expect(review.summary.customerVisibleClaims).toBe(0);
    expect(coverage.customerApprovedScenarios).toBe(0);
    expect(
      review.claims.every(
        (claim) =>
          claim.publicationState === "research_only" &&
          claim.evidenceStatus === "nuang_validation_required",
      ),
    ).toBe(true);
  });

  it("passes automatic copy rules without treating them as expert approval", () => {
    expect(copyAudit.auditedClaims).toBe(288);
    expect(copyAudit.rewriteRequired).toBe(0);
    expect(copyAudit.exactDuplicateAssertions).toBe(0);
    expect(copyAudit.status).toBe(
      "AUTOMATIC_RULES_PASSED_HUMAN_REVIEW_REQUIRED",
    );
  });
});
