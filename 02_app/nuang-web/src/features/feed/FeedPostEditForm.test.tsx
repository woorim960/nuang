import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedPostEditForm } from "@/features/feed/FeedPostEditForm";
import type { FeedItem } from "@/features/feed/feed-seed";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

const post: FeedItem = {
  authorHandle: "me",
  authorName: "나",
  avatarLabel: "나",
  body: "수정 전 내용",
  id: "22222222-2222-4222-8222-222222222222",
  kind: "user_post",
  layout: "thread",
  likeLabel: "좋아요 0개",
  priority: 0,
  replyLabel: "답글 0개",
  targetType: "feed_post",
  timeLabel: "방금",
  title: "오늘의 생각",
  topic: {
    category: "daily_life",
    label: "일상",
    tags: ["오늘"],
  },
  visibility: "profile_public",
  viewerCanManage: true,
};

describe("FeedPostEditForm", () => {
  afterEach(() => {
    navigationMocks.push.mockClear();
    navigationMocks.refresh.mockClear();
    vi.unstubAllGlobals();
  });

  it("keeps the current audience and saves edited post fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          feedWrite: {
            action: "update_post",
            id: post.id,
          },
          ok: true,
        }),
      ),
    );

    render(<FeedPostEditForm post={post} returnTo="/my" />);

    expect(
      screen.getByRole("button", { name: "프로필에만 공개" }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(screen.getByRole("textbox", { name: "게시글 내용" }), {
      target: { value: "수정한 내용" },
    });
    fireEvent.click(screen.getByRole("button", { name: "생각" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith("/my");
      expect(navigationMocks.refresh).toHaveBeenCalledTimes(1);
    });

    const request = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      action: "update_post",
      body: "수정한 내용",
      postId: post.id,
      topic: {
        category: "thoughts",
        source: "manual",
        tags: ["오늘"],
      },
      visibility: "profile_public",
    });
  });

  it("does not save an empty text-only post", () => {
    render(<FeedPostEditForm post={post} returnTo="/feed" />);

    fireEvent.change(screen.getByRole("textbox", { name: "게시글 내용" }), {
      target: { value: " " },
    });

    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });
});
