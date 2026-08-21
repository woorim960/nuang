import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/community/follow/route";

const mocks = vi.hoisted(() => ({
  createSupabaseServiceClient: vi.fn(),
  isAllowedGateCRequest: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  writeProfileFollow: vi.fn(),
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/features/feed/server-community-social", () => ({
  writeProfileFollow: mocks.writeProfileFollow,
}));

vi.mock("@/features/research/gate-c/gate-c-server-security", () => ({
  isAllowedGateCRequest: mocks.isAllowedGateCRequest,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

describe("community follow API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAllowedGateCRequest.mockReturnValue(true);
    mocks.requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      user: { id: "user-1" },
    });
    mocks.createSupabaseServiceClient.mockReturnValue({ service: true });
  });

  it("returns an explicit 409 when a general profile cannot be followed", async () => {
    mocks.writeProfileFollow.mockResolvedValue({
      code: "profile_action_unavailable",
      ok: false,
    });
    const publicSnapshotId = "11111111-1111-4111-8111-111111111111";

    const response = await POST(
      new Request("http://localhost/api/community/follow", {
        body: JSON.stringify({ action: "follow", publicSnapshotId }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: "profile_action_unavailable",
      message: "이 일반 프로필에서는 아직 팔로우 기능을 사용할 수 없어요.",
      ok: false,
    });
    expect(mocks.writeProfileFollow).toHaveBeenCalledWith({
      action: "follow",
      client: { service: true },
      publicSnapshotId,
      user: { id: "user-1" },
    });
  });

  it("forwards the canonical profile id while preserving snapshot compatibility", async () => {
    mocks.writeProfileFollow.mockResolvedValue({
      data: { followerCount: 2, following: true },
      ok: true,
    });
    const communityProfileId = "22222222-2222-4222-8222-222222222222";
    const publicSnapshotId = "11111111-1111-4111-8111-111111111111";

    const response = await POST(
      new Request("http://localhost/api/community/follow", {
        body: JSON.stringify({
          action: "follow",
          communityProfileId,
          publicSnapshotId,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.writeProfileFollow).toHaveBeenCalledWith({
      action: "follow",
      client: { service: true },
      communityProfileId,
      publicSnapshotId,
      user: { id: "user-1" },
    });
  });
});
