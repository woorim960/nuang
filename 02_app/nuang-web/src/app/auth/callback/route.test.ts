import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureAccountForUser: vi.fn(),
  ensureCommunityProfile: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  persistAccountConsent: vi.fn(),
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
    },
  })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => ({ kind: "service" })),
}));

import { GET } from "@/app/auth/callback/route";

describe("OAuth callback identity synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
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

  it("audits and synchronizes the full server user before completing sign-in", async () => {
    const response = await GET(createRequest());
    const serverUser = (await mocks.getUser.mock.results[0]?.value).data.user;

    expect(mocks.ensureAccountForUser).toHaveBeenCalledWith(
      { kind: "service" },
      serverUser,
      { auditEvent: true },
    );
    expect(mocks.persistAccountConsent).toHaveBeenCalledWith(
      { kind: "service" },
      "account-1",
      expect.objectContaining({ is14OrOlder: true, privacy: true, terms: true }),
    );
    expect(response.headers.get("location")).toBe(
      "https://nuang.app/home?auth=connected",
    );
  });

  it("does not choose or mutate either account when the resolver is ambiguous", async () => {
    mocks.ensureAccountForUser.mockResolvedValue({
      code: "account_conflict",
      ok: false,
    });

    const response = await GET(createRequest());

    expect(response.headers.get("location")).toBe(
      "https://nuang.app/home?auth=identity_conflict",
    );
    expect(mocks.persistAccountConsent).not.toHaveBeenCalled();
    expect(mocks.ensureCommunityProfile).not.toHaveBeenCalled();
  });

  it("fails closed for an unsupported or malformed provider identity", async () => {
    mocks.ensureAccountForUser.mockResolvedValue({
      code: "provider_not_allowed",
      ok: false,
    });

    const response = await GET(createRequest());

    expect(response.headers.get("location")).toBe(
      "https://nuang.app/home?auth=identity_unsupported",
    );
    expect(mocks.persistAccountConsent).not.toHaveBeenCalled();
  });
});

function createRequest() {
  const consent = encodeURIComponent(
    JSON.stringify({
      analytics: false,
      is14OrOlder: true,
      marketing: false,
      privacy: true,
      terms: true,
    }),
  );

  return new NextRequest(
    "https://nuang.app/auth/callback?code=oauth-code&next=/home",
    { headers: { cookie: `nuang-consent-intent=${consent}` } },
  );
}
