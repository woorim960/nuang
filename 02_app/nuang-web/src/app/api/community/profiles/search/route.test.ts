import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  searchServerPublicProfiles: vi.fn(),
}));

vi.mock("@/features/public-profile/server-public-profile-search", () => ({
  searchServerPublicProfiles: mocks.searchServerPublicProfiles,
}));

import { GET } from "@/app/api/community/profiles/search/route";

describe("GET /api/community/profiles/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a short query before accessing the profile store", async () => {
    const response = await GET(
      new NextRequest(
        "https://nuang.example/api/community/profiles/search?q=E",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body).toMatchObject({ code: "invalid_query", ok: false });
    expect(mocks.searchServerPublicProfiles).not.toHaveBeenCalled();
  });

  it("returns only the public profile search projection", async () => {
    mocks.searchServerPublicProfiles.mockResolvedValue({
      ok: true,
      profiles: [
        {
          code: "ENAKQ",
          comparisonAvailable: true,
          displayName: "여름",
          handle: "summer.day",
          profileImage: {
            alt: "여름 프로필 이미지",
            motif: "purple",
            source: "character",
            src: "/assets/characters/nuang-character-purple.webp",
          },
          profileMessage: "산책을 좋아해요.",
          publicProfileId: "24000000-0000-4000-8000-000000000003",
          publicSnapshotId: "34000000-0000-4000-8000-000000000003",
          roleName: "관계를 여는 지휘자",
        },
      ],
    });

    const response = await GET(
      new NextRequest(
        "https://nuang.example/api/community/profiles/search?q=%EC%97%AC%EB%A6%84",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.searchServerPublicProfiles).toHaveBeenCalledWith("여름");
    expect(body.profiles[0]).toEqual(
      expect.objectContaining({
        displayName: "여름",
        publicProfileId: expect.any(String),
      }),
    );
    expect(body.profiles[0]).not.toHaveProperty("accountId");
    expect(body.profiles[0]).not.toHaveProperty("email");
  });

  it("returns a retryable response when profile search is unavailable", async () => {
    mocks.searchServerPublicProfiles.mockResolvedValue({
      code: "search_unavailable",
      ok: false,
    });

    const response = await GET(
      new NextRequest(
        "https://nuang.example/api/community/profiles/search?q=%EC%97%AC%EB%A6%84",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      code: "search_unavailable",
      ok: false,
    });
  });
});
