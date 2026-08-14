import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServiceClient: vi.fn(),
  ensureAccountForUser: vi.fn(),
  ensureCommunityProfile: vi.fn(),
  persistAccountConsent: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("@/features/account/server-writes", () => ({
  ensureAccountForUser: mocks.ensureAccountForUser,
  persistAccountConsent: mocks.persistAccountConsent,
}));
vi.mock("@/features/account/server-community-profile", () => ({
  ensureCommunityProfile: mocks.ensureCommunityProfile,
}));
vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

import { POST } from "./route";

describe("POST /api/mobile/auth/finalize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseServiceClient.mockReturnValue({ service: true });
    mocks.requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      user: { id: "auth-user-1", identities: [{ provider: "kakao" }] },
    });
    mocks.ensureAccountForUser.mockResolvedValue({
      accountId: "account-1",
      ok: true,
    });
    mocks.persistAccountConsent.mockResolvedValue({ ok: true });
    mocks.ensureCommunityProfile.mockResolvedValue({ ok: true });
  });

  it("persists the same mandatory and optional consent contract as web OAuth", async () => {
    const consent = {
      analytics: true,
      is14OrOlder: true,
      marketing: false,
      privacy: true,
      terms: true,
    };
    const request = createRequest({ consent, provider: "kakao" });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      accountId: "account-1",
      ok: true,
    });
    expect(mocks.requireAuthenticatedUser).toHaveBeenCalledWith(request);
    expect(mocks.persistAccountConsent).toHaveBeenCalledWith(
      { service: true },
      "account-1",
      consent,
    );
  });

  it("rejects missing age or required policy consent before account creation", async () => {
    const response = await POST(
      createRequest({
        consent: {
          analytics: false,
          is14OrOlder: false,
          marketing: false,
          privacy: true,
          terms: true,
        },
        provider: "kakao",
      }),
    );

    expect(response.status).toBe(422);
    expect(mocks.requireAuthenticatedUser).not.toHaveBeenCalled();
    expect(mocks.ensureAccountForUser).not.toHaveBeenCalled();
  });

  it("hard-blocks deferred Apple before authentication or account writes", async () => {
    const response = await POST(
      createRequest({ consent: validConsent, provider: "apple" }),
    );

    expect(response.status).toBe(422);
    expect(mocks.requireAuthenticatedUser).not.toHaveBeenCalled();
    expect(mocks.ensureAccountForUser).not.toHaveBeenCalled();
    expect(mocks.persistAccountConsent).not.toHaveBeenCalled();
    expect(mocks.ensureCommunityProfile).not.toHaveBeenCalled();
  });

  it("rejects a callback completed by a different provider", async () => {
    const response = await POST(
      createRequest({
        consent: validConsent,
        provider: "google",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "provider_mismatch",
      ok: false,
    });
    expect(mocks.ensureAccountForUser).not.toHaveBeenCalled();
  });
});

const validConsent = {
  analytics: false,
  is14OrOlder: true,
  marketing: false,
  privacy: true,
  terms: true,
};

function createRequest(body: unknown) {
  return new Request("https://nuang.app/api/mobile/auth/finalize", {
    body: JSON.stringify(body),
    headers: {
      authorization: "Bearer header.payload.signature",
      "content-type": "application/json",
    },
    method: "POST",
  });
}
