import type { SupabaseClient, User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { ensureAccountForUser } from "@/features/account/server-writes";

describe("ensureAccountForUser atomic resolver", () => {
  it("sends every trusted identity to one resolver call", async () => {
    const rpc = vi.fn(async () => ({
      data: [
        {
          account_id: "account-1",
          identities_synced: 2,
          resolution: "existing",
        },
      ],
      error: null,
    }));
    const client = createClient(rpc);

    await expect(
      ensureAccountForUser(client, createMultiProviderUser()),
    ).resolves.toEqual({
      accountId: "account-1",
      identitiesSynced: 2,
      ok: true,
      resolution: "existing",
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("resolve_account_for_auth_user", {
      p_correlation_id: null,
      p_identities: [
        {
          issuer: "https://accounts.google.com",
          provider: "google",
          provider_subject: "google-subject",
          supabase_identity_id: "identity-google",
        },
        {
          issuer: "https://kauth.kakao.com",
          provider: "kakao",
          provider_subject: "kakao-subject",
          supabase_identity_id: "identity-kakao",
        },
      ],
      p_linked_via: "same_auth_user",
      p_supabase_user_id: "auth-user-1",
    });
  });

  it("returns a closed conflict state without selecting an arbitrary account", async () => {
    const rpc = vi.fn(async () => ({
      data: [
        {
          account_id: null,
          identities_synced: 0,
          resolution: "conflict",
        },
      ],
      error: null,
    }));

    await expect(
      ensureAccountForUser(createClient(rpc), createMultiProviderUser()),
    ).resolves.toEqual({ code: "account_conflict", ok: false });
  });

  it("blocks a previously deleted provider identity", async () => {
    const rpc = vi.fn(async () => ({
      data: [
        {
          account_id: null,
          identities_synced: 0,
          resolution: "deleted",
        },
      ],
      error: null,
    }));

    await expect(
      ensureAccountForUser(createClient(rpc), createMultiProviderUser()),
    ).resolves.toEqual({ code: "identity_deleted", ok: false });
  });

  it("never invokes the resolver for an unregistered provider", async () => {
    const rpc = vi.fn();
    const client = createClient(rpc);
    const user = {
      id: "auth-user-1",
      identities: [
        {
          id: "github-subject",
          identity_id: "identity-github",
          provider: "github",
          user_id: "auth-user-1",
        },
      ],
    } as User;

    await expect(ensureAccountForUser(client, user)).resolves.toEqual({
      code: "provider_not_allowed",
      ok: false,
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});

function createClient(rpc: ReturnType<typeof vi.fn>) {
  return {
    schema: vi.fn(() => ({ rpc })),
  } as unknown as SupabaseClient;
}

function createMultiProviderUser() {
  return {
    id: "auth-user-1",
    identities: [
      {
        id: "kakao-subject",
        identity_id: "identity-kakao",
        provider: "kakao",
        user_id: "auth-user-1",
      },
      {
        id: "google-subject",
        identity_id: "identity-google",
        provider: "google",
        user_id: "auth-user-1",
      },
    ],
    user_metadata: {},
  } as unknown as User;
}
