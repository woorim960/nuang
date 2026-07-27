import { describe, expect, it } from "vitest";
import { isCommunityContentDashboard } from "@/features/admin/server-admin-community-content";

const dashboard = {
  counts: {
    archived: 0,
    closed: 1,
    draft: 2,
    published: 1,
    scheduled: 1,
  },
  items: [
    {
      body: "두 선택지 중 하나를 골라보세요.",
      closedAt: null,
      contentType: "balance_game",
      createdAt: "2026-07-27T00:00:00.000Z",
      id: "11111111-1111-4111-8111-111111111111",
      options: [
        { key: "plan", label: "계획한다" },
        { key: "flow", label: "그때 정한다" },
      ],
      pollId: null,
      postId: null,
      prompt: "여행 전날, 나는 어느 쪽에 가까운가요?",
      promptKey: "official_balance_game_001",
      publishedAt: null,
      replyCount: 0,
      revision: 1,
      scheduledFor: null,
      status: "draft",
      title: "여행 계획 방식",
      updatedAt: "2026-07-27T00:00:00.000Z",
      voteCount: 0,
    },
  ],
};

describe("admin community content dashboard contract", () => {
  it("accepts the service RPC dashboard payload", () => {
    expect(isCommunityContentDashboard(dashboard)).toBe(true);
  });

  it("rejects unknown states and malformed options", () => {
    expect(
      isCommunityContentDashboard({
        ...dashboard,
        items: [{ ...dashboard.items[0], status: "reviewing" }],
      }),
    ).toBe(false);
    expect(
      isCommunityContentDashboard({
        ...dashboard,
        items: [{ ...dashboard.items[0], options: [{ label: "누락" }] }],
      }),
    ).toBe(false);
  });
});
