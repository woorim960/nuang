import { describe, expect, it } from "vitest";
import {
  communityPreviewCards,
  communityPreviewPolicy,
  communityPreviewSafetyLines,
  listCommunityPreviewCards,
} from "@/features/community/community-preview-seed";

describe("community preview seed", () => {
  it("keeps Community 1 limited to three safe preview surfaces", () => {
    expect(listCommunityPreviewCards().map((card) => card.kind)).toEqual([
      "daily_question",
      "trait_card",
      "public_profile",
    ]);
    expect(communityPreviewCards.every((card) => card.status === "preview")).toBe(
      true,
    );
  });

  it("does not open comments, public writing, direct messages, or infinite feed", () => {
    expect(communityPreviewPolicy).toEqual({
      commentsEnabled: false,
      directMessagesEnabled: false,
      infiniteFeedEnabled: false,
      moderationRequiredBeforePosting: true,
      publicWriteEnabled: false,
      sensitiveTopicsAllowed: false,
    });
  });

  it("keeps visible copy away from sensitive or clinical community topics", () => {
    const publicText = JSON.stringify([
      communityPreviewCards,
      communityPreviewSafetyLines,
    ]);

    expect(publicText).not.toMatch(/자살|자해|우울|ADHD|중독|트라우마|약물/);
    expect(publicText).not.toMatch(/직접 응답 공개|원점수 공개/);
    expect(communityPreviewSafetyLines).toContain(
      "민감 검사와 도움 연결 기록은 커뮤니티 미사용",
    );
  });
});
