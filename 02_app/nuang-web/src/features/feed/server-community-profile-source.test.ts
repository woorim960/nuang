import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { readCommunityProfileSource } from "@/features/feed/server-read";

const accountId = "11111111-1111-4111-8111-111111111111";
const stableProfileId = "22222222-2222-4222-8222-222222222222";
const legacySnapshotId = "33333333-3333-4333-8333-333333333333";

describe("community profile source resolution", () => {
  it("resolves the stable profile id only while its owner profile is active", async () => {
    const active = await readCommunityProfileSource({
      client: createSourceClient({ profileStatus: "active" }),
      profileId: stableProfileId,
    });
    const hidden = await readCommunityProfileSource({
      client: createSourceClient({ profileStatus: "hidden" }),
      profileId: stableProfileId,
    });

    expect(active).toMatchObject({
      communityProfile: { accountId, status: "active" },
      snapshot: { account_id: accountId, id: legacySnapshotId },
    });
    expect(hidden).toBeNull();
  });

  it("rejects an active legacy snapshot after its owner profile is hidden", async () => {
    const active = await readCommunityProfileSource({
      client: createSourceClient({ profileStatus: "active" }),
      profileId: legacySnapshotId,
    });
    const hidden = await readCommunityProfileSource({
      client: createSourceClient({ profileStatus: "hidden" }),
      profileId: legacySnapshotId,
    });

    expect(active).toMatchObject({
      communityProfile: { accountId, status: "active" },
      snapshot: { account_id: accountId, id: legacySnapshotId },
    });
    expect(hidden).toBeNull();
  });

  it("fails closed instead of trying the legacy path when profile lookup fails", async () => {
    const mock = createSourceClient({
      communityLookupError: true,
      profileStatus: "active",
    });

    const source = await readCommunityProfileSource({
      client: mock,
      profileId: legacySnapshotId,
    });

    expect(source).toBeNull();
  });

  it("resolves an active stable profile without requiring a public snapshot", async () => {
    const source = await readCommunityProfileSource({
      client: createSourceClient({
        profileStatus: "active",
        snapshotMissing: true,
      }),
      profileId: stableProfileId,
    });

    expect(source).toMatchObject({
      communityProfile: { accountId, id: stableProfileId },
      snapshot: {
        account_id: accountId,
        id: stableProfileId,
        snapshot_payload: {
          profile: { code: "-----", name: "비공개 성향" },
          publicData: { coreDomainMap: [], coreFacetSummary: [] },
          snapshotId: stableProfileId,
          visibility: { includedFields: ["display_profile"] },
        },
      },
    });
  });
});

type Operation = {
  filters: Array<["eq" | "is", string, unknown]>;
  schema: string;
  table: string;
};

function createSourceClient({
  communityLookupError = false,
  profileStatus,
  snapshotMissing = false,
}: {
  communityLookupError?: boolean;
  profileStatus: "active" | "hidden";
  snapshotMissing?: boolean;
}) {
  return {
    schema(schema: string) {
      return {
        from(table: string) {
          const operation: Operation = { filters: [], schema, table };
          const builder = {
            eq(column: string, value: unknown) {
              operation.filters.push(["eq", column, value]);
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
          };
          return builder;
        },
      };
    },
  } as unknown as SupabaseClient;

  function resolveOperation(operation: Operation) {
    if (
      operation.schema === "profile" &&
      operation.table === "community_profile"
    ) {
      if (hasFilter(operation, "eq", "id", stableProfileId)) {
        return communityLookupError
          ? { data: null, error: { message: "profile lookup failed" } }
          : {
              data:
                profileStatus === "active" ? { account_id: accountId } : null,
              error: null,
            };
      }
      if (hasFilter(operation, "eq", "id", legacySnapshotId)) {
        return communityLookupError
          ? { data: null, error: { message: "profile lookup failed" } }
          : { data: null, error: null };
      }
      if (hasFilter(operation, "eq", "account_id", accountId)) {
        return {
          data: profileStatus === "active" ? createCommunityProfileRow() : null,
          error: null,
        };
      }
    }

    if (
      operation.schema === "profile" &&
      operation.table === "profile_public_snapshot"
    ) {
      if (
        hasFilter(operation, "eq", "account_id", accountId) ||
        hasFilter(operation, "eq", "id", legacySnapshotId)
      ) {
        return {
          data:
            snapshotMissing &&
            hasFilter(operation, "eq", "account_id", accountId)
              ? null
              : createSnapshotRow(),
          error: null,
        };
      }
      return { data: null, error: null };
    }

    return {
      data: null,
      error: { message: `Unexpected ${operation.schema}.${operation.table}` },
    };
  }
}

function hasFilter(
  operation: Operation,
  kind: "eq" | "is",
  column: string,
  value: unknown,
) {
  return operation.filters.some(
    (filter) =>
      filter[0] === kind && filter[1] === column && filter[2] === value,
  );
}

function createCommunityProfileRow() {
  return {
    account_id: accountId,
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
    id: stableProfileId,
    revision: 1,
    status: "active",
  };
}

function createSnapshotRow() {
  return {
    account_id: accountId,
    id: legacySnapshotId,
    snapshot_payload: {
      displayProfile: { displayName: "활성 프로필", motif: "purple" },
      profile: { code: "ENAKQ", name: "관계를 여는 선도자" },
      publicData: { coreDomainMap: [], coreFacetSummary: [] },
    },
  };
}
