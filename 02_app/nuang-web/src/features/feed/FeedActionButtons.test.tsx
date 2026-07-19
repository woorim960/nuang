import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedActionButtons } from "@/features/feed/FeedActionButtons";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigationMocks.push,
    refresh: navigationMocks.refresh,
  }),
}));

describe("FeedActionButtons", () => {
  afterEach(() => {
    navigationMocks.refresh.mockClear();
    navigationMocks.push.mockClear();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("posts reaction requests to the feed API and shows the closed state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify(createApiClosedPayload("feed_write_db_pending")),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 501,
          },
        );
      }),
    );

    render(<FeedActionButtons postId="daily_mood_001" />);

    const likeButton = screen.getByRole("button", { name: "좋아요" });
    expect(likeButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(likeButton);

    expect(
      await screen.findByText("피드 글쓰기와 댓글은 아직 열기 전이에요."),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/feed",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
    expect(getLastRequestBody()).toMatchObject({
      action: "react",
      reaction: "like",
      target: {
        id: "daily_mood_001",
        type: "feed_seed_card",
      },
    });
  });

  it("hydrates liked and saved icon states from the feed read model", () => {
    vi.stubGlobal("fetch", vi.fn());

    render(
      <FeedActionButtons
        includeBookmark
        initialBookmarked
        initialLiked
        postId="daily_mood_001"
      />,
    );

    expect(screen.getByRole("button", { name: "좋아요" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "저장" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("sends remove requests when active like and save buttons are pressed again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            feedWrite: {
              action: "remove_reaction",
              id: "reaction_001",
              targetType: "feed_seed_card",
            },
            ok: true,
          }),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 200,
          },
        );
      }),
    );

    render(
      <FeedActionButtons
        includeBookmark
        initialBookmarked
        initialLiked
        postId="daily_mood_001"
      />,
    );

    const likeButton = screen.getByRole("button", { name: "좋아요" });
    fireEvent.click(likeButton);

    expect(await screen.findByText("좋아요를 취소했어요.")).toBeInTheDocument();
    expect(likeButton).toHaveAttribute("aria-pressed", "false");
    expect(getLastRequestBody()).toMatchObject({
      action: "remove_reaction",
      reaction: "like",
      target: {
        id: "daily_mood_001",
        type: "feed_seed_card",
      },
    });

    const bookmarkButton = screen.getByRole("button", { name: "저장" });
    fireEvent.click(bookmarkButton);

    expect(await screen.findByText("저장을 취소했어요.")).toBeInTheDocument();
    expect(bookmarkButton).toHaveAttribute("aria-pressed", "false");
    expect(getLastRequestBody()).toMatchObject({
      action: "remove_bookmark",
      target: {
        id: "daily_mood_001",
        type: "feed_seed_card",
      },
    });
  });

  it("opens comment input first and posts only user-written comments", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify({ error: "unauthenticated" }), {
          headers: {
            "content-type": "application/json",
          },
          status: 401,
        });
      }),
    );

    render(<FeedActionButtons postId="daily_mood_001" />);

    const commentButton = screen.getByRole("button", { name: "댓글" });
    expect(commentButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(commentButton);

    expect(fetch).not.toHaveBeenCalled();
    expect(commentButton).toHaveAttribute("aria-expanded", "true");
    fireEvent.change(screen.getByLabelText("댓글 내용"), {
      target: {
        value: "이 질문은 오늘 생각해볼 만해요.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "게시" }));

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        "/login?next=%2Ffeed%3FresumeFeed%3Dcomment%26postId%3Ddaily_mood_001&reason=comment",
      );
    });
    expect(
      window.sessionStorage.getItem(
        "nuang:feed:pending-comment:daily_mood_001",
      ),
    ).toBe("이 질문은 오늘 생각해볼 만해요.");
    expect(getLastRequestBody()).toMatchObject({
      action: "create_comment",
      body: "이 질문은 오늘 생각해볼 만해요.",
      target: {
        id: "daily_mood_001",
        type: "feed_seed_card",
      },
    });
    expect(navigationMocks.refresh).not.toHaveBeenCalled();
  });

  it("shows a focused comment composer without unrelated feed actions", () => {
    vi.stubGlobal("fetch", vi.fn());

    render(
      <FeedActionButtons
        commentComposer
        commentPlaceholder="왜 이쪽을 골랐나요?"
        postId="post-001"
        targetType="feed_post"
      />,
    );

    expect(
      screen.getByPlaceholderText("왜 이쪽을 골랐나요?"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "등록" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "좋아요" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "공유" }),
    ).not.toBeInTheDocument();
  });

  it("restores a pending comment after login without losing the draft", async () => {
    window.sessionStorage.setItem(
      "nuang:feed:pending-comment:post-001",
      "로그인 전에 작성한 댓글이에요.",
    );
    window.history.replaceState(
      {},
      "",
      "/feed/polls/poll-001/stats?from=home&resumeFeed=comment&postId=post-001&auth=connected",
    );
    vi.stubGlobal("fetch", vi.fn());

    render(
      <FeedActionButtons
        postId="post-001"
        returnTo="/feed/polls/poll-001/stats?from=home"
        targetType="feed_post"
      />,
    );

    expect(await screen.findByLabelText("댓글 내용")).toHaveValue(
      "로그인 전에 작성한 댓글이에요.",
    );
    expect(
      screen.getByText(
        "로그인이 완료됐어요. 게시 버튼을 누르면 댓글이 등록돼요.",
      ),
    ).toBeInTheDocument();
    expect(window.location.search).toBe("?from=home");
  });

  it("shows recent replies only after the comment action is opened", async () => {
    vi.stubGlobal("fetch", vi.fn());

    render(
      <FeedActionButtons
        postId="post-001"
        replyPreview={[
          {
            authorHandle: "me",
            authorName: "나",
            body: "내가 남긴 댓글입니다.",
            id: "reply-001",
            statusLabel: "게시 전 확인 중",
          },
          {
            authorHandle: "nuang.user",
            authorName: "NUANG 사용자",
            body: "최근 공개 댓글입니다.",
            id: "reply-002",
          },
        ]}
        targetType="feed_post"
      />,
    );

    expect(screen.queryByText("내가 남긴 댓글입니다.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "댓글" }));

    expect(screen.getByLabelText("최근 댓글")).toBeInTheDocument();
    expect(screen.getByText("내가 남긴 댓글입니다.")).toBeInTheDocument();
    expect(screen.getByText(/게시 전 확인 중/)).toBeInTheDocument();
    expect(screen.getByText("최근 공개 댓글입니다.")).toBeInTheDocument();
  });

  it("refreshes the feed after a successful comment write", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            feedWrite: {
              action: "create_comment",
              id: "comment_001",
              moderationStatus: "pending_review",
              targetType: "feed_post",
            },
            ok: true,
          }),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 200,
          },
        );
      }),
    );

    render(<FeedActionButtons postId="post-001" targetType="feed_post" />);

    fireEvent.click(screen.getByRole("button", { name: "댓글" }));
    fireEvent.change(screen.getByLabelText("댓글 내용"), {
      target: {
        value: "이 댓글은 바로 피드에 반영돼야 해요.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "게시" }));

    expect(await screen.findByText("댓글이 접수됐어요.")).toBeInTheDocument();
    expect(screen.getByLabelText("댓글 내용")).toBeInTheDocument();
    expect(navigationMocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("marks successful bookmark actions as saved", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            feedWrite: {
              action: "bookmark",
              id: "bookmark_001",
              targetType: "feed_seed_card",
            },
            ok: true,
          }),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 200,
          },
        );
      }),
    );

    render(<FeedActionButtons includeBookmark postId="daily_mood_001" />);

    const bookmarkButton = screen.getByRole("button", { name: "저장" });
    expect(bookmarkButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(bookmarkButton);

    expect(await screen.findByText("저장했어요.")).toBeInTheDocument();
    expect(bookmarkButton).toHaveAttribute("aria-pressed", "true");
    expect(navigationMocks.refresh).toHaveBeenCalledTimes(1);
    expect(getLastRequestBody()).toMatchObject({
      action: "bookmark",
      target: {
        id: "daily_mood_001",
        type: "feed_seed_card",
      },
    });
  });

  it("keeps share local until the share policy is connected", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<FeedActionButtons includeBookmark postId="daily_mood_001" />);

    fireEvent.click(screen.getByRole("button", { name: "공유" }));

    expect(
      await screen.findByText(
        "공유는 프로필과 결과 공유 정책이 연결된 뒤 열릴 예정이에요.",
      ),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function getLastRequestBody() {
  const mockedFetch = vi.mocked(fetch);
  const lastCall = mockedFetch.mock.calls.at(-1);
  const init = lastCall?.[1] as RequestInit | undefined;

  return JSON.parse(String(init?.body));
}
