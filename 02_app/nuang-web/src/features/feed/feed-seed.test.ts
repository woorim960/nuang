import { describe, expect, it } from "vitest";
import {
  feedItems,
  feedPolicy,
  listHomeFeedPreviewItems,
  listFeedStories,
} from "@/features/feed/feed-seed";

describe("feed seed", () => {
  it("keeps the MVP feed as a separate non-bottom-nav surface", () => {
    expect(feedPolicy).toMatchObject({
      bottomNavTab: false,
      homePreviewMaxItems: 3,
      publicWriteEnabled: false,
      sensitiveTopicsAllowed: false,
    });
  });

  it("starts with mood, question, and trait cards for the home preview", () => {
    expect(listHomeFeedPreviewItems().map((item) => item.kind)).toEqual([
      "daily_mood",
      "daily_question",
      "trait_card",
    ]);
  });

  it("keeps a single stream with story entries instead of visible categories", () => {
    expect(listFeedStories().map((story) => story.label)).toEqual([
      "내 기록",
      "불꽃",
      "물결",
      "숲",
      "햇살",
    ]);

    const visibleText = JSON.stringify(feedItems);

    expect(visibleText).not.toContain("커뮤니티");
    expect(visibleText).not.toContain("함께 탭");
    expect(visibleText).not.toContain("안전");
    expect(visibleText).not.toContain("궁합");
    expect(visibleText).not.toContain("진단");
    expect(visibleText).not.toContain("치료");
  });
});
