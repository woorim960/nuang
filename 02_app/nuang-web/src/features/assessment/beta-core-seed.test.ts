import { describe, expect, it } from "vitest";
import {
  betaCoreAssessment,
  betaScoringRelease,
  isBetaCoreReleaseActive,
} from "@/features/assessment/beta-core-seed";
import { calculateCoreScore } from "@/lib/scoring/core";
import { applyCorePlainKoreanRuntimeCopy } from "@/features/assessment/core-runtime-plain-language";

describe("beta core item set", () => {
  it("uses the reviewed plain-Korean copy for every previously blocked item", () => {
    const reviewedCopy = {
      "NU-B1-003": "그 사람이 그때 어떤 기분이었는지 먼저 궁금해진다.",
      "NU-B1-013":
        "상대의 기분보다 문제가 생긴 이유와 해결 방법을 먼저 생각한다.",
      "NU-B1-018": "미리 순서를 정하기보다 그때 가장 먼저 보이는 일부터 한다.",
      "NU-B1-023": "상대의 기분보다 왜 그런 일이 생겼는지 먼저 궁금해진다.",
      "NU-B1-028": "정해 둔 자리보다 지금 쓰는 곳에서 가까운 곳에 둔다.",
      "NU-B1-033":
        "해결 방법을 말하기 전에 상대가 어떤 기분이었는지 더 듣고 싶다.",
      "NU-B1-043":
        "내 의견을 말하기 전에 그 사람이 그때 어떤 기분이었는지 먼저 묻고 싶다.",
      "NU-B1-050":
        "모르는 말이 나오면 그 뜻을 이해할 때까지 질문하거나 찾아본다.",
      "NU-B1-053":
        "누구의 기분이 상했는지보다 어느 부분에서 문제가 생겼는지 먼저 살핀다.",
      "NU-B1-056": "다른 사람들의 의견을 먼저 들은 다음 내 생각을 말한다.",
      "NU-B1-058":
        "정해 둔 자리를 따로 만들기보다 쓸 때마다 꺼내기 쉬운 곳에 둔다.",
    } as const;

    expect(
      Object.fromEntries(
        applyCorePlainKoreanRuntimeCopy(betaCoreAssessment)
          .items.filter((item) => item.itemId in reviewedCopy)
          .map((item) => [item.itemId, item.text]),
      ),
    ).toEqual(reviewedCopy);
  });

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
    expect(result.profileName).toBe("관계를 여는 선도자");
  });

  it("stays inactive until the empirical release gates pass", () => {
    expect(isBetaCoreReleaseActive()).toBe(false);
  });
});
