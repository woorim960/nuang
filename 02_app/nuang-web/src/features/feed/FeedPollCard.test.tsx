import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedPollCard } from "@/features/feed/FeedPollCard";
import type { FeedPollSummary } from "@/features/feed/feed-seed";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

describe("FeedPollCard", () => {
  afterEach(() => {
    navigationMocks.push.mockClear();
    navigationMocks.refresh.mockClear();
    navigationMocks.replace.mockClear();
    window.history.replaceState({}, "", "/");
    vi.unstubAllGlobals();
  });

  it("preserves the selected option when login is required", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "unauthenticated" }), {
            status: 401,
          }),
      ),
    );

    render(
      <FeedPollCard poll={createPoll()} returnTo="/home" variant="home" />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /사람을 만나 함께 보낸다/ }),
    );

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        "/login?next=%2Fhome%3FresumeFeed%3Dpoll%26pollId%3D7be2c8d3-c9f2-4f16-8d79-87ca3ceb0801%26optionId%3D8cf3d9e4-daf3-4017-8e8a-98db4dfc0801&reason=poll",
      );
    });
  });

  it("finishes the saved vote after OAuth returns to home", async () => {
    window.history.replaceState(
      {},
      "",
      "/home?resumeFeed=poll&pollId=7be2c8d3-c9f2-4f16-8d79-87ca3ceb0801&optionId=8cf3d9e4-daf3-4017-8e8a-98db4dfc0801&auth=connected",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
      ),
    );

    render(
      <FeedPollCard poll={createPoll()} returnTo="/home" variant="home" />,
    );

    await waitFor(() => {
      expect(navigationMocks.replace).toHaveBeenCalledWith("/home");
    });
    expect(navigationMocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("leaves the home result actions to the surrounding home card", () => {
    const poll = createPoll();
    poll.canViewCodeStats = true;
    poll.viewerVoteOptionId = poll.options[0]?.id ?? null;
    poll.options[0]!.viewerHasVoted = true;

    render(<FeedPollCard poll={poll} returnTo="/home" variant="home" />);

    expect(
      screen.queryByRole("link", { name: "뉴앙 코드별 통계 보기" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/총 0명 참여/)).not.toBeInTheDocument();
  });
});

function createPoll(): FeedPollSummary {
  return {
    canViewCodeStats: false,
    id: "7be2c8d3-c9f2-4f16-8d79-87ca3ceb0801",
    options: [
      {
        id: "8cf3d9e4-daf3-4017-8e8a-98db4dfc0801",
        key: "together",
        label: "사람을 만나 함께 보낸다",
        ratio: 0,
        viewerHasVoted: false,
        voteCount: 0,
      },
      {
        id: "9df4eaf5-eb04-4128-9f9b-a9ec5efd0801",
        key: "solo",
        label: "혼자 여유롭게 보낸다",
        ratio: 0,
        viewerHasVoted: false,
        voteCount: 0,
      },
    ],
    promptId: "balance_home_free_day_together_solo_001",
    question: "갑자기 하루 여유가 생겼다면, 지금 더 끌리는 쪽은?",
    statsHref: "/feed/polls/7be2c8d3-c9f2-4f16-8d79-87ca3ceb0801/stats",
    totalVotes: 0,
    viewerVoteOptionId: null,
  };
}
