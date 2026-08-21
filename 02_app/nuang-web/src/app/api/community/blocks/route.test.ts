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
    const blockedProfile = {
      blockedAccountId: "11111111-1111-4111-8111-111111111111",
      blockedAt: "2026-08-20T00:00:00.000Z",
      code: null,
      communityProfileId: "33333333-3333-4333-8333-333333333333",
      displayName: "차단한 사용자",
      profileImage: {
        alt: "차단한 사용자 프로필 이미지",
        source: "character",
        src: "/assets/characters/nuang-character-purple.webp",
      },
      profileName: null,
      publicSnapshotId: "22222222-2222-4222-8222-222222222222",
    };
    mocks.readBlockedProfiles.mockResolvedValue({
      blockedProfiles: [blockedProfile],
      ok: true,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      blockedProfiles: [blockedProfile],
      ok: true,
    });
    expect(JSON.stringify(body)).not.toContain("INGMC");
    expect(JSON.stringify(body)).not.toContain("/legacy/INGMC.webp");
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

  it("forwards the canonical community profile id for v2 unblock", async () => {
    mocks.unblockProfileByAccountId.mockResolvedValue({ ok: true });
    const blockedAccountId = "11111111-1111-4111-8111-111111111111";
    const communityProfileId = "33333333-3333-4333-8333-333333333333";

    const response = await DELETE(
      new Request("http://localhost/api/community/blocks", {
        body: JSON.stringify({ blockedAccountId, communityProfileId }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.unblockProfileByAccountId).toHaveBeenCalledWith({
      blockedAccountId,
      client: {},
      communityProfileId,
      user: { id: "user-1" },
    });
  });
});
