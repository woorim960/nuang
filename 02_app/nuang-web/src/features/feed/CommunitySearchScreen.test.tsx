import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommunitySearchScreen } from "@/features/feed/CommunitySearchScreen";
import { feedItems, type FeedItem } from "@/features/feed/feed-seed";

const post: FeedItem = {
  authorHandle: "summer.note",
  authorName: "여름",
  avatarLabel: "여",
  body: "조용한 카페에서 오늘의 생각을 정리했어요.",
  id: "44444444-4444-4444-8444-444444444444",
  kind: "user_post",
  layout: "thread",
  likeLabel: "좋아요 0개",
  priority: 0,
  replyLabel: "댓글 0개",
  timeLabel: "5분",
  title: "오늘의 생각",
  topic: { category: "daily_life", label: "일상", tags: ["카페"] },
};

describe("CommunitySearchScreen", () => {
  it("searches public content on one dedicated route screen", () => {
    render(<CommunitySearchScreen posts={[post]} />);

    expect(
      screen.getByRole("link", { name: "커뮤니티로 돌아가기" }),
    ).toHaveAttribute("href", "/feed");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "커뮤니티 검색어" }),
      { target: { value: "#카페" } },
    );

    expect(screen.getByText("검색 결과")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "검색어 지우기" }),
    ).toHaveLength(1);
    expect(screen.getByText("2개")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /#카페/ })).toHaveAttribute(
      "href",
      `/feed/tags/${encodeURIComponent("카페")}`,
    );
    expect(screen.getByRole("link", { name: /여름/ })).toHaveAttribute(
      "href",
      "/feed/posts/44444444-4444-4444-8444-444444444444",
    );
  });

  it("opens a matching public profile from search", () => {
    const profilePost = feedItems.find((item) => item.authorProfile);
    if (!profilePost?.authorProfile) throw new Error("profile fixture missing");

    render(<CommunitySearchScreen posts={[profilePost]} />);
    fireEvent.change(
      screen.getByRole("searchbox", { name: "커뮤니티 검색어" }),
      { target: { value: profilePost.authorProfile.display.code } },
    );

    expect(screen.getByText("프로필")).toBeInTheDocument();
    const profileHref = `/feed/profiles/${profilePost.authorProfile.source.publicSnapshotId}`;
    const profileLink = screen
      .getAllByRole("link", {
        name: new RegExp(profilePost.authorProfile.display.displayName),
      })
      .find((link) => link.getAttribute("href") === profileHref);
    expect(profileLink).toHaveAttribute("href", profileHref);
  });
});
