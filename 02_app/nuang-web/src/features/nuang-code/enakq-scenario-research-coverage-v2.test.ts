import { describe, expect, it } from "vitest";
import researchCoverage from "../../../docs/research/trait-map-data-center-v2/generated/ENAKQ_SCENARIO_RESEARCH_COVERAGE_V2.json";
import scenarioReview from "../../../docs/research/trait-map-data-center-v2/generated/ENAKQ_SCENARIO_REVIEW_V2.json";
import { traitMapScenarioCatalogV2 } from "@/features/nuang-code/trait-map-data-center-v2";

describe("ENAKQ scenario research coverage v2", () => {
  it("covers all 72 canonical scenarios at research-candidate level", () => {
    expect(researchCoverage.canonicalScenarioCount).toBe(72);
    expect(researchCoverage.totalResearchCandidateCovered).toBe(72);
    expect(researchCoverage.remainingResearchGaps).toBe(0);
    expect(
      new Set(researchCoverage.rows.map((row) => row.scenarioId)).size,
    ).toBe(72);
    expect(
      researchCoverage.rows.every((row) => row.researchCandidateCovered),
    ).toBe(true);
  });

  it("does not confuse research coverage with customer approval", () => {
    expect(researchCoverage.customerApprovedScenarios).toBe(0);
    expect(
      researchCoverage.rows.every((row) => row.customerApproved === false),
    ).toBe(true);
    expect(scenarioReview.summary.customerVisibleClaims).toBe(0);
    expect(
      scenarioReview.claims.every(
        (claim) => claim.publicationState === "research_only",
      ),
    ).toBe(true);
  });

  it("matches the catalog and standardizes all 72 scenes into four channels", () => {
    const canonicalIds = new Set(
      traitMapScenarioCatalogV2.map((scenario) => scenario.scenarioId),
    );

    expect(scenarioReview.validationQueue).toHaveLength(72);
    expect(scenarioReview.claims).toHaveLength(288);
    expect(researchCoverage.newReviewCandidateCovered).toBe(72);
    for (const row of researchCoverage.rows) {
      expect(canonicalIds.has(row.scenarioId)).toBe(true);
    }
  });
});
