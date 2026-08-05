import { describe, expect, it } from "vitest";
import type { AccountTraitProfile } from "@/features/assessment/account-trait-profile-contract";
import {
  buildTopicTraitImpactSnapshot,
  getTopicTraitImpactPresentation,
  readTopicTraitImpactSnapshot,
} from "@/features/assessment/topic-trait-impact";

describe("topic trait impact", () => {
  it("distinguishes an exact zero change from a small adjustment", () => {
    const unchanged = buildImpact(profile(), profile());
    const small = buildImpact(profile(), profile({ SE: 61.1 }));

    expect(unchanged.degree).toBe("none");
    expect(getTopicTraitImpactPresentation(unchanged).title).toBe(
      "이번에는 달라진 부분이 없어요",
    );
    expect(small.degree).toBe("small");
    expect(getTopicTraitImpactPresentation(small).title).toBe(
      "뉴앙코드는 그대로예요",
    );
  });

  it("uses the three-point boundary for a clearer adjustment", () => {
    expect(buildImpact(profile(), profile({ SE: 62.9 })).degree).toBe("small");
    expect(buildImpact(profile(), profile({ SE: 63 })).degree).toBe("clear");
  });

  it("explains movement toward the center without calling it worse", () => {
    const impact = buildImpact(profile({ SE: 70 }), profile({ SE: 64 }));
    const presentation = getTopicTraitImpactPresentation(impact);

    expect(impact.affectedDomains[0].presentation).toBe("more_balanced");
    expect(presentation.title).toBe("두 모습의 차이가 줄었어요");
    expect(presentation.items[0].detail).toContain(
      "차이가 전보다 조금 줄었어요",
    );
  });

  it("only calls a movement more balanced when it actually moves toward center", () => {
    const awayFromCenter = buildImpact(
      profile({ SE: 50 }),
      profile({ SE: 54 }),
    );
    const towardCenter = buildImpact(profile({ SE: 54 }), profile({ SE: 52 }));

    expect(awayFromCenter.affectedDomains[0].presentation).toBe("clearer");
    expect(towardCenter.affectedDomains[0].presentation).toBe("more_balanced");
  });

  it("separates a code letter adjustment from a score-only change", () => {
    const before = profile({ RO: 47 }, "ENGKQ");
    const after = profile({ RO: 58 }, "ENAKQ");
    const impact = buildTopicTraitImpactSnapshot({
      affectedDomainIds: ["RO"],
      after,
      before,
      calculatedAt: "2026-08-03T12:00:00.000Z",
      evidenceApplied: true,
      isRetest: true,
    });

    expect(impact.degree).toBe("code_changed");
    expect(getTopicTraitImpactPresentation(impact)).toMatchObject({
      badge: "코드가 조정됐어요",
      title: "뉴앙코드 한 글자가 달라졌어요",
    });
  });

  it("derives changed code domains even if an upstream affected-id list misses one", () => {
    const impact = buildTopicTraitImpactSnapshot({
      affectedDomainIds: [],
      after: profile({ RO: 58 }, "ENAKQ"),
      before: profile({ RO: 47 }, "ENGKQ"),
      calculatedAt: "2026-08-03T12:00:00.000Z",
      evidenceApplied: true,
      isRetest: true,
    });

    expect(impact.affectedDomains.map((domain) => domain.domainId)).toContain(
      "RO",
    );
    expect(getTopicTraitImpactPresentation(impact).title).toBe(
      "뉴앙코드 한 글자가 달라졌어요",
    );
  });

  it("does not let one balanced axis overstate a mixed multi-axis change", () => {
    const impact = buildTopicTraitImpactSnapshot({
      affectedDomainIds: ["SE", "OE"],
      after: profile({ SE: 70, OE: 64 }),
      before: profile({ SE: 60, OE: 70 }),
      calculatedAt: "2026-08-03T12:00:00.000Z",
      evidenceApplied: true,
      isRetest: false,
    });

    expect(getTopicTraitImpactPresentation(impact).title).toBe(
      "2가지 모습이 더 구체적으로 보였어요",
    );
  });

  it("uses a dedicated explanation when the opposite side appears without a code change", () => {
    const before = profile({ RO: 56 });
    const after = profile({ RO: 48 });
    const afterDomain = after.domains.find(
      (domain) => domain.domainId === "RO",
    );
    if (!afterDomain) throw new Error("RO fixture missing");
    afterDomain.rawSymbol = "G";
    const impact = buildTopicTraitImpactSnapshot({
      affectedDomainIds: ["RO"],
      after,
      before,
      calculatedAt: "2026-08-03T12:00:00.000Z",
      evidenceApplied: true,
      isRetest: false,
    });

    expect(impact.affectedDomains[0].presentation).toBe("opposite_seen");
    expect(getTopicTraitImpactPresentation(impact)).toMatchObject({
      badge: "코드 유지",
      title: "반대쪽 모습도 함께 보였어요",
    });
  });

  it("explains when a previous result from the same topic was replaced", () => {
    const impact = buildTopicTraitImpactSnapshot({
      affectedDomainIds: ["SE"],
      after: profile({ SE: 64 }),
      before: profile({ SE: 60 }),
      calculatedAt: "2026-08-03T12:00:00.000Z",
      evidenceApplied: true,
      isRetest: true,
    });

    expect(getTopicTraitImpactPresentation(impact).note).toContain(
      "지난번 같은 주제 결과를 이번 답으로 바꿔 반영했어요",
    );
  });

  it("does not mislabel missing baselines as no change", () => {
    const impact = buildTopicTraitImpactSnapshot({
      affectedDomainIds: ["SE"],
      after: null,
      before: null,
      calculatedAt: "2026-08-03T12:00:00.000Z",
      evidenceApplied: true,
      isRetest: false,
    });

    expect(impact.state).toBe("no_baseline");
    expect(getTopicTraitImpactPresentation(impact).title).toBe(
      "아직 비교할 뉴앙코드가 없어요",
    );
  });

  it("keeps insufficient evidence separate from no change", () => {
    const impact = buildTopicTraitImpactSnapshot({
      affectedDomainIds: [],
      after: profile(),
      before: profile(),
      calculatedAt: "2026-08-03T12:00:00.000Z",
      evidenceApplied: false,
      isRetest: false,
    });

    expect(impact.state).toBe("insufficient_evidence");
    expect(getTopicTraitImpactPresentation(impact).title).toContain(
      "코드에 반영할 내용이 충분하지 않았어요",
    );
  });

  it("omits a malformed frozen snapshot instead of exposing it to the report", () => {
    const valid = buildImpact(profile(), profile({ SE: 64 }));

    expect(readTopicTraitImpactSnapshot(valid)).toEqual(valid);
    expect(
      readTopicTraitImpactSnapshot({
        ...valid,
        affectedDomains: [null],
      }),
    ).toBeNull();
    expect(
      readTopicTraitImpactSnapshot({
        ...valid,
        after: { ...valid.after, code: "BAD" },
      }),
    ).toBeNull();
  });
});

function buildImpact(before: AccountTraitProfile, after: AccountTraitProfile) {
  return buildTopicTraitImpactSnapshot({
    affectedDomainIds: ["SE"],
    after,
    before,
    calculatedAt: "2026-08-03T12:00:00.000Z",
    evidenceApplied: true,
    isRetest: false,
  });
}

function profile(
  scores: Partial<Record<"ER" | "OE" | "RO" | "SE" | "SM", number>> = {},
  code = "ENAKQ",
): AccountTraitProfile {
  const domainIds = ["SE", "OE", "RO", "SM", "ER"] as const;
  return {
    alternativeCodes: [],
    baseResultReportId: "11111111-1111-4111-8111-111111111111",
    code,
    domains: domainIds.map((domainId, index) => ({
      change: "stable",
      domainId,
      evidenceCount: 1,
      evidenceWeight: 1,
      isBoundary: false,
      label: domainId,
      rawSymbol: code[index],
      score: scores[domainId] ?? 60,
      status: "valid",
      symbol: code[index],
    })),
    evidenceCount: 5,
    profileName: "관계를 여는 선도자",
    source: "core_and_topics",
    topicCount: 1,
    updatedAt: "2026-08-03T12:00:00.000Z",
    version: "dynamic-trait-evidence.v0.1",
  };
}
