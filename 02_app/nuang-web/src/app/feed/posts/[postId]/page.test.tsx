import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FeedPostDetailPage, { metadata } from "@/app/feed/posts/[postId]/page";

const feedReadMocks = vi.hoisted(() => ({
  createServerFeedPostDetailPayload: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/feed/server-read", () => ({
  createServerFeedPostDetailPayload:
    feedReadMocks.createServerFeedPostDetailPayload,
}));

describe("FeedPostDetailPage", () => {
  it("shows the complete conversation and a focused reply composer", async () => {
    feedReadMocks.createServerFeedPostDetailPayload.mockResolvedValue({
      comments: [
        {
          authorHandle: "me",
          authorName: "나",
          body: "저도 비슷한 순간이 있었어요.",
          id: "comment-own",
          statusLabel: "게시 전 확인 중",
          timeLabel: "방금",
        },
        {
          authorHandle: "nuang.user",
          authorName: "NUANG 사용자",
          body: "다른 관점도 흥미롭네요.",
          id: "comment-public",
          timeLabel: "8분",
        },
      ],
      post: {
        authorHandle: "me",
        authorName: "나",
        avatarLabel: "나",
        body: "서로 다른 생각을 편하게 나누기 위해 남긴 이야기예요.",
        id: "44444444-4444-4444-8444-444444444444",
        kind: "user_post",
        layout: "thread",
        likeCount: 3,
        likeLabel: "좋아요 3개",
        priority: 0,
        replyCount: 2,
        replyLabel: "답글 2개",
        targetType: "feed_post",
        timeLabel: "12분",
        title: "오늘의 생각",
        viewerHasBookmarked: false,
        viewerHasLiked: true,
      },
      viewer: {
        isAuthenticated: true,
      },
    });

    render(
      await FeedPostDetailPage({
        params: Promise.resolve({
          postId: "44444444-4444-4444-8444-444444444444",
        }),
      }),
    );

    expect(screen.getByRole("heading", { name: "이야기" })).toBeInTheDocument();
    expect(
      screen.getByText("서로 다른 생각을 편하게 나누기 위해 남긴 이야기예요."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "댓글" })).toBeInTheDocument();
    expect(
      screen.getByText("저도 비슷한 순간이 있었어요."),
    ).toBeInTheDocument();
    expect(screen.getByText("다른 관점도 흥미롭네요.")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("생각을 이어서 남겨보세요."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "좋아요" })).toBePressed();
    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "댓글" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "피드로 돌아가기" }),
    ).toHaveAttribute("href", "/feed");
  });

  it("keeps community conversations out of search indexing", () => {
    expect(metadata.robots).toMatchObject({
      follow: false,
      index: false,
    });
  });
});
