import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createServerFeedPostDetailPayload,
  createServerFeedReadPayload,
  createServerFeedPollStatsPayload,
  createServerFeedReportSharePayload,
  createServerHomeFeedPreviewItems,
} from "@/features/feed/server-read";

const supabaseMocks = vi.hoisted(() => ({
  serverClient: null as null | {
    auth: {
      getUser: () => Promise<{
        data: {
          user: {
            id: string;
          } | null;
        };
        error: null;
      }>;
    };
  },
  serviceClient: null as null | ReturnType<typeof createMockFeedReadClient>,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => supabaseMocks.serverClient),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => supabaseMocks.serviceClient),
}));

describe("feed server read model", () => {
  afterEach(() => {
    supabaseMocks.serverClient = null;
    supabaseMocks.serviceClient = null;
    vi.clearAllMocks();
  });

  it("does not present example posts as real content when service credentials are unavailable", async () => {
    const payload = await createServerFeedReadPayload();

    expect(payload.items).toEqual([]);
    expect(payload.stories).toEqual([]);
  });

  it("keeps the payload free from legacy community wording", async () => {
    const payload = await createServerFeedReadPayload();

    expect(JSON.stringify(payload)).not.toContain("community");
  });

  it("adds visible DB engagement counts to user feed posts", async () => {
    supabaseMocks.serverClient = {
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: "auth-user-001",
            },
          },
          error: null,
        }),
      },
    };
    supabaseMocks.serviceClient = createMockFeedReadClient();

    const payload = await createServerFeedReadPayload();
    const ownPost = payload.items.find((item) => item.id === "post-own");
    const publicPost = payload.items.find((item) => item.id === "post-public");

    expect(ownPost).toMatchObject({
      likeLabel: "좋아요 2개",
      replyPreview: [
        {
          authorName: "나",
          body: "내가 남긴 댓글",
          statusLabel: "게시 전 확인 중",
        },
        {
          authorName: "NUANG 사용자",
          body: "공개 댓글",
        },
      ],
      replyLabel: "답글 2개",
      statusLabel: "게시 전 확인 중",
      viewerHasBookmarked: true,
      viewerHasLiked: true,
    });
    expect(publicPost).toMatchObject({
      likeLabel: "좋아요 1개",
      replyPreview: [
        {
          authorName: "NUANG 사용자",
          body: "공개 글의 댓글",
        },
      ],
      replyLabel: "답글 1개",
      viewerHasBookmarked: false,
      viewerHasLiked: false,
    });
  });

  it("keeps only report shares that use the current Nuang code", async () => {
    supabaseMocks.serverClient = {
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: "auth-user-001",
            },
          },
          error: null,
        }),
      },
    };
    supabaseMocks.serviceClient = createMockFeedReadClient();

    const payload = await createServerFeedReadPayload();
    const reportPost = payload.items.find(
      (item) => item.id === "post-report-share",
    );

    expect(reportPost?.reportShare).toMatchObject({
      profileCode: "INGMQ",
      profileName: "생각의 파도 탐험가",
    });
  });

  it("filters posts marked as not interested by the current account", async () => {
    supabaseMocks.serverClient = {
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: "auth-user-001",
            },
          },
          error: null,
        }),
      },
    };
    supabaseMocks.serviceClient = createMockFeedReadClient({
      hiddenPostIds: ["post-public"],
      hiddenSeedKeys: ["daily_mood_001"],
    });

    const payload = await createServerFeedReadPayload();
    const itemIds = payload.items.map((item) => item.id);

    expect(itemIds).toContain("post-own");
    expect(itemIds).not.toContain("post-public");
    expect(itemIds).not.toContain("daily_mood_001");
  });

  it("builds the home preview from the same filtered feed read model", async () => {
    supabaseMocks.serverClient = {
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: "auth-user-001",
            },
          },
          error: null,
        }),
      },
    };
    supabaseMocks.serviceClient = createMockFeedReadClient({
      hiddenPostIds: ["post-public"],
      hiddenSeedKeys: ["daily_mood_001"],
    });

    const previewItems = await createServerHomeFeedPreviewItems();
    const itemIds = previewItems.map((item) => item.id);

    expect(previewItems).toHaveLength(2);
    expect(itemIds).toEqual(["post-own", "post-report-share"]);
  });

  it("reads one visible post with every comment the viewer may see", async () => {
    supabaseMocks.serverClient = {
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: "auth-user-001",
            },
          },
          error: null,
        }),
      },
    };
    supabaseMocks.serviceClient = createMockFeedReadClient();

    const payload = await createServerFeedPostDetailPayload(
      "44444444-4444-4444-8444-444444444444",
    );

    expect(payload).toMatchObject({
      comments: [
        {
          authorName: "나",
          body: "내가 남긴 확인 중 댓글",
          statusLabel: "게시 전 확인 중",
        },
        {
          authorName: "NUANG 사용자",
          body: "공개된 대화 댓글",
        },
      ],
      post: {
        body: "서로 다른 생각을 편하게 나누기 위해 남긴 실제 공개 이야기입니다.",
        id: "44444444-4444-4444-8444-444444444444",
        replyCount: 2,
        title: "오늘의 질문",
        viewerHasLiked: true,
      },
      viewer: {
        isAuthenticated: true,
      },
    });
    expect(payload?.comments).toHaveLength(2);
  });

  it("hides code-level poll rows that could reveal one person's choice", async () => {
    supabaseMocks.serviceClient = createMockFeedReadClient();

    const payload = await createServerFeedPollStatsPayload(
      "11111111-1111-4111-8111-111111111111",
    );

    expect(payload).toMatchObject({
      poll: {
        question: "나 혼자 여행 간다면?",
      },
      totalVotes: 2,
      viewer: {
        isAuthenticated: false,
        voteOptionId: null,
      },
    });
    expect(payload?.codeRows).toEqual([]);
  });

  it("normalizes feed report detail names from the current Nuang code dictionary", async () => {
    supabaseMocks.serviceClient = createMockFeedReadClient();

    const payload = await createServerFeedReportSharePayload(
      "33333333-3333-4333-8333-333333333333",
    );

    expect(payload?.reportShare).toMatchObject({
      href: "/feed/reports/33333333-3333-4333-8333-333333333333",
      profileCode: "SVODE",
      profileName: "물결의 새길 개척가",
    });
    expect(JSON.stringify(payload)).not.toContain("물결 새길 개척가");
  });

  it("does not expose a private report share to another viewer", async () => {
    supabaseMocks.serviceClient = createMockFeedReadClient({
      privateReportShare: true,
    });

    const payload = await createServerFeedReportSharePayload(
      "33333333-3333-4333-8333-333333333333",
    );

    expect(payload).toBeNull();
  });
});

type MockFeedReadOperation = {
  filters: Array<[string, string, unknown]>;
  schema: string;
  table: string;
};

function createMockFeedReadClient({
  hiddenPostIds = [],
  hiddenSeedKeys = [],
  privateReportShare = false,
}: {
  hiddenPostIds?: string[];
  hiddenSeedKeys?: string[];
  privateReportShare?: boolean;
} = {}) {
  const options = {
    hiddenPostIds,
    hiddenSeedKeys,
    privateReportShare,
  };

  return {
    schema(schema: string) {
      return {
        from(table: string) {
          const operation: MockFeedReadOperation = {
            filters: [],
            schema,
            table,
          };
          const builder = {
            eq(column: string, value: unknown) {
              operation.filters.push(["eq", column, value]);
              return builder;
            },
            in(column: string, value: unknown) {
              operation.filters.push(["in", column, value]);
              return builder;
            },
            is(column: string, value: unknown) {
              operation.filters.push(["is", column, value]);
              return builder;
            },
            limit() {
              return builder;
            },
            maybeSingle() {
              return Promise.resolve(
                resolveFeedReadOperation(operation, options),
              );
            },
            order() {
              return builder;
            },
            select() {
              return builder;
            },
            then<TResult1 = unknown, TResult2 = never>(
              onfulfilled?:
                ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
              onrejected?:
                ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
            ) {
              return Promise.resolve(
                resolveFeedReadOperation(operation, options),
              ).then(onfulfilled, onrejected);
            },
          };

          return builder;
        },
      };
    },
  };
}

function resolveFeedReadOperation(
  operation: MockFeedReadOperation,
  options: {
    hiddenPostIds: string[];
    hiddenSeedKeys: string[];
    privateReportShare: boolean;
  },
) {
  if (operation.schema === "identity" && operation.table === "auth_identity") {
    return {
      data: {
        account_id: "account-own",
      },
      error: null,
    };
  }

  if (operation.schema === "feed" && operation.table === "feed_post") {
    if (
      hasFilter(operation, "eq", "id", "44444444-4444-4444-8444-444444444444")
    ) {
      return {
        data: {
          author_account_id: "account-other",
          body: "서로 다른 생각을 편하게 나누기 위해 남긴 실제 공개 이야기입니다.",
          created_at: "2026-07-09T07:10:00.000Z",
          id: "44444444-4444-4444-8444-444444444444",
          moderation_status: "published",
          published_at: "2026-07-09T07:11:00.000Z",
          source: "daily_question",
          source_id: "daily_question_detail_001",
          visibility: "public",
        },
        error: null,
      };
    }

    if (
      hasFilter(operation, "eq", "id", "33333333-3333-4333-8333-333333333333")
    ) {
      return {
        data: {
          author_account_id: "account-other",
          body: "SVODE 물결 새길 개척가 리포트를 공유했어요.",
          created_at: "2026-07-09T07:10:00.000Z",
          id: "33333333-3333-4333-8333-333333333333",
          moderation_status: options.privateReportShare
            ? "pending_review"
            : "published",
          public_projection_payload: {
            reportShare: {
              assessmentKind: "full",
              completedAt: "2026-07-04T00:00:00.000Z",
              domains: [],
              profileCode: "SVODE",
              profileName: "물결 새길 개척가",
              resultLabel: "현재 가장 가까운 대표 성향",
            },
          },
          published_at: "2026-07-09T07:11:00.000Z",
          source: "report_share",
          source_id: null,
          visibility: options.privateReportShare ? "private_draft" : "public",
        },
        error: null,
      };
    }

    if (hasFilter(operation, "eq", "author_account_id", "account-own")) {
      return {
        data: [
          {
            author_account_id: "account-own",
            body: "내 pending 피드 글",
            created_at: "2026-07-09T07:20:00.000Z",
            id: "post-own",
            moderation_status: "pending_review",
            published_at: null,
            source: "free_text",
            source_id: null,
            visibility: "public",
          },
        ],
        error: null,
      };
    }

    return {
      data: [
        {
          author_account_id: "account-other",
          body: "INGMQ 생각의 파도 탐험가 리포트를 공유했어요.",
          created_at: "2026-07-09T07:10:00.000Z",
          id: "post-report-share",
          moderation_status: "published",
          public_projection_payload: {
            reportShare: {
              assessmentKind: "full",
              completedAt: "2026-07-04T00:00:00.000Z",
              domains: [],
              profileCode: "INGMQ",
              profileName: "생각의 파도 탐험가",
              resultLabel: "현재 가장 가까운 대표 성향",
            },
          },
          published_at: "2026-07-09T07:11:00.000Z",
          source: "report_share",
          source_id: null,
          visibility: "public",
        },
        {
          author_account_id: "account-other",
          body: "실제 공개 피드에 남긴 충분히 이해할 수 있는 이야기입니다.",
          created_at: "2026-07-09T07:00:00.000Z",
          id: "post-public",
          moderation_status: "published",
          published_at: "2026-07-09T07:05:00.000Z",
          source: "daily_question",
          source_id: "daily_question_001",
          visibility: "public",
        },
      ],
      error: null,
    };
  }

  if (operation.schema === "feed" && operation.table === "feed_poll") {
    return {
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        post_id: "22222222-2222-4222-8222-222222222222",
        prompt_id: "balance_game_trip",
        question: "나 혼자 여행 간다면?",
      },
      error: null,
    };
  }

  if (operation.schema === "feed" && operation.table === "feed_poll_option") {
    return {
      data: [
        {
          id: "option-mountain",
          label: "산",
          option_key: "mountain",
          poll_id: "11111111-1111-4111-8111-111111111111",
          sort_order: 1,
        },
        {
          id: "option-sea",
          label: "바다",
          option_key: "sea",
          poll_id: "11111111-1111-4111-8111-111111111111",
          sort_order: 2,
        },
      ],
      error: null,
    };
  }

  if (operation.schema === "feed" && operation.table === "feed_poll_vote") {
    return {
      data: [
        {
          account_id: "account-flame",
          nuang_code: "TVOAE",
          option_id: "option-mountain",
          poll_id: "11111111-1111-4111-8111-111111111111",
          profile_name: "불꽃 온기 탐험가",
        },
        {
          account_id: "account-water",
          nuang_code: "SVODE",
          option_id: "option-sea",
          poll_id: "11111111-1111-4111-8111-111111111111",
          profile_name: "물결 새길 개척가",
        },
      ],
      error: null,
    };
  }

  if (operation.schema === "feed" && operation.table === "feed_comment") {
    if (
      hasFilter(
        operation,
        "eq",
        "post_id",
        "44444444-4444-4444-8444-444444444444",
      )
    ) {
      return {
        data: [
          {
            author_account_id: "account-own",
            body: "내가 남긴 확인 중 댓글",
            created_at: "2026-07-09T07:24:00.000Z",
            id: "comment-detail-own",
            moderation_status: "pending_review",
            post_id: "44444444-4444-4444-8444-444444444444",
          },
          {
            author_account_id: "account-other",
            body: "공개된 대화 댓글",
            created_at: "2026-07-09T07:23:00.000Z",
            id: "comment-detail-public",
            moderation_status: "published",
            post_id: "44444444-4444-4444-8444-444444444444",
          },
          {
            author_account_id: "account-other",
            body: "다른 사람에게 보이면 안 되는 댓글",
            created_at: "2026-07-09T07:25:00.000Z",
            id: "comment-detail-hidden",
            moderation_status: "pending_review",
            post_id: "44444444-4444-4444-8444-444444444444",
          },
        ],
        error: null,
      };
    }

    if (hasFilter(operation, "eq", "target_type", "feed_seed_card")) {
      return {
        data: [
          {
            author_account_id: "account-own",
            body: "공식 카드에 남긴 내 댓글",
            created_at: "2026-07-09T07:28:00.000Z",
            id: "comment-seed-own-pending",
            moderation_status: "pending_review",
            target_key: "daily_mood_001",
          },
          {
            author_account_id: "account-other",
            body: "공식 카드 숨김 댓글",
            created_at: "2026-07-09T07:29:00.000Z",
            id: "comment-seed-other-pending",
            moderation_status: "pending_review",
            target_key: "daily_mood_001",
          },
          {
            author_account_id: "account-other",
            body: "공식 카드 공개 댓글",
            created_at: "2026-07-09T07:27:00.000Z",
            id: "comment-seed-other-published",
            moderation_status: "published",
            target_key: "daily_mood_001",
          },
        ],
        error: null,
      };
    }

    return {
      data: [
        {
          author_account_id: "account-own",
          body: "내가 남긴 댓글",
          created_at: "2026-07-09T07:24:00.000Z",
          id: "comment-own-pending",
          moderation_status: "pending_review",
          post_id: "post-own",
        },
        {
          author_account_id: "account-other",
          body: "숨겨져야 하는 댓글",
          created_at: "2026-07-09T07:25:00.000Z",
          id: "comment-other-pending",
          moderation_status: "pending_review",
          post_id: "post-own",
        },
        {
          author_account_id: "account-other",
          body: "공개 댓글",
          created_at: "2026-07-09T07:23:00.000Z",
          id: "comment-other-published",
          moderation_status: "published",
          post_id: "post-own",
        },
        {
          author_account_id: "account-other",
          body: "공개 글의 댓글",
          created_at: "2026-07-09T07:22:00.000Z",
          id: "comment-public-published",
          moderation_status: "published",
          post_id: "post-public",
        },
      ],
      error: null,
    };
  }

  if (operation.schema === "feed" && operation.table === "feed_reaction") {
    if (hasFilter(operation, "eq", "target_type", "feed_seed_card")) {
      return {
        data: [
          {
            account_id: "account-own",
            target_key: "daily_mood_001",
          },
        ],
        error: null,
      };
    }

    return {
      data: [
        {
          account_id: "account-own",
          target_id: "44444444-4444-4444-8444-444444444444",
        },
        {
          account_id: "account-own",
          target_id: "post-own",
        },
        {
          account_id: "account-other",
          target_id: "post-own",
        },
        {
          account_id: "account-other",
          target_id: "post-public",
        },
      ],
      error: null,
    };
  }

  if (operation.schema === "feed" && operation.table === "feed_bookmark") {
    if (hasFilter(operation, "eq", "target_type", "feed_seed_card")) {
      return {
        data: [
          {
            target_key: "daily_mood_001",
          },
        ],
        error: null,
      };
    }

    return {
      data: [
        {
          post_id: "post-own",
        },
      ],
      error: null,
    };
  }

  if (operation.schema === "feed" && operation.table === "feed_preference") {
    if (hasFilter(operation, "eq", "target_type", "feed_seed_card")) {
      return {
        data: options.hiddenSeedKeys.map((target_key) => ({
          target_key,
        })),
        error: null,
      };
    }

    return {
      data: options.hiddenPostIds.map((target_id) => ({
        target_id,
      })),
      error: null,
    };
  }

  return {
    data: null,
    error: {
      message: `Unexpected ${operation.schema}.${operation.table}`,
    },
  };
}

function hasFilter(
  operation: MockFeedReadOperation,
  type: string,
  column: string,
  value: unknown,
) {
  return operation.filters.some(
    (filter) =>
      filter[0] === type && filter[1] === column && filter[2] === value,
  );
}
