import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  callCommunityStableProfileMutationRpc,
  communityStableProfileMutationCapability,
  isCommunityStableProfileMutationFlagEnabled,
  readCommunityStableProfileMutationReadiness,
} from "@/features/feed/server-community-stable-mutations";

describe("stable community profile mutation capability", () => {
  it("defaults the server-only feature flag to closed", async () => {
    const rpc = vi.fn();
    const client = createRpcClient(rpc);

    expect(isCommunityStableProfileMutationFlagEnabled({})).toBe(false);
    await expect(
      readCommunityStableProfileMutationReadiness({
        client,
        environment: {},
      }),
    ).resolves.toEqual({ state: "disabled" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("opens only for the exact flag and exact database capability", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: communityStableProfileMutationCapability,
      error: null,
    });

    await expect(
      readCommunityStableProfileMutationReadiness({
        client: createRpcClient(rpc),
        environment: {
          COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED: "true",
        },
      }),
    ).resolves.toEqual({
      capability: communityStableProfileMutationCapability,
      state: "ready",
    });
    expect(rpc).toHaveBeenCalledWith(
      "get_community_stable_profile_mutation_capability",
      {},
    );
  });

  it.each(["TRUE", "1", "yes", "false"])(
    "keeps non-exact flag value %s closed",
    async (configured) => {
      expect(
        isCommunityStableProfileMutationFlagEnabled({
          COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED: configured,
        }),
      ).toBe(false);
    },
  );

  it("fails closed on a capability version mismatch", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: "community-stable-profile-mutation.v2",
      error: null,
    });

    await expect(
      readCommunityStableProfileMutationReadiness({
        client: createRpcClient(rpc),
        environment: {
          COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED: "true",
        },
      }),
    ).resolves.toEqual({ state: "unavailable" });
  });
});

describe("stable community profile mutation RPC contract", () => {
  it("accepts the bounded report result needed for one notification", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        changed: true,
        code: "reported",
        createdAt: "2026-08-21T00:00:00.000Z",
        ok: true,
        reported: true,
        reportId: "11111111-1111-4111-8111-111111111111",
      },
      error: null,
    });

    await expect(
      callCommunityStableProfileMutationRpc({
        client: createRpcClient(rpc),
        name: "create_profile_report_v2",
        params: { p_reason: "spam" },
      }),
    ).resolves.toEqual({
      result: {
        changed: true,
        code: "reported",
        createdAt: "2026-08-21T00:00:00.000Z",
        ok: true,
        reported: true,
        reportId: "11111111-1111-4111-8111-111111111111",
      },
      state: "ready",
    });
  });

  it("normalizes a documented failure without accepting unknown fields", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { code: "rate_limited", ok: false },
      error: null,
    });

    await expect(
      callCommunityStableProfileMutationRpc({
        client: createRpcClient(rpc),
        name: "set_profile_follow_v2",
        params: {},
      }),
    ).resolves.toEqual({
      result: { changed: false, code: "rate_limited", ok: false },
      state: "ready",
    });
  });

  it("does not retry a missing v2 RPC through a legacy function", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST202" },
    });

    await expect(
      callCommunityStableProfileMutationRpc({
        client: createRpcClient(rpc),
        name: "set_profile_block_v2",
        params: {},
      }),
    ).resolves.toEqual({ state: "unavailable" });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("set_profile_block_v2", {});
    expect(consoleError).toHaveBeenCalledWith(
      "[community-stable-profile] mutation unavailable",
      { code: "PGRST202", rpc: "set_profile_block_v2" },
    );
  });

  it("rejects an unknown success shape", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { changed: true, code: "done", ok: true },
      error: null,
    });

    await expect(
      callCommunityStableProfileMutationRpc({
        client: createRpcClient(rpc),
        name: "set_profile_follow_v2",
        params: {},
      }),
    ).resolves.toEqual({ state: "unavailable" });
  });
});

function createRpcClient(rpc: ReturnType<typeof vi.fn>) {
  return {
    schema() {
      return { rpc };
    },
  } as unknown as SupabaseClient;
}
