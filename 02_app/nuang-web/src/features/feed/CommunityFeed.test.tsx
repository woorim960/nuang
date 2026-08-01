import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommunityFeed } from "@/features/feed/CommunityFeed";
import { homeDailyCommunityPollPromptId } from "@/features/feed/feed-prompts";
import type { FeedItem } from "@/features/feed/feed-seed";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/advertising/delivery/CoupangAffiliateCard", () => ({
  CoupangAffiliateCard: ({ creative }: { creative: { title: string } | null }) =>
    creative ? <section aria-label="테스트 피드 광고">{creative.title}</section> : null,
}));

const post: FeedItem = {
  authorHandle: "story.user",
  authorName: "여름",
  avatarLabel: "여",
  body: "조용한 카페에서 오늘의 생각을 정리했어요.",
  id: "44444444-4444-4444-8444-444444444444",
  kind: "user_post",
  layout: "thread",
  likeCount: 2,
  likeLabel: "좋아요 2개",
  priority: 0,
  replyCount: 1,
  replyLabel: "댓글 1개",
  targetType: "feed_post",
  timeLabel: "5분",
  title: "오늘의 생각",
  topic: {
    category: "daily_life",
    label: "일상",
    tags: ["카페"],
  },
};

describe("CommunityFeed", () => {
  it("places one commerce card only after eight unfiltered recommended posts", () => {
    const posts = Array.from({ length: 9 }, (_, index): FeedItem => ({
      ...post,
      body: `게시물 ${index + 1}`,
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    }));
    render(
      <CommunityFeed
        commerceAd={{
          altText: "테스트 상품",
          campaignId: "10000000-0000-4000-8000-000000000001",
          creativeId: "20000000-0000-4000-8000-000000000001",
          dailyCap: 2,
          description: "검수된 테스트 설명",
          destinationUrl: "https://link.coupang.com/a/example",
          disclosure:
            "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.",
          imageUrl: "https://image.example/item.jpg",
          placementKey: "FEED_COMMERCE_01",
          sessionCap: 1,
          title: "검수된 제휴 카드",
        }}
        posts={posts}
      />,
    );

    const ad = screen.getByRole("region", { name: "테스트 피드 광고" });
    const eighth = document.getElementById(`community-post-${posts[7].id}`);
    const ninth = document.getElementById(`community-post-${posts[8].id}`);
    expect(eighth?.compareDocumentPosition(ad)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(ad.compareDocumentPosition(ninth as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    fireEvent.click(screen.getByRole("button", { name: "성향 놀이터" }));
    expect(
      screen.queryByRole("region", { name: "테스트 피드 광고" }),
    ).not.toBeInTheDocument();
  });

  it("renders an anonymous together-game result card with a replay path", () => {
    const resultPost: FeedItem = {
      ...post,
      body: "우리 그룹의 취향 싱크는 75점이었어요.",
      id: "55555555-5555-4555-8555-555555555555",
      kind: "together_balance_result_share",
      title: "밸런스 게임 결과",
      togetherBalanceResult: {
        completedCount: 4,
        highlight: "치킨 한 마리를 고른다면?",
        href: "/assessments/together/balance-game?pack=what-to-eat",
        packSlug: "what-to-eat",
        packTitle: "우리 뭐 먹을까?",
        resultStatus: "final",
        roomName: "우리 뭐 먹을까? 함께한 결과",
        score: 75,
        scoreLabel: "자주 통하는 팀",
      },
    };

    render(<CommunityFeed posts={[resultPost]} />);

    const card = screen.getByRole("link", {
      name: /우리 뭐 먹을까?.*75.*자주 통하는 팀.*이 주제로 우리도 해보기/,
    });
    expect(card).toHaveAttribute(
      "href",
      "/assessments/together/balance-game?pack=what-to-eat",
    );
    expect(screen.queryByText("민지")).not.toBeInTheDocument();
  });

  it("switches to decal mode and offers the required code action", () => {
    render(<CommunityFeed posts={[post]} />);

    fireEvent.click(screen.getByRole("button", { name: "데칼코마니" }));

    expect(screen.getByRole("button", { name: "데칼코마니" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.queryByRole("button", {
        name: "여러 성향을 골라 게시물 모아보기",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "내 코드 확인하기" }),
    ).toHaveAttribute("href", "/home");
  });

  it("hides the obvious decal recommendation reason from my own post", () => {
    const ownPost: FeedItem = {
      ...post,
      authorHandle: "me",
      authorName: "나",
      authorProfile: {
        cardId: "my-card",
        contractVersion: "public-profile-card.v0.1",
        display: {
          code: "ENAKQ",
          displayName: "나",
          motif: "purple",
          profileImage: {
            alt: "내 프로필",
            motif: "purple",
            source: "character",
            src: "/images/nuang/character-purple.png",
          },
          profileName: "관계를 여는 지휘자",
        },
        highlights: { domainHighlights: [], facetSummaryCount: 0 },
        privacy: {
          includesAccountIdentity: false,
          includesCrisisHelpInteractions: false,
          includesDirectResponses: false,
          includesRawScorePayload: false,
          includesSensitiveAssessments: false,
        },
        source: {
          publicSnapshotContractVersion: "public-profile-snapshot.v0.1",
          publicSnapshotId: "22222222-2222-4222-8222-222222222222",
        },
        status: "published",
        visibility: {
          cardScope: "public_profile_card",
          includedFields: [],
          policyVersion: "profile-visibility.v0.1",
        },
      },
      viewerIsAuthor: true,
    };

    render(<CommunityFeed posts={[ownPost]} viewerCode="ENAKQ" />);
    fireEvent.click(screen.getByRole("button", { name: "데칼코마니" }));

    expect(
      screen.queryByText("내 코드와 5자리가 가까워요"),
    ).not.toBeInTheDocument();
  });

  it("allows several Nuang profiles to be selected in one filter", () => {
    render(<CommunityFeed posts={[post]} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "여러 성향을 골라 게시물 모아보기",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "ERGKC, 차분히 현장을 이끄는 운영자",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "IRGMQ, 변화의 원인을 좇는 추적자",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "2개 성향의 글 보기" }));

    expect(screen.getByText("2개 성향의 게시물만 보는 중")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "데칼코마니" }));

    expect(
      screen.queryByText("2개 성향의 게시물만 보는 중"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "여러 성향을 골라 게시물 모아보기",
      }),
    ).not.toBeInTheDocument();
  });

  it("keeps keyboard focus inside the filter and restores it when closed", async () => {
    render(<CommunityFeed posts={[post]} />);

    const filterTrigger = screen.getByRole("button", {
      name: "여러 성향을 골라 게시물 모아보기",
    });
    filterTrigger.focus();
    fireEvent.click(filterTrigger);

    const dialog = screen.getByRole("dialog", { name: "성향 필터" });
    const closeButton = screen.getByRole("button", {
      name: "커뮤니티로 돌아가기",
    });

    await waitFor(() => expect(closeButton).toHaveFocus());
    expect(filterTrigger.closest("nav")).toHaveAttribute("inert");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(dialog).not.toBeInTheDocument();
    await waitFor(() => expect(filterTrigger).toHaveFocus());
    expect(filterTrigger.closest("nav")).not.toHaveAttribute("inert");
  });

  it("opens search and notifications as dedicated routes", () => {
    render(<CommunityFeed posts={[post]} />);

    expect(
      screen.getByRole("link", { name: "게시물, 사람, 성향 검색" }),
    ).toHaveAttribute("href", "/feed/search");
    expect(
      screen.getByRole("link", { name: "커뮤니티 활동 알림" }),
    ).toHaveAttribute("href", "/feed/notifications");
    expect(
      screen.queryByRole("dialog", { name: /검색|알림/ }),
    ).not.toBeInTheDocument();
  });

  it("opens a tag collection from a post hashtag", () => {
    render(<CommunityFeed posts={[post]} />);

    expect(screen.getByRole("link", { name: "#카페" })).toHaveAttribute(
      "href",
      `/feed/tags/${encodeURIComponent("카페")}`,
    );
  });

  it("confirms an upload and highlights the newly created post", () => {
    render(<CommunityFeed highlightedPostId={post.id} posts={[post]} />);

    expect(screen.getByText("게시물이 업로드됐어요")).toBeInTheDocument();
    expect(screen.getByText(post.body).closest("article")).toHaveAttribute(
      "data-highlighted",
      "true",
    );
  });

  it("opens a public author profile on its own route", () => {
    const profilePost: FeedItem = {
      ...post,
      authorProfile: {
        cardId: "profile-card",
        contractVersion: "public-profile-card.v0.1",
        display: {
          code: "IRGMQ",
          displayName: "여름",
          motif: "purple",
          profileImage: {
            alt: "여름 프로필",
            motif: "purple",
            source: "character",
            src: "/images/nuang/character-purple.png",
          },
          profileName: "변화의 원인을 좇는 추적자",
        },
        highlights: { domainHighlights: [], facetSummaryCount: 0 },
        privacy: {
          includesAccountIdentity: false,
          includesCrisisHelpInteractions: false,
          includesDirectResponses: false,
          includesRawScorePayload: false,
          includesSensitiveAssessments: false,
        },
        source: {
          publicSnapshotContractVersion: "public-profile-snapshot.v0.1",
          publicSnapshotId: "22222222-2222-4222-8222-222222222222",
        },
        status: "published",
        visibility: {
          cardScope: "public_profile_card",
          includedFields: [],
          policyVersion: "profile-visibility.v0.1",
        },
      },
    };

    render(<CommunityFeed posts={[profilePost]} />);

    expect(
      screen.getByRole("link", { name: "여름 프로필 보기" }),
    ).toHaveAttribute(
      "href",
      "/feed/profiles/22222222-2222-4222-8222-222222222222",
    );
  });

  it("keeps question answers inside the feed instead of opening a detail route", () => {
    const questionPost: FeedItem = {
      ...post,
      likeCount: 87,
      questionAudience: { codes: ["ENAKQ"], mode: "exact" },
      replyCount: 14,
      replyPreview: [
        {
          authorCode: "ERGMC",
          authorHandle: "doyun.guide",
          authorName: "도윤",
          body: "괜찮은지 한 번 묻고 기다리는 편이에요.",
          id: "reply-001",
          timeLabel: "3분",
        },
      ],
      title: "뉴앙에게 물어봐",
    };

    render(<CommunityFeed posts={[questionPost]} viewerCode="ENAKQ" />);

    expect(
      screen.queryByRole("link", { name: /댓글 14개 보기/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "답변" }));

    expect(screen.getByLabelText("질문의 답변")).toBeInTheDocument();
    expect(
      screen.getByText("괜찮은지 한 번 묻고 기다리는 편이에요."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("답변 내용")).toHaveAttribute(
      "placeholder",
      "내 경험으로 답변하기",
    );
    expect(screen.getByRole("link", { name: /나도 질문하기/ })).toHaveAttribute(
      "href",
      "/feed/questions/new",
    );
  });

  it("marks my post and describes my question as sent instead of received", () => {
    const ownQuestion: FeedItem = {
      ...post,
      authorHandle: "me",
      authorName: "나",
      questionAudience: { codes: ["ENAKQ"], mode: "exact" },
      viewerCanManage: true,
      viewerIsAuthor: true,
    };

    render(<CommunityFeed posts={[ownQuestion]} viewerCode="ENAKQ" />);

    const article = screen.getByRole("article");
    expect(article).toHaveAttribute("data-own", "true");
    expect(screen.getByText("내 글")).toBeInTheDocument();
    expect(screen.getByText("ENAKQ에게 보낸 질문")).toBeInTheDocument();
    expect(screen.queryByText("뉴앙에게 물어봐")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "답변" }));
    expect(
      screen.getByText(
        "내가 보낸 질문이에요. 다른 사람의 답변을 기다려 보세요.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("답변 내용")).not.toBeInTheDocument();
  });

  it("keeps a concerns and questions topic as a regular free-form post", () => {
    const generalConcernPost: FeedItem = {
      ...post,
      body: "친구와 대화를 나눈 뒤 마음이 복잡해서 경험을 적어봤어요.",
      topic: {
        category: "concerns_questions",
        label: "고민·질문",
        tags: ["관계"],
      },
    };

    render(<CommunityFeed posts={[generalConcernPost]} />);

    expect(screen.getByText("고민·질문")).toBeInTheDocument();
    expect(screen.queryByText("뉴앙에게 물어봐")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "댓글" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "댓글 1개 보기" })).toHaveAttribute(
      "href",
      `/feed/posts/${generalConcernPost.id}?backTo=%2Ffeed`,
    );
  });

  it("prioritizes only a targeted Nuang question for its requested code", () => {
    const generalConcernPost: FeedItem = {
      ...post,
      body: "형식 없이 자유롭게 남긴 고민 이야기예요.",
      id: "general-concern-post",
      topic: {
        category: "concerns_questions",
        label: "고민·질문",
        tags: [],
      },
    };
    const targetedQuestion: FeedItem = {
      ...post,
      body: "ENAKQ 성향의 경험이 궁금해서 남긴 질문이에요.",
      id: "targeted-nuang-question",
      questionAudience: { codes: ["ENAKQ"], mode: "exact" },
      topic: {
        category: "concerns_questions",
        label: "고민·질문",
        tags: [],
      },
    };

    render(
      <CommunityFeed
        posts={[generalConcernPost, targetedQuestion]}
        viewerCode="ENAKQ"
      />,
    );

    const articles = screen.getAllByRole("article");
    expect(articles[0]).toHaveTextContent(targetedQuestion.body);
    expect(articles[1]).toHaveTextContent(generalConcernPost.body);
  });

  it("shows the official balance game in the V12 playground flow", () => {
    const playgroundPost: FeedItem = {
      ...post,
      authorHandle: "nuang.official",
      authorName: "NUANG",
      id: "11111111-1111-4111-8111-111111111111",
      kind: "balance_game",
      poll: {
        canViewCodeStats: false,
        codePerspectives: [],
        id: "22222222-2222-4222-8222-222222222222",
        options: [
          {
            id: "option-a",
            key: "a",
            label: "함께 보낸다",
            ratio: 0,
            viewerHasVoted: false,
            voteCount: 0,
          },
          {
            id: "option-b",
            key: "b",
            label: "혼자 보낸다",
            ratio: 0,
            viewerHasVoted: false,
            voteCount: 0,
          },
        ],
        promptId: homeDailyCommunityPollPromptId,
        question: "갑자기 하루 여유가 생겼다면?",
        statsHref: "/feed/polls/poll/stats",
        totalVotes: 0,
        viewerCode: null,
        viewerVoteOptionId: null,
      },
    };

    render(<CommunityFeed posts={[playgroundPost]} />);

    expect(screen.getByText("오늘의 성향 놀이터")).toBeInTheDocument();
    expect(screen.queryByText("오늘의 투표")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /내 기록/ })).toHaveAttribute(
      "href",
      "/feed/perspectives",
    );
  });

  it("closes an opened poll result whenever the feed tab changes", () => {
    const playgroundPost: FeedItem = {
      ...post,
      authorHandle: "nuang.official",
      authorName: "NUANG",
      id: "11111111-1111-4111-8111-111111111111",
      kind: "balance_game",
      poll: {
        canViewCodeStats: true,
        codePerspectives: [],
        id: "22222222-2222-4222-8222-222222222222",
        options: [
          {
            id: "option-a",
            key: "a",
            label: "함께 보낸다",
            ratio: 100,
            viewerHasVoted: true,
            voteCount: 1,
          },
          {
            id: "option-b",
            key: "b",
            label: "혼자 보낸다",
            ratio: 0,
            viewerHasVoted: false,
            voteCount: 0,
          },
        ],
        promptId: homeDailyCommunityPollPromptId,
        question: "갑자기 하루 여유가 생겼다면?",
        statsHref: "/feed/polls/poll/stats",
        totalVotes: 1,
        viewerCode: "ENAKQ",
        viewerVoteOptionId: "option-a",
      },
    };

    render(<CommunityFeed posts={[playgroundPost]} />);

    const firstResult = screen.getByRole("region", {
      name: "뉴앙 코드별 결과",
    });
    fireEvent.click(
      within(firstResult).getByRole("button", {
        name: "결과 보기 펼치기",
      }),
    );
    expect(
      within(firstResult).getByRole("button", { name: "전체" }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "성향 놀이터" }));

    const returnedResult = screen.getByRole("region", {
      name: "뉴앙 코드별 결과",
    });
    expect(
      within(returnedResult).getByRole("button", {
        name: "결과 보기 펼치기",
      }),
    ).toBeVisible();
    expect(
      within(returnedResult).queryByRole("button", { name: "전체" }),
    ).not.toBeInTheDocument();
  });

  it("collects balance games and official daily questions in personality playground", () => {
    const playgroundPost: FeedItem = {
      ...post,
      id: "11111111-1111-4111-8111-111111111111",
      kind: "balance_game",
      poll: {
        canViewCodeStats: false,
        codePerspectives: [],
        id: "22222222-2222-4222-8222-222222222222",
        options: [
          {
            id: "option-a",
            key: "a",
            label: "함께 보낸다",
            ratio: 0,
            viewerHasVoted: false,
            voteCount: 0,
          },
          {
            id: "option-b",
            key: "b",
            label: "혼자 보낸다",
            ratio: 0,
            viewerHasVoted: false,
            voteCount: 0,
          },
        ],
        promptId: "user-balance",
        question: "갑자기 하루 여유가 생겼다면?",
        statsHref: "/feed/polls/poll/stats",
        totalVotes: 0,
        viewerCode: null,
        viewerVoteOptionId: null,
      },
    };
    const dailyQuestion: FeedItem = {
      ...post,
      id: "33333333-3333-4333-8333-333333333333",
      kind: "daily_question",
      body: "오늘 가장 마음에 남은 말은 무엇인가요?",
    };
    const ordinaryPost: FeedItem = {
      ...post,
      id: "55555555-5555-4555-8555-555555555555",
      body: "일반 게시물이에요.",
    };

    render(
      <CommunityFeed posts={[ordinaryPost, playgroundPost, dailyQuestion]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "성향 놀이터" }));

    expect(screen.getByText(playgroundPost.poll!.question)).toBeVisible();
    expect(screen.getByText(dailyQuestion.body)).toBeVisible();
    expect(screen.queryByText(ordinaryPost.body)).not.toBeInTheDocument();
  });

  it("renders distinct original-report cards for core, topic, and lab results", () => {
    const corePost: FeedItem = {
      ...post,
      id: "60000000-0000-4000-8000-000000000001",
      reportShare: {
        assessmentKind: "full",
        assessmentTitle: "정밀 코어 검사",
        completedAt: "2026-07-28T00:00:00.000Z",
        domains: [],
        href: "/feed/profiles/profile-1/reports/core_result-1",
        profileCode: "ENAKQ",
        profileName: "관계를 여는 선도자",
        reportType: "core",
        resultLabel: "정밀 검사 결과",
        summary: "사람과 가능성을 연결하며 자연스럽게 방향을 만드는 편이에요.",
      },
    };
    const topicPost: FeedItem = {
      ...post,
      id: "60000000-0000-4000-8000-000000000002",
      reportShare: {
        assessmentKind: "full",
        assessmentTitle: "위로받을 때 필요한 것",
        completedAt: "2026-07-28T00:00:00.000Z",
        domains: [],
        href: "/feed/profiles/profile-1/reports/topic_result-2",
        profileCode: "",
        profileName: "방법은 같이 찾고, 속도는 내가 정하고 싶어요",
        reportType: "topic",
        resultLabel: "주제 검사",
        summary: "도움은 반갑지만 결정할 시간과 선택권도 중요해요.",
      },
    };
    const labPost: FeedItem = {
      ...post,
      id: "60000000-0000-4000-8000-000000000003",
      reportShare: {
        assessmentKind: "full",
        assessmentTitle: "애착 탐색",
        completedAt: "2026-07-28T00:00:00.000Z",
        domains: [],
        href: "/feed/profiles/profile-1/reports/lab_result-3",
        profileCode: "",
        profileName: "천천히 확인하는 관계 탐색가",
        reportType: "lab",
        resultLabel: "별난 연구소",
        summary: "관계가 안전하다는 확신이 들 때 마음을 더 편하게 열어요.",
      },
    };

    render(<CommunityFeed posts={[corePost, topicPost, labPost]} />);

    expect(screen.getByText("정밀 코어 검사")).toBeInTheDocument();
    expect(screen.getByText("관계를 여는 선도자")).toBeInTheDocument();
    expect(
      screen.getByText(
        "사람과 가능성을 연결하며 자연스럽게 방향을 만드는 편이에요.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("주제 검사 · 위로받을 때 필요한 것"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("방법은 같이 찾고, 속도는 내가 정하고 싶어요"),
    ).toBeInTheDocument();
    expect(screen.getByText("별난 연구소 · 애착 탐색")).toBeInTheDocument();
    expect(screen.getByText("천천히 확인하는 관계 탐색가")).toBeInTheDocument();
  });

  it("lets only the requested exact Nuang code open the answer composer", () => {
    const targetedQuestion: FeedItem = {
      ...post,
      kind: "daily_question",
      questionAudience: { codes: ["ENAKQ"], mode: "exact" },
      title: "오늘의 질문",
      topic: {
        category: "concerns_questions",
        label: "고민·질문",
        tags: [],
      },
    };

    render(<CommunityFeed posts={[targetedQuestion]} viewerCode="IRGMC" />);

    expect(screen.getByText("ENAKQ에게 묻는 질문")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "답변" }));
    expect(
      screen.getByText("답변 대상으로 지정된 성향만 답변을 남길 수 있어요."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("답변 내용")).not.toBeInTheDocument();
  });
});
