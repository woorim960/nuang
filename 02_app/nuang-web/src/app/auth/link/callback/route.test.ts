import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consume: vi.fn(),
  exchange: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/features/auth/server-linked-identities", () => ({
  consumeIdentityLinkIntent: mocks.consume,
}));
vi.mock("@/lib/supabase/env", () => ({
  getAppOrigin: () => "https://nuang.app",
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      exchangeCodeForSession: mocks.exchange,
      getUser: mocks.getUser,
    },
  }),
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({ service: true }),
}));

import { GET } from "@/app/auth/link/callback/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.exchange.mockResolvedValue({ error: null });
  mocks.getUser.mockResolvedValue({
    data: {
      user: {
        app_metadata: { provider: "google" },
        id: "11111111-1111-4111-8111-111111111111",
        identities: [],
      },
    },
    error: null,
  });
  mocks.consume.mockResolvedValue({
    data: {
      accountId: "22222222-2222-4222-8222-222222222222",
      provider: "google",
      returnPath: "/my/settings/account",
    },
    ok: true,
  });
});

describe("GET /auth/link/callback", () => {
  it("consumes only the HttpOnly-bound intent and clears it after success", async () => {
    const request = new NextRequest(
      "https://nuang.app/auth/link/callback?code=oauth-code&next=%2Fmy%2Fsettings%2Faccount",
      {
        headers: {
          cookie: "nuang-identity-link-intent=opaque-cookie-token",
        },
      },
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://nuang.app/my/settings/account?link=connected&provider=google",
    );
    expect(mocks.consume).toHaveBeenCalledWith(
      expect.objectContaining({ token: "opaque-cookie-token" }),
    );
    expect(response.headers.get("set-cookie")).toMatch(
      /nuang-identity-link-intent=;.*Max-Age=0/i,
    );
  });

  it("does not exchange an OAuth code when the account-bound intent is absent", async () => {
    const response = await GET(
      new NextRequest(
        "https://nuang.app/auth/link/callback?code=oauth-code&next=%2Fmy%2Fsettings%2Faccount",
      ),
    );

    expect(response.headers.get("location")).toContain("link=expired");
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
});
