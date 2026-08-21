import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCommunityProfileEditorPayload: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
  ensureCommunityProfile: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

vi.mock("@/features/account/server-community-profile", () => ({
  createCommunityProfileEditorPayload:
    mocks.createCommunityProfileEditorPayload,
  ensureCommunityProfile: mocks.ensureCommunityProfile,
}));

import { GET } from "@/app/api/profile-visibility/route";

describe("profile visibility API containment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      user: { id: "supabase-user" },
    });
    mocks.createSupabaseServiceClient.mockReturnValue({});
    mocks.ensureCommunityProfile.mockResolvedValue({
      accountId: "10000000-0000-4000-8000-000000000001",
      codeVisibility: "public",
      comparisonEnabled: true,
      detailVisibility: "public",
      displayName: "여름",
      id: "20000000-0000-4000-8000-000000000001",
      revision: 3,
    });
    mocks.createCommunityProfileEditorPayload.mockResolvedValue({
      code: null,
      displayName: "여름",
      profileName: null,
      publicId: "20000000-0000-4000-8000-000000000001",
    });
  });

  it("keeps visibility controls while returning no contained core identity", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      visibility: {
        code: null,
        codeVisible: true,
        comparisonEnabled: true,
        detailsVisible: true,
        displayName: "여름",
        profileName: null,
        publicId: "20000000-0000-4000-8000-000000000001",
        revision: 3,
      },
    });
    expect(JSON.stringify(body)).not.toContain("INGMC");
    expect(JSON.stringify(body)).not.toContain("새 가능성을 찾는 탐험가");
  });
});
