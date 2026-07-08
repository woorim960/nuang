import { describe, expect, it } from "vitest";
import { calculateCoreScore, scoreResponse } from "@/lib/scoring/core";
import type { ScoringRelease } from "@/lib/scoring/types";

const release: ScoringRelease = {
  items: [
    { itemId: "i1", facetId: "se_together", isReverse: false },
    { itemId: "i2", facetId: "se_together", isReverse: true },
    { itemId: "i3", facetId: "se_express", isReverse: false },
    { itemId: "i4", facetId: "se_express", isReverse: false },
    { itemId: "i5", facetId: "er_reactive", isReverse: false },
    { itemId: "i6", facetId: "er_reactive", isReverse: true },
    { itemId: "i7", facetId: "er_worry", isReverse: false },
    { itemId: "i8", facetId: "er_worry", isReverse: true },
  ],
  facets: [
    { facetId: "se_together", label: "함께하는 에너지", minValidResponses: 2 },
    { facetId: "se_express", label: "먼저 표현하기", minValidResponses: 2 },
    { facetId: "er_reactive", label: "감정이 커지는 정도", minValidResponses: 2 },
    { facetId: "er_worry", label: "걱정과 망설임", minValidResponses: 2 },
  ],
  domains: [
    {
      domainId: "SE",
      label: "사람 사이 에너지",
      lowSymbol: "S",
      highSymbol: "T",
      facetIds: ["se_together", "se_express"],
    },
    {
      domainId: "ER",
      label: "마음의 반응",
      lowSymbol: "C",
      highSymbol: "V",
      facetIds: ["er_reactive", "er_worry"],
    },
  ],
  profileNames: {
    TV: "불꽃 온기 탐험가",
    TC: "불꽃 균형 탐험가",
    SV: "물결 온기 탐험가",
    SC: "숲 균형 탐험가",
  },
};

describe("scoreResponse", () => {
  it("converts forward and reverse responses to 0-100 scores", () => {
    expect(scoreResponse(1, false)).toBe(0);
    expect(scoreResponse(5, false)).toBe(100);
    expect(scoreResponse(1, true)).toBe(100);
    expect(scoreResponse(5, true)).toBe(0);
  });
});

describe("calculateCoreScore", () => {
  it("calculates facet, domain, code, and profile name", () => {
    const result = calculateCoreScore(release, [
      { itemId: "i1", value: 5 },
      { itemId: "i2", value: 1 },
      { itemId: "i3", value: 4 },
      { itemId: "i4", value: 4 },
      { itemId: "i5", value: 2 },
      { itemId: "i6", value: 4 },
      { itemId: "i7", value: 2 },
      { itemId: "i8", value: 4 },
    ]);

    expect(result.facets[0].score).toBe(100);
    expect(result.domains[0].score).toBe(87.5);
    expect(result.domains[1].score).toBe(25);
    expect(result.code).toBe("TC");
    expect(result.profileName).toBe("불꽃 균형 탐험가");
  });

  it("excludes unsure responses and marks insufficient facets", () => {
    const result = calculateCoreScore(release, [
      { itemId: "i1", value: 5 },
      { itemId: "i2", isUnsure: true },
      { itemId: "i3", value: 4 },
      { itemId: "i4", value: 4 },
    ]);

    expect(result.facets[0].status).toBe("insufficient");
    expect(result.domains[0].status).toBe("partial");
    expect(result.domains[1].status).toBe("insufficient");
    expect(result.code).toBeNull();
  });

  it("marks 45-55 as boundary and returns nearby alternative codes", () => {
    const result = calculateCoreScore(release, [
      { itemId: "i1", value: 3 },
      { itemId: "i2", value: 3 },
      { itemId: "i3", value: 3 },
      { itemId: "i4", value: 3 },
      { itemId: "i5", value: 4 },
      { itemId: "i6", value: 2 },
      { itemId: "i7", value: 4 },
      { itemId: "i8", value: 2 },
    ]);

    expect(result.domains[0].score).toBe(50);
    expect(result.domains[0].isBoundary).toBe(true);
    expect(result.code).toBe("TV");
    expect(result.alternativeCodes).toContain("SV");
  });
});
