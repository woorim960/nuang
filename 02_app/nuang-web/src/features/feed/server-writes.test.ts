import type { SupabaseClient, User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";
import { writeFeedRequestForAccount } from "@/features/feed/server-writes";

const originalReportMocks = vi.hoisted(() => ({
  readOriginalProfileReport: vi.fn(),
  resolveProfileOwnerAccountId: vi.fn(),
}));
const publicationMocks = vi.hoisted(() => ({
  readCoreResultPublicationDecision: vi.fn(
    async (): Promise<
      | { eligible: true; resultReportId: string }
      | { eligible: false; reason: string }
    > => ({
      eligible: true,
      resultReportId: "44444444-4444-4444-8444-444444444444",
    }),
  ),
}));

vi.mock("@/features/assessment/server-core-result-publication-policy", () => ({
  readCoreResultPublicationDecision:
    publicationMocks.readCoreResultPublicationDecision,
}));

vi.mock("@/features/public-profile/server-profile-reports", () => ({
  readOriginalProfileReport: originalReportMocks.readOriginalProfileReport,
  resolveProfileOwnerAccountId:
    originalReportMocks.resolveProfileOwnerAccountId,
}));

type MockOperation = {
  deleteRow?: boolean;
  filters: Array<[string, string, unknown]>;
  insertRow?: Record<string, unknown>;
  method?: "maybeSingle" | "single";
  schema: string;
  table: string;
  updateRow?: Record<string, unknown>;
};

type MockResponse = {
  count?: number | null;
  data: unknown;
  error: { code?: string; message?: string } | null;
};

type MockRpcOperation = {
  name: string;
  params: Record<string, unknown>;
  schema: string;
};

const accountId = "11111111-1111-4111-8111-111111111111";
const user = {
  app_metadata: {
    provider: "kakao",
  },
  id: "auth-user-001",
  identities: [
    {
      id: "kakao-user-001",
      identity_id: "supabase-identity-kakao-001",
      provider: "kakao",
    },
  ],
  user_metadata: {
    name: "테스트 사용자",
  },
} as unknown as User;

describe("feed server writes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores an original topic report as a verified canonical reference", async () => {
    const reportId = "44444444-4444-4444-8444-444444444444";
    const reportKey = `topic_${reportId}`;
    const profileId = "55555555-5555-4555-8555-555555555555";
    originalReportMocks.resolveProfileOwnerAccountId.mockResolvedValueOnce(
      "99999999-9999-4999-8999-999999999999",
    );
    originalReportMocks.readOriginalProfileReport.mockResolvedValueOnce({
      kind: "topic",
      result: {
        completedAt: "2026-07-28T09:00:00.000Z",
        nuangCodeContext: {
          capturedAt: "2026-07-28T09:00:00.000Z",
          code: "INGMC",
        },
      },
      summary: {
        assessmentSlug: "comfort-style",
        assessmentTitle: "위로받을 때 필요한 것",
        completedAt: "2026-07-28T09:00:00.000Z",
        reportKey,
        resultName: "조용한 곁 지킴",
        summary: "말을 재촉하지 않고 곁을 지켜주는 위로가 잘 맞아요.",
        type: "topic",
        viewerCanManage: false,
        visibility: "profile_public",
      },
    });
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return { data: { account_id: accountId }, error: null };
      }
      if (operation.schema === "feed" && operation.table === "profile_block") {
        return { data: null, error: null };
      }
      if (operation.schema === "feed" && operation.table === "feed_post") {
        return {
          data: {
            id: "22222222-2222-4222-8222-222222222222",
            moderation_status: "published",
          },
          error: null,
        };
      }
      return { data: null, error: { message: "unexpected operation" } };
    });
    const payload = {
      action: "create_post",
      attachments: [{ id: reportKey, profileId, type: "original_report" }],
      body: "내 위로 성향 결과를 공유해요.",
      source: "report_share",
      sourceId: reportKey,
      visibility: "public",
    } satisfies FeedWriteRequest;

    const result = await writeFeedRequestForAccount({ client, payload, user });

    expect(result.ok).toBe(true);
    const feedInsert = operations.find((item) => item.table === "feed_post");
    expect(feedInsert?.insertRow).toMatchObject({
      attachment_payload: [
        { id: reportKey, profileId, type: "original_report" },
      ],
      public_projection_payload: {
        reportShare: {
          assessmentTitle: "위로받을 때 필요한 것",
          profileId,
          reportKey,
          reportType: "topic",
          resultLabel: "위로받을 때 필요한 것",
          summary: "말을 재촉하지 않고 곁을 지켜주는 위로가 잘 맞아요.",
        },
      },
      source: "report_share",
      source_id: reportKey,
    });
  });

  it("rejects an original report whose source id does not match its report key", async () => {
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return { data: { account_id: accountId }, error: null };
      }
      return { data: null, error: { message: "unexpected operation" } };
    });
    const result = await writeFeedRequestForAccount({
      client,
      payload: {
        action: "create_post",
        attachments: [
          {
            id: "topic_44444444-4444-4444-8444-444444444444",
            profileId: "55555555-5555-4555-8555-555555555555",
            type: "original_report",
          },
        ],
        body: "원본 리포트를 공유해요.",
        source: "report_share",
        sourceId: "lab_66666666-6666-4666-8666-666666666666",
        visibility: "public",
      },
      user,
    });

    expect(result).toEqual({ code: "feed_target_invalid", ok: false });
    expect(operations.some((item) => item.table === "feed_post")).toBe(false);
  });

  it("rejects a candidate core result attachment before writing a feed post", async () => {
    publicationMocks.readCoreResultPublicationDecision.mockResolvedValueOnce({
      eligible: false,
      reason: "release_not_publicable",
    });
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return { data: { account_id: accountId }, error: null };
      }
      return { data: null, error: { message: "unexpected operation" } };
    });

    const result = await writeFeedRequestForAccount({
      client,
      payload: {
        action: "create_post",
        attachments: [
          {
            id: "44444444-4444-4444-8444-444444444444",
            type: "result_summary",
          },
        ],
        body: "코어 결과를 공유해요.",
        source: "report_share",
        visibility: "public",
      },
      user,
    });

    expect(result).toEqual({
      code: "feed_result_release_not_publicable",
      ok: false,
    });
    expect(operations.some((operation) => operation.table === "feed_post")).toBe(
      false,
    );
  });

  it("allows a validated core result attachment", async () => {
    const reportId = "44444444-4444-4444-8444-444444444444";
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return { data: { account_id: accountId }, error: null };
      }
      if (
        operation.schema === "report" &&
        operation.table === "result_report"
      ) {
        return {
          data: {
            id: reportId,
            profile_code: "ENAKQ",
            profile_name: "관계를 여는 선도자",
            report_kind: "full",
            share_summary: {
              completedAt: "2026-08-05T00:00:00.000Z",
              domains: [],
              profileCode: "ENAKQ",
              profileName: "관계를 여는 선도자",
              resultLabel: "현재 대표 성향",
            },
          },
          error: null,
        };
      }
      if (operation.schema === "feed" && operation.table === "feed_post") {
        return {
          data: {
            id: "22222222-2222-4222-8222-222222222222",
            moderation_status: "published",
          },
          error: null,
        };
      }
      return { data: null, error: { message: "unexpected operation" } };
    });

    const result = await writeFeedRequestForAccount({
      client,
      payload: {
        action: "create_post",
        attachments: [{ id: reportId, type: "result_summary" }],
        body: "검증된 코어 결과를 공유해요.",
        source: "report_share",
        visibility: "public",
      },
      user,
    });

    expect(result.ok).toBe(true);
    expect(operations.some((operation) => operation.table === "feed_post")).toBe(
      true,
    );
  });

  it("stores new feed posts with public projection only", async () => {
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return {
          data: {
            account_id: accountId,
          },
          error: null,
        };
      }

      if (operation.schema === "feed" && operation.table === "feed_post") {
        return {
          data: {
            id: "22222222-2222-4222-8222-222222222222",
            moderation_status: "published",
          },
          error: null,
        };
      }

      return {
        data: null,
        error: {
          message: "unexpected operation",
        },
      };
    });
    const payload = {
      action: "create_post",
      body: "오늘의 질문에서 내 리듬을 한 문장으로 남겨요.",
      source: "daily_question",
      sourceId: "daily_question_evening_001",
      visibility: "public",
    } satisfies FeedWriteRequest;

    const result = await writeFeedRequestForAccount({ client, payload, user });

    expect(result).toEqual({
      data: {
        action: "create_post",
        id: "22222222-2222-4222-8222-222222222222",
        moderationStatus: "published",
        targetType: "feed_post",
      },
      ok: true,
    });
    const feedInsert = operations.find((item) => item.table === "feed_post");
    expect(feedInsert?.insertRow).toMatchObject({
      attachment_payload: [],
      author_account_id: accountId,
      moderation_status: "published",
      public_projection_payload: {
        attachmentTypes: [],
        bodyPreview: "오늘의 질문에서 내 리듬을 한 문장으로 남겨요.",
        source: "daily_question",
        sourceId: "daily_question_evening_001",
      },
      source: "daily_question",
      source_id: "daily_question_evening_001",
      visibility: "public",
    });
    expect(JSON.stringify(feedInsert?.insertRow)).not.toContain("raw_score");
  });

  it("stores a user report for a published community post", async () => {
    const targetPostId = "22222222-2222-4222-8222-222222222222";
    const targetAuthorId = "99999999-9999-4999-8999-999999999999";
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return { data: { account_id: accountId }, error: null };
      }

      if (
        operation.schema === "feed" &&
        operation.table === "feed_post" &&
        operation.method === "maybeSingle"
      ) {
        return {
          data: {
            author_account_id: targetAuthorId,
            id: targetPostId,
            moderation_status: "published",
          },
          error: null,
        };
      }

      if (
        operation.schema === "feed" &&
        operation.table === "content_report"
      ) {
        return {
          data: { id: "33333333-3333-4333-8333-333333333333" },
          error: null,
        };
      }

      return { data: null, error: { message: "unexpected operation" } };
    });

    const result = await writeFeedRequestForAccount({
      client,
      payload: {
        action: "report_content",
        details: "같은 광고가 반복돼요.",
        reason: "spam",
        target: {
          id: targetPostId,
          type: "feed_post",
        },
      },
      user,
    });

    expect(result).toEqual({
      data: {
        action: "report_content",
        id: "33333333-3333-4333-8333-333333333333",
        targetType: "feed_post",
      },
      ok: true,
    });
    expect(
      operations.find((operation) => operation.table === "content_report")
        ?.insertRow,
    ).toMatchObject({
      details: "같은 광고가 반복돼요.",
      post_id: targetPostId,
      reason: "spam",
      reporter_account_id: accountId,
      severity: "low",
      status: "queued",
      target_author_account_id: targetAuthorId,
    });
  });

  it("keeps a post with an unknown external link in review until approval", async () => {
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return { data: { account_id: accountId }, error: null };
      }

      if (
        operation.schema === "feed" &&
        operation.table === "link_domain_policy"
      ) {
        return { data: [], error: null };
      }

      if (operation.schema === "feed" && operation.table === "feed_post") {
        return {
          data: {
            id: "22222222-2222-4222-8222-222222222222",
            moderation_status: operation.insertRow?.moderation_status,
          },
          error: null,
        };
      }

      if (
        operation.schema === "feed" &&
        operation.table === "feed_external_link"
      ) {
        return { data: null, error: null };
      }

      return { data: null, error: { message: "unexpected operation" } };
    });

    const result = await writeFeedRequestForAccount({
      client,
      payload: {
        action: "create_post",
        body: "이 링크를 함께 봐요 https://unreviewed.example/path",
        source: "free_text",
        visibility: "public",
      },
      user,
    });

    expect(result).toMatchObject({
      data: { moderationStatus: "pending_review" },
      ok: true,
    });
    expect(
      operations.find((operation) => operation.table === "feed_post")
        ?.insertRow,
    ).toMatchObject({
      moderation_status: "pending_review",
      published_at: null,
    });
    expect(
      operations.find(
        (operation) => operation.table === "feed_external_link",
      )?.insertRow,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          hostname: "unreviewed.example",
          review_status: "pending",
        }),
      ]),
    );
  });

  it("stores balance game posts with poll options and an anonymous code vote", async () => {
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return {
          data: {
            account_id: accountId,
          },
          error: null,
        };
      }

      if (operation.schema === "feed" && operation.table === "feed_post") {
        return {
          data: {
            id: "22222222-2222-4222-8222-222222222222",
            moderation_status: "published",
          },
          error: null,
        };
      }

      if (operation.schema === "feed" && operation.table === "feed_poll") {
        return {
          data: {
            id: "33333333-3333-4333-8333-333333333333",
          },
          error: null,
        };
      }

      if (
        operation.schema === "feed" &&
        operation.table === "feed_poll_option"
      ) {
        return {
          data: [
            {
              id: "44444444-4444-4444-8444-444444444444",
              option_key: "mountain",
            },
            {
              id: "55555555-5555-4555-8555-555555555555",
              option_key: "sea",
            },
          ],
          error: null,
        };
      }

      if (
        operation.schema === "profile" &&
        operation.table === "profile_public_snapshot"
      ) {
        return {
          data: null,
          error: null,
        };
      }

      if (
        operation.schema === "report" &&
        operation.table === "result_report"
      ) {
        return {
          data: {
            profile_code: "ENAKQ",
            profile_name: "관계를 여는 선도자",
          },
          error: null,
        };
      }

      if (operation.schema === "feed" && operation.table === "feed_poll_vote") {
        return {
          data: {
            id: "66666666-6666-4666-8666-666666666666",
          },
          error: null,
        };
      }

      return {
        data: null,
        error: {
          message: "unexpected operation",
        },
      };
    });
    const payload = {
      action: "create_post",
      body: "오늘은 산 쪽이 더 끌려요.",
      pollOptionKey: "mountain",
      source: "balance_game",
      sourceId: "balance_trip_mountain_sea_001",
      visibility: "public",
    } satisfies FeedWriteRequest;

    const result = await writeFeedRequestForAccount({ client, payload, user });

    expect(result).toMatchObject({
      data: {
        action: "create_post",
        id: "22222222-2222-4222-8222-222222222222",
        targetType: "feed_post",
      },
      ok: true,
    });
    expect(
      operations.find((item) => item.table === "feed_poll")?.insertRow,
    ).toMatchObject({
      post_id: "22222222-2222-4222-8222-222222222222",
      prompt_id: "balance_trip_mountain_sea_001",
      question: "나 혼자 여행 간다면?",
    });
    expect(
      operations.find((item) => item.table === "feed_poll_vote")?.insertRow,
    ).toMatchObject({
      account_id: accountId,
      nuang_code: "ENAKQ",
      option_id: "44444444-4444-4444-8444-444444444444",
      poll_id: "33333333-3333-4333-8333-333333333333",
      profile_name: "관계를 여는 선도자",
    });
    expect(JSON.stringify(operations)).not.toContain("direct_response");
    expect(JSON.stringify(operations)).not.toContain("raw_score");
  });

  it("stores a user-created balance game without forcing the author's vote", async () => {
    const postId = "22222222-2222-4222-8222-222222222222";
    const pollId = "33333333-3333-4333-8333-333333333333";
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return { data: { account_id: accountId }, error: null };
      }
      if (operation.schema === "feed" && operation.table === "feed_post") {
        return {
          data: { id: postId, moderation_status: "published" },
          error: null,
        };
      }
      if (operation.schema === "feed" && operation.table === "feed_poll") {
        return { data: { id: pollId }, error: null };
      }
      if (
        operation.schema === "feed" &&
        operation.table === "feed_poll_option"
      ) {
        return {
          data: [
            {
              id: "44444444-4444-4444-8444-444444444444",
              option_key: "option_a",
            },
            {
              id: "55555555-5555-4555-8555-555555555555",
              option_key: "option_b",
            },
          ],
          error: null,
        };
      }
      return { data: null, error: { message: "unexpected operation" } };
    });

    const result = await writeFeedRequestForAccount({
      client,
      payload: {
        action: "create_post",
        body: "여러분의 선택이 궁금해요.",
        poll: {
          options: ["바로 연락하기", "조금 더 기다리기"],
          question: "좋아하는 사람에게 먼저 연락하고 싶을 때?",
        },
        source: "balance_game",
        sourceId: "user_balance_game_v1",
        visibility: "public",
      },
      user,
    });

    expect(result).toMatchObject({ data: { id: postId }, ok: true });
    expect(
      operations.find((operation) => operation.table === "feed_poll")
        ?.insertRow,
    ).toMatchObject({
      post_id: postId,
      prompt_id: `user_balance_${postId}`,
      question: "좋아하는 사람에게 먼저 연락하고 싶을 때?",
    });
    expect(
      operations.find((operation) => operation.table === "feed_poll_option")
        ?.insertRow,
    ).toEqual([
      expect.objectContaining({
        label: "바로 연락하기",
        option_key: "option_a",
      }),
      expect.objectContaining({
        label: "조금 더 기다리기",
        option_key: "option_b",
      }),
    ]);
    expect(
      operations.some((operation) => operation.table === "feed_poll_vote"),
    ).toBe(false);
    expect(publicationMocks.readCoreResultPublicationDecision).not.toHaveBeenCalled();
  });

  it("removes a partially created balance post when its choices fail to save", async () => {
    const postId = "22222222-2222-4222-8222-222222222222";
    const pollId = "33333333-3333-4333-8333-333333333333";
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return { data: { account_id: accountId }, error: null };
      }
      if (
        operation.schema === "feed" &&
        operation.table === "feed_post" &&
        !operation.deleteRow
      ) {
        return {
          data: { id: postId, moderation_status: "published" },
          error: null,
        };
      }
      if (
        operation.schema === "feed" &&
        operation.table === "feed_post" &&
        operation.deleteRow
      ) {
        return { data: null, error: null };
      }
      if (operation.schema === "feed" && operation.table === "feed_poll") {
        return { data: { id: pollId }, error: null };
      }
      if (
        operation.schema === "feed" &&
        operation.table === "feed_poll_option"
      ) {
        return {
          data: null,
          error: { code: "PGRST100", message: "options insert failed" },
        };
      }
      return { data: null, error: { message: "unexpected operation" } };
    });

    const result = await writeFeedRequestForAccount({
      client,
      payload: {
        action: "create_post",
        body: "질문과 선택지가 함께 저장돼야 해요.",
        poll: {
          options: ["바로 이야기하기", "조금 더 생각하기"],
          question: "마음에 걸리는 일이 생기면?",
        },
        source: "balance_game",
        sourceId: "user_balance_game_v1",
        visibility: "public",
      },
      user,
    });

    expect(result).toEqual({ code: "feed_poll_write_failed", ok: false });
    const rollback = operations.find(
      (operation) =>
        operation.schema === "feed" &&
        operation.table === "feed_post" &&
        operation.deleteRow,
    );
    expect(rollback).toBeDefined();
    expect(hasFilter(rollback!, "eq", "id", postId)).toBe(true);
    expect(
      hasFilter(rollback!, "eq", "author_account_id", accountId),
    ).toBe(true);
  });

  it("keeps a balance game's question and choices immutable after voting starts", async () => {
    const postId = "22222222-2222-4222-8222-222222222222";
    const pollId = "33333333-3333-4333-8333-333333333333";
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return { data: { account_id: accountId }, error: null };
      }
      if (
        operation.schema === "feed" &&
        operation.table === "feed_post" &&
        operation.method === "maybeSingle"
      ) {
        return {
          data: {
            attachment_payload: [],
            id: postId,
            public_projection_payload: {},
            published_at: "2026-07-28T00:00:00.000Z",
            source: "balance_game",
            source_id: "user_balance_game_v1",
          },
          error: null,
        };
      }
      if (operation.schema === "feed" && operation.table === "feed_poll") {
        return {
          data: { id: pollId, status: "active" },
          error: null,
        };
      }
      if (
        operation.schema === "feed" &&
        operation.table === "feed_poll_vote"
      ) {
        return { count: 1, data: null, error: null };
      }
      return { data: null, error: { message: "unexpected operation" } };
    });

    const result = await writeFeedRequestForAccount({
      client,
      payload: {
        action: "update_post",
        body: "설명은 바꿀 수 있어요.",
        poll: {
          options: ["새 선택 A", "새 선택 B"],
          question: "새 질문으로 바꿀까요?",
        },
        postId,
        visibility: "public",
      },
      user,
    });

    expect(result).toEqual({ code: "feed_poll_content_locked", ok: false });
    expect(
      operations.some(
        (operation) =>
          operation.table === "feed_poll" && Boolean(operation.updateRow),
      ),
    ).toBe(false);
  });

  it("updates a user-created balance game before the first vote", async () => {
    const postId = "22222222-2222-4222-8222-222222222222";
    const pollId = "33333333-3333-4333-8333-333333333333";
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return { data: { account_id: accountId }, error: null };
      }
      if (
        operation.schema === "feed" &&
        operation.table === "feed_post" &&
        operation.method === "maybeSingle"
      ) {
        return {
          data: {
            attachment_payload: [],
            id: postId,
            public_projection_payload: {},
            published_at: "2026-07-28T00:00:00.000Z",
            source: "balance_game",
            source_id: "user_balance_game_v1",
          },
          error: null,
        };
      }
      if (
        operation.schema === "feed" &&
        operation.table === "feed_post" &&
        operation.method === "single"
      ) {
        return {
          data: { id: postId, moderation_status: "published" },
          error: null,
        };
      }
      if (
        operation.schema === "feed" &&
        operation.table === "feed_poll" &&
        operation.method === "maybeSingle"
      ) {
        return {
          data: { id: pollId, status: "active" },
          error: null,
        };
      }
      if (
        operation.schema === "feed" &&
        operation.table === "feed_poll_vote"
      ) {
        return { count: 0, data: null, error: null };
      }
      if (
        operation.schema === "feed" &&
        operation.table === "feed_poll_option" &&
        !operation.updateRow
      ) {
        return {
          data: [
            {
              id: "44444444-4444-4444-8444-444444444444",
              sort_order: 0,
            },
            {
              id: "55555555-5555-4555-8555-555555555555",
              sort_order: 1,
            },
          ],
          error: null,
        };
      }
      if (
        operation.schema === "feed" &&
        (operation.table === "feed_poll" ||
          operation.table === "feed_poll_option" ||
          operation.table === "feed_external_link")
      ) {
        return { data: null, error: null };
      }
      return { data: null, error: { message: "unexpected operation" } };
    });

    const result = await writeFeedRequestForAccount({
      client,
      payload: {
        action: "update_post",
        body: "설명도 함께 바꿨어요.",
        poll: {
          options: ["새 선택 A", "새 선택 B"],
          question: "첫 투표 전에 질문을 다듬었어요.",
        },
        postId,
        visibility: "public",
      },
      user,
    });

    expect(result).toMatchObject({ data: { id: postId }, ok: true });
    expect(
      operations.find(
        (operation) =>
          operation.table === "feed_poll" && Boolean(operation.updateRow),
      )?.updateRow,
    ).toEqual({ question: "첫 투표 전에 질문을 다듬었어요." });
    expect(
      operations
        .filter(
          (operation) =>
            operation.table === "feed_poll_option" &&
            Boolean(operation.updateRow),
        )
        .map((operation) => operation.updateRow),
    ).toEqual([{ label: "새 선택 A" }, { label: "새 선택 B" }]);
  });

  it("updates an existing balance vote when the viewer changes their choice", async () => {
    const pollId = "33333333-3333-4333-8333-333333333333";
    const optionId = "55555555-5555-4555-8555-555555555555";
    const voteId = "66666666-6666-4666-8666-666666666666";
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return {
          data: { account_id: accountId },
          error: null,
        };
      }

      if (
        operation.schema === "profile" &&
        operation.table === "profile_public_snapshot"
      ) {
        return {
          data: {
            snapshot_payload: {
              profile: {
                code: "ENAKQ",
                name: "관계를 여는 선도자",
              },
            },
          },
          error: null,
        };
      }

      if (operation.schema === "feed" && operation.table === "feed_poll") {
        return {
          data: {
            id: pollId,
            post_id: "77777777-7777-4777-8777-777777777777",
            status: "active",
          },
          error: null,
        };
      }

      if (
        operation.schema === "feed" &&
        operation.table === "feed_poll_option"
      ) {
        return {
          data: { id: optionId, poll_id: pollId },
          error: null,
        };
      }

      if (
        operation.schema === "feed" &&
        operation.table === "official_community_content"
      ) {
        return { data: null, error: null };
      }

      if (operation.schema === "feed" && operation.table === "feed_poll_vote") {
        if (operation.insertRow) {
          return {
            data: null,
            error: { code: "23505", message: "duplicate vote" },
          };
        }

        if (operation.updateRow) {
          return {
            data: { id: voteId },
            error: null,
          };
        }

        return {
          data: { id: voteId },
          error: null,
        };
      }

      return {
        data: null,
        error: { message: "unexpected operation" },
      };
    });

    const result = await writeFeedRequestForAccount({
      client,
      payload: {
        action: "vote_poll",
        optionId,
        pollId,
        replaceExisting: true,
      },
      user,
    });

    expect(result).toEqual({
      data: {
        action: "vote_poll",
        id: voteId,
        targetType: "feed_poll",
      },
      ok: true,
    });
    const updateOperation = operations.find((operation) => operation.updateRow);
    expect(updateOperation?.updateRow).toEqual({
      nuang_code: "ENAKQ",
      option_id: optionId,
      profile_name: "관계를 여는 선도자",
    });
    expect(updateOperation?.filters).toEqual(
      expect.arrayContaining([
        ["eq", "account_id", accountId],
        ["eq", "poll_id", pollId],
        ["is", "deleted_at", null],
      ]),
    );
    expect(
      operations.some(
        (operation) =>
          operation.table === "feed_poll_vote" && operation.insertRow,
      ),
    ).toBe(false);
  });

  it("rejects a vote after the balance game response closes", async () => {
    const pollId = "33333333-3333-4333-8333-333333333333";
    const optionId = "55555555-5555-4555-8555-555555555555";
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return {
          data: { account_id: accountId },
          error: null,
        };
      }
      if (operation.schema === "feed" && operation.table === "feed_poll") {
        return {
          data: {
            id: pollId,
            post_id: "77777777-7777-4777-8777-777777777777",
            status: "closed",
          },
          error: null,
        };
      }
      if (
        operation.schema === "feed" &&
        operation.table === "feed_poll_option"
      ) {
        return {
          data: { id: optionId, poll_id: pollId },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    const result = await writeFeedRequestForAccount({
      client,
      payload: {
        action: "vote_poll",
        optionId,
        pollId,
      },
      user,
    });

    expect(result).toEqual({ code: "feed_response_closed", ok: false });
    expect(
      operations.some(
        (operation) =>
          operation.table === "feed_poll_vote" && operation.insertRow,
      ),
    ).toBe(false);
  });

  it("stores duplicate seed card reactions idempotently", async () => {
    let reactionInsertCount = 0;
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return {
          data: {
            account_id: accountId,
          },
          error: null,
        };
      }

      if (operation.schema === "feed" && operation.table === "feed_reaction") {
        if (operation.method === "single") {
          reactionInsertCount += 1;

          return {
            data: null,
            error: {
              code: "23505",
            },
          };
        }

        return {
          data: {
            id: "33333333-3333-4333-8333-333333333333",
          },
          error: null,
        };
      }

      return {
        data: null,
        error: {
          message: "unexpected operation",
        },
      };
    });
    const payload = {
      action: "react",
      reaction: "like",
      target: {
        id: "daily_mood_001",
        type: "feed_seed_card",
      },
    } satisfies FeedWriteRequest;

    const result = await writeFeedRequestForAccount({ client, payload, user });

    expect(result).toEqual({
      data: {
        action: "react",
        id: "33333333-3333-4333-8333-333333333333",
        targetType: "feed_seed_card",
      },
      ok: true,
    });
    expect(reactionInsertCount).toBe(1);
    const feedInsert = operations.find(
      (item) => item.table === "feed_reaction" && item.method === "single",
    );
    expect(feedInsert?.insertRow).toMatchObject({
      account_id: accountId,
      reaction: "like",
      target_id: null,
      target_key: "daily_mood_001",
      target_type: "feed_seed_card",
    });
  });

  it("rejects a reaction when the server guard cannot resolve a public target", async () => {
    const { client, operations, rpcOperations } = createMockClient(
      (operation) => {
        if (
          operation.schema === "identity" &&
          operation.table === "auth_identity"
        ) {
          return { data: { account_id: accountId }, error: null };
        }
        return { data: null, error: { message: "unexpected operation" } };
      },
      () => ({ data: "target_invalid", error: null }),
    );

    const result = await writeFeedRequestForAccount({
      client,
      payload: {
        action: "react",
        reaction: "like",
        target: {
          id: "22222222-2222-4222-8222-222222222222",
          type: "feed_post",
        },
      },
      user,
    });

    expect(result).toEqual({ code: "feed_target_invalid", ok: false });
    expect(rpcOperations).toContainEqual({
      name: "check_community_mutation_guard",
      params: expect.objectContaining({
        p_action: "react",
        p_target_id: "22222222-2222-4222-8222-222222222222",
        p_target_key: null,
        p_target_type: "feed_post",
      }),
      schema: "feed",
    });
    expect(
      operations.some((operation) => operation.table === "feed_reaction"),
    ).toBe(false);
  });

  it("fails closed when the community write guard is unavailable", async () => {
    const { client, operations } = createMockClient(
      (operation) => {
        if (
          operation.schema === "identity" &&
          operation.table === "auth_identity"
        ) {
          return { data: { account_id: accountId }, error: null };
        }
        return { data: null, error: { message: "unexpected operation" } };
      },
      () => ({
        data: null,
        error: { code: "PGRST202", message: "function not found" },
      }),
    );

    const result = await writeFeedRequestForAccount({
      client,
      payload: {
        action: "bookmark",
        target: {
          id: "daily_mood_001",
          type: "feed_seed_card",
        },
      },
      user,
    });

    expect(result).toEqual({
      code: "feed_write_guard_unavailable",
      ok: false,
    });
    expect(
      operations.some((operation) => operation.table === "feed_bookmark"),
    ).toBe(false);
  });

  it("rejects unknown seed card targets before writing", async () => {
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return {
          data: {
            account_id: accountId,
          },
          error: null,
        };
      }

      return {
        data: null,
        error: {
          message: "unexpected operation",
        },
      };
    });
    const payload = {
      action: "bookmark",
      target: {
        id: "unknown_seed_card",
        type: "feed_seed_card",
      },
    } satisfies FeedWriteRequest;

    const result = await writeFeedRequestForAccount({ client, payload, user });

    expect(result).toEqual({
      code: "feed_target_invalid",
      ok: false,
    });
    expect(operations.some((item) => item.schema === "feed")).toBe(false);
  });

  it("restores soft-deleted feed post reactions when they are created again", async () => {
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return {
          data: {
            account_id: accountId,
          },
          error: null,
        };
      }

      if (operation.schema === "feed" && operation.table === "feed_reaction") {
        if (operation.insertRow) {
          return {
            data: null,
            error: {
              code: "23505",
            },
          };
        }

        if (operation.updateRow) {
          return {
            data: {
              id: "33333333-3333-4333-8333-333333333333",
            },
            error: null,
          };
        }

        if (hasFilter(operation, "is", "deleted_at", null)) {
          return {
            data: null,
            error: null,
          };
        }

        return {
          data: {
            deleted_at: "2026-07-09T07:00:00.000Z",
            id: "33333333-3333-4333-8333-333333333333",
          },
          error: null,
        };
      }

      return {
        data: null,
        error: {
          message: "unexpected operation",
        },
      };
    });
    const payload = {
      action: "react",
      reaction: "like",
      target: {
        id: "22222222-2222-4222-8222-222222222222",
        type: "feed_post",
      },
    } satisfies FeedWriteRequest;

    const result = await writeFeedRequestForAccount({ client, payload, user });

    expect(result).toEqual({
      data: {
        action: "react",
        id: "33333333-3333-4333-8333-333333333333",
        targetType: "feed_post",
      },
      ok: true,
    });
    const restoreOperation = operations.find(
      (operation) => operation.updateRow,
    );
    expect(restoreOperation?.updateRow).toEqual({
      deleted_at: null,
    });
  });

  it("soft deletes active seed bookmarks", async () => {
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return {
          data: {
            account_id: accountId,
          },
          error: null,
        };
      }

      if (operation.schema === "feed" && operation.table === "feed_bookmark") {
        return {
          data: {
            id: "44444444-4444-4444-8444-444444444444",
          },
          error: null,
        };
      }

      return {
        data: null,
        error: {
          message: "unexpected operation",
        },
      };
    });
    const payload = {
      action: "remove_bookmark",
      target: {
        id: "daily_mood_001",
        type: "feed_seed_card",
      },
    } satisfies FeedWriteRequest;

    const result = await writeFeedRequestForAccount({ client, payload, user });

    expect(result).toEqual({
      data: {
        action: "remove_bookmark",
        id: "44444444-4444-4444-8444-444444444444",
        targetType: "feed_seed_card",
      },
      ok: true,
    });
    const removeOperation = operations.find((operation) => operation.updateRow);

    expect(removeOperation?.updateRow?.deleted_at).toEqual(expect.any(String));
    expect(removeOperation?.filters).toEqual(
      expect.arrayContaining([
        ["eq", "account_id", accountId],
        ["eq", "target_type", "feed_seed_card"],
        ["eq", "target_key", "daily_mood_001"],
        ["is", "deleted_at", null],
      ]),
    );
  });

  it("stores not interested preferences without touching public reactions", async () => {
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return {
          data: {
            account_id: accountId,
          },
          error: null,
        };
      }

      if (
        operation.schema === "feed" &&
        operation.table === "feed_preference"
      ) {
        return {
          data: {
            id: "55555555-5555-4555-8555-555555555555",
          },
          error: null,
        };
      }

      return {
        data: null,
        error: {
          message: "unexpected operation",
        },
      };
    });
    const payload = {
      action: "not_interested",
      target: {
        id: "daily_mood_001",
        type: "feed_seed_card",
      },
    } satisfies FeedWriteRequest;

    const result = await writeFeedRequestForAccount({ client, payload, user });

    expect(result).toEqual({
      data: {
        action: "not_interested",
        id: "55555555-5555-4555-8555-555555555555",
        targetType: "feed_seed_card",
      },
      ok: true,
    });
    const preferenceInsert = operations.find(
      (operation) => operation.table === "feed_preference",
    );

    expect(preferenceInsert?.insertRow).toMatchObject({
      account_id: accountId,
      preference: "not_interested",
      target_id: null,
      target_key: "daily_mood_001",
      target_type: "feed_seed_card",
    });
    expect(
      operations.some((operation) => operation.table === "feed_reaction"),
    ).toBe(false);
  });

  it("rejects not interested preferences for comment targets", async () => {
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return {
          data: {
            account_id: accountId,
          },
          error: null,
        };
      }

      return {
        data: null,
        error: {
          message: "unexpected operation",
        },
      };
    });
    const payload = {
      action: "not_interested",
      target: {
        id: "22222222-2222-4222-8222-222222222222",
        type: "feed_comment",
      },
    } satisfies FeedWriteRequest;

    const result = await writeFeedRequestForAccount({ client, payload, user });

    expect(result).toEqual({
      code: "feed_target_not_supported",
      ok: false,
    });
    expect(
      operations.some((operation) => operation.table === "feed_preference"),
    ).toBe(false);
  });

  it("reports feed schema exposure problems clearly", async () => {
    const { client } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return {
          data: {
            account_id: accountId,
          },
          error: null,
        };
      }

      if (operation.schema === "feed") {
        return {
          data: null,
          error: {
            code: "PGRST106",
            message: "Invalid schema: feed",
          },
        };
      }

      return {
        data: null,
        error: {
          message: "unexpected operation",
        },
      };
    });
    const payload = {
      action: "react",
      reaction: "like",
      target: {
        id: "daily_mood_001",
        type: "feed_seed_card",
      },
    } satisfies FeedWriteRequest;

    const result = await writeFeedRequestForAccount({ client, payload, user });

    expect(result).toEqual({
      code: "feed_schema_not_available",
      ok: false,
    });
  });

  it("reports feed schema grant problems clearly", async () => {
    const { client } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return {
          data: {
            account_id: accountId,
          },
          error: null,
        };
      }

      if (operation.schema === "feed") {
        return {
          data: null,
          error: {
            code: "42501",
            message: "permission denied for schema feed",
          },
        };
      }

      return {
        data: null,
        error: {
          message: "unexpected operation",
        },
      };
    });
    const payload = {
      action: "bookmark",
      target: {
        id: "daily_mood_001",
        type: "feed_seed_card",
      },
    } satisfies FeedWriteRequest;

    const result = await writeFeedRequestForAccount({ client, payload, user });

    expect(result).toEqual({
      code: "feed_schema_permission_missing",
      ok: false,
    });
  });

  it("updates only an owned user-manageable post", async () => {
    const postId = "22222222-2222-4222-8222-222222222222";
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return { data: { account_id: accountId }, error: null };
      }

      if (
        operation.schema === "feed" &&
        operation.table === "feed_post" &&
        operation.method === "maybeSingle"
      ) {
        return {
          data: {
            attachment_payload: [],
            id: postId,
            public_projection_payload: {
              authorName: "나",
            },
            published_at: "2026-07-28T00:00:00.000Z",
            source: "free_text",
          },
          error: null,
        };
      }

      if (
        operation.schema === "feed" &&
        operation.table === "link_domain_policy"
      ) {
        return { data: [], error: null };
      }

      if (
        operation.schema === "feed" &&
        operation.table === "feed_external_link"
      ) {
        return { data: null, error: null };
      }

      if (
        operation.schema === "feed" &&
        operation.table === "feed_post" &&
        operation.method === "single"
      ) {
        return {
          data: {
            id: postId,
            moderation_status: "published",
          },
          error: null,
        };
      }

      return { data: null, error: { message: "unexpected operation" } };
    });

    const result = await writeFeedRequestForAccount({
      client,
      payload: {
        action: "update_post",
        body: "수정한 오늘의 이야기예요.",
        postId,
        topic: {
          category: "daily_life",
          source: "manual",
          tags: ["오늘"],
        },
        visibility: "profile_public",
      },
      user,
    });

    expect(result).toMatchObject({
      data: {
        action: "update_post",
        id: postId,
        moderationStatus: "published",
      },
      ok: true,
    });
    const updateOperation = operations.find(
      (operation) =>
        operation.table === "feed_post" && Boolean(operation.updateRow),
    );
    expect(updateOperation?.updateRow).toMatchObject({
      body: "수정한 오늘의 이야기예요.",
      topic_category: "daily_life",
      topic_tags: ["오늘"],
      visibility: "profile_public",
    });
    expect(
      hasFilter(updateOperation!, "eq", "author_account_id", accountId),
    ).toBe(true);
  });

  it("soft deletes an owned post and preserves it for operational recovery", async () => {
    const postId = "22222222-2222-4222-8222-222222222222";
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return { data: { account_id: accountId }, error: null };
      }

      if (
        operation.schema === "feed" &&
        operation.table === "feed_post" &&
        operation.method === "maybeSingle"
      ) {
        return {
          data: { id: postId, source: "free_text" },
          error: null,
        };
      }

      if (
        operation.schema === "feed" &&
        operation.table === "feed_post" &&
        operation.method === "single"
      ) {
        return { data: { id: postId }, error: null };
      }

      return { data: null, error: { message: "unexpected operation" } };
    });

    const result = await writeFeedRequestForAccount({
      client,
      payload: { action: "delete_post", postId },
      user,
    });

    expect(result).toMatchObject({
      data: {
        action: "delete_post",
        id: postId,
        moderationStatus: "removed",
      },
      ok: true,
    });
    const deleteOperation = operations.find(
      (operation) =>
        operation.table === "feed_post" && Boolean(operation.updateRow),
    );
    expect(deleteOperation?.updateRow).toMatchObject({
      moderation_status: "removed",
    });
    expect(deleteOperation?.updateRow?.deleted_at).toEqual(expect.any(String));
    expect(
      hasFilter(deleteOperation!, "eq", "author_account_id", accountId),
    ).toBe(true);
  });

  it("does not change a question audience after replies have started", async () => {
    const postId = "22222222-2222-4222-8222-222222222222";
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return { data: { account_id: accountId }, error: null };
      }
      if (
        operation.schema === "feed" &&
        operation.table === "feed_post" &&
        operation.method === "maybeSingle"
      ) {
        return {
          data: {
            attachment_payload: [],
            id: postId,
            public_projection_payload: {},
            published_at: "2026-07-28T00:00:00.000Z",
            source: "free_text",
            source_id: "ask_all",
          },
          error: null,
        };
      }
      if (
        operation.schema === "feed" &&
        operation.table === "feed_comment"
      ) {
        return { count: 1, data: null, error: null };
      }
      return { data: null, error: { message: "unexpected operation" } };
    });

    const result = await writeFeedRequestForAccount({
      client,
      payload: {
        action: "update_post",
        body: "수정한 질문 내용은 충분히 길어요.",
        postId,
        sourceId: "ask_exact_enakq",
        topic: {
          category: "concerns_questions",
          source: "manual",
          tags: [],
        },
        visibility: "public",
      },
      user,
    });

    expect(result).toEqual({
      code: "feed_question_audience_locked",
      ok: false,
    });
    expect(
      operations.some((operation) => Boolean(operation.updateRow)),
    ).toBe(false);
  });

  it("does not let a viewer delete another account's post", async () => {
    const { client, operations } = createMockClient((operation) => {
      if (
        operation.schema === "identity" &&
        operation.table === "auth_identity"
      ) {
        return { data: { account_id: accountId }, error: null };
      }
      if (
        operation.schema === "feed" &&
        operation.table === "feed_post"
      ) {
        return { data: null, error: null };
      }
      return { data: null, error: { message: "unexpected operation" } };
    });

    const result = await writeFeedRequestForAccount({
      client,
      payload: {
        action: "delete_post",
        postId: "22222222-2222-4222-8222-222222222222",
      },
      user,
    });

    expect(result).toEqual({ code: "feed_target_invalid", ok: false });
    expect(
      operations.some((operation) => Boolean(operation.updateRow)),
    ).toBe(false);
  });
});

function createMockClient(
  responder: (operation: MockOperation) => MockResponse,
  rpcResponder: (operation: MockRpcOperation) => MockResponse = () => ({
    data: null,
    error: null,
  }),
) {
  const operations: MockOperation[] = [];
  const rpcOperations: MockRpcOperation[] = [];
  const resolveResponse = (operation: MockOperation): MockResponse => {
    if (
      operation.schema === "consent" &&
      operation.table === "age_and_consent_status"
    ) {
      return {
        data: {
          is_14_or_older: true,
          required_privacy_version: "privacy.v0.1",
          required_terms_version: "terms.v0.1",
        },
        error: null,
      };
    }
    return responder(operation);
  };
  const client = {
    schema(schema: string) {
      return {
        rpc(name: string, params: Record<string, unknown>) {
          const operation = { name, params, schema };
          rpcOperations.push(structuredClone(operation));
          if (
            schema === "identity" &&
            name === "resolve_account_for_auth_user"
          ) {
            return Promise.resolve({
              data: [
                {
                  account_id: accountId,
                  identities_synced: 1,
                  resolution: "existing",
                },
              ],
              error: null,
            });
          }
          return Promise.resolve(rpcResponder(operation));
        },
        from(table: string) {
          const operation: MockOperation = {
            filters: [],
            schema,
            table,
          };
          const builder = {
            eq(column: string, value: unknown) {
              operation.filters.push(["eq", column, value]);
              return builder;
            },
            delete() {
              operation.deleteRow = true;
              return builder;
            },
            insert(row: Record<string, unknown>) {
              operation.insertRow = row;
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
              operation.method = "maybeSingle";
              operations.push(structuredClone(operation));
              return Promise.resolve(resolveResponse(operation));
            },
            order() {
              return builder;
            },
            select() {
              return builder;
            },
            single() {
              operation.method = "single";
              operations.push(structuredClone(operation));
              return Promise.resolve(resolveResponse(operation));
            },
            then<TResult1 = unknown, TResult2 = never>(
              onfulfilled?:
                ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
              onrejected?:
                ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
            ) {
              operations.push(structuredClone(operation));
              return Promise.resolve(resolveResponse(operation)).then(
                onfulfilled,
                onrejected,
              );
            },
            update(row: Record<string, unknown>) {
              operation.updateRow = row;
              return builder;
            },
          };

          return builder;
        },
      };
    },
  } as unknown as SupabaseClient;

  return {
    client,
    operations,
    rpcOperations,
  };
}

function hasFilter(
  operation: MockOperation,
  type: string,
  column: string,
  value: unknown,
) {
  return operation.filters.some(
    (filter) =>
      filter[0] === type && filter[1] === column && filter[2] === value,
  );
}
