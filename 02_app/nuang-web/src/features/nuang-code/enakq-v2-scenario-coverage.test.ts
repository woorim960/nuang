import { describe, expect, it } from "vitest";
import coverage from "../../../docs/research/trait-map-data-center-v2/generated/ENAKQ_SCENARIO_COVERAGE.json";
import { traitMapScenarioCatalogV2 } from "@/features/nuang-code/trait-map-data-center-v2";

describe("ENAKQ v2 scenario coverage", () => {
  it("audits all 72 canonical scenarios without dropping gaps", () => {
    expect(coverage.rows).toHaveLength(72);
    expect(coverage.totalCanonicalScenarios).toBe(72);
    expect(
      coverage.candidateCoveredScenarios + coverage.gapScenarios,
    ).toBe(72);
  });

  it("uses the same scenario inventory as the v2 contract", () => {
    expect(
      coverage.rows.map((row) => row.scenarioId).sort(),
    ).toEqual(
      traitMapScenarioCatalogV2.map((scenario) => scenario.scenarioId).sort(),
    );
  });

  it("keeps uncovered scenarios visible as authoring work", () => {
    const gaps = coverage.rows.filter(
      (row) => row.status === "gap_needs_claim",
    );

    expect(gaps).toHaveLength(coverage.gapScenarios);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.every((row) => row.claimRefs.length === 0)).toBe(true);
  });
});
