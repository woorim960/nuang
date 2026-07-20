import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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

  it("reveals a code perspective from the first coded vote", () => {
    const poll = createPoll();
    poll.canViewCodeStats = true;
    poll.totalVotes = 1;
    poll.viewerCode = "INGMC";
    poll.viewerVoteOptionId = poll.options[0]!.id;
    poll.options[0] = {
      ...poll.options[0]!,
      ratio: 100,
      viewerHasVoted: true,
      voteCount: 1,
    };
    poll.options[1] = {
      ...poll.options[1]!,
      ratio: 0,
      voteCount: 0,
    };
    poll.codePerspectives = [
      {
        code: "INGMC",
        name: "새 길을 찾는 탐구자",
        options: [
          { label: poll.options[0]!.label, ratio: 100, voteCount: 1 },
          { label: poll.options[1]!.label, ratio: 0, voteCount: 0 },
        ],
        totalVotes: 1,
      },
    ];

    render(<FeedPollCard poll={poll} variant="playground" />);

    const perspective = screen.getByRole("region", {
      name: "뉴앙 코드별 관점 보기",
    });
    expect(within(perspective).getByText("1명 참여")).toBeInTheDocument();
    expect(
      within(perspective).queryByRole("link", {
        name: "뉴앙 코드별 관점 보기",
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(perspective).getByRole("button", {
        name: "코드별 관점 펼치기",
      }),
    );

    fireEvent.click(
      within(perspective).getByRole("button", { name: "내 코드 INGMC" }),
    );

    expect(within(perspective).getByText("새 길을 찾는 탐구자")).toBeVisible();
    expect(within(perspective).getByText("100%")).toBeVisible();

    fireEvent.click(
      within(perspective).getByRole("button", { name: "참여 코드 1" }),
    );
    expect(
      within(perspective).getByRole("button", { name: "INGMC 1명" }),
    ).toBeVisible();
  });

  it("keeps the inline overall result visible while code groups are gathering", () => {
    const poll = createPoll();
    poll.totalVotes = 2;
    poll.viewerCode = "INGMC";
    poll.viewerVoteOptionId = poll.options[0]!.id;
    poll.options[0] = {
      ...poll.options[0]!,
      ratio: 50,
      viewerHasVoted: true,
      voteCount: 1,
    };
    poll.options[1] = {
      ...poll.options[1]!,
      ratio: 50,
      voteCount: 1,
    };

    render(<FeedPollCard poll={poll} variant="playground" />);

    fireEvent.click(screen.getByRole("button", { name: "코드별 관점 펼치기" }));
    expect(
      screen.getByRole("button", { name: "내 코드 INGMC · 집계 중" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "참여 코드 0" }));
    expect(
      screen.getByText("아직 코드가 확인된 참여자가 없어요."),
    ).toBeVisible();
  });

  it("activates and opens code perspectives only after the viewer votes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
      ),
    );

    render(<FeedPollCard poll={createPoll()} variant="playground" />);

    expect(
      screen.queryByRole("region", { name: "뉴앙 코드별 관점 보기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("하나를 고르면 결과와 코드별 관점을 볼 수 있어요."),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: /사람을 만나 함께 보낸다/ }),
    );

    const perspective = await screen.findByRole("region", {
      name: "뉴앙 코드별 관점 보기",
    });
    expect(
      within(perspective).getByRole("button", { name: "코드별 관점 접기" }),
    ).toBeVisible();
  });

  it("lets the viewer close and reopen code perspectives inline", () => {
    const poll = createPoll();
    poll.totalVotes = 9;
    poll.viewerVoteOptionId = poll.options[0]!.id;

    render(<FeedPollCard poll={poll} variant="playground" />);

    const perspective = screen.getByRole("region", {
      name: "뉴앙 코드별 관점 보기",
    });
    fireEvent.click(
      within(perspective).getByRole("button", {
        name: "코드별 관점 펼치기",
      }),
    );
    fireEvent.click(
      within(perspective).getByRole("button", { name: "코드별 관점 접기" }),
    );

    expect(
      within(perspective).queryByRole("button", { name: "전체" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(perspective).getByRole("button", {
        name: "코드별 관점 펼치기",
      }),
    );
    expect(
      within(perspective).getByRole("button", { name: "전체" }),
    ).toBeVisible();
  });

  it("replaces a saved playground vote as soon as another option is chosen", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, request?: RequestInit) => {
        void input;
        void request;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    const poll = createPoll();
    poll.totalVotes = 9;
    poll.viewerVoteOptionId = poll.options[0]!.id;

    render(<FeedPollCard poll={poll} variant="playground" />);

    expect(
      screen.queryByRole("button", { name: "투표 다시 하기" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /혼자 여유롭게 보낸다/ }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [, request] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(String(request?.body))).toMatchObject({
      action: "vote_poll",
      optionId: poll.options[1]!.id,
      pollId: poll.id,
    });
    expect(navigationMocks.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText("선택을 바꿨어요.")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /혼자 여유롭게 보낸다/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});

function createPoll(): FeedPollSummary {
  return {
    canViewCodeStats: false,
    codePerspectives: [],
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
    viewerCode: null,
    viewerVoteOptionId: null,
  };
}
