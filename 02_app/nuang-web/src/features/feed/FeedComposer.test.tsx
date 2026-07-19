import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeedComposer } from "@/features/feed/FeedComposer";

const navigationMock = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMock.router,
}));

describe("FeedComposer", () => {
  beforeEach(() => {
    navigationMock.router.push.mockClear();
    navigationMock.router.refresh.mockClear();
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/feed");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts user-written feed content with the selected daily question source", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            feedWrite: {
              action: "create_post",
              id: "feed_post_001",
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

    render(<FeedComposer />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "지금 떠오른 생각을 나눠보세요",
      }),
    );

    expect(screen.getByRole("tab", { name: "글" })).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "일반 글" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "리포트" }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: {
        value: "오늘은 대화 전에 생각을 정리하고 싶었어요.",
      },
    });
    fireEvent.click(screen.getByRole("tab", { name: "오늘의 질문" }));
    fireEvent.click(screen.getByRole("button", { name: "게시" }));

    expect(
      await screen.findByText(
        "글을 올렸어요. 확인이 끝나면 다른 사람에게도 보여요.",
      ),
    ).toBeInTheDocument();
    expect(navigationMock.router.refresh).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/feed",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
    expect(getLastRequestBody()).toMatchObject({
      action: "create_post",
      body: "오늘은 대화 전에 생각을 정리하고 싶었어요.",
      source: "daily_question",
      sourceId: "daily_question_evening_001",
      visibility: "public",
    });
  });

  it("posts a balance game with the selected option", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            feedWrite: {
              action: "create_post",
              id: "feed_post_001",
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

    render(<FeedComposer />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "지금 떠오른 생각을 나눠보세요",
      }),
    );
    fireEvent.click(screen.getByRole("tab", { name: "밸런스 게임" }));
    fireEvent.click(
      screen.getByRole("button", { name: "사람을 만나 함께 보낸다" }),
    );
    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: {
        value: "오늘은 조용한 길이 더 끌려요.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "게시" }));

    expect(
      await screen.findByText(
        "글을 올렸어요. 확인이 끝나면 다른 사람에게도 보여요.",
      ),
    ).toBeInTheDocument();
    expect(getLastRequestBody()).toMatchObject({
      action: "create_post",
      body: "오늘은 조용한 길이 더 끌려요.",
      pollOptionKey: "together",
      source: "balance_game",
      sourceId: "balance_home_free_day_together_solo_001",
      visibility: "public",
    });
  });

  it("does not submit empty content", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<FeedComposer />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "지금 떠오른 생각을 나눠보세요",
      }),
    );
    expect(screen.getByRole("button", { name: "게시" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows login copy without community or safety wording", async () => {
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

    render(<FeedComposer />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "지금 떠오른 생각을 나눠보세요",
      }),
    );
    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: {
        value: "짧은 생각을 남겨요.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "게시" }));

    expect(
      await screen.findByText("로그인 후 게시할 수 있어요."),
    ).toBeInTheDocument();
    expect(navigationMock.router.push).toHaveBeenCalledWith(
      "/login?next=%2Ffeed%3FresumeFeed%3Dpost&reason=community",
    );
    expect(window.sessionStorage.getItem("nuang:feed:pending-post")).toContain(
      "짧은 생각을 남겨요.",
    );
    expect(document.body).not.toHaveTextContent("커뮤니티");
    expect(document.body).not.toHaveTextContent("안전");
  });

  it("restores the post draft after login", async () => {
    window.sessionStorage.setItem(
      "nuang:feed:pending-post",
      JSON.stringify({
        body: "로그인 전에 적어둔 생각이에요.",
        mode: "daily_question",
        selectedPollOptionKey: null,
      }),
    );
    window.history.replaceState({}, "", "/feed?resumeFeed=post&auth=connected");

    render(<FeedComposer />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("글 내용")).toHaveValue(
      "로그인 전에 적어둔 생각이에요.",
    );
    expect(screen.getByRole("tab", { name: "오늘의 질문" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByText("로그인됐어요. 내용을 확인하고 게시해 주세요."),
    ).toBeInTheDocument();
  });
});

function getLastRequestBody() {
  const mockedFetch = vi.mocked(fetch);
  const lastCall = mockedFetch.mock.calls.at(-1);
  const init = lastCall?.[1] as RequestInit | undefined;

  return JSON.parse(String(init?.body));
}
