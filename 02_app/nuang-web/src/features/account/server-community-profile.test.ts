import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { readCommunityProfileForAccount } from "@/features/account/server-community-profile";

describe("community profile server reads", () => {
  it("requires the account profile to remain active", async () => {
    const mock = createCommunityProfileClient("hidden");

    const profile = await readCommunityProfileForAccount({
      accountId: "11111111-1111-4111-8111-111111111111",
      client: mock.client,
    });

    expect(profile).toBeNull();
    expect(mock.filters).toContainEqual(["eq", "status", "active"]);
  });

  it("returns an active, non-deleted account profile", async () => {
    const mock = createCommunityProfileClient("active");

    const profile = await readCommunityProfileForAccount({
      accountId: "11111111-1111-4111-8111-111111111111",
      client: mock.client,
    });

    expect(profile).toMatchObject({
      accountId: "11111111-1111-4111-8111-111111111111",
      displayName: "활성 프로필",
      status: "active",
    });
  });
});

function createCommunityProfileClient(status: "active" | "hidden") {
  const filters: Array<["eq" | "is", string, unknown]> = [];
  const builder = {
    eq(column: string, value: unknown) {
      filters.push(["eq", column, value]);
      return builder;
    },
    is(column: string, value: unknown) {
      filters.push(["is", column, value]);
      return builder;
    },
    maybeSingle() {
      const requiresActive = filters.some(
        ([kind, column, value]) =>
          kind === "eq" && column === "status" && value === "active",
      );
      return Promise.resolve({
        data:
          status === "active" && requiresActive
            ? createCommunityProfileRow("active")
            : null,
        error: null,
      });
    },
    select() {
      return builder;
    },
  };
  const client = {
    schema(schema: string) {
      expect(schema).toBe("profile");
      return {
        from(table: string) {
          expect(table).toBe("community_profile");
          return builder;
        },
      };
    },
  } as unknown as SupabaseClient;

  return { client, filters };
}

function createCommunityProfileRow(status: "active" | "hidden") {
  return {
    account_id: "11111111-1111-4111-8111-111111111111",
    avatar_bucket: null,
    avatar_character_key: "purple",
    avatar_object_path: null,
    avatar_revision: 0,
    bio: "",
    code_visibility: "public",
    comparison_enabled: true,
    detail_visibility: "public",
    display_name: "활성 프로필",
    handle: "active.profile",
    id: "22222222-2222-4222-8222-222222222222",
    revision: 1,
    status,
  };
}
