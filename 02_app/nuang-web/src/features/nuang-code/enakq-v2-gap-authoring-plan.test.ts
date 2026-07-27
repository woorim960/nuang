import { describe, expect, it } from "vitest";
import gapPlan from "../../../docs/research/trait-map-data-center-v2/generated/ENAKQ_GAP_AUTHORING_PLAN.json";
import coverage from "../../../docs/research/trait-map-data-center-v2/generated/ENAKQ_SCENARIO_COVERAGE.json";
import {
  traitMapScenarioCatalogV2,
  traitMapV2ChapterIds,
} from "@/features/nuang-code/trait-map-data-center-v2";

describe("ENAKQ v2 gap authoring plan", () => {
  it("turns every uncovered canonical scenario into one evidence-first work item", () => {
    const gapScenarioIds = coverage.rows
      .filter((row) => row.status === "gap_needs_claim")
      .map((row) => row.scenarioId)
      .sort();
    const plannedScenarioIds = gapPlan.items
      .map((item) => item.scenarioId)
      .sort();

    expect(gapPlan.gapCount).toBe(coverage.gapScenarios);
    expect(plannedScenarioIds).toEqual(gapScenarioIds);
    expect(new Set(plannedScenarioIds).size).toBe(plannedScenarioIds.length);
  });

  it("only uses registered scenarios and chapters", () => {
    const scenarioIds = new Set<string>(
      traitMapScenarioCatalogV2.map((scenario) => scenario.scenarioId),
    );
    const chapterIds = new Set<string>(traitMapV2ChapterIds);

    for (const item of gapPlan.items) {
      expect(scenarioIds.has(item.scenarioId)).toBe(true);
      expect(chapterIds.has(item.chapterId)).toBe(true);
    }
  });

  it("does not authorize invented customer copy to fill a gap", () => {
    expect(
      gapPlan.items.every(
        (item) =>
          item.authoringStatus === "evidence_search_required" &&
          item.evidenceGate.customerPublicationAllowed === false &&
          item.evidenceGate.requiresNuangUserValidation === true,
      ),
    ).toBe(true);
  });
});
