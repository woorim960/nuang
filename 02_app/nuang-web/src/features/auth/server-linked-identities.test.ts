import { describe, expect, it, vi } from "vitest";
import { unlinkIdentityProvider } from "@/features/auth/server-linked-identities";

const now = new Date().toISOString();
const google = {
  id: "google-subject",
  identity_id: "google-identity",
  last_sign_in_at: now,
  provider: "google",
  user_id: "user-id",
};
const kakao = {
  id: "kakao-subject",
  identity_id: "kakao-identity",
  last_sign_in_at: now,
  provider: "kakao",
  user_id: "user-id",
};

describe("unlinkIdentityProvider", () => {
  it("blocks removing the final login method before calling Supabase", async () => {
    const authClient = createAuthClient([google]);
    const result = await unlinkIdentityProvider({
      authClient: authClient.client,
      provider: "google",
      serviceClient: {} as never,
      user: { app_metadata: { provider: "google" }, id: "user-id" } as never,
    });

    expect(result).toEqual({ code: "last_login_method", ok: false });
    expect(authClient.unlink).not.toHaveBeenCalled();
  });

  it("requires a remaining provider reauthentication before current-provider removal", async () => {
    const authClient = createAuthClient([google, kakao]);
    const result = await unlinkIdentityProvider({
      authClient: authClient.client,
      provider: "google",
      serviceClient: {} as never,
      user: { app_metadata: { provider: "google" }, id: "user-id" } as never,
    });

    expect(result).toEqual({ code: "reauth_required", ok: false });
    expect(authClient.unlink).not.toHaveBeenCalled();
  });

  it("unlinks only a non-current provider when the kept login was recently verified", async () => {
    const authClient = createAuthClient([google, kakao]);
    const shadow = createShadowClient();
    const result = await unlinkIdentityProvider({
      authClient: authClient.client,
      provider: "kakao",
      serviceClient: shadow.client,
      user: { app_metadata: { provider: "google" }, id: "user-id" } as never,
    });

    expect(result).toEqual({
      data: { reconciliationPending: false },
      ok: true,
    });
    expect(authClient.unlink).toHaveBeenCalledWith(kakao);
    expect(shadow.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "revoked" }),
    );
  });
});

function createAuthClient(identities: unknown[]) {
  const unlink = vi.fn().mockResolvedValue({ data: {}, error: null });
  return {
    client: {
      auth: {
        getUserIdentities: vi.fn().mockResolvedValue({
          data: { identities },
          error: null,
        }),
        unlinkIdentity: unlink,
      },
    } as never,
    unlink,
  };
}

function createShadowClient() {
  const update = vi.fn();
  const eqCalls: unknown[] = [];
  const chain: { eq: ReturnType<typeof vi.fn>; then?: unknown } = {
    eq: vi.fn((...args: unknown[]) => {
      eqCalls.push(args);
      return chain;
    }),
  };
  Object.defineProperty(chain, "then", {
    value: (resolve: (value: unknown) => void) =>
      Promise.resolve({ error: null }).then(resolve),
  });
  update.mockReturnValue(chain);
  return {
    client: {
      schema: vi.fn(() => ({ from: vi.fn(() => ({ update })) })),
    } as never,
    eqCalls,
    update,
  };
}
