import { describe, expect, it } from "vitest";
import {
  quickCoreAssessment,
  quickScoringRelease,
  responseOptions,
} from "@/features/assessment/quick-core-seed";

describe("quick core seed", () => {
  it("contains 20 interleaved quick items and 5 response choices", () => {
    expect(quickCoreAssessment.items).toHaveLength(20);
    expect(responseOptions).toHaveLength(5);
    expect(responseOptions.map((option) => option.label)).toEqual([
      "거의 그렇지 않아요",
      "드문 편이에요",
      "반반이에요",
      "자주 그래요",
      "거의 항상 그래요",
    ]);
    expect(quickCoreAssessment.items[0].itemId).toBe("NU-C17-SERE-01");
    expect(quickCoreAssessment.items[1].domainId).toBe("ER");
  });

  it("separates a clear situation label from every quick-core question", () => {
    expect(
      quickCoreAssessment.items.every(
        (item) =>
          Boolean(item.contextLabel?.trim()) &&
          item.contextLabel?.trim() !== item.text.trim(),
      ),
    ).toBe(true);
    expect(quickCoreAssessment.items[0]).toMatchObject({
      contextLabel: "사람들과 함께하는 자리에 있을 때",
      text: "그 흐름에 자연스럽게 참여한다.",
    });
  });

  it("contains 10 facets, 5 domains, and 32 profile names", () => {
    expect(quickScoringRelease.facets).toHaveLength(10);
    expect(quickScoringRelease.domains).toHaveLength(5);
    expect(Object.keys(quickScoringRelease.profileNames)).toHaveLength(32);
  });
});
