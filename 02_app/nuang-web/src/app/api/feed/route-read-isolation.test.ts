import { describe, expect, it, vi } from "vitest";

const feedReadMocks = vi.hoisted(() => ({
  createServerFeedReadPayload: vi.fn(async () => ({ items: [] })),
}));

vi.mock("@/features/feed/server-read", () => ({
  communityFeedCacheTag: "community-feed",
  createServerFeedReadPayload: feedReadMocks.createServerFeedReadPayload,
}));

vi.mock("@/features/feed/feed-media-server", () => {
  throw new Error("GET must not initialize the native image runtime");
});

describe("GET /api/feed dependency isolation", () => {
  it("serves public reads without loading the POST-only image runtime", async () => {
    const { GET } = await import("./route");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("server-timing")).toMatch(/^app;dur=\d+\.\d$/);
    expect(feedReadMocks.createServerFeedReadPayload).toHaveBeenCalledOnce();
  });
});
