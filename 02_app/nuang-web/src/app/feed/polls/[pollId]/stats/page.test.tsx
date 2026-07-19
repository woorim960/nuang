import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FeedPollStatsPage, {
  metadata,
} from "@/app/feed/polls/[pollId]/stats/page";

const feedReadMocks = vi.hoisted(() => ({
  createServerFeedPollStatsPayload: vi.fn(),
}));
const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/features/feed/server-read", () => ({
  createServerFeedPollStatsPayload:
    feedReadMocks.createServerFeedPollStatsPayload,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

describe("FeedPollStatsPage", () => {
  it("shows code-level stats and comments after the privacy threshold", async () => {
    feedReadMocks.createServerFeedPollStatsPayload.mockResolvedValue({
      codeRows: [
        {
          code: "ENAKQ",
          name: "관계를 여는 지휘자",
          options: [
            {
              label: "산",
              ratio: 0,
              voteCount: 0,
            },
            {
              label: "바다",
              ratio: 100,
              voteCount: 3,
            },
          ],
          totalVotes: 3,
        },
      ],
      options: [
        {
          id: "option-mountain",
          label: "산",
          ratio: 0,
          voteCount: 0,
        },
        {
          id: "option-sea",
          label: "바다",
          ratio: 100,
          voteCount: 3,
        },
      ],
      poll: {
        id: "11111111-1111-4111-8111-111111111111",
        question: "나 혼자 여행 간다면?",
      },
      post: {
        id: "22222222-2222-4222-8222-222222222222",
        replyCount: 1,
        replyPreview: [
          {
            authorHandle: "nuang.user",
            authorName: "NUANG 사용자",
            body: "함께 시간을 보내면 기분이 더 살아나요.",
            id: "comment-001",
          },
        ],
      },
      totalVotes: 3,
    });

    render(
      await FeedPollStatsPage({
        params: Promise.resolve({
          pollId: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "뉴앙 코드별 통계" }),
    ).toBeInTheDocument();
    expect(screen.getByText("3명 참여")).toBeInTheDocument();
    expect(screen.getByText("ENAKQ")).toBeInTheDocument();
    expect(screen.getByText("관계를 여는 지휘자")).toBeInTheDocument();
    expect(screen.getAllByText("100% · 3명").length).toBeGreaterThan(0);
    expect(document.body).toHaveTextContent("3명 이상 참여한 경우만 표시해요.");
    expect(document.body).not.toHaveTextContent("5명");
    expect(document.body).not.toHaveTextContent("누가 투표");
    expect(screen.getByText("댓글로 이어서 이야기해요")).toBeInTheDocument();
    expect(
      screen.getByText("함께 시간을 보내면 기분이 더 살아나요."),
    ).toBeInTheDocument();
  });

  it("keeps noindex metadata for poll stats", () => {
    expect(metadata.robots).toMatchObject({
      follow: false,
      index: false,
    });
  });

  it("returns to home and preserves the stats route for comment login", async () => {
    feedReadMocks.createServerFeedPollStatsPayload.mockResolvedValue({
      codeRows: [],
      options: [],
      poll: {
        id: "11111111-1111-4111-8111-111111111111",
        question: "갑자기 하루 여유가 생겼다면?",
      },
      post: {
        id: "22222222-2222-4222-8222-222222222222",
        replyCount: 0,
        replyPreview: [],
      },
      totalVotes: 0,
    });

    render(
      await FeedPollStatsPage({
        params: Promise.resolve({
          pollId: "11111111-1111-4111-8111-111111111111",
        }),
        searchParams: Promise.resolve({ from: "home" }),
      }),
    );

    expect(
      screen.getByRole("link", { name: "홈으로 돌아가기" }),
    ).toHaveAttribute("href", "/home");
  });
});
