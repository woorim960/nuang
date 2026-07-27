import { describe, expect, it } from "vitest";
import baseline from "../../../docs/research/trait-map-data-center-v2/generated/IRGMC_RESEARCH_BASELINE_V2.json";
import { traitMapScenarioCatalogV2 } from "@/features/nuang-code/trait-map-data-center-v2";

describe("IRGMC research baseline v2", () => {
  it("scaffolds all chapters and scenarios without claiming completion", () => {
    expect(baseline.metrics.chapterQuestionCount).toBe(16);
    expect(baseline.metrics.canonicalScenarioCount).toBe(72);
    expect(baseline.scenarioInventory).toHaveLength(72);
    expect(
      baseline.scenarioInventory.every(
        (scenario) => scenario.authoringStatus === "not_started",
      ),
    ).toBe(true);
    expect(baseline.metrics.customerApprovedClaims).toBe(0);
  });

  it("uses the canonical scenario IDs and exact opposite anchor", () => {
    const canonicalIds = new Set(
      traitMapScenarioCatalogV2.map((scenario) => scenario.scenarioId),
    );
    for (const scenario of baseline.scenarioInventory) {
      expect(canonicalIds.has(scenario.scenarioId)).toBe(true);
    }
    expect(baseline.oppositeAnchor).toBe("ENAKQ");
  });

  it("keeps the five one-letter neighbors distinct from the opposite anchor", () => {
    expect(baseline.oneLetterNeighbors).toHaveLength(5);
    expect(baseline.oneLetterNeighbors).not.toContain("ENAKQ");
  });
});
