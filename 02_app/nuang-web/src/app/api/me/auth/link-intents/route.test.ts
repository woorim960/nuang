import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createIntent: vi.fn(),
  requireAuth: vi.fn(),
  resolveAccount: vi.fn(),
  serviceClient: {},
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuth,
}));
vi.mock("@/features/auth/server-linked-identities", () => ({
  createIdentityLinkIntent: mocks.createIntent,
  resolveSingleAccountForAuthUser: mocks.resolveAccount,
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => mocks.serviceClient,
}));

import { POST } from "@/app/api/me/auth/link-intents/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAuth.mockResolvedValue({
    ok: true,
    supabase: {},
    user: { id: "11111111-1111-4111-8111-111111111111" },
  });
  mocks.resolveAccount.mockResolvedValue({
    accountId: "22222222-2222-4222-8222-222222222222",
    ok: true,
  });
  mocks.createIntent.mockResolvedValue({
    data: {
      cookieToken: "33333333-3333-4333-8333-333333333333.private-secret",
      expiresAt: "2026-08-02T01:10:00.000Z",
      provider: "google",
      redirectTo:
        "https://nuang.app/auth/link/callback?next=%2Fmy%2Fsettings%2Faccount",
    },
    ok: true,
  });
});

describe("POST /api/me/auth/link-intents", () => {
  it("keeps the one-time nonce in an HttpOnly callback cookie", async () => {
    const response = await POST(
      new Request("https://nuang.app/api/me/auth/link-intents", {
        body: JSON.stringify({
          provider: "google",
          returnPath: "/my/settings/account",
        }),
        headers: {
          "content-type": "application/json",
          origin: "https://nuang.app",
          "sec-fetch-site": "same-origin",
        },
        method: "POST",
      }),
    );
    const payload = await response.json();
    const serialized = JSON.stringify(payload);

    expect(response.status).toBe(200);
    expect(serialized).not.toContain("private-secret");
    expect(serialized).not.toContain("intentToken");
    expect(payload.link.redirectTo).not.toContain("intent=");
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("nuang-identity-link-intent=");
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/auth\/link\/callback/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it("rejects cross-site intent creation before reading the account", async () => {
    const response = await POST(
      new Request("https://nuang.app/api/me/auth/link-intents", {
        body: JSON.stringify({ provider: "google" }),
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.example",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.requireAuth).not.toHaveBeenCalled();
    expect(mocks.createIntent).not.toHaveBeenCalled();
  });
});
