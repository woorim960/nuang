import { describe, expect, it } from "vitest";
import {
  createPublicProfileCardPayload,
  publicProfileCardContractVersion,
} from "@/features/community/public-profile-card-contract";
import { createPublicProfileSnapshotPayload } from "@/features/together/public-comparison-contract";
import { profileVisibilityPolicyVersion } from "@/features/together/profile-visibility-policy";
import type { CoreScoreResult } from "@/lib/scoring/types";

const result: CoreScoreResult = {
  alternativeCodes: [],
  code: "FOAMT",
  domains: [
    {
      domainId: "SE",
      isBoundary: false,
      label: "사람 사이 에너지",
      score: 72.4,
      status: "valid",
      symbol: "T",
    },
    {
      domainId: "ER",
      isBoundary: false,
      label: "마음의 반응",
      score: 64.2,
      status: "valid",
      symbol: "V",
    },
    {
      domainId: "SM",
      isBoundary: true,
      label: "일상 리듬",
      score: 51.3,
      status: "valid",
      symbol: "O",
    },
  ],
  facets: [
    {
      facetId: "SE-AI",
      label: "먼저 표현하기",
      score: 71.8,
      status: "valid",
      validResponses: 6,
    },
    {
      facetId: "ER-RT",
      label: "감정 반응",
      score: 60.1,
      status: "valid",
      validResponses: 6,
    },
  ],
  profileName: "불꽃 온기 탐험가",
};

describe("public profile card contract", () => {
  it("creates a community-safe card from a public profile snapshot", () => {
    const snapshot = createPublicProfileSnapshotPayload({
      createdAt: "2026-07-04T00:00:00.000Z",
      displayProfile: {
        displayName: "탐험가",
        motif: "flame",
      },
      result,
      snapshotId: "11111111-1111-4111-8111-111111111111",
    });
    const card = createPublicProfileCardPayload({
      cardId: "card_local_preview",
      snapshot,
    });

    expect(card.contractVersion).toBe(publicProfileCardContractVersion);
    expect(card.status).toBe("preview");
    expect(card.display).toEqual({
      code: "FOAMT",
      displayName: "탐험가",
      motif: "flame",
      profileName: "불꽃 온기 탐험가",
    });
    expect(card.highlights.domainHighlights.map((axis) => axis.id)).toEqual([
      "SE",
      "ER",
    ]);
    expect(card.highlights.facetSummaryCount).toBe(2);
    expect(card.visibility).toMatchObject({
      cardScope: "community_profile_card",
      policyVersion: profileVisibilityPolicyVersion,
    });
  });

  it("keeps public cards free of private data surfaces", () => {
    const snapshot = createPublicProfileSnapshotPayload({
      createdAt: "2026-07-04T00:00:00.000Z",
      displayProfile: {
        displayName: "탐험가",
        motif: "flame",
      },
      result,
      snapshotId: "11111111-1111-4111-8111-111111111111",
    });
    const card = createPublicProfileCardPayload({
      cardId: "card_local_preview",
      snapshot,
    });
    const publicJson = JSON.stringify(card);

    expect(card.privacy).toEqual({
      includesAccountIdentity: false,
      includesCrisisHelpInteractions: false,
      includesDirectResponses: false,
      includesRawScorePayload: false,
      includesSensitiveAssessments: false,
    });
    expect(publicJson).not.toContain("email");
    expect(publicJson).not.toContain("provider");
    expect(publicJson).not.toMatch(/"responses"\s*:/);
    expect(publicJson).not.toContain("score_payload");
    expect(publicJson).not.toContain("itemId");
    expect(publicJson).not.toContain("token_hash");
  });
});
