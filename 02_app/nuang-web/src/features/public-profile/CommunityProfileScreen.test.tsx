import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { feedItems } from "@/features/feed/feed-seed";
import { CommunityProfileScreen } from "@/features/public-profile/CommunityProfileScreen";

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/feed/profiles/11111111-1111-4111-8111-111111111111",
  useRouter: () => navigationMock,
}));

const post = feedItems.find((item) => item.authorProfile);
if (!post?.authorProfile) throw new Error("public profile fixture missing");
const profile = post.authorProfile;

describe("CommunityProfileScreen", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    navigationMock.push.mockClear();
    navigationMock.refresh.mockClear();
  });

  it("shows the public profile and persists a follow through the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ followerCount: 13, following: true }), {
            headers: { "content-type": "application/json" },
            status: 200,
          }),
      ),
    );

    render(
      <CommunityProfileScreen
        initialSocialState={{
          followerCount: 12,
          following: false,
          isOwnProfile: false,
        }}
        posts={[post]}
        profile={profile}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(profile.display.profileName)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "팔로우" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "팔로잉" })).toBePressed();
    });
    expect(screen.getByText("13")).toBeInTheDocument();
  });

  it("creates a privacy-scoped comparison and opens its report", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              comparisonReportId: "33333333-3333-4333-8333-333333333333",
            }),
            { headers: { "content-type": "application/json" }, status: 200 },
          ),
      ),
    );

    render(
      <CommunityProfileScreen
        initialSocialState={{
          followerCount: 12,
          following: false,
          isOwnProfile: false,
        }}
        posts={[post]}
        profile={profile}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "나와 비교" }));

    await waitFor(() => {
      expect(navigationMock.push).toHaveBeenCalledWith(
        expect.stringContaining(
          "/reports/comparison/33333333-3333-4333-8333-333333333333?backTo=",
        ),
      );
    });
  });

  it("links reporting to a dedicated screen and blocks after confirmation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ blocked: true }), {
            headers: { "content-type": "application/json" },
            status: 200,
          }),
      ),
    );

    render(
      <CommunityProfileScreen
        initialSocialState={{
          followerCount: 12,
          following: false,
          isOwnProfile: false,
        }}
        posts={[post]}
        profile={profile}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "프로필 더보기" }));
    expect(screen.getByRole("link", { name: "신고하기" })).toHaveAttribute(
      "href",
      "/feed/profiles/11111111-1111-4111-8111-111111111111/report",
    );

    fireEvent.click(screen.getByRole("button", { name: "차단하기" }));
    expect(
      screen.getByText(`${profile.display.displayName}님을 차단할까요?`),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "차단하기" }));

    await waitFor(() => {
      expect(navigationMock.push).toHaveBeenCalledWith("/feed");
      expect(navigationMock.refresh).toHaveBeenCalled();
    });
  });

  it("keeps the own community profile in place and shares it directly", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <CommunityProfileScreen
        initialSocialState={{
          followerCount: 2,
          following: false,
          isOwnProfile: true,
        }}
        posts={[post]}
        profile={profile}
      />,
    );

    expect(
      screen.getByRole("button", { name: "내 프로필 공유" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("내 프로필 관리")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "내 프로필 공유" }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
  });
});
