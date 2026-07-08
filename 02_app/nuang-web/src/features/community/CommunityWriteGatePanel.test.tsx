import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommunityWriteGateButton } from "@/features/community/CommunityWriteGateButton";
import { CommunityWriteGatePanel } from "@/features/community/CommunityWriteGatePanel";
import { communityWriteGateSelectEventName } from "@/features/community/community-write-gate";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";

describe("CommunityWriteGatePanel", () => {
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

  it("shows the selected reaction gate from a card button", async () => {
    render(
      <>
        <CommunityWriteGateButton cardTitle="오늘의 질문" kind="reaction" />
        <CommunityWriteGatePanel />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "오늘의 질문 공감 오픈 조건 보기" }));

    expect(screen.getByRole("heading", { name: "공감은 아직 열기 전이에요" })).toBeInTheDocument();
    expect(screen.getByText(/오늘의 질문에서 선택한 공감 기능/)).toBeInTheDocument();
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
      action: "react",
      reaction: "like",
      target: {
        id: "community_preview_오늘의_질문",
        type: "community_preview_card",
      },
    });
  });

  it("can receive a write gate event directly", async () => {
    render(<CommunityWriteGatePanel />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(communityWriteGateSelectEventName, {
          detail: {
            cardTitle: "오늘의 질문",
            kind: "comment",
          },
        }),
      );
    });

    expect(screen.getByRole("heading", { name: "댓글은 아직 열기 전이에요" })).toBeInTheDocument();
    expect(screen.getByText(/댓글 작성, 신고, 숨김/)).toBeInTheDocument();
    expect(
      await screen.findByText("아직 계정 연결을 열기 전이에요."),
    ).toBeInTheDocument();
    expect(getLastRequestBody()).toMatchObject({
      action: "create_comment",
      body: "댓글 오픈 상태 확인",
      target: {
        id: "community_read_feed_card",
        type: "community_preview_card",
      },
    });
  });
});

function getLastRequestBody() {
  const mockedFetch = vi.mocked(fetch);
  const lastCall = mockedFetch.mock.calls.at(-1);
  const init = lastCall?.[1] as RequestInit | undefined;

  return JSON.parse(String(init?.body));
}
