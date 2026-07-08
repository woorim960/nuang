import { describe, expect, it } from "vitest";
import {
  fullCoreAssessment,
  fullScoringRelease,
} from "@/features/assessment/full-core-seed";
import { quickCoreAssessment } from "@/features/assessment/quick-core-seed";

describe("full core seed", () => {
  it("contains 60 full items and keeps quick items reusable", () => {
    expect(fullCoreAssessment.items).toHaveLength(60);

    const fullIds = new Set(fullCoreAssessment.items.map((item) => item.itemId));
    for (const quickItem of quickCoreAssessment.items) {
      expect(fullIds.has(quickItem.itemId)).toBe(true);
    }
  });

  it("uses stricter full-core scoring validity", () => {
    expect(fullScoringRelease.facets).toHaveLength(10);
    expect(fullScoringRelease.facets.every((facet) => facet.minValidResponses === 4)).toBe(
      true,
    );
  });
});
