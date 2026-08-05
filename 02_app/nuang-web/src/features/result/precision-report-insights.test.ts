import { describe, expect, it } from "vitest";
import { buildPrecisionFacetInsights } from "@/features/result/precision-report-insights";

describe("buildPrecisionFacetInsights", () => {
  it("selects the clearest valid response directions first", () => {
    const insights = buildPrecisionFacetInsights([
      { facetId: "SE-RE", label: "함께하는 에너지", score: 51, status: "valid" },
      { facetId: "RO-EC", label: "관계", score: 88, status: "valid" },
      { facetId: "SM-OS", label: "질서", score: 14, status: "valid" },
      { facetId: "ER-IR", label: "감정", score: 100, status: "insufficient" },
      { facetId: "UNKNOWN", label: "알 수 없음", score: 0, status: "valid" },
    ]);

    expect(insights.map((insight) => insight.facetId)).toEqual([
      "RO-EC",
      "SM-OS",
      "SE-RE",
    ]);
    expect(insights[0].copy).toContain("상대가 어떤 마음일지");
    expect(insights[1].copy).toContain("그때 쓰기 편하거나");
  });

  it("uses a balanced explanation near the middle", () => {
    expect(
      buildPrecisionFacetInsights([
        { facetId: "OE-IE", label: "탐구", score: 50, status: "valid" },
      ])[0].copy,
    ).toContain("상황에 따라 달라지는");
  });

  it("does not infer unmeasured ability, visible expression, or proven effectiveness", () => {
    const copy = buildPrecisionFacetInsights(
      [
        "OE-AE",
        "OE-CI",
        "OE-IE",
        "SM-EP",
        "SM-OS",
        "ER-IR",
      ].map((facetId) => ({
        facetId,
        label: facetId,
        score: 10,
        status: "valid" as const,
      })),
      10,
    )
      .map((insight) => insight.copy)
      .join(" ");

    expect(copy).not.toMatch(/능력|효과가 확인|차분해 보|유연하게/);
  });
});
