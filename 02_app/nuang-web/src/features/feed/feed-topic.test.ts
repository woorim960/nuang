import { describe, expect, it } from "vitest";
import {
  extractCompletedFeedTags,
  formatFeedTopicInput,
  normalizeFeedTagParam,
  parseFeedTopicInput,
  suggestFeedTopic,
} from "@/features/feed/feed-topic";

describe("feed post topics", () => {
  it("keeps manual entry as one standard category and editable tags", () => {
    expect(parseFeedTopicInput("일상, 카페, 산책")).toEqual({
      category: "daily_life",
      source: "manual",
      tags: ["카페", "산책"],
    });
  });

  it("preserves free-form tags when no standard category is entered", () => {
    expect(parseFeedTopicInput("여름, 야경, #산책")).toEqual({
      category: null,
      source: "manual",
      tags: ["여름", "야경", "산책"],
    });
  });

  it("suggests a relationship topic from ordinary Korean copy", () => {
    const topic = suggestFeedTopic({
      body: "친구와 대화할 때 먼저 마음을 물어보려고 해요.",
    });

    expect(topic.category).toBe("relationships");
    expect(topic.tags).toContain("친구");
    expect(topic.tags).toContain("대화");
    expect(formatFeedTopicInput(topic)).toBe("관계, 친구, 대화");
  });

  it("uses local image hints without requiring an external AI provider", () => {
    expect(
      suggestFeedTopic({
        body: "",
        imageHints: ["자연", "밝은 사진"],
        photoCount: 2,
      }),
    ).toMatchObject({
      category: "daily_life",
      source: "local_suggestion",
      tags: ["자연", "밝은 사진"],
    });
  });

  it("does not confuse 산책 with a separate 책 topic", () => {
    const topic = suggestFeedTopic({
      body: "퇴근 후 천천히 동네를 산책하며 오늘을 정리했어요.",
    });

    expect(formatFeedTopicInput(topic)).toBe("일상, 산책");
  });
});

describe("extractCompletedFeedTags", () => {
  it("turns a hashtag into a separate tag as soon as whitespace completes it", () => {
    expect(
      extractCompletedFeedTags("오늘 산책했어요 #산책 #주말 ", ["기록"]),
    ).toEqual({
      body: "오늘 산책했어요 ",
      limitReached: false,
      tags: ["기록", "산책", "주말"],
    });
  });

  it("keeps an unfinished hashtag in the body until whitespace is entered", () => {
    expect(extractCompletedFeedTags("오늘은 #산책")).toEqual({
      body: "오늘은 #산책",
      limitReached: false,
      tags: [],
    });
  });

  it("restores an encoded Korean tag from a route parameter", () => {
    expect(normalizeFeedTagParam(encodeURIComponent("카페"))).toBe("카페");
  });
});
