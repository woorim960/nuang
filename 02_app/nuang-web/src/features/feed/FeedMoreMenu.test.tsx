import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedMoreMenu } from "@/features/feed/FeedMoreMenu";

const navigationMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: navigationMocks.refresh,
  }),
}));

describe("FeedMoreMenu", () => {
  afterEach(() => {
    navigationMocks.refresh.mockClear();
    vi.unstubAllGlobals();
  });

  it("opens a single not interested action and writes a feed preference", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            feedWrite: {
              action: "not_interested",
              id: "preference_001",
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

    render(<FeedMoreMenu postId="daily_mood_001" />);

    const moreButton = screen.getByRole("button", { name: "더 보기" });
    expect(moreButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(moreButton);

    expect(moreButton).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "관심 없음" }));

    await waitFor(() => {
      expect(navigationMocks.refresh).toHaveBeenCalledTimes(1);
    });
    expect(getLastRequestBody()).toMatchObject({
      action: "not_interested",
      target: {
        id: "daily_mood_001",
        type: "feed_seed_card",
      },
    });
  });

  it("keeps unauthenticated not interested requests inside the menu", async () => {
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

    render(<FeedMoreMenu postId="post-001" targetType="feed_post" />);

    fireEvent.click(screen.getByRole("button", { name: "더 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "관심 없음" }));

    expect(await screen.findByText("로그인 후 사용할 수 있어요.")).toBeInTheDocument();
    expect(navigationMocks.refresh).not.toHaveBeenCalled();
    expect(getLastRequestBody()).toMatchObject({
      action: "not_interested",
      target: {
        id: "post-001",
        type: "feed_post",
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
