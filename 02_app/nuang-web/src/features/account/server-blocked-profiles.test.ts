import type { SupabaseClient, User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { readBlockedProfiles } from "@/features/account/server-blocked-profiles";

describe("blocked profile containment", () => {
  it("keeps the block and general profile while redacting raw snapshot code identity", async () => {
    const client = createBlockedProfilesClient();

    const result = await readBlockedProfiles({
      client,
      user: { id: "auth-viewer" } as User,
    });

    expect(result).toEqual({
      blockedProfiles: [
        expect.objectContaining({
          blockedAccountId: "22222222-2222-4222-8222-222222222222",
          code: null,
          displayName: "차단된 사용자",
          profileName: null,
          publicSnapshotId: "33333333-3333-4333-8333-333333333333",
        }),
      ],
      ok: true,
    });
    expect(JSON.stringify(result)).not.toContain("INGMC");
    expect(JSON.stringify(result)).not.toContain("새 가능성을 찾는 탐험가");
    expect(JSON.stringify(result)).not.toContain("/legacy/INGMC.webp");
  });
});

type Operation = {
  filters: Array<[string, string, unknown]>;
  schema: string;
  table: string;
};

function createBlockedProfilesClient() {
  const client = {
    schema(schema: string) {
      return {
        from(table: string) {
          const operation: Operation = { filters: [], schema, table };
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
              return Promise.resolve(resolveOperation(operation));
            },
            order() {
              return builder;
            },
            select() {
              return builder;
            },
            then(onFulfilled: (value: unknown) => unknown) {
              return Promise.resolve(resolveOperation(operation)).then(
                onFulfilled,
              );
            },
          };
          return builder;
        },
      };
    },
  } as unknown as SupabaseClient;

  return client;
}

function resolveOperation(operation: Operation) {
  const key = `${operation.schema}.${operation.table}`;

  if (key === "identity.auth_identity") {
    return {
      data: { account_id: "11111111-1111-4111-8111-111111111111" },
      error: null,
    };
  }
  if (key === "feed.profile_block") {
    return {
      data: [
        {
          blocked_account_id: "22222222-2222-4222-8222-222222222222",
          created_at: "2026-08-20T00:00:00.000Z",
          target_public_snapshot_id: "33333333-3333-4333-8333-333333333333",
        },
      ],
      error: null,
    };
  }
  if (key === "profile.profile_public_snapshot") {
    return {
      data: [
        {
          account_id: "22222222-2222-4222-8222-222222222222",
          created_at: "2026-08-19T00:00:00.000Z",
          id: "33333333-3333-4333-8333-333333333333",
          snapshot_payload: {
            displayProfile: {
              displayName: "이전 표시명",
              motif: "purple",
              profileImage: {
                alt: "INGMC 전용 성향 이미지",
                source: "trait_image",
                src: "/legacy/INGMC.webp",
              },
            },
            profile: {
              code: "INGMC",
              name: "새 가능성을 찾는 탐험가",
            },
          },
        },
      ],
      error: null,
    };
  }
  if (key === "profile.community_profile") {
    return {
      data: [
        {
          account_id: "22222222-2222-4222-8222-222222222222",
          avatar_bucket: null,
          avatar_character_key: "purple",
          avatar_object_path: null,
          avatar_revision: 0,
          bio: "",
          code_visibility: "public",
          comparison_enabled: true,
          detail_visibility: "public",
          display_name: "차단된 사용자",
          handle: "blocked.user",
          id: "44444444-4444-4444-8444-444444444444",
          revision: 1,
          status: "active",
        },
      ],
      error: null,
    };
  }

  return { data: null, error: { message: `Unexpected ${key}` } };
}
