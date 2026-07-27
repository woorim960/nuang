import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
  readAccountAccessStatus: vi.fn(),
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
});
