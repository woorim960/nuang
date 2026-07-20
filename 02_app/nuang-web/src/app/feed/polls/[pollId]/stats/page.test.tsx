import { fireEvent, render, screen } from "@testing-library/react";
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
  it("shows the V12 code perspective explorer from the first vote", async () => {
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
              voteCount: 1,
            },
          ],
          totalVotes: 1,
        },
        {
          code: "IRGMC",
          name: "단서를 좇는 탐구자",
          options: [
            { label: "산", ratio: 100, voteCount: 1 },
            { label: "바다", ratio: 0, voteCount: 0 },
          ],
          totalVotes: 1,
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
      totalVotes: 2,
      viewer: {
        isAuthenticated: true,
        nuangCode: "ENAKQ",
        profileName: "관계를 여는 지휘자",
        voteOptionId: "option-sea",
        voteOptionLabel: "바다",
      },
    });

    render(
      await FeedPollStatsPage({
        params: Promise.resolve({
          pollId: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "코드별 관점" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2개 코드가 참여했어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ENAKQ.*1명/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("ENAKQ의 관점")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /IRGMC.*1명/ }));
    expect(screen.getByText("IRGMC의 관점")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(document.body).toHaveTextContent("1명부터 코드별 선택을");
    expect(document.body).not.toHaveTextContent("누가 투표");
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
      viewer: {
        isAuthenticated: false,
        nuangCode: null,
        profileName: null,
        voteOptionId: null,
        voteOptionLabel: null,
      },
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
    expect(
      screen.getByText("먼저 오늘의 선택을 골라주세요"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /투표하고 관점 보기/ }),
    ).toHaveAttribute("href", "/home");
    expect(
      screen.queryByText("코드별 관점을 모으고 있어요"),
    ).not.toBeInTheDocument();
  });
});
