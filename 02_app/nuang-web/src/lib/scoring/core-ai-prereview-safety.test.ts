import { describe, expect, it } from "vitest";
import { candidateFullScoringRelease } from "@/features/assessment/candidate-full-core-seed";
import { candidateQuickScoringRelease } from "@/features/assessment/candidate-quick-core-seed";
import {
  calculateCoreScore,
  isCoreResultUndetermined,
  scoreResponse,
} from "@/lib/scoring/core";

describe("candidate core AI prereview software edge cases", () => {
  it("keeps the full bank mechanically balanced without calling it validated", () => {
    const byFacet = new Map<string, { direct: number; reverse: number }>();
    for (const item of candidateFullScoringRelease.items) {
      const count = byFacet.get(item.facetId) ?? { direct: 0, reverse: 0 };
      count[item.isReverse ? "reverse" : "direct"] += 1;
      byFacet.set(item.facetId, count);
    }

    expect(candidateFullScoringRelease.items).toHaveLength(60);
    expect([...byFacet.values()]).toHaveLength(10);
    expect([...byFacet.values()]).toEqual(
      expect.arrayContaining(
        Array.from({ length: 10 }, () => ({ direct: 3, reverse: 3 })),
      ),
    );
  });

  it("covers every quick public facet but records its low minimum evidence", () => {
    const itemFacets = new Set(
      candidateQuickScoringRelease.items.map((item) => item.facetId),
    );
    const publicFacets = new Set(
      candidateQuickScoringRelease.domains.flatMap(
        (domain) => domain.facetIds,
      ),
    );

    expect(candidateQuickScoringRelease.items).toHaveLength(22);
    expect(itemFacets).toEqual(publicFacets);
    expect(
      candidateQuickScoringRelease.facets.filter(
        (facet) => facet.minValidResponses === 1,
      ),
    ).toHaveLength(9);
  });

  it("fails closed for empty and all-unsure responses", () => {
    expect(calculateCoreScore(candidateFullScoringRelease, []).code).toBeNull();
    expect(
      calculateCoreScore(
        candidateFullScoringRelease,
        candidateFullScoringRelease.items.map((item) => ({
          answeredAt: "2026-08-05T00:00:00.000Z",
          isUnsure: true as const,
          itemId: item.itemId,
          unsureReason: "CONTEXT_VARIES" as const,
        })),
      ).code,
    ).toBeNull();
  });

  it("preserves keyed-direction monotonicity", () => {
    expect(scoreResponse(1, false)).toBeLessThan(scoreResponse(5, false));
    expect(scoreResponse(1, true)).toBeGreaterThan(scoreResponse(5, true));
  });

  it("exposes neutral straightlining as boundary evidence", () => {
    const result = calculateCoreScore(
      candidateFullScoringRelease,
      candidateFullScoringRelease.items.map((item) => ({
        answeredAt: "2026-08-05T00:00:00.000Z",
        itemId: item.itemId,
        value: 3 as const,
      })),
    );

    expect(result.domains.every((domain) => domain.isBoundary)).toBe(true);
    expect(isCoreResultUndetermined(result)).toBe(true);
  });
});
