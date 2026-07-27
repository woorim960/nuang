import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommunitySearchScreen } from "@/features/feed/CommunitySearchScreen";
import type { FeedItem } from "@/features/feed/feed-seed";
import type { PublicProfileSearchItem } from "@/features/public-profile/public-profile-search-contract";

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

const profile: PublicProfileSearchItem = {
  code: "ENAKQ",
  comparisonAvailable: true,
  displayName: "여름",
  handle: "summer.day",
  profileImage: {
    alt: "여름 프로필 이미지",
    motif: "purple",
    source: "character",
    src: "/assets/characters/nuang-character-purple.webp",
  },
  profileMessage: "산책을 좋아해요.",
  publicProfileId: "24000000-0000-4000-8000-000000000003",
  publicSnapshotId: "34000000-0000-4000-8000-000000000003",
  roleName: "관계를 여는 지휘자",
};

describe("CommunitySearchScreen", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps #tag and post search on the existing dedicated route", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
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
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("debounces a server profile search and opens the returned public profile", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, profiles: [profile] }), {
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CommunitySearchScreen posts={[]} />);
    fireEvent.change(
      screen.getByRole("searchbox", { name: "커뮤니티 검색어" }),
      { target: { value: "여름" } },
    );

    expect(fetchMock).not.toHaveBeenCalled();
    const profileLink = await screen.findByRole("link", {
      name: /여름[\s\S]*summer\.day[\s\S]*관계를 여는 지휘자/,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/community/profiles/search?q=%EC%97%AC%EB%A6%84",
      expect.objectContaining({ cache: "no-store", method: "GET" }),
    );
    expect(profileLink).toHaveAttribute(
      "href",
      "/feed/profiles/24000000-0000-4000-8000-000000000003",
    );
  });

  it("requires two characters and exposes an actionable error state", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    render(<CommunitySearchScreen posts={[]} />);
    const input = screen.getByRole("searchbox", {
      name: "커뮤니티 검색어",
    });

    fireEvent.change(input, { target: { value: "여" } });
    expect(
      screen.getByText("사람 검색은 두 글자부터 가능해요."),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "여름" } });
    expect(
      await screen.findByText("사람 검색을 완료하지 못했어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다시 시도" }),
    ).toBeInTheDocument();
  });

  it("makes comparison intent and the next profile action explicit", async () => {
    const hiddenComparisonProfile = {
      ...profile,
      comparisonAvailable: false,
      displayName: "비공개 사용자",
      publicProfileId: "24000000-0000-4000-8000-000000000004",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            profiles: [profile, hiddenComparisonProfile],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      ),
    );

    render(<CommunitySearchScreen intent="compare" posts={[]} />);
    expect(screen.getByText("비교할 사람 찾기")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "커뮤니티 검색어" }),
      { target: { value: "여름" } },
    );

    const link = await screen.findByRole("link", {
      name: /여름[\s\S]*프로필 확인/,
    });
    expect(link).toHaveAttribute(
      "href",
      "/feed/profiles/24000000-0000-4000-8000-000000000003?intent=compare",
    );
    expect(screen.queryByText("비공개 사용자")).not.toBeInTheDocument();
  });
});
