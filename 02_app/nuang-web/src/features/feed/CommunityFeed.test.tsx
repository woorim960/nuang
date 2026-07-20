import { fireEvent, render, screen } from "@testing-library/react";
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
  it("switches to decal mode and explains how to connect a viewer code", () => {
    render(<CommunityFeed posts={[post]} />);

    fireEvent.click(screen.getByRole("button", { name: "데칼코마니" }));

    expect(screen.getByText("데칼코마니 피드")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "여러 성향을 골라 게시물 모아보기",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "내 코드 확인하기" }),
    ).toHaveAttribute("href", "/assessments");
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
        name: "ERGKC, 답을 세우는 설계자",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "IRGMQ, 질문을 품은 탐구자",
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
          profileName: "질문을 품은 탐구자",
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
      `/feed/posts/${generalConcernPost.id}`,
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
    expect(screen.getByRole("link", { name: /내 기록/ })).toHaveAttribute(
      "href",
      "/feed/perspectives",
    );
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

    expect(
      screen.getByText("ENAKQ의 답변을 기다리는 질문이에요."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "답변" }));
    expect(
      screen.getByText("답변 대상으로 지정된 성향만 답변을 남길 수 있어요."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("답변 내용")).not.toBeInTheDocument();
  });
});
