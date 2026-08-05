import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServiceClient: vi.fn(),
  deleteOwnAccount: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/features/account/server-account-deletion", () => ({
  deleteOwnAccount: mocks.deleteOwnAccount,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

import { DELETE } from "@/app/api/account/route";

describe("DELETE /api/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      user: { id: "auth-user" },
    });
    mocks.createSupabaseServiceClient.mockReturnValue({ service: true });
    mocks.deleteOwnAccount.mockResolvedValue({ ok: true });
  });

  it("requires the exact destructive confirmation phrase", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/account", {
        body: JSON.stringify({ confirmation: "삭제" }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(422);
    expect(mocks.deleteOwnAccount).not.toHaveBeenCalled();
  });

  it("deletes only the authenticated member's linked account", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/account", {
        body: JSON.stringify({ confirmation: "계정 삭제" }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.deleteOwnAccount).toHaveBeenCalledWith({
      client: { service: true },
      user: { id: "auth-user" },
    });
  });

  it("fails closed when identity ownership cannot be confirmed", async () => {
    mocks.deleteOwnAccount.mockResolvedValue({
      code: "account_link_missing",
      ok: false,
    });

    const response = await DELETE(
      new Request("http://localhost/api/account", {
        body: JSON.stringify({ confirmation: "계정 삭제" }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(403);
  });

  it("returns 503 when media cleanup fails and never reports success", async () => {
    mocks.deleteOwnAccount.mockResolvedValue({
      code: "media_cleanup_failed",
      ok: false,
    });

    const response = await DELETE(
      new Request("http://localhost/api/account", {
        body: JSON.stringify({ confirmation: "계정 삭제" }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: "media_cleanup_failed",
      message: "업로드한 사진을 안전하게 정리하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      ok: false,
    });
  });
});
