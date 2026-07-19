import type { SupabaseClient, User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";
import { writeFeedRequestForAccount } from "@/features/feed/server-writes";

type MockOperation = {
  filters: Array<[string, string, unknown]>;
  insertRow?: Record<string, unknown>;
  method?: "maybeSingle" | "single";
  schema: string;
  table: string;
  updateRow?: Record<string, unknown>;
};

type MockResponse = {
  data: unknown;
  error: { code?: string; message?: string } | null;
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
      provider: "kakao",
    },
  ],
  user_metadata: {
    name: "테스트 사용자",
  },
} as unknown as User;

describe("feed server writes", () => {
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
            moderation_status: "pending_review",
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
        moderationStatus: "pending_review",
        targetType: "feed_post",
      },
      ok: true,
    });
    const feedInsert = operations.find((item) => item.table === "feed_post");
    expect(feedInsert?.insertRow).toMatchObject({
      attachment_payload: [],
      author_account_id: accountId,
      moderation_status: "pending_review",
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
            moderation_status: "pending_review",
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
            profile_code: "TVOAE",
            profile_name: "불꽃의 온기 탐험가",
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
      nuang_code: "TVOAE",
      option_id: "44444444-4444-4444-8444-444444444444",
      poll_id: "33333333-3333-4333-8333-333333333333",
      profile_name: "불꽃의 온기 탐험가",
    });
    expect(JSON.stringify(operations)).not.toContain("direct_response");
    expect(JSON.stringify(operations)).not.toContain("raw_score");
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
});

function createMockClient(
  responder: (operation: MockOperation) => MockResponse,
) {
  const operations: MockOperation[] = [];
  const client = {
    schema(schema: string) {
      return {
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
              return Promise.resolve(responder(operation));
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
              return Promise.resolve(responder(operation));
            },
            then<TResult1 = unknown, TResult2 = never>(
              onfulfilled?:
                ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
              onrejected?:
                ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
            ) {
              operations.push(structuredClone(operation));
              return Promise.resolve(responder(operation)).then(
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
