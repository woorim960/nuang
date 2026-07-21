import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
import { betaCoreAssessment } from "@/features/assessment/beta-core-seed";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import type {
  AssessmentDefinition,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";
import type { FeedItem } from "@/features/feed/feed-seed";
import { HomeDashboard } from "@/features/home/HomeDashboard";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/features/assessment/assessment-storage", () => ({
  listLocalAttempts: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

describe("HomeDashboard", () => {
  beforeEach(() => {
    vi.mocked(listLocalAttempts).mockResolvedValue([]);
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
  });

  it("renders a focused first-visit home without duplicate menu sections", async () => {
    render(<HomeDashboard />);

    expect(
      await screen.findByRole("heading", {
        name: "3분이면 내 성향의 첫 단서를 만나요",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("NUANG").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: /첫 성향 검사 시작/ }),
    ).toHaveAttribute("href", "/assessments/nu-core-quick?returnTo=%2Fhome");
    expect(
      screen.getByText("오늘의 질문을 준비하고 있어요"),
    ).toBeInTheDocument();
    expect(screen.getByText("오늘 발견할 성향")).toBeInTheDocument();
    const profileLink = await screen.findByRole("link", {
      name: /성향 자세히 보기/,
    });
    expect(profileLink.getAttribute("href")).toMatch(
      /^\/map\/[EI][RN][GA][KM][CQ]\?from=home$/,
    );
    expect(screen.getByText("지금 많이 이야기하는 것")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "커뮤니티 더 보기" }),
    ).toHaveAttribute("href", "/feed");
    expect(screen.getByText(/답변은 공개되지 않아요/)).toBeInTheDocument();

    expect(screen.queryByText("오늘의 메뉴")).not.toBeInTheDocument();
    expect(screen.queryByText("피드 미리보기")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/알림/)).toHaveAttribute(
      "href",
      "/feed/notifications",
    );
    expect(screen.queryByText(/리듬/)).not.toBeInTheDocument();
  });

  it("renders server-supplied feed content as a tappable conversation", async () => {
    const serverPreviewItems: FeedItem[] = [
      {
        authorHandle: "me",
        authorName: "나",
        avatarLabel: "나",
        body: "실제 피드에 쓴 글이 홈에서도 같은 내용으로 보여요.",
        id: "home-preview-server-post",
        kind: "user_post",
        layout: "thread",
        likeLabel: "좋아요 0개",
        priority: -1000,
        replyLabel: "답글 0개",
        targetType: "feed_post",
        timeLabel: "방금",
        title: "오늘의 생각",
      },
      {
        authorHandle: "short",
        authorName: "짧은 글",
        avatarLabel: "짧",
        body: "ㅣㅏㅡㅔ",
        id: "home-preview-unreadable-post",
        kind: "user_post",
        layout: "thread",
        likeLabel: "좋아요 0개",
        priority: -999,
        replyLabel: "답글 0개",
        targetType: "feed_post",
        timeLabel: "방금",
        title: "밸런스 게임",
      },
    ];

    render(<HomeDashboard feedPreviewItems={serverPreviewItems} />);

    expect(await screen.findByText("오늘의 생각")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /오늘의 생각/ })).toHaveAttribute(
      "href",
      "/feed/posts/home-preview-server-post",
    );
    expect(screen.queryByText("ㅣㅏㅡㅔ")).not.toBeInTheDocument();
    expect(
      screen.getByText("오늘의 질문을 준비하고 있어요"),
    ).toBeInTheDocument();
  });

  it("does not invent a separate local vote when the official poll is unavailable", async () => {
    render(<HomeDashboard feedPreviewItems={[]} />);

    expect(
      await screen.findByText("오늘의 질문을 준비하고 있어요"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /커뮤니티 보기/ })).toHaveAttribute(
      "href",
      "/feed",
    );
    expect(window.localStorage.length).toBe(0);
  });

  it("uses the same playground post, actions, and replies as the community", async () => {
    const user = userEvent.setup();
    const communityPollItem: FeedItem = {
      authorHandle: "nuang.official",
      authorName: "NUANG",
      avatarLabel: "뉴",
      body: "오늘 더 끌리는 쪽을 골라보세요.",
      id: "6af1b7c2-b8e1-4ee5-9c68-76b92bda0801",
      kind: "balance_game",
      layout: "thread",
      likeLabel: "좋아요 0개",
      poll: {
        canViewCodeStats: true,
        codePerspectives: [],
        id: "7be2c8d3-c9f2-4f16-8d79-87ca3ceb0801",
        options: [
          {
            id: "option-together",
            key: "together",
            label: "사람을 만나 함께 보낸다",
            ratio: 60,
            viewerHasVoted: true,
            voteCount: 6,
          },
          {
            id: "option-solo",
            key: "solo",
            label: "혼자 여유롭게 보낸다",
            ratio: 40,
            viewerHasVoted: false,
            voteCount: 4,
          },
        ],
        promptId: "balance_home_free_day_together_solo_001",
        question: "갑자기 하루 여유가 생겼다면, 지금 더 끌리는 쪽은?",
        statsHref: "/feed/polls/7be2c8d3-c9f2-4f16-8d79-87ca3ceb0801/stats",
        totalVotes: 10,
        viewerCode: "INGMC",
        viewerVoteOptionId: "option-together",
      },
      priority: -1000,
      replyCount: 3,
      replyLabel: "답글 3개",
      replyPreview: [
        {
          authorHandle: "guest",
          authorName: "고요한산책",
          body: "오늘은 혼자 쉬는 시간이 더 필요했어요.",
          id: "reply-1",
        },
      ],
      targetType: "feed_post",
      timeLabel: "방금",
      title: "밸런스 게임",
    };

    render(<HomeDashboard feedPreviewItems={[communityPollItem]} />);

    expect(await screen.findByText("오늘의 성향 놀이터")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "오늘의 밸런스 게임" }),
    ).toBeInTheDocument();
    expect(screen.getByText("10명 참여")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 기록" })).toHaveAttribute(
      "href",
      "/feed/perspectives?from=home",
    );
    expect(
      screen.getByRole("link", { name: "커뮤니티에서 이어보기" }),
    ).toHaveAttribute(
      "href",
      "/feed?posted=6af1b7c2-b8e1-4ee5-9c68-76b92bda0801",
    );
    expect(
      screen.getByRole("button", { name: /코드별 관점 펼치기/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /좋아요/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /공유/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /저장/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "댓글" }));
    expect(
      screen.getByText("오늘은 혼자 쉬는 시간이 더 필요했어요."),
    ).toBeInTheDocument();
  });

  it("opens code perspectives even when the first participant has voted", async () => {
    const communityPollItem: FeedItem = {
      authorHandle: "nuang.official",
      authorName: "NUANG",
      avatarLabel: "뉴",
      body: "오늘 더 끌리는 쪽을 골라보세요.",
      id: "official-poll-low-participation",
      kind: "balance_game",
      layout: "thread",
      likeLabel: "좋아요 0개",
      poll: {
        canViewCodeStats: true,
        codePerspectives: [
          {
            code: "INGMC",
            name: "새 길을 찾는 탐구자",
            options: [
              {
                label: "사람을 만나 함께 보낸다",
                ratio: 100,
                voteCount: 1,
              },
              {
                label: "혼자 여유롭게 보낸다",
                ratio: 0,
                voteCount: 0,
              },
            ],
            totalVotes: 1,
          },
        ],
        id: "poll-low-participation",
        options: [
          {
            id: "option-together",
            key: "together",
            label: "사람을 만나 함께 보낸다",
            ratio: 100,
            viewerHasVoted: true,
            voteCount: 1,
          },
          {
            id: "option-solo",
            key: "solo",
            label: "혼자 여유롭게 보낸다",
            ratio: 0,
            viewerHasVoted: false,
            voteCount: 0,
          },
        ],
        promptId: "balance_home_free_day_together_solo_001",
        question: "갑자기 하루 여유가 생겼다면, 지금 더 끌리는 쪽은?",
        statsHref: "/feed/polls/poll-low-participation/stats",
        totalVotes: 1,
        viewerCode: "INGMC",
        viewerVoteOptionId: "option-together",
      },
      priority: -1000,
      replyCount: 0,
      replyLabel: "답글 0개",
      targetType: "feed_post",
      timeLabel: "방금",
      title: "밸런스 게임",
    };

    render(<HomeDashboard feedPreviewItems={[communityPollItem]} />);

    expect(await screen.findByText("1명 참여")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /코드별 관점 펼치기/ }),
    ).toBeInTheDocument();
  });

  it("resumes the current full assessment with accurate base-item progress", async () => {
    vi.mocked(listLocalAttempts).mockResolvedValue([
      createInProgressAttempt(
        betaCoreAssessment,
        31,
        "2026-07-19T10:00:00.000Z",
      ),
      createInProgressAttempt(
        candidateFullCoreAssessment,
        19,
        "2026-07-19T09:00:00.000Z",
      ),
    ]);

    render(<HomeDashboard />);

    expect(
      await screen.findByRole("heading", { name: "답하던 곳부터 이어가요" }),
    ).toBeInTheDocument();
    expect(screen.getByText("32%")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "정밀 성향 검사 진행률" }),
    ).toHaveAttribute("aria-valuetext", "60개 중 19개 응답 저장");
    expect(screen.getByRole("link", { name: /검사 이어가기/ })).toHaveAttribute(
      "href",
      "/assessments/nu-core-full?from=home&backTo=%2Fhome&returnTo=%2Fhome",
    );
  });

  it("recovers to a usable first state when local storage cannot be read", async () => {
    vi.mocked(listLocalAttempts).mockRejectedValue(new Error("blocked"));

    render(<HomeDashboard />);

    expect(
      await screen.findByRole("heading", {
        name: "3분이면 내 성향의 첫 단서를 만나요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /첫 성향 검사 시작/ }),
    ).toBeInTheDocument();
  });
});

function createInProgressAttempt(
  assessment: AssessmentDefinition,
  answeredCount: number,
  updatedAt: string,
): LocalAssessmentAttempt {
  return {
    assessmentId: assessment.assessmentId,
    createdAt: "2026-07-19T08:00:00.000Z",
    currentIndex: answeredCount,
    expiresAt: "2026-08-18T08:00:00.000Z",
    id: `local-${assessment.releaseId}`,
    itemIds: assessment.items.map((item) => item.itemId),
    mode: assessment.mode,
    releaseId: assessment.releaseId,
    responses: Object.fromEntries(
      assessment.items.slice(0, answeredCount).map((item) => [
        item.itemId,
        {
          answeredAt: updatedAt,
          itemId: item.itemId,
          value: 4 as const,
        },
      ]),
    ),
    state: "in_progress",
    updatedAt,
  };
}

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
