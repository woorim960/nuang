import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FeedPage, { metadata } from "@/app/feed/page";

const feedReadMocks = vi.hoisted(() => ({
  createServerFeedReadPayload: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/feed",
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/feed/server-read", () => ({
  createServerFeedReadPayload: feedReadMocks.createServerFeedReadPayload,
}));

describe("FeedPage", () => {
  beforeEach(() => {
    feedReadMocks.createServerFeedReadPayload.mockResolvedValue({
      items: [],
    });
  });

  it("renders a focused community feed without unfinished controls or example posts", async () => {
    render(await FeedPage());

    expect(screen.getByRole("heading", { name: "피드" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "지금 떠오른 생각을 나눠보세요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "글쓰기 영역으로 이동" }),
    ).toBeInTheDocument();
    expect(screen.getByText("아직 올라온 이야기가 없어요")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "피드 검색" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "메시지" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "팔로잉" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("TVOAE")).not.toBeInTheDocument();
  });

  it("keeps product metadata for the feed route", () => {
    expect(metadata.title).toBe("피드 | NUANG");
  });

  it("keeps the bottom navigation as the only way back to main tabs", async () => {
    render(await FeedPage());

    expect(screen.getByRole("link", { name: "홈 탭" })).toHaveAttribute(
      "href",
      "/home",
    );
    expect(
      screen.queryByRole("link", { name: "홈으로 돌아가기" }),
    ).not.toBeInTheDocument();
  });

  it("opens a real post in the conversation detail route", async () => {
    feedReadMocks.createServerFeedReadPayload.mockResolvedValue({
      items: [
        {
          authorHandle: "me",
          authorName: "나",
          avatarLabel: "나",
          body: "오늘 있었던 일을 차분하게 돌아보며 남긴 이야기예요.",
          id: "44444444-4444-4444-8444-444444444444",
          kind: "user_post",
          layout: "thread",
          likeCount: 1,
          likeLabel: "좋아요 1개",
          priority: 0,
          replyCount: 2,
          replyLabel: "답글 2개",
          targetType: "feed_post",
          timeLabel: "5분",
          title: "오늘의 생각",
        },
      ],
    });

    render(await FeedPage());

    expect(screen.getByRole("link", { name: "댓글 2개 보기" })).toHaveAttribute(
      "href",
      "/feed/posts/44444444-4444-4444-8444-444444444444",
    );
  });
});
