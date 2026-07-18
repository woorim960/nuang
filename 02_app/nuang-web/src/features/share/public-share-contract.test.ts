import { describe, expect, it } from "vitest";
import {
  createPublicShareSuccessPayload,
  createPublicShareUnavailablePayload,
  publicShareMaxDomainCount,
  publicShareUnavailableStates,
} from "@/features/share/public-share-contract";

const domainSummaries = [
  { domainId: "SE", label: "사람 사이 에너지", score: 72, symbol: "T" },
  { domainId: "ER", label: "마음의 반응", score: 64, symbol: "V" },
  { domainId: "SM", label: "일상 리듬", score: 68, symbol: "O" },
  { domainId: "RO", label: "관계 방식", score: 58, symbol: "A" },
  { domainId: "OE", label: "감각과 생각", score: 66, symbol: "E" },
  { domainId: "EXTRA", label: "노출되면 안 되는 추가 축", score: 99, symbol: "X" },
];

describe("public share contract", () => {
  it("returns only the summary result surface for an active share", () => {
    const payload = createPublicShareSuccessPayload({
      assessmentKind: "full",
      completedAt: "2026-07-04T00:00:00.000Z",
      domains: domainSummaries,
      profileCode: "TVOAE",
      profileName: "불꽃의 온기 탐험가",
      resultLabel: "현재 가장 가까운 대표 성향",
    });

    expect(payload.ok).toBe(true);
    expect(payload.share.visibility).toBe("summary");
    expect(payload.share.result.assessmentKind).toBe("full");
    expect(payload.share.result.domains).toHaveLength(publicShareMaxDomainCount);
    expect(payload.share.result.domains.map((domain) => domain.domainId)).toEqual([
      "SE",
      "ER",
      "SM",
      "RO",
      "OE",
    ]);
    expect(payload.privacy).toEqual({
      includesDirectResponses: false,
      includesFacetScores: false,
      includesRawScorePayload: false,
    });
  });

  it("keeps public share payloads free of private responses and raw score payloads", () => {
    const payload = createPublicShareSuccessPayload({
      assessmentKind: "full",
      completedAt: "2026-07-04T00:00:00.000Z",
      domains: domainSummaries,
      profileCode: "TVOAE",
      profileName: "불꽃의 온기 탐험가",
      resultLabel: "현재 가장 가까운 대표 성향",
    });
    const publicJson = JSON.stringify(payload);

    expect(publicJson).not.toContain("itemId");
    expect(publicJson).not.toContain("value");
    expect(publicJson).not.toMatch(/"responses"\s*:/);
    expect(publicJson).not.toMatch(/"facets"\s*:/);
    expect(publicJson).not.toContain("score_payload");
    expect(publicJson).not.toContain("token_hash");
    expect(publicJson).not.toContain("email");
  });

  it("standardizes unavailable share states", () => {
    expect(Object.keys(publicShareUnavailableStates)).toEqual([
      "expired",
      "not_found",
      "revoked",
    ]);

    Object.keys(publicShareUnavailableStates).forEach((status) => {
      const typedStatus = status as keyof typeof publicShareUnavailableStates;
      const payload = createPublicShareUnavailablePayload(typedStatus);

      expect(payload.ok).toBe(false);
      expect(payload.error).toBe("share_unavailable");
      expect(payload.status).toBe(typedStatus);
      expect(payload.message).toBe(publicShareUnavailableStates[typedStatus].message);
      expect(publicShareUnavailableStates[typedStatus].httpStatus).toBeGreaterThanOrEqual(
        400,
      );
    });
  });
});
