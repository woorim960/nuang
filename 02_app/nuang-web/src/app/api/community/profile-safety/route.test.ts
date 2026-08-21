import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/community/profile-safety/route";

const mocks = vi.hoisted(() => ({
  createSupabaseServiceClient: vi.fn(),
  isAllowedGateCRequest: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  writeProfileSafetyAction: vi.fn(),
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/features/feed/server-community-social", () => ({
  writeProfileSafetyAction: mocks.writeProfileSafetyAction,
}));

vi.mock("@/features/research/gate-c/gate-c-server-security", () => ({
  isAllowedGateCRequest: mocks.isAllowedGateCRequest,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

describe("community profile safety API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAllowedGateCRequest.mockReturnValue(true);
    mocks.requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      user: { id: "user-1" },
    });
    mocks.createSupabaseServiceClient.mockReturnValue({ service: true });
    mocks.writeProfileSafetyAction.mockResolvedValue({
      code: "profile_action_unavailable",
      ok: false,
    });
  });

  it.each([
    { action: "block" as const },
    { action: "report" as const, reason: "spam" as const },
  ])("returns an explicit 409 for unavailable $action", async (payload) => {
    const publicSnapshotId = "11111111-1111-4111-8111-111111111111";

    const response = await POST(
      new Request("http://localhost/api/community/profile-safety", {
        body: JSON.stringify({ ...payload, publicSnapshotId }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: "profile_action_unavailable",
      message: "이 일반 프로필에서는 아직 신고·차단 기능을 사용할 수 없어요.",
      ok: false,
    });
    expect(mocks.writeProfileSafetyAction).toHaveBeenCalledWith({
      ...payload,
      client: { service: true },
      publicSnapshotId,
      user: { id: "user-1" },
    });
  });

  it("forwards the canonical profile id for stable safety mutations", async () => {
    mocks.writeProfileSafetyAction.mockResolvedValue({
      data: { blocked: true },
      ok: true,
    });
    const communityProfileId = "22222222-2222-4222-8222-222222222222";
    const publicSnapshotId = "11111111-1111-4111-8111-111111111111";

    const response = await POST(
      new Request("http://localhost/api/community/profile-safety", {
        body: JSON.stringify({
          action: "block",
          communityProfileId,
          publicSnapshotId,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.writeProfileSafetyAction).toHaveBeenCalledWith({
      action: "block",
      client: { service: true },
      communityProfileId,
      publicSnapshotId,
      user: { id: "user-1" },
    });
  });
});
