import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommunityCommentPreview } from "@/features/community/CommunityCommentPreview";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";

const target = {
  id: "daily_prompt_001",
  type: "community_preview_card",
} as const;

describe("CommunityCommentPreview", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify(createApiClosedPayload("supabase_env_missing")),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 503,
          },
        );
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits a card-scoped comment preview to the closed feed route", async () => {
    render(<CommunityCommentPreview cardTitle="오늘의 질문" target={target} />);

    expect(screen.getByRole("button", { name: "오늘의 질문 댓글 준비 확인" }))
      .toHaveTextContent("입력 후 확인");
    expect(
      screen.getByRole("button", { name: "오늘의 질문 댓글 준비 확인" }),
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText("오늘의 질문 댓글 미리쓰기"), {
      target: {
        value: "저는 잠깐 생각할 시간이 있으면 좋아요.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "오늘의 질문 댓글 준비 확인" }));

    expect(
      await screen.findByText(/아직 계정 연결을 열기 전이에요/),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/community-feed",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
    expect(getLastRequestBody()).toMatchObject({
      action: "create_comment",
      body: "저는 잠깐 생각할 시간이 있으면 좋아요.",
      target,
    });
  });

  it("blocks sensitive comments before calling the feed route", () => {
    render(<CommunityCommentPreview cardTitle="오늘의 질문" target={target} />);

    fireEvent.change(screen.getByLabelText("오늘의 질문 댓글 미리쓰기"), {
      target: {
        value: "요즘 우울 이야기를 길게 하고 싶어요.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "오늘의 질문 댓글 준비 확인" }));

    expect(screen.getByText(/댓글보다 도움 허브/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "도움 허브" })).toHaveAttribute(
      "href",
      "/help",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});

function getLastRequestBody() {
  const mockedFetch = vi.mocked(fetch);
  const lastCall = mockedFetch.mock.calls.at(-1);
  const init = lastCall?.[1] as RequestInit | undefined;

  return JSON.parse(String(init?.body));
}
