import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
  headers: vi.fn(),
  readAccountAccessStatus: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));
vi.mock("@/features/auth/server-account-access", () => ({
  readAccountAccessStatus: mocks.readAccountAccessStatus,
}));

import { requireAuthenticatedUser } from "./server-auth";

describe("requireAuthenticatedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers());
    mocks.createSupabaseServiceClient.mockReturnValue({ service: true });
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
    });
  });

  it("allows an active account", async () => {
    mocks.readAccountAccessStatus.mockResolvedValue({
      ok: true,
      status: "active",
    });

    const result = await requireAuthenticatedUser();

    expect(result.ok).toBe(true);
    expect(result.ok && result.user.id).toBe("user-1");
  });

  it("blocks a suspended account from every authenticated write route", async () => {
    mocks.readAccountAccessStatus.mockResolvedValue({
      ok: true,
      status: "suspended",
    });

    const result = await requireAuthenticatedUser();

    expect(result.ok).toBe(false);
    expect(!result.ok && result.response.status).toBe(403);
    await expect(!result.ok && result.response.json()).resolves.toMatchObject({
      error: "account_suspended",
    });
  });

  it("allows a newly authenticated user before the identity row is created", async () => {
    mocks.readAccountAccessStatus.mockResolvedValue({
      ok: true,
      status: "new",
    });

    const result = await requireAuthenticatedUser();

    expect(result.ok).toBe(true);
  });

  it("fails closed when one auth user is mapped to multiple accounts", async () => {
    mocks.readAccountAccessStatus.mockResolvedValue({
      ok: true,
      status: "conflict",
    });

    const result = await requireAuthenticatedUser();

    expect(result.ok).toBe(false);
    expect(!result.ok && result.response.status).toBe(409);
    await expect(!result.ok && result.response.json()).resolves.toMatchObject({
      error: "identity_conflict",
    });
  });

  it("validates a native Bearer JWT without falling back to browser cookies", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "mobile-user-1" } },
      error: null,
    });
    mocks.createServerSupabaseClient.mockResolvedValue({ auth: { getUser } });
    mocks.readAccountAccessStatus.mockResolvedValue({
      ok: true,
      status: "active",
    });
    const token = "header.payload.signature";

    const result = await requireAuthenticatedUser(
      new Request("https://nuang.app/api/account-results", {
        headers: { authorization: `Bearer ${token}` },
      }),
    );

    expect(mocks.createServerSupabaseClient).toHaveBeenCalledWith({
      accessToken: token,
    });
    expect(getUser).toHaveBeenCalledWith(token);
    expect(result.ok && result.authSource).toBe("bearer");
  });

  it("rejects malformed Bearer credentials before touching a cookie session", async () => {
    const result = await requireAuthenticatedUser(
      new Request("https://nuang.app/api/account-results", {
        headers: { authorization: "Bearer not-a-jwt" },
      }),
    );

    expect(result.ok).toBe(false);
    expect(!result.ok && result.response.status).toBe(401);
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("rejects a changed browser user before reading any account state", async () => {
    const request = new Request("https://nuang.app/api/account-results", {
      headers: { "x-nuang-auth-user-id": "user-before-switch" },
    });

    const result = await requireAuthenticatedUser(request, {
      expectedSupabaseUserId: request.headers.get("x-nuang-auth-user-id"),
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.response.status).toBe(409);
    await expect(!result.ok && result.response.json()).resolves.toMatchObject({
      authUserId: "user-1",
      error: "auth_scope_changed",
      ok: false,
    });
    expect(mocks.createSupabaseServiceClient).not.toHaveBeenCalled();
    expect(mocks.readAccountAccessStatus).not.toHaveBeenCalled();
  });
});
