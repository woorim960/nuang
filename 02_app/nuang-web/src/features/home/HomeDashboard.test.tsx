import { render, screen } from "@testing-library/react";
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

vi.mock("@/features/assessment/assessment-storage", () => ({
  listLocalAttempts: vi.fn(),
}));

describe("HomeDashboard", () => {
  beforeEach(() => {
    vi.mocked(listLocalAttempts).mockResolvedValue([]);
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
        name: "서로 다른 사람과 편하게 지내는 방법",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("지금 나누는 이야기")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "피드에서 더 보기" }),
    ).toHaveAttribute("href", "/feed");
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
    ];

    render(<HomeDashboard feedPreviewItems={serverPreviewItems} />);

    expect(await screen.findByText("오늘의 생각")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /오늘의 생각/ })).toHaveAttribute(
      "href",
      "/feed",
    );
    expect(screen.queryByText("오늘의 성향 질문")).not.toBeInTheDocument();
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
