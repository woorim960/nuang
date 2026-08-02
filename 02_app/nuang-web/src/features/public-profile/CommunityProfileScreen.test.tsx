import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { feedItems } from "@/features/feed/feed-seed";
import type { FeedItem } from "@/features/feed/feed-seed";
import { CommunityProfileScreen } from "@/features/public-profile/CommunityProfileScreen";
import type { OriginalProfileReportSummary } from "@/features/public-profile/profile-report-contract";

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
const topicReport: OriginalProfileReportSummary = {
  assessmentSlug: "comfort-style",
  assessmentTitle: "위로받을 때 필요한 것",
  completedAt: "2026-07-28T10:00:00.000Z",
  reportKey: "topic_11111111-1111-4111-8111-111111111111",
  resultName: "방법은 같이 찾고, 속도는 내가 정하고 싶어요",
  summary: "검사 당시의 답을 바탕으로 만든 원본 결과예요.",
  type: "topic",
  viewerCanManage: false,
  visibility: "profile_public",
};
const labReport: OriginalProfileReportSummary = {
  assessmentSlug: "recharge-ritual",
  assessmentTitle: "나는 왜 쉬어도 안 풀릴까?",
  completedAt: "2026-07-27T10:00:00.000Z",
  reportKey: "lab_22222222-2222-4222-8222-222222222222",
  resultName: "조용히 충전하는 밤 산책가",
  summary: "지친 뒤 회복하는 나만의 방식을 정리했어요.",
  type: "lab",
  viewerCanManage: false,
  visibility: "profile_public",
};
const reportPost: FeedItem = {
  ...post,
  body: "지금의 나와 닮은 검사 결과를 공유해요.",
  id: "report-share-post",
  kind: "report_share",
  media: undefined,
  poll: undefined,
  questionAudience: undefined,
  reportShare: {
    assessmentKind: "full",
    assessmentTitle: "위로받을 때 필요한 것",
    completedAt: "2026-07-28T10:00:00.000Z",
    domains: [],
    href: `/feed/profiles/${profile.source.publicSnapshotId}/reports/${topicReport.reportKey}`,
    profileCode: "INGMC",
    profileName: "새 가능성을 찾는 탐험가",
    reportKey: topicReport.reportKey,
    reportType: "topic",
    resultLabel: topicReport.resultName,
    summary: topicReport.summary,
  },
  topic: undefined,
};

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
          followingCount: 8,
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
    expect(screen.getByRole("link", { name: "13팔로워" })).toHaveAttribute(
      "href",
      expect.stringContaining("/connections?tab=followers"),
    );
    expect(screen.getByRole("link", { name: "8팔로잉" })).toHaveAttribute(
      "href",
      expect.stringContaining("/connections?tab=following"),
    );
  });

  it("shows the operation center only on an authorized self profile", () => {
    const { rerender } = render(
      <CommunityProfileScreen
        initialSocialState={{
          followerCount: 12,
          following: false,
          followingCount: 8,
          isOwnProfile: true,
        }}
        mode="self"
        posts={[post]}
        profile={profile}
      />,
    );

    expect(
      screen.queryByRole("link", { name: "관리자 운영 센터" }),
    ).not.toBeInTheDocument();

    rerender(
      <CommunityProfileScreen
        initialSocialState={{
          followerCount: 12,
          following: false,
          followingCount: 8,
          isOwnProfile: true,
        }}
        mode="self"
        posts={[post]}
        profile={profile}
        showAdminEntry
      />,
    );

    expect(
      screen.getByRole("link", { name: "관리자 운영 센터" }),
    ).toHaveAttribute("href", "/admin");
  });

  it("unfollows without leaving the profile and keeps the prior state on failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ followerCount: 11, following: false }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: "팔로우 상태를 저장하지 못했어요." }),
          { headers: { "content-type": "application/json" }, status: 409 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <CommunityProfileScreen
        initialSocialState={{
          followerCount: 12,
          following: true,
          followingCount: 8,
          isOwnProfile: false,
        }}
        posts={[post]}
        profile={profile}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "팔로잉" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "팔로우" })).not.toBePressed(),
    );
    expect(screen.getByRole("link", { name: "11팔로워" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "팔로우" }));
    await waitFor(() =>
      expect(
        screen.getByText("팔로우 상태를 저장하지 못했어요."),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "팔로우" })).not.toBePressed();
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
          followingCount: 8,
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
          followingCount: 8,
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

  it("continues comparison intent into the public profile action", () => {
    render(
      <CommunityProfileScreen
        initialSocialState={{
          followerCount: 12,
          following: false,
          followingCount: 8,
          isOwnProfile: false,
        }}
        intent="compare"
        posts={[post]}
        profile={profile}
      />,
    );

    expect(screen.getByText("비교할 사람 확인")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "이 사람과 비교하기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "비교할 사람 찾기로 돌아가기" }),
    ).toHaveAttribute("href", "/feed/search?intent=compare");
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
          followingCount: 3,
          isOwnProfile: true,
        }}
        posts={[post]}
        profile={profile}
      />,
    );

    expect(
      screen.getByRole("button", { name: "프로필 공유" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /의견 보내기/ })).toHaveAttribute(
      "href",
      "/my/feedback?from=%2Fmy",
    );
    expect(
      screen.queryByRole("link", { name: "놀이터 기록" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "내 리포트" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("내 프로필 관리")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "프로필 공유" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining(
          `/feed/profiles/${profile.source.communityProfileId ?? profile.source.publicSnapshotId}`,
        ),
      ),
    );
  });

  it("opens the original report collection from the public profile", () => {
    render(
      <CommunityProfileScreen
        initialContent="reports"
        initialSocialState={{
          followerCount: 12,
          following: false,
          followingCount: 8,
          isOwnProfile: false,
        }}
        posts={[post]}
        profile={profile}
        reports={[topicReport]}
      />,
    );

    expect(screen.getByRole("button", { name: "검사 결과1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", {
        name: /위로받을 때 필요한 것.*리포트 보기/,
      }),
    ).toHaveAttribute(
      "href",
      `/feed/profiles/${profile.source.communityProfileId ?? profile.source.publicSnapshotId}/reports/${topicReport.reportKey}`,
    );
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("groups saved results with the same customer categories as the assessment hub", () => {
    render(
      <CommunityProfileScreen
        initialContent="reports"
        initialSocialState={{
          followerCount: 12,
          following: false,
          followingCount: 8,
          isOwnProfile: true,
        }}
        mode="self"
        posts={[post]}
        profile={profile}
        reports={[
          { ...topicReport, viewerCanManage: true },
          { ...labReport, viewerCanManage: true },
        ]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "나 알아보기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "함께하기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "별난 연구소" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "나 알아보기" }));
    expect(screen.getByText(topicReport.assessmentTitle)).toBeInTheDocument();
    expect(
      screen.queryByText(labReport.assessmentTitle),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "별난 연구소" }));
    expect(screen.getByText(labReport.assessmentTitle)).toBeInTheDocument();
    expect(
      screen.queryByText(topicReport.assessmentTitle),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "함께하기" }));
    expect(
      screen.getByText("아직 함께한 검사 결과가 없어요"),
    ).toBeInTheDocument();
  });

  it("filters profile posts down to shared reports", () => {
    render(
      <CommunityProfileScreen
        initialSocialState={{
          followerCount: 2,
          following: false,
          followingCount: 3,
          isOwnProfile: true,
        }}
        mode="self"
        posts={[{ ...post, body: "일반 게시물 내용" }, reportPost]}
        profile={profile}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "리포트" }));

    expect(
      screen.getByLabelText(`${profile.display.displayName}님의 게시물 종류`),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(`${profile.display.displayName}님의 게시물 주제`),
    ).toBeInTheDocument();
    expect(
      screen.getByText("지금의 나와 닮은 검사 결과를 공유해요."),
    ).toBeInTheDocument();
    expect(screen.queryByText("일반 게시물 내용")).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("게시물 주제"),
    ).toHaveTextContent("리포트");
    expect(screen.getByRole("link", { name: /리포트 보기/ })).toHaveAttribute(
      "href",
      reportPost.reportShare?.href,
    );
  });

  it("separates playground format filters from reusable topic filters", () => {
    const everydayPost: FeedItem = {
      ...post,
      body: "친구와 보낸 평범한 하루",
      id: "everyday-post",
      kind: "user_post",
      questionAudience: undefined,
      topic: {
        category: "relationships",
        label: "관계",
        tags: ["친구"],
      },
    };
    const playgroundPost: FeedItem = {
      ...post,
      body: "INGMC에게 묻고 싶은 관계 질문",
      id: "playground-post",
      kind: "daily_question",
      questionAudience: { codes: ["INGMC"], mode: "exact" },
      topic: {
        category: "relationships",
        label: "관계",
        tags: ["대화"],
      },
    };

    render(
      <CommunityProfileScreen
        initialSocialState={{
          followerCount: 2,
          following: false,
          followingCount: 3,
          isOwnProfile: true,
        }}
        mode="self"
        posts={[everydayPost, playgroundPost]}
        profile={profile}
        viewerCode="INGMC"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "놀이터" }));
    expect(screen.getByText(playgroundPost.body)).toBeInTheDocument();
    expect(screen.queryByText(everydayPost.body)).not.toBeInTheDocument();
    expect(screen.getByLabelText("게시물 주제")).toHaveTextContent(
      "놀이터#대화",
    );

    fireEvent.click(screen.getByRole("button", { name: "관계" }));
    expect(screen.getByText(playgroundPost.body)).toBeInTheDocument();
  });

  it("lets only the owner change one original report visibility", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <CommunityProfileScreen
        initialContent="reports"
        initialSocialState={{
          followerCount: 2,
          following: false,
          followingCount: 3,
          isOwnProfile: true,
        }}
        mode="self"
        posts={[post]}
        profile={profile}
        reports={[{ ...topicReport, viewerCanManage: true }]}
      />,
    );

    const visibilitySwitch = screen.getByRole("switch", {
      name: `${topicReport.assessmentTitle} 리포트를 프로필에 공개`,
    });
    expect(visibilitySwitch).toBeChecked();
    fireEvent.click(visibilitySwitch);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/profile-report-visibility",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
    expect(
      await screen.findByRole("switch", {
        name: `${topicReport.assessmentTitle} 리포트를 프로필에 공개`,
      }),
    ).not.toBeChecked();
    expect(screen.getByText("나만 볼 수 있어요")).toBeInTheDocument();
    expect(
      screen.queryByText("이 리포트는 이제 나만 볼 수 있어요."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("이 리포트를 프로필에 공개했어요."),
    ).not.toBeInTheDocument();
  });
});
