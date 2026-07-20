import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PerspectiveCollection } from "@/features/feed/PerspectiveCollection";
import type { FeedPlaygroundRecord } from "@/features/feed/server-read";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("PerspectiveCollection", () => {
  it("shows the viewer's real choices and filters only by recorded topics", () => {
    render(
      <PerspectiveCollection
        payload={{
          records: [
            createRecord({
              pollId: "poll-relationship",
              question: "친구와 약속 시간이 달라졌다면?",
              topicLabel: "관계",
            }),
            createRecord({
              pollId: "poll-preference",
              question: "혼자 떠난다면 산과 바다 중 어디로 갈까요?",
              topicLabel: "취향",
              voteId: "vote-preference",
            }),
          ],
          state: "ready",
        }}
      />,
    );

    expect(screen.getAllByText("참여 당시 코드")).toHaveLength(2);
    expect(screen.getAllByText(/INGMC/).length).toBeGreaterThan(0);
    expect(screen.getByText(/친구와 약속 시간이/)).toBeInTheDocument();
    expect(screen.getByText(/혼자 떠난다면/)).toBeInTheDocument();
    expect(screen.queryByText("자주 나타난 처음 생각")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "관계" }));

    expect(screen.getByText(/친구와 약속 시간이/)).toBeInTheDocument();
    expect(screen.queryByText(/혼자 떠난다면/)).not.toBeInTheDocument();
  });

  it("guides a signed-out viewer to login without exposing records", () => {
    render(
      <PerspectiveCollection
        payload={{ records: [], state: "unauthenticated" }}
      />,
    );

    expect(
      screen.getByRole("link", { name: "로그인하고 내 기록 보기" }),
    ).toHaveAttribute(
      "href",
      "/login?next=%2Ffeed%2Fperspectives&reason=community",
    );
  });

  it("shows a useful first-participation empty state", () => {
    render(<PerspectiveCollection payload={{ records: [], state: "ready" }} />);

    expect(screen.getByText("아직 참여한 질문이 없어요")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "오늘의 질문 보러 가기" }),
    ).toHaveAttribute("href", "/feed");
  });
});

function createRecord(
  overrides: Partial<FeedPlaygroundRecord> = {},
): FeedPlaygroundRecord {
  const pollId = overrides.pollId ?? "poll-relationship";
  const question = overrides.question ?? "친구와 약속 시간이 달라졌다면?";
  const selectedOptionId = `${pollId}-option-a`;

  return {
    canRevote: true,
    participatedAt: "2026-07-20T04:00:00.000Z",
    poll: {
      canViewCodeStats: true,
      codePerspectives: [
        {
          code: "INGMC",
          name: "새 길을 찾는 탐구자",
          options: [
            { label: "먼저 이야기한다", ratio: 100, voteCount: 1 },
            { label: "조금 기다린다", ratio: 0, voteCount: 0 },
          ],
          totalVotes: 1,
        },
      ],
      id: pollId,
      options: [
        {
          id: selectedOptionId,
          key: "talk",
          label: "먼저 이야기한다",
          ratio: 100,
          viewerHasVoted: true,
          voteCount: 1,
        },
        {
          id: `${pollId}-option-b`,
          key: "wait",
          label: "조금 기다린다",
          ratio: 0,
          viewerHasVoted: false,
          voteCount: 0,
        },
      ],
      promptId: pollId,
      question,
      statsHref: `/feed/polls/${pollId}/stats`,
      totalVotes: 1,
      viewerCode: "INGMC",
      viewerVoteOptionId: selectedOptionId,
    },
    pollId,
    postId: "22222222-2222-4222-8222-222222222222",
    question,
    selectedCode: "INGMC",
    selectedOptionLabel: "먼저 이야기한다",
    selectedProfileName: "새 길을 찾는 탐구자",
    status: "active",
    topicLabel: "관계",
    voteId: "vote-relationship",
    ...overrides,
  };
}
