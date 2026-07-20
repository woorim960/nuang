import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommunityNotificationsPage from "@/app/feed/notifications/page";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
  readCommunityNotifications: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

vi.mock("@/features/feed/server-community-social", () => ({
  readCommunityNotifications: mocks.readCommunityNotifications,
}));

describe("CommunityNotificationsPage", () => {
  beforeEach(() => {
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    });
    mocks.createSupabaseServiceClient.mockReturnValue({});
  });

  it("opens the follower's public profile from a real follow notification", async () => {
    mocks.readCommunityNotifications.mockResolvedValue({
      notifications: [
        {
          actorDisplayName: "하린",
          actorPublicSnapshotId: "22222222-2222-4222-8222-222222222222",
          createdAt: new Date().toISOString(),
          eventType: "follow",
          id: "33333333-3333-4333-8333-333333333333",
          previewText: "새로운 팔로우가 시작됐어요.",
          targetId: "11111111-1111-4111-8111-111111111111",
          targetType: "public_profile",
        },
      ],
      state: "ready",
    });

    render(await CommunityNotificationsPage());

    expect(
      screen.getByRole("link", { name: /하린님이 팔로우했어요/ }),
    ).toHaveAttribute(
      "href",
      "/feed/profiles/22222222-2222-4222-8222-222222222222",
    );
  });

  it("shows an actionable failure state when notifications cannot load", async () => {
    mocks.readCommunityNotifications.mockResolvedValue({
      notifications: [],
      state: "unavailable",
    });

    render(await CommunityNotificationsPage());

    expect(screen.getByText("알림을 불러오지 못했어요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "다시 불러오기" })).toHaveAttribute(
      "href",
      "/feed/notifications",
    );
  });
});
