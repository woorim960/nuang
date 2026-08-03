import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signInWithOAuth: vi.fn(),
}));

vi.mock("@/features/auth/oauth-browser-navigation", () => ({
  navigateToOAuthAuthorization: mocks.navigate,
}));
vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({
    auth: { signInWithOAuth: mocks.signInWithOAuth },
  }),
}));
vi.mock("@/lib/supabase/env", () => ({
  getSupabasePublicEnv: () => ({
    anonKey: "anon-key",
    appOrigin: window.location.origin,
    url: "https://project.supabase.co",
  }),
}));

import { startSocialSignIn } from "@/features/auth/start-social-sign-in";

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/login?next=/my/profile/edit");
});

describe("startSocialSignIn", () => {
  it("requests a server intent and opens only an exact prevalidated authorization URL", async () => {
    const callbackUrl = `${window.location.origin}/auth/callback`;
    const authorization = new URL(
      "https://project.supabase.co/auth/v1/authorize",
    );
    authorization.searchParams.set("redirect_to", callbackUrl);
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        intent: {
          callbackUrl,
          expiresAt: "2026-08-03T00:10:00.000Z",
          provider: "google",
        },
        ok: true,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    mocks.signInWithOAuth.mockResolvedValue({
      data: { provider: "google", url: authorization.toString() },
      error: null,
    });

    await expect(startSocialSignIn("google")).resolves.toEqual({
      status: "redirecting",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/sign-in-intents",
      expect.objectContaining({
        body: JSON.stringify({
          provider: "google",
          returnPath: "/my/profile/edit",
        }),
      }),
    );
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      options: {
        redirectTo: callbackUrl,
        skipBrowserRedirect: true,
      },
      provider: "google",
    });
    expect(mocks.navigate).toHaveBeenCalledWith(authorization.toString());
  });

  it("keeps the current page when Supabase substitutes the production callback", async () => {
    const callbackUrl = `${window.location.origin}/auth/callback`;
    const fallback = new URL("https://project.supabase.co/auth/v1/authorize");
    fallback.searchParams.set("redirect_to", "https://nuang.app/auth/callback");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          intent: {
            callbackUrl,
            expiresAt: "2026-08-03T00:10:00.000Z",
            provider: "kakao",
          },
          ok: true,
        }),
      ),
    );
    mocks.signInWithOAuth.mockResolvedValue({
      data: { provider: "kakao", url: fallback.toString() },
      error: null,
    });

    const result = await startSocialSignIn("kakao");

    expect(result).toMatchObject({ status: "configuration_mismatch" });
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("never sends unsafe next values to the intent API", async () => {
    window.history.replaceState(
      {},
      "",
      "/login?next=https%3A%2F%2Fevil.example%2Fsteal",
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ code: "test_stop", ok: false }, { status: 503 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await startSocialSignIn("google");

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      provider: "google",
      returnPath: "/my",
    });
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
  });
});
