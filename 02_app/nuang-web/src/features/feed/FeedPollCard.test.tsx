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
    expect(navigationMocks.refresh).not.toHaveBeenCalled();
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
        name: "새 가능성을 찾는 탐험가",
        options: [
          { label: poll.options[0]!.label, ratio: 100, voteCount: 1 },
          { label: poll.options[1]!.label, ratio: 0, voteCount: 0 },
        ],
        totalVotes: 1,
      },
    ];

    render(<FeedPollCard poll={poll} variant="playground" />);

    const perspective = screen.getByRole("region", {
      name: "뉴앙 코드별 결과",
    });
    expect(within(perspective).getByText("1명 참여")).toBeInTheDocument();
    expect(
      within(perspective).queryByRole("link", {
        name: "뉴앙 코드별 결과",
      }),
    ).not.toBeInTheDocument();

    expect(
      within(perspective).getByRole("button", {
        name: "결과 보기 펼치기",
      }),
    ).toBeVisible();
    expect(
      within(perspective).queryByRole("button", { name: "INGMC" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(perspective).getByRole("button", {
        name: "결과 보기 펼치기",
      }),
    );
    expect(
      screen.queryByText(
        "전체 참여자의 현재 선택이에요. 같은 선택을 골라도 이유는 사람마다 다를 수 있어요.",
      ),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(perspective).getByRole("button", { name: "INGMC" }),
    );

    expect(
      within(perspective).getByText("새 가능성을 찾는 탐험가"),
    ).toBeVisible();
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

    fireEvent.click(
      screen.getByRole("button", { name: "결과 보기 펼치기" }),
    );
    expect(
      screen.getByRole("button", { name: "INGMC · 집계 중" }),
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
      screen.queryByRole("region", { name: "뉴앙 코드별 결과" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /사람을 만나 함께 보낸다/ }),
    );

    const perspective = await screen.findByRole("region", {
      name: "뉴앙 코드별 결과",
    });
    expect(
      within(perspective).getByRole("button", { name: "결과 보기 접기" }),
    ).toBeVisible();
  });

  it("shows the selected option and result before the network response finishes", async () => {
    let resolveVote: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, request?: RequestInit) => {
        void input;
        void request;
        return new Promise<Response>((resolve) => {
          resolveVote = resolve;
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<FeedPollCard poll={createPoll()} variant="playground" />);

    const selectedOption = screen.getByRole("button", {
      name: /사람을 만나 함께 보낸다/,
    });
    fireEvent.click(selectedOption);
    fireEvent.click(selectedOption);

    expect(selectedOption).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("100%").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "결과 보기 접기" }),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, request] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(String(request?.body))).toMatchObject({
      action: "vote_poll",
      replaceExisting: false,
    });
    expect(navigationMocks.refresh).not.toHaveBeenCalled();

    resolveVote?.(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
      }),
    );
    await waitFor(() => {
      expect(screen.queryByText("투표 저장 중")).not.toBeInTheDocument();
    });
  });

  it("starts collapsed and lets the viewer open code perspectives inline", () => {
    const poll = createPoll();
    poll.totalVotes = 9;
    poll.viewerVoteOptionId = poll.options[0]!.id;

    render(<FeedPollCard poll={poll} variant="playground" />);

    const perspective = screen.getByRole("region", {
      name: "뉴앙 코드별 결과",
    });
    expect(
      within(perspective).queryByRole("button", { name: "전체" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(perspective).getByRole("button", {
        name: "결과 보기 펼치기",
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
      replaceExisting: true,
    });
    expect(navigationMocks.refresh).not.toHaveBeenCalled();
    expect(screen.getByText("선택을 바꿨어요.")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /혼자 여유롭게 보낸다/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("updates the viewer code result and participating-code result after re-voting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
      ),
    );
    const poll = createPoll();
    poll.totalVotes = 3;
    poll.viewerCode = "INGMC";
    poll.viewerVoteOptionId = poll.options[0]!.id;
    poll.options[0] = {
      ...poll.options[0]!,
      ratio: 67,
      viewerHasVoted: true,
      voteCount: 2,
    };
    poll.options[1] = {
      ...poll.options[1]!,
      ratio: 33,
      voteCount: 1,
    };
    poll.codePerspectives = [
      {
        code: "INGMC",
        name: "새 가능성을 찾는 탐험가",
        options: [
          { label: poll.options[0]!.label, ratio: 100, voteCount: 2 },
          { label: poll.options[1]!.label, ratio: 0, voteCount: 0 },
        ],
        totalVotes: 2,
      },
    ];

    render(<FeedPollCard poll={poll} variant="playground" />);

    fireEvent.click(
      screen.getByRole("button", { name: /혼자 여유롭게 보낸다/ }),
    );

    const perspective = screen.getByRole("region", {
      name: "뉴앙 코드별 결과",
    });
    expect(within(perspective).getByText("33%")).toBeVisible();
    expect(within(perspective).getByText("67%")).toBeVisible();

    fireEvent.click(
      within(perspective).getByRole("button", { name: "INGMC" }),
    );
    expect(within(perspective).getAllByText("50%")).toHaveLength(2);

    fireEvent.click(
      within(perspective).getByRole("button", { name: "참여 코드 1" }),
    );
    expect(
      within(perspective).getByRole("button", { name: "INGMC 2명" }),
    ).toBeVisible();
    fireEvent.click(
      within(perspective).getByRole("button", { name: "INGMC 2명" }),
    );
    expect(within(perspective).getAllByText("50%")).toHaveLength(2);
  });

  it("keeps final results visible and blocks new votes after closing", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const poll = createPoll();
    poll.status = "closed";
    poll.totalVotes = 10;
    poll.options[0] = {
      ...poll.options[0]!,
      ratio: 60,
      voteCount: 6,
    };
    poll.options[1] = {
      ...poll.options[1]!,
      ratio: 40,
      voteCount: 4,
    };

    render(<FeedPollCard poll={poll} variant="playground" />);

    expect(screen.getByText("투표 마감")).toBeInTheDocument();
    expect(
      screen.getByText("마감된 최종 결과 · 총 10명 참여"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("60%").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /사람을 만나 함께 보낸다/ }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("region", { name: "뉴앙 코드별 결과" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /사람을 만나 함께 보낸다/ }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps accumulated code statistics available after a poll closes", () => {
    const poll = createPoll();
    poll.status = "closed";
    poll.canViewCodeStats = true;
    poll.totalVotes = 1;
    poll.viewerVoteOptionId = poll.options[0]!.id;
    poll.options[0]!.viewerHasVoted = true;
    poll.codePerspectives = [
      {
        code: "ENAKQ",
        name: "관계를 여는 선도자",
        options: [
          { label: poll.options[0]!.label, ratio: 100, voteCount: 1 },
          { label: poll.options[1]!.label, ratio: 0, voteCount: 0 },
        ],
        totalVotes: 1,
      },
    ];

    render(<FeedPollCard poll={poll} variant="playground" />);

    const perspective = screen.getByRole("region", {
      name: "뉴앙 코드별 결과",
    });
    expect(
      within(perspective).getByRole("button", {
        name: "결과 보기 펼치기",
      }),
    ).toBeVisible();
    expect(screen.getByText("마감된 최종 결과예요.")).toBeVisible();
    fireEvent.click(
      within(perspective).getByRole("button", {
        name: "결과 보기 펼치기",
      }),
    );
    expect(
      within(perspective).getByRole("button", { name: "참여 코드 1" }),
    ).toBeVisible();
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
