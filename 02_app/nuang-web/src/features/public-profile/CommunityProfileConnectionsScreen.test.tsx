import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { feedItems } from "@/features/feed/feed-seed";
import { CommunityProfileConnectionsScreen } from "@/features/public-profile/CommunityProfileConnectionsScreen";

const routerMock = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

const item = feedItems.find((feedItem) => feedItem.authorProfile);
if (!item?.authorProfile) throw new Error("public profile fixture missing");

const connection = {
  code: item.authorProfile.display.code,
  connectedAt: "2026-07-20T00:00:00.000Z",
  displayName: item.authorProfile.display.displayName,
  profileImage: item.authorProfile.display.profileImage,
  profileName: item.authorProfile.display.profileName,
  publicSnapshotId: item.authorProfile.source.publicSnapshotId,
};

describe("CommunityProfileConnectionsScreen", () => {
  it("switches between follower lists and links each person to a profile", () => {
    render(
      <CommunityProfileConnectionsScreen
        activeTab="followers"
        result={{
          followers: [connection],
          following: [],
          ownerDisplayName: "여름",
          ownerPublicSnapshotId: "11111111-1111-4111-8111-111111111111",
          state: "ready",
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "팔로워 1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "팔로잉 0" })).toHaveAttribute(
      "href",
      expect.stringContaining("tab=following"),
    );
    expect(
      screen.getByRole("link", {
        name: `${connection.displayName}님의 프로필 보기`,
      }),
    ).toHaveAttribute("href", `/feed/profiles/${connection.publicSnapshotId}`);
  });

  it("provides a useful empty state without adding another task", () => {
    render(
      <CommunityProfileConnectionsScreen
        activeTab="following"
        result={{
          followers: [],
          following: [],
          ownerDisplayName: "여름",
          ownerPublicSnapshotId: "11111111-1111-4111-8111-111111111111",
          state: "ready",
        }}
      />,
    );

    expect(
      screen.getByText("아직 팔로우한 프로필이 없어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "커뮤니티 둘러보기" }),
    ).toHaveAttribute("href", "/feed");
  });

  it("keeps the user on the list and retries a failed read", () => {
    render(
      <CommunityProfileConnectionsScreen
        activeTab="followers"
        result={{
          followers: [],
          following: [],
          ownerDisplayName: "여름",
          ownerPublicSnapshotId: "11111111-1111-4111-8111-111111111111",
          state: "unavailable",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(routerMock.refresh).toHaveBeenCalledOnce();
  });
});
