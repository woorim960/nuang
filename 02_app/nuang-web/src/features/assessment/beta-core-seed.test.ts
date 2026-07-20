import { describe, expect, it } from "vitest";
import {
  betaCoreAssessment,
  betaScoringRelease,
  isBetaCoreReleaseActive,
} from "@/features/assessment/beta-core-seed";
import { calculateCoreScore } from "@/lib/scoring/core";

describe("beta core item set", () => {
  it("contains 60 balanced context-labelled items without private or conditional facets", () => {
    expect(betaCoreAssessment.items).toHaveLength(60);
    expect(
      new Set(betaCoreAssessment.items.map((item) => item.itemId)).size,
    ).toBe(60);
    expect(
      betaCoreAssessment.items.every((item) => Boolean(item.contextLabel)),
    ).toBe(true);

    const counts = new Map<string, { direct: number; reverse: number }>();
    betaCoreAssessment.items.forEach((item) => {
      const current = counts.get(item.facetId) ?? { direct: 0, reverse: 0 };
      current[item.isReverse ? "reverse" : "direct"] += 1;
      counts.set(item.facetId, current);
    });

    expect(counts.size).toBe(10);
    counts.forEach((count) => expect(count).toEqual({ direct: 3, reverse: 3 }));
    expect(counts.has("SM-RL")).toBe(false);
    expect(counts.has("RO-RN")).toBe(false);
    expect(
      betaScoringRelease.domains.flatMap((domain) => domain.facetIds),
    ).not.toEqual(expect.arrayContaining(["SM-RL", "RO-RN"]));
  });

  it("provides exactly three forced-choice follow-up items per code position", () => {
    expect(betaCoreAssessment.adaptiveItems).toHaveLength(15);
    expect(
      new Set(betaCoreAssessment.adaptiveItems?.map((item) => item.itemId))
        .size,
    ).toBe(15);

    for (const domainId of ["SE", "OE", "RO", "SM", "ER"]) {
      expect(
        betaCoreAssessment.adaptiveItems?.filter(
          (item) => item.domainId === domainId,
        ),
      ).toHaveLength(3);
    }
    expect(
      betaCoreAssessment.adaptiveItems?.every(
        (item) => item.responseFormat === "forced_direction_4",
      ),
    ).toBe(true);
  });

  it("builds the owner-approved five-letter customer order", () => {
    const result = calculateCoreScore(
      betaScoringRelease,
      betaCoreAssessment.items.map((item) => ({
        itemId: item.itemId,
        value: item.isReverse ? (1 as const) : (5 as const),
      })),
    );

    expect(result.code).toBe("ENAKQ");
    expect(result.profileName).toBe("관계를 여는 지휘자");
  });

  it("stays inactive until the empirical release gates pass", () => {
    expect(isBetaCoreReleaseActive()).toBe(false);
  });
});
