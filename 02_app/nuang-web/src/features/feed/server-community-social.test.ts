import type { SupabaseClient, User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  readBlockedCommunityAccountIds,
  readCommunityProfileConnections,
} from "@/features/feed/server-community-social";

const communityProfileMocks = vi.hoisted(() => ({
  mergeCommunityProfileIntoSnapshot: vi.fn(
    async ({ snapshot }: { snapshot: unknown }) => snapshot,
  ),
  readCommunityProfilesForAccounts: vi.fn(async () => new Map()),
}));

vi.mock("@/features/account/server-community-profile", () => ({
  mergeCommunityProfileIntoSnapshot:
    communityProfileMocks.mergeCommunityProfileIntoSnapshot,
  readCommunityProfilesForAccounts:
    communityProfileMocks.readCommunityProfilesForAccounts,
}));

const viewerUser = { id: "auth-viewer" } as User;

describe("community block reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns both directions as an explicit ready result", async () => {
    const { client } = createSocialReadClient({
      blockedByViewer: ["account-blocked-by-viewer"],
      blockedViewer: ["account-that-blocked-viewer"],
    });

    const result = await readBlockedCommunityAccountIds({
      accountId: "account-viewer",
      client,
    });

    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect([...result.blockedAccountIds]).toEqual([
      "account-blocked-by-viewer",
      "account-that-blocked-viewer",
    ]);
  });

  it("returns unavailable instead of an empty allow-list on a query error", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { client } = createSocialReadClient({ blockReadFailure: true });

    const result = await readBlockedCommunityAccountIds({
      accountId: "account-viewer",
      client,
    });

    expect(result).toEqual({ state: "unavailable" });
    expect(consoleError).toHaveBeenCalledWith(
      "[community-block] relationship read failed",
      expect.objectContaining({ blockedByMeCode: "BLOCK_READ_FAILED" }),
    );
  });
});

describe("community profile connections privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("makes the connection page unavailable when block reads fail", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { client } = createSocialReadClient({ blockReadFailure: true });

    const result = await readCommunityProfileConnections({
      client,
      publicSnapshotId: "snapshot-owner",
      user: viewerUser,
    });

    expect(result.state).toBe("unavailable");
    expect(result.followers).toEqual([]);
    expect(result.following).toEqual([]);
  });

  it("hides the owner's list for a block in either direction", async () => {
    for (const blockOptions of [
      { blockedByViewer: ["account-owner"] },
      { blockedViewer: ["account-owner"] },
    ]) {
      const { client, operations } = createSocialReadClient(blockOptions);

      const result = await readCommunityProfileConnections({
        client,
        publicSnapshotId: "snapshot-owner",
        user: viewerUser,
      });

      expect(result.state).toBe("profile_not_found");
      expect(
        operations.some((operation) => operation.table === "profile_follow"),
      ).toBe(false);
    }
  });

  it("removes blocked accounts from both follower and following lists", async () => {
    const { client, requestedConnectionAccountIds } = createSocialReadClient({
      blockedByViewer: ["account-blocked-follower"],
      blockedViewer: ["account-blocked-following"],
      followers: ["account-allowed-follower", "account-blocked-follower"],
      following: ["account-allowed-following", "account-blocked-following"],
    });

    const result = await readCommunityProfileConnections({
      client,
      publicSnapshotId: "snapshot-owner",
      user: viewerUser,
    });

    expect(result.state).toBe("ready");
    expect(result.followers.map((profile) => profile.displayName)).toEqual([
      "account-allowed-follower",
    ]);
    expect(result.following.map((profile) => profile.displayName)).toEqual([
      "account-allowed-following",
    ]);
    expect(requestedConnectionAccountIds).toEqual([
      "account-allowed-follower",
      "account-allowed-following",
    ]);
  });
});

type SocialReadOptions = {
  blockReadFailure?: boolean;
  blockedByViewer?: string[];
  blockedViewer?: string[];
  followers?: string[];
  following?: string[];
};

type SocialReadOperation = {
  filters: Array<["eq" | "in" | "is", string, unknown]>;
  schema: string;
  selected: string;
  table: string;
};

function createSocialReadClient(options: SocialReadOptions = {}) {
  const operations: SocialReadOperation[] = [];
  const requestedConnectionAccountIds: string[] = [];
  const config = {
    blockReadFailure: options.blockReadFailure ?? false,
    blockedByViewer: options.blockedByViewer ?? [],
    blockedViewer: options.blockedViewer ?? [],
    followers: options.followers ?? [],
    following: options.following ?? [],
  };

  const client = {
    schema(schema: string) {
      return {
        from(table: string) {
          const operation: SocialReadOperation = {
            filters: [],
            schema,
            selected: "",
            table,
          };
          operations.push(operation);

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
            select(columns: string) {
              operation.selected = columns;
              return builder;
            },
            then<TResult1 = unknown, TResult2 = never>(
              onfulfilled?:
                ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
              onrejected?:
                ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
            ) {
              return Promise.resolve(resolveOperation(operation)).then(
                onfulfilled,
                onrejected,
              );
            },
          };

          return builder;
        },
      };
    },
  } as unknown as SupabaseClient;

  function resolveOperation(operation: SocialReadOperation) {
    if (
      operation.schema === "identity" &&
      operation.table === "auth_identity"
    ) {
      return { data: { account_id: "account-viewer" }, error: null };
    }

    if (operation.schema === "feed" && operation.table === "profile_block") {
      if (config.blockReadFailure) {
        return {
          data: null,
          error: { code: "BLOCK_READ_FAILED", message: "read failed" },
        };
      }
      return operation.selected === "blocked_account_id"
        ? {
            data: config.blockedByViewer.map((blocked_account_id) => ({
              blocked_account_id,
            })),
            error: null,
          }
        : {
            data: config.blockedViewer.map((blocker_account_id) => ({
              blocker_account_id,
            })),
            error: null,
          };
    }

    if (operation.schema === "feed" && operation.table === "profile_follow") {
      return operation.selected.startsWith("follower_account_id")
        ? {
            data: config.followers.map((follower_account_id, index) => ({
              created_at: `2026-08-05T00:00:0${index}.000Z`,
              follower_account_id,
            })),
            error: null,
          }
        : {
            data: config.following.map((target_account_id, index) => ({
              created_at: `2026-08-05T00:01:0${index}.000Z`,
              target_account_id,
            })),
            error: null,
          };
    }

    if (
      operation.schema === "profile" &&
      operation.table === "profile_public_snapshot"
    ) {
      if (operation.selected === "account_id,status") {
        return {
          data: { account_id: "account-owner", status: "active" },
          error: null,
        };
      }
      if (operation.selected === "snapshot_payload") {
        return {
          data: { snapshot_payload: createSnapshot("snapshot-owner", "주인") },
          error: null,
        };
      }

      const accountIds = readInFilter(operation, "account_id");
      requestedConnectionAccountIds.push(...accountIds);
      return {
        data: accountIds.map((accountId) => ({
          account_id: accountId,
          created_at: "2026-08-05T00:00:00.000Z",
          id: `snapshot-${accountId}`,
          snapshot_payload: createSnapshot(`snapshot-${accountId}`, accountId),
        })),
        error: null,
      };
    }

    return {
      data: null,
      error: { code: "UNEXPECTED_READ", message: "unexpected read" },
    };
  }

  return { client, operations, requestedConnectionAccountIds };
}

function readInFilter(operation: SocialReadOperation, column: string) {
  const value = operation.filters.find(
    ([kind, filterColumn]) => kind === "in" && filterColumn === column,
  )?.[2];
  return Array.isArray(value) ? value.map(String) : [];
}

function createSnapshot(snapshotId: string, displayName: string) {
  return {
    displayProfile: {
      displayName,
      motif: "purple",
    },
    profile: {
      code: "INGMC",
      name: "새 가능성을 찾는 탐험가",
    },
    snapshotId,
  };
}
