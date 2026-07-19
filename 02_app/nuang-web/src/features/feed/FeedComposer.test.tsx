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

    expect(screen.getByRole("tab", { name: "내 생각" })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "게시하기" }));

    expect(
      await screen.findByText("게시 요청이 접수됐어요."),
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

    fireEvent.click(screen.getByRole("tab", { name: "둘 중 하나" }));
    fireEvent.click(
      screen.getByRole("button", { name: "사람을 만나 함께 보낸다" }),
    );
    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: {
        value: "오늘은 조용한 길이 더 끌려요.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "게시하기" }));

    expect(
      await screen.findByText("게시 요청이 접수됐어요."),
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

    expect(screen.getByRole("button", { name: "게시하기" })).toBeDisabled();
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

    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: {
        value: "짧은 생각을 남겨요.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "게시하기" }));

    expect(
      await screen.findByText("로그인 후 게시할 수 있어요."),
    ).toBeInTheDocument();
    expect(navigationMock.router.push).toHaveBeenCalledWith(
      "/login?next=%2Ffeed",
    );
    expect(document.body).not.toHaveTextContent("커뮤니티");
    expect(document.body).not.toHaveTextContent("안전");
  });
});

function getLastRequestBody() {
  const mockedFetch = vi.mocked(fetch);
  const lastCall = mockedFetch.mock.calls.at(-1);
  const init = lastCall?.[1] as RequestInit | undefined;

  return JSON.parse(String(init?.body));
}
