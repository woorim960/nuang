import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminCommunityContentManager } from "@/features/admin/AdminCommunityContentManager";
import type { AdminCommunityContentDashboard } from "@/features/admin/server-admin-community-content";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const dashboard: AdminCommunityContentDashboard = {
  counts: {
    archived: 0,
    closed: 0,
    draft: 1,
    published: 1,
    scheduled: 0,
  },
  items: [
    {
      body: "둘 중 더 끌리는 쪽을 골라보세요.",
      closedAt: null,
      contentType: "balance_game",
      createdAt: "2026-07-27T00:00:00.000Z",
      id: "11111111-1111-4111-8111-111111111111",
      isFeatured: true,
      options: [
        { key: "plan", label: "미리 계획한다" },
        { key: "flow", label: "그날 정한다" },
      ],
      pollId: "22222222-2222-4222-8222-222222222222",
      postId: "33333333-3333-4333-8333-333333333333",
      prompt: "여행 전날, 나는 어느 쪽에 가까운가요?",
      promptKey: "official_balance_game_001",
      publishedAt: "2026-07-27T00:00:00.000Z",
      replyCount: 3,
      revision: 1,
      responseClosesAt: null,
      scheduledFor: null,
      status: "published",
      title: "여행 계획 방식",
      updatedAt: "2026-07-27T00:00:00.000Z",
      voteCount: 24,
    },
    {
      body: "",
      closedAt: null,
      contentType: "daily_question",
      createdAt: "2026-07-27T00:00:00.000Z",
      id: "44444444-4444-4444-8444-444444444444",
      isFeatured: false,
      options: [],
      pollId: null,
      postId: null,
      prompt: "요즘 가장 마음이 편해지는 순간은 언제인가요?",
      promptKey: "official_daily_question_001",
      publishedAt: null,
      replyCount: 0,
      revision: 1,
      responseClosesAt: null,
      scheduledFor: null,
      status: "draft",
      title: "마음이 편한 순간",
      updatedAt: "2026-07-27T00:00:00.000Z",
      voteCount: 0,
    },
  ],
};

describe("AdminCommunityContentManager", () => {
  beforeEach(() => {
    refresh.mockReset();
  });

  it("shows operational state and protects published poll history through duplication", () => {
    render(
      <AdminCommunityContentManager
        contentType="balance_game"
        dashboard={dashboard}
      />,
    );

    expect(screen.getByText("여행 계획 방식")).toBeInTheDocument();
    expect(screen.getByText("24명 참여")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /복제/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /편집/ }),
    ).not.toBeInTheDocument();
  });

  it("builds a feed preview while authoring a daily question", () => {
    render(
      <AdminCommunityContentManager
        contentType="daily_question"
        dashboard={dashboard}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /새로 만들기/ }));
    fireEvent.change(screen.getByLabelText(/운영용 제목/), {
      target: { value: "오늘의 회복 순간" },
    });
    fireEvent.change(screen.getByLabelText(/질문/), {
      target: { value: "오늘 나를 다시 편안하게 만든 순간은 언제였나요?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "미리보기" }));

    expect(screen.getByText("피드 미리보기")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "오늘 나를 다시 편안하게 만든 순간은 언제였나요?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "임시저장" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "예약" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /지금 게시/ }),
    ).toBeInTheDocument();
  });
});
