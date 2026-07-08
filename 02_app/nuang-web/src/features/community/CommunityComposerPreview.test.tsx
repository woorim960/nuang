import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommunityComposerPreview } from "@/features/community/CommunityComposerPreview";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";

describe("CommunityComposerPreview", () => {
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

  it("submits a safe composer draft to the closed community feed route", async () => {
    render(<CommunityComposerPreview />);

    expect(screen.getByRole("button", { name: "글 입력 후 확인" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: {
        value: "나는 대화 전에 생각을 정리할 시간이 있으면 더 편해요.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "나만 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "게시 준비 확인" }));

    expect(
      await screen.findByText("아직 계정 연결을 열기 전이에요."),
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
      action: "create_post",
      body: "나는 대화 전에 생각을 정리할 시간이 있으면 더 편해요.",
      visibility: "private_draft",
    });
  });

  it("blocks sensitive or treatment-like topics before hitting the feed route", () => {
    render(<CommunityComposerPreview />);

    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: {
        value: "요즘 자살 생각 때문에 너무 힘들어요.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "게시 준비 확인" }));

    expect(screen.getByText(/도움 허브나 전문가 연결/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "도움 허브 보기" })).toHaveAttribute(
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
