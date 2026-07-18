import { describe, expect, it } from "vitest";
import {
  candidateQuickCoreAssessment,
  candidateQuickScoringRelease,
} from "@/features/assessment/candidate-quick-core-seed";
import { calculateCoreScore } from "@/lib/scoring/core";

describe("candidate quick core seed", () => {
  it("covers every public candidate facet with balanced keyed directions", () => {
    expect(candidateQuickCoreAssessment.items).toHaveLength(22);
    expect(
      candidateQuickCoreAssessment.items.every((item) =>
        Boolean(item.contextLabel?.trim()),
      ),
    ).toBe(true);

    const itemCountsByDomain = Object.fromEntries(
      candidateQuickScoringRelease.domains.map((domain) => [
        domain.domainId,
        candidateQuickCoreAssessment.items.filter(
          (item) => item.domainId === domain.domainId,
        ).length,
      ]),
    );
    expect(itemCountsByDomain).toEqual({
      SE: 4,
      OE: 6,
      RO: 4,
      SM: 4,
      ER: 4,
    });

    for (const facet of candidateQuickScoringRelease.facets) {
      const items = candidateQuickCoreAssessment.items.filter(
        (item) => item.facetId === facet.facetId,
      );
      expect(items.filter((item) => item.isReverse)).toHaveLength(
        items.length / 2,
      );
      expect(items.filter((item) => !item.isReverse)).toHaveLength(
        items.length / 2,
      );
    }
  });

  it("uses the new five-letter order and can produce a complete candidate code", () => {
    expect(
      candidateQuickScoringRelease.domains.map((domain) => [
        domain.lowSymbol,
        domain.highSymbol,
      ]),
    ).toEqual([
      ["I", "E"],
      ["R", "N"],
      ["G", "A"],
      ["M", "K"],
      ["C", "Q"],
    ]);

    const result = calculateCoreScore(
      candidateQuickScoringRelease,
      candidateQuickCoreAssessment.items.map((item) => ({
        itemId: item.itemId,
        value: item.isReverse ? 1 : 5,
      })),
    );

    expect(result.code).toBe("ENAKQ");
    expect(result.profileName).toBeTruthy();
    expect(result.domains.every((domain) => domain.status === "valid")).toBe(
      true,
    );
  });

  it("provides exactly three follow-up items for every tied domain", () => {
    for (const domain of candidateQuickScoringRelease.domains) {
      expect(
        candidateQuickCoreAssessment.adaptiveItems?.filter(
          (item) => item.domainId === domain.domainId,
        ),
      ).toHaveLength(3);
    }
  });
});
