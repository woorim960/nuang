import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureAccount: vi.fn(),
  persistConsent: vi.fn(),
  requireAuth: vi.fn(),
  serviceClient: vi.fn(),
}));

vi.mock("@/features/account/server-writes", () => ({
  ensureAccountForUser: mocks.ensureAccount,
  persistAccountConsent: mocks.persistConsent,
}));
vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuth,
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.serviceClient,
}));

import { POST } from "@/app/api/me/required-consents/route";

describe("POST /api/me/required-consents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      ok: true,
      user: { id: "auth-user-1" },
    });
    mocks.serviceClient.mockReturnValue({ marker: "service-client" });
    mocks.ensureAccount.mockResolvedValue({
      accountId: "account-1",
      ok: true,
    });
    mocks.persistConsent.mockResolvedValue({ ok: true });
  });

  it("persists current required consent for the authenticated account", async () => {
    const request = createRequest(validRequiredConsent);
    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      accountId: "account-1",
      ok: true,
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireAuth).toHaveBeenCalledWith(request);
    expect(mocks.persistConsent).toHaveBeenCalledWith(
      { marker: "service-client" },
      "account-1",
      {
        analytics: false,
        is14OrOlder: true,
        marketing: false,
        privacy: true,
        terms: true,
      },
    );
  });

  it("rejects a missing declaration before auth or persistence", async () => {
    const response = await POST(
      createRequest({ ...validRequiredConsent, privacy: false }),
    );

    expect(response.status).toBe(422);
    expect(mocks.requireAuth).not.toHaveBeenCalled();
    expect(mocks.persistConsent).not.toHaveBeenCalled();
  });

  it("returns the auth challenge without touching account consent", async () => {
    mocks.requireAuth.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: "unauthenticated" },
        { status: 401 },
      ),
    });

    const response = await POST(createRequest(validRequiredConsent));

    expect(response.status).toBe(401);
    expect(mocks.ensureAccount).not.toHaveBeenCalled();
    expect(mocks.persistConsent).not.toHaveBeenCalled();
  });

  it("rejects cross-site mutation before parsing or auth", async () => {
    const response = await POST(
      createRequest(validRequiredConsent, {
        origin: "https://malicious.example",
        "sec-fetch-site": "cross-site",
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.requireAuth).not.toHaveBeenCalled();
    expect(mocks.persistConsent).not.toHaveBeenCalled();
  });
});

const validRequiredConsent = {
  is14OrOlder: true,
  privacy: true,
  terms: true,
};

function createRequest(
  body: unknown,
  extraHeaders: Record<string, string> = {},
) {
  return new Request("https://nuang.app/api/me/required-consents", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      origin: "https://nuang.app",
      "sec-fetch-site": "same-origin",
      ...extraHeaders,
    },
    method: "POST",
  });
}
