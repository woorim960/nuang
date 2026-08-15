import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/feed/route";
import { uploadFeedPostMedia } from "@/features/feed/feed-media-server";
import { createFeedCreateRequestHash } from "@/features/feed/server-feed-request-idempotency";
import { writeFeedRequestForAccount } from "@/features/feed/server-writes";

const routeMocks = vi.hoisted(() => ({
  events: [] as string[],
  serviceClient: { kind: "service-client" },
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(() => routeMocks.events.push("revalidate")),
}));

vi.mock("@/features/research/gate-c/gate-c-server-security", () => ({
  isAllowedGateCRequest: vi.fn(() => true),
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: vi.fn(async () => ({
    ok: true,
    user: { id: "auth-user-001" },
  })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => routeMocks.serviceClient),
}));

vi.mock("@/features/feed/server-read", () => ({
  communityFeedCacheTag: "community-feed",
  createServerFeedReadPayload: vi.fn(),
}));

vi.mock("@/features/feed/server-feed-request-idempotency", () => ({
  createFeedCreateRequestHash: vi.fn(async () => "a".repeat(64)),
}));

vi.mock("@/features/feed/server-writes", () => ({
  writeFeedRequestForAccount: vi.fn(async () => {
    routeMocks.events.push("write");
    return {
      data: {
        action: "create_post",
        id: "22222222-2222-4222-8222-222222222222",
        mediaUploadState: "pending",
        moderationStatus: "published",
        targetType: "feed_post",
      },
      ok: true,
    };
  }),
}));

vi.mock("@/features/feed/feed-media-server", () => ({
  cleanupDeletedFeedPostMedia: vi.fn(),
  uploadFeedPostMedia: vi.fn(async () => {
    routeMocks.events.push("upload");
    return { ok: true };
  }),
}));

describe("feed photo post route", () => {
  afterEach(() => {
    routeMocks.events.length = 0;
    vi.clearAllMocks();
  });

  it("hashes, hides, uploads, then publishes a new photo post", async () => {
    const response = await POST(createPhotoPostRequest());

    expect(response.status).toBe(200);
    expect(createFeedCreateRequestHash).toHaveBeenCalledWith(
      expect.objectContaining({
        files: [expect.any(File)],
        payload: expect.objectContaining({
          clientRequestId: "feed-photo-request-001",
        }),
      }),
    );
    expect(writeFeedRequestForAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        clientRequestHash: "a".repeat(64),
        deferMediaPublication: true,
      }),
    );
    expect(uploadFeedPostMedia).toHaveBeenCalledOnce();
    expect(routeMocks.events).toEqual(["write", "upload", "revalidate"]);
  });

  it("does not upload the photos again after an identical committed retry", async () => {
    vi.mocked(writeFeedRequestForAccount).mockImplementationOnce(async () => {
      routeMocks.events.push("write");
      return {
        data: {
          action: "create_post",
          id: "22222222-2222-4222-8222-222222222222",
          mediaUploadState: "ready",
          moderationStatus: "published",
          requestReused: true,
          targetType: "feed_post",
        },
        ok: true,
      };
    });

    const response = await POST(createPhotoPostRequest());

    expect(response.status).toBe(200);
    expect(uploadFeedPostMedia).not.toHaveBeenCalled();
    expect(routeMocks.events).toEqual(["write", "revalidate"]);
  });

  it("never lets a reused pending request enter a competing media upload", async () => {
    vi.mocked(writeFeedRequestForAccount).mockImplementationOnce(async () => {
      routeMocks.events.push("write");
      return {
        data: {
          action: "create_post",
          id: "22222222-2222-4222-8222-222222222222",
          mediaUploadState: "pending",
          moderationStatus: "published",
          requestReused: true,
          targetType: "feed_post",
        },
        ok: true,
      };
    });

    const response = await POST(createPhotoPostRequest());

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "feed_media_upload_in_progress",
      retryable: true,
    });
    expect(uploadFeedPostMedia).not.toHaveBeenCalled();
    expect(routeMocks.events).toEqual(["write"]);
  });

  it("does not create a post when request hashing cannot read a photo", async () => {
    vi.mocked(createFeedCreateRequestHash).mockRejectedValueOnce(
      new Error("unreadable photo"),
    );

    const response = await POST(createPhotoPostRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "feed_media_processing_failed",
      ok: false,
    });
    expect(writeFeedRequestForAccount).not.toHaveBeenCalled();
    expect(uploadFeedPostMedia).not.toHaveBeenCalled();
  });

  it("does not apply free-writing idempotency to dependent poll posts", async () => {
    const response = await POST(createPhotoPostRequest("balance_game"));

    expect(response.status).toBe(200);
    expect(createFeedCreateRequestHash).not.toHaveBeenCalled();
    expect(writeFeedRequestForAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        clientRequestHash: undefined,
        deferMediaPublication: true,
      }),
    );
  });

  it("does not hash a text-only free-writing request", async () => {
    const response = await POST(
      new Request("http://localhost/api/feed", {
        body: JSON.stringify({
          action: "create_post",
          body: "사진 없는 글이에요.",
          clientRequestId: "feed-text-request-001",
          source: "free_text",
          visibility: "public",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(createFeedCreateRequestHash).not.toHaveBeenCalled();
    expect(writeFeedRequestForAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        clientRequestHash: undefined,
        deferMediaPublication: false,
      }),
    );
    expect(uploadFeedPostMedia).not.toHaveBeenCalled();
  });
});

function createPhotoPostRequest(source = "free_text") {
  const formData = new FormData();
  formData.set(
    "payload",
    JSON.stringify({
      action: "create_post",
      body: "사진과 함께 올려요.",
      clientRequestId: "feed-photo-request-001",
      source,
      visibility: "public",
    }),
  );
  formData.append(
    "media",
    new File([new Uint8Array([1, 2, 3])], "photo.webp", {
      type: "image/webp",
    }),
  );

  return {
    formData: async () => formData,
    headers: new Headers({
      "content-type": "multipart/form-data; boundary=test",
    }),
  } as Request;
}
