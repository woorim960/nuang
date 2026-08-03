import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureAccountForUser: vi.fn(),
  ensureCommunityProfile: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  persistAccountConsent: vi.fn(),
  signOut: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock("@/features/account/server-writes", () => ({
  ensureAccountForUser: mocks.ensureAccountForUser,
  persistAccountConsent: mocks.persistAccountConsent,
}));
vi.mock("@/features/account/server-community-profile", () => ({
  ensureCommunityProfile: mocks.ensureCommunityProfile,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      getUser: mocks.getUser,
      signOut: mocks.signOut,
    },
  })),
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createServiceClient,
}));

import { GET } from "@/app/auth/callback/route";
import { createSignInIntent } from "@/features/auth/sign-in-intent-security";

describe("OAuth callback origin-bound identity synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SHARE_TOKEN_PEPPER", "callback-test-pepper");
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.createServiceClient.mockReturnValue({ kind: "service" });
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          app_metadata: { provider: "google" },
          id: "auth-user-1",
          identities: [
            {
              id: "google-subject",
              identity_id: "identity-google",
              provider: "google",
              user_id: "auth-user-1",
            },
            {
              id: "kakao-subject",
              identity_id: "identity-kakao",
              provider: "kakao",
              user_id: "auth-user-1",
            },
          ],
        },
      },
    });
    mocks.ensureAccountForUser.mockResolvedValue({
      accountId: "account-1",
      ok: true,
    });
    mocks.persistAccountConsent.mockResolvedValue({ ok: true });
    mocks.ensureCommunityProfile.mockResolvedValue({ ok: true });
  });

  it("uses the signed return path, synchronizes all identities and clears the intent", async () => {
    const response = await GET(
      createRequest({ queryNext: "https://evil.example", returnPath: "/home" }),
    );
    const serverUser = (await mocks.getUser.mock.results[0]?.value).data.user;

    expect(mocks.ensureAccountForUser).toHaveBeenCalledWith(
      { kind: "service" },
      serverUser,
      { auditEvent: true },
    );
    expect(mocks.persistAccountConsent).toHaveBeenCalledWith(
      { kind: "service" },
      "account-1",
      expect.objectContaining({
        is14OrOlder: true,
        privacy: true,
        terms: true,
      }),
    );
    expect(response.headers.get("location")).toBe(
      "https://nuang.app/home?auth=connected",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "nuang-sign-in-intent=;",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("does not exchange a code without a valid intent", async () => {
    const response = await GET(
      new NextRequest("https://nuang.app/auth/callback?code=oauth-code"),
    );

    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://nuang.app/login?next=%2Fmy&auth=intent_missing",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("set-cookie")).toMatch(
      /nuang-sign-in-intent=;.*Max-Age=0/i,
    );
  });

  it("does not exchange a code on an origin mismatch", async () => {
    const response = await GET(
      createRequest({
        callbackOrigin: "https://nuang.app",
        initiatingOrigin: "http://localhost:3000",
      }),
    );

    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain("auth=origin_mismatch");
  });

  it("returns OAuth cancellation to login on the initiating origin", async () => {
    const response = await GET(
      createRequest({ code: null, error: "access_denied", returnPath: "/my" }),
    );

    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://nuang.app/login?next=%2Fmy&auth=oauth_cancelled",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("set-cookie")).toMatch(
      /nuang-sign-in-intent=;.*Max-Age=0/i,
    );
  });

  it("does not mutate either account when the resolver is ambiguous", async () => {
    mocks.ensureAccountForUser.mockResolvedValue({
      code: "account_conflict",
      ok: false,
    });

    const response = await GET(createRequest());

    expect(response.headers.get("location")).toBe(
      "https://nuang.app/login?next=%2Fhome&auth=identity_conflict",
    );
    expect(mocks.persistAccountConsent).not.toHaveBeenCalled();
    expect(mocks.ensureCommunityProfile).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("accepts a linked provider even when app metadata keeps another primary provider", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: {
        user: {
          app_metadata: { provider: "kakao" },
          id: "auth-user-1",
          identities: [{ provider: "google" }, { provider: "kakao" }],
        },
      },
    });

    const response = await GET(createRequest());

    expect(response.headers.get("location")).toContain("auth=connected");
    expect(mocks.ensureAccountForUser).toHaveBeenCalledOnce();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("fails closed for an unsupported provider identity", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: {
        user: {
          app_metadata: { provider: "kakao" },
          id: "auth-user-1",
          identities: [{ provider: "kakao" }],
        },
      },
    });

    const response = await GET(createRequest());

    expect(response.headers.get("location")).toBe(
      "https://nuang.app/login?next=%2Fhome&auth=identity_unsupported",
    );
    expect(mocks.ensureAccountForUser).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("clears the exchanged session when required consent is missing", async () => {
    const response = await GET(createRequest({ includeConsent: false }));

    expect(response.headers.get("location")).toBe(
      "https://nuang.app/login?next=%2Fhome&auth=consent_required",
    );
    expect(mocks.ensureAccountForUser).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("clears the exchanged session when consent persistence fails", async () => {
    mocks.persistAccountConsent.mockResolvedValueOnce({ ok: false });

    const response = await GET(createRequest());

    expect(response.headers.get("location")).toBe(
      "https://nuang.app/login?next=%2Fhome&auth=consent_error",
    );
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("keeps a valid session for retryable service or profile bootstrap failure", async () => {
    mocks.createServiceClient.mockReturnValueOnce(null);
    const serviceFailure = await GET(createRequest());
    expect(serviceFailure.headers.get("location")).toBe(
      "https://nuang.app/home?auth=env_missing",
    );
    expect(mocks.signOut).not.toHaveBeenCalled();

    mocks.ensureCommunityProfile.mockRejectedValueOnce(
      new Error("profile temporarily unavailable"),
    );
    const profileFailure = await GET(createRequest());
    expect(profileFailure.headers.get("location")).toContain("auth=connected");
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("reports a cleanup failure instead of showing a rejected session as connected", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: {
        user: {
          app_metadata: { provider: "kakao" },
          id: "auth-user-1",
          identities: [{ provider: "kakao" }],
        },
      },
    });
    mocks.signOut.mockResolvedValueOnce({ error: new Error("signout failed") });

    const response = await GET(createRequest());

    expect(response.headers.get("location")).toBe(
      "https://nuang.app/login?next=%2Fhome&auth=session_cleanup_error",
    );
    expect(mocks.ensureAccountForUser).not.toHaveBeenCalled();
  });

  it("makes a sequential callback replay fail before account writes", async () => {
    const first = await GET(createRequest());
    const replay = await GET(
      new NextRequest("https://nuang.app/auth/callback?code=oauth-code"),
    );

    expect(first.headers.get("location")).toContain("auth=connected");
    expect(replay.headers.get("location")).toContain("auth=intent_missing");
    expect(mocks.ensureAccountForUser).toHaveBeenCalledTimes(1);
  });
});

function createRequest({
  callbackOrigin = "https://nuang.app",
  code = "oauth-code",
  error,
  includeConsent = true,
  initiatingOrigin = "https://nuang.app",
  queryNext,
  returnPath = "/home",
}: {
  callbackOrigin?: string;
  code?: null | string;
  error?: string;
  includeConsent?: boolean;
  initiatingOrigin?: "http://localhost:3000" | "https://nuang.app";
  queryNext?: string;
  returnPath?: string;
} = {}) {
  const consent = encodeURIComponent(
    JSON.stringify({
      analytics: false,
      is14OrOlder: true,
      marketing: false,
      privacy: true,
      terms: true,
    }),
  );
  const intent = createSignInIntent({
    initiatingOrigin,
    provider: "google",
    returnPath,
  });
  const url = new URL("/auth/callback", callbackOrigin);
  if (code) url.searchParams.set("code", code);
  if (error) url.searchParams.set("error", error);
  if (queryNext) url.searchParams.set("next", queryNext);

  return new NextRequest(url, {
    headers: {
      cookie: [
        includeConsent ? `nuang-consent-intent=${consent}` : null,
        `nuang-sign-in-intent=${intent.token}`,
      ]
        .filter(Boolean)
        .join("; "),
    },
  });
}
