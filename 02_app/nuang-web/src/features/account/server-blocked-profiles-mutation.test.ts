import type { SupabaseClient, User } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { unblockProfileByAccountId } from "@/features/account/server-blocked-profiles";

const blockerAccountId = "11111111-1111-4111-8111-111111111111";
const blockedAccountId = "22222222-2222-4222-8222-222222222222";
const communityProfileId = "33333333-3333-4333-8333-333333333333";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("blocked profile stable mutation", () => {
  it("uses the v2 atomic RPC when the flag and capability are ready", async () => {
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");
    const mock = createUnblockClient({
      capability: "community-stable-profile-mutation.v1",
    });

    await expect(
      unblockProfileByAccountId({
        blockedAccountId,
        client: mock.client,
        communityProfileId,
        user: { id: "auth-viewer" } as User,
      }),
    ).resolves.toEqual({ ok: true });

    expect(mock.rpc).toHaveBeenCalledWith("set_profile_block_v2", {
      p_blocked: false,
      p_blocker_account_id: blockerAccountId,
      p_expected_target_account_id: blockedAccountId,
      p_target_community_profile_id: communityProfileId,
    });
    expect(mock.legacyUpdate).not.toHaveBeenCalled();
  });

  it("keeps the D06 safe direct unblock when capability does not match", async () => {
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");
    const mock = createUnblockClient({
      capability: "community-stable-profile-mutation.v2",
    });

    await expect(
      unblockProfileByAccountId({
        blockedAccountId,
        client: mock.client,
        communityProfileId,
        user: { id: "auth-viewer" } as User,
      }),
    ).resolves.toEqual({ ok: true });

    expect(mock.rpc.mock.calls.map(([name]) => name)).toEqual([
      "get_community_stable_profile_mutation_capability",
    ]);
    expect(mock.legacyUpdate).toHaveBeenCalledTimes(1);
  });

  it("does not fall back after a v2 unblock RPC error", async () => {
    vi.stubEnv("COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED", "true");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const mock = createUnblockClient({
      capability: "community-stable-profile-mutation.v1",
      mutationError: true,
    });

    await expect(
      unblockProfileByAccountId({
        blockedAccountId,
        client: mock.client,
        communityProfileId,
        user: { id: "auth-viewer" } as User,
      }),
    ).resolves.toEqual({ ok: false });

    expect(mock.rpc.mock.calls.map(([name]) => name)).toEqual([
      "get_community_stable_profile_mutation_capability",
      "set_profile_block_v2",
    ]);
    expect(mock.legacyUpdate).not.toHaveBeenCalled();
  });
});

function createUnblockClient({
  capability,
  mutationError = false,
}: {
  capability: string;
  mutationError?: boolean;
}) {
  const legacyUpdate = vi.fn();
  const rpc = vi.fn(async (name: string) => {
    if (name === "get_community_stable_profile_mutation_capability") {
      return { data: capability, error: null };
    }
    if (mutationError) {
      return { data: null, error: { code: "PGRST202" } };
    }
    return {
      data: {
        blocked: false,
        changed: true,
        code: "unblocked",
        ok: true,
      },
      error: null,
    };
  });

  const client = {
    schema(schema: string) {
      return {
        from(table: string) {
          const builder = {
            eq() {
              return builder;
            },
            is() {
              return builder;
            },
            limit() {
              return builder;
            },
            maybeSingle() {
              return Promise.resolve(
                schema === "identity" && table === "auth_identity"
                  ? { data: { account_id: blockerAccountId }, error: null }
                  : { data: null, error: null },
              );
            },
            order() {
              return builder;
            },
            select() {
              return builder;
            },
            then(onFulfilled: (value: unknown) => unknown) {
              return Promise.resolve({
                data: [{ id: "block-1" }],
                error: null,
              }).then(onFulfilled);
            },
            update() {
              legacyUpdate();
              return builder;
            },
          };
          return builder;
        },
        rpc,
      };
    },
  } as unknown as SupabaseClient;

  return { client, legacyUpdate, rpc };
}
