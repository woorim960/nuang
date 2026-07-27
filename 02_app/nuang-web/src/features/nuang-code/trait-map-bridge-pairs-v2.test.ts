import { describe, expect, it } from "vitest";
import {
  getOneLetterNeighborCodes,
  traitMapScenarioCatalogV2,
} from "@/features/nuang-code/trait-map-data-center-v2";
import {
  traitMapBridgePairsV2,
  traitMapBridgeProductionOrderV2,
} from "@/features/nuang-code/trait-map-bridge-pairs-v2";

describe("trait-map bridge pairs v2", () => {
  it("covers the ten unique one-letter neighbors of both anchors", () => {
    expect(traitMapBridgePairsV2).toHaveLength(5);
    expect(traitMapBridgeProductionOrderV2).toHaveLength(10);
    expect(new Set(traitMapBridgeProductionOrderV2).size).toBe(10);
    expect(new Set(traitMapBridgeProductionOrderV2)).toEqual(
      new Set([
        ...getOneLetterNeighborCodes("ENAKQ"),
        ...getOneLetterNeighborCodes("IRGMC"),
      ]),
    );
  });

  it("orders each axis as a two-anchor calibration pair", () => {
    expect(traitMapBridgePairsV2.map((pair) => pair.order)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    for (const pair of traitMapBridgePairsV2) {
      expect(pair.enakqSide.anchor).toBe("ENAKQ");
      expect(pair.irgmcSide.anchor).toBe("IRGMC");
      expect(pair.discriminatingScenarioIds.length).toBeGreaterThanOrEqual(10);
    }
  });

  it("references only canonical scenarios", () => {
    const scenarioIds = new Set(
      traitMapScenarioCatalogV2.map((scenario) => scenario.scenarioId),
    );
    for (const pair of traitMapBridgePairsV2) {
      for (const scenarioId of pair.discriminatingScenarioIds) {
        expect(scenarioIds.has(scenarioId)).toBe(true);
      }
    }
  });
});
