import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommunityTagScreen } from "@/features/feed/CommunityTagScreen";
import type { FeedItem } from "@/features/feed/feed-seed";

const post: FeedItem = {
  authorHandle: "summer.note",
  authorName: "여름",
  avatarLabel: "여",
  body: "조용한 카페에서 오늘의 생각을 정리했어요.",
  id: "44444444-4444-4444-8444-444444444444",
  kind: "user_post",
  layout: "thread",
  likeCount: 2,
  likeLabel: "좋아요 2개",
  priority: 0,
  replyCount: 1,
  replyLabel: "댓글 1개",
  timeLabel: "5분",
  title: "오늘의 생각",
  topic: { category: "daily_life", label: "일상", tags: ["카페", "기록"] },
};

describe("CommunityTagScreen", () => {
  it("collects public posts and links every tag to its own route", () => {
    render(<CommunityTagScreen posts={[post]} tag="카페" />);

    expect(
      screen.getByRole("heading", { level: 2, name: "#카페" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "#카페" })).toHaveAttribute(
      "href",
      `/feed/tags/${encodeURIComponent("카페")}`,
    );
    expect(screen.getByRole("link", { name: "#기록" })).toHaveAttribute(
      "href",
      `/feed/tags/${encodeURIComponent("기록")}`,
    );
    expect(screen.getByRole("link", { name: /댓글 1/ })).toHaveAttribute(
      "href",
      "/feed/posts/44444444-4444-4444-8444-444444444444",
    );
  });
});
