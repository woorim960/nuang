import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET } from "@/app/api/community/blocks/route";

const mocks = vi.hoisted(() => ({
  createSupabaseServiceClient: vi.fn(),
  readBlockedProfiles: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  unblockProfileByAccountId: vi.fn(),
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/features/account/server-blocked-profiles", () => ({
  readBlockedProfiles: mocks.readBlockedProfiles,
  unblockProfileByAccountId: mocks.unblockProfileByAccountId,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

describe("community blocks API", () => {
  beforeEach(() => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      user: { id: "user-1" },
    });
    mocks.createSupabaseServiceClient.mockReturnValue({});
  });

  it("returns the current account's blocked profiles", async () => {
    mocks.readBlockedProfiles.mockResolvedValue({
      blockedProfiles: [],
      ok: true,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      blockedProfiles: [],
      ok: true,
    });
    expect(mocks.readBlockedProfiles).toHaveBeenCalledWith({
      client: {},
      user: { id: "user-1" },
    });
  });

  it("unblocks by stable account id even if the old profile snapshot changed", async () => {
    mocks.unblockProfileByAccountId.mockResolvedValue({ ok: true });
    const blockedAccountId = "11111111-1111-4111-8111-111111111111";

    const response = await DELETE(
      new Request("http://localhost/api/community/blocks", {
        body: JSON.stringify({ blockedAccountId }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.unblockProfileByAccountId).toHaveBeenCalledWith({
      blockedAccountId,
      client: {},
      user: { id: "user-1" },
    });
  });
});
