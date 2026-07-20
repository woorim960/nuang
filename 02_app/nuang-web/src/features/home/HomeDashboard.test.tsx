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
        name: "3분이면 첫 뉴앙 코드를 만나요",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("NUANG").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: /첫 성향 검사 시작/ }),
    ).toHaveAttribute("href", "/assessments/nu-core-quick?returnTo=%2Fhome");
    expect(screen.getByText("오늘의 성향 질문")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "오늘 나는 어느 쪽에 가까울까요?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("오늘 만나는 성향")).toBeInTheDocument();
    const profileLink = await screen.findByRole("link", {
      name: /성향지도에서 더 알아보기/,
    });
    expect(profileLink.getAttribute("href")).toMatch(
      /^\/map\?code=[EI][RN][GA][KM][CQ]&from=home$/,
    );
    expect(
      screen.getByText("다른 사람들은 이렇게 생각해요"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "더 보기" })).toHaveAttribute(
      "href",
      "/feed",
    );
    expect(screen.getByText("내 답변은 나만 볼 수 있어요")).toBeInTheDocument();

    expect(screen.queryByText("오늘의 메뉴")).not.toBeInTheDocument();
    expect(screen.queryByText("피드 미리보기")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/알림/)).not.toBeInTheDocument();
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
      "/feed",
    );
    expect(screen.queryByText("ㅣㅏㅡㅔ")).not.toBeInTheDocument();
    expect(screen.getByText("오늘의 성향 질문")).toBeInTheDocument();
  });

  it("lets a visitor answer the daily choice without signing in", async () => {
    const user = userEvent.setup();

    render(<HomeDashboard />);

    const option = await screen.findByRole("button", {
      name: /사람을 만나 함께 보낸다/,
    });
    await user.click(option);

    expect(option).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent(
      "누군가와 시간을 나누는 쪽이 더 끌렸네요",
    );
    const storedChoiceKey = window.localStorage.key(0);
    expect(storedChoiceKey).toMatch(
      /^nuang:home:daily-choice:free-day-choice-v1:\d{4}-\d{2}-\d{2}$/,
    );
    expect(window.localStorage.getItem(storedChoiceKey ?? "")).toBe("together");
    expect(
      screen.getByRole("link", { name: /다른 사람들의 생각도 보기/ }),
    ).toHaveAttribute("href", "/feed");
  });

  it("shows live totals and community links when the official poll is connected", async () => {
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

    expect(await screen.findByText("실시간 커뮤니티 투표")).toBeInTheDocument();
    expect(screen.getByText("10명 참여")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /코드별 결과 비교하기/ }),
    ).toHaveAttribute(
      "href",
      "/feed/polls/7be2c8d3-c9f2-4f16-8d79-87ca3ceb0801/stats?from=home",
    );
    expect(
      screen.getByText("뉴앙 코드별 선택 차이가 열렸어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("오늘은 혼자 쉬는 시간이 더 필요했어요."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /3개 댓글 모두 보기/ }),
    ).toHaveAttribute(
      "href",
      "/feed/polls/7be2c8d3-c9f2-4f16-8d79-87ca3ceb0801/stats?from=home",
    );
  });

  it("explains the low-participation state without inventing code statistics", async () => {
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
        canViewCodeStats: false,
        codePerspectives: [],
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
      screen.getByText("사람들의 선택이 모이기 시작했어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "참여가 더 모이면 뉴앙 코드별 선택 차이도 볼 수 있어요.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("코드별 결과 비교하기")).not.toBeInTheDocument();
    expect(
      screen.getByText("내가 고른 이유를 먼저 남겨보세요."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /첫 댓글 남기기/ }),
    ).toHaveAttribute(
      "href",
      "/feed/polls/poll-low-participation/stats?from=home",
    );
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
      await screen.findByRole("heading", { name: "답하던 곳부터 계속해요" }),
    ).toBeInTheDocument();
    expect(screen.getByText("32%")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "정밀 성향 검사 진행률" }),
    ).toHaveAttribute("aria-valuetext", "60개 중 19개 응답 저장");
    expect(
      screen.getByRole("link", { name: /정밀 성향 검사 이어가기/ }),
    ).toHaveAttribute(
      "href",
      "/assessments/nu-core-full?from=home&backTo=%2Fhome&returnTo=%2Fhome",
    );
  });

  it("recovers to a usable first state when local storage cannot be read", async () => {
    vi.mocked(listLocalAttempts).mockRejectedValue(new Error("blocked"));

    render(<HomeDashboard />);

    expect(
      await screen.findByRole("heading", {
        name: "3분이면 첫 뉴앙 코드를 만나요",
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
