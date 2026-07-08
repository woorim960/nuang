import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommunityReactionPreview } from "@/features/community/CommunityReactionPreview";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";

const target = {
  id: "daily_prompt_001",
  type: "community_preview_card",
} as const;

describe("CommunityReactionPreview", () => {
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

  it("shows official topic reaction count without pretending user reaction is saved", () => {
    render(
      <CommunityReactionPreview
        cardTitle="오늘의 질문"
        previewCount={128}
        target={target}
      />,
    );

    expect(screen.getByText("반응 128")).toBeInTheDocument();
    expect(screen.getByText("공식 주제 카드 · 내 반응 미저장")).toBeInTheDocument();
  });

  it("checks reaction readiness against the closed feed route", async () => {
    render(
      <CommunityReactionPreview
        cardTitle="오늘의 질문"
        previewCount={128}
        target={target}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "오늘의 질문 반응 준비 확인" }));

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
      target,
    });
  });
});

function getLastRequestBody() {
  const mockedFetch = vi.mocked(fetch);
  const lastCall = mockedFetch.mock.calls.at(-1);
  const init = lastCall?.[1] as RequestInit | undefined;

  return JSON.parse(String(init?.body));
}
