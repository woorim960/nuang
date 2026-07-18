import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FeedPollStatsPage, { metadata } from "@/app/feed/polls/[pollId]/stats/page";

const feedReadMocks = vi.hoisted(() => ({
  createServerFeedPollStatsPayload: vi.fn(),
}));

vi.mock("@/features/feed/server-read", () => ({
  createServerFeedPollStatsPayload: feedReadMocks.createServerFeedPollStatsPayload,
}));

describe("FeedPollStatsPage", () => {
  it("shows anonymous code-level stats even when a code has one vote", async () => {
    feedReadMocks.createServerFeedPollStatsPayload.mockResolvedValue({
      codeRows: [
        {
          code: "SVODE",
          name: "물결의 새길 개척가",
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
      ],
      options: [
        {
          id: "option-mountain",
          label: "산",
          ratio: 50,
          voteCount: 1,
        },
        {
          id: "option-sea",
          label: "바다",
          ratio: 50,
          voteCount: 1,
        },
      ],
      poll: {
        id: "11111111-1111-4111-8111-111111111111",
        question: "나 혼자 여행 간다면?",
      },
      totalVotes: 2,
    });

    render(
      await FeedPollStatsPage({
        params: Promise.resolve({
          pollId: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );

    expect(screen.getByRole("heading", { name: "뉴앙 코드별 통계" }))
      .toBeInTheDocument();
    expect(screen.getByText("2명 참여")).toBeInTheDocument();
    expect(screen.getByText("SVODE")).toBeInTheDocument();
    expect(screen.getByText("물결의 새길 개척가")).toBeInTheDocument();
    expect(screen.getAllByText("100% · 1명").length).toBeGreaterThan(0);
    expect(document.body).toHaveTextContent("0명인 코드는 숨겨요.");
    expect(document.body).not.toHaveTextContent("5명");
    expect(document.body).not.toHaveTextContent("누가 투표");
  });

  it("keeps noindex metadata for poll stats", () => {
    expect(metadata.robots).toMatchObject({
      follow: false,
      index: false,
    });
  });
});
