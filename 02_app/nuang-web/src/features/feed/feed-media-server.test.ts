import type { SupabaseClient, User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OptimizedFeedMediaImage } from "@/features/feed/feed-media-image-optimizer";
import type { FeedMediaR2Adapter } from "@/features/feed/feed-media-r2";

type MockStoredObject = {
  provider: "cloudflare_r2" | "supabase";
  storagePath: string;
};

const mocks = vi.hoisted(() => ({
  createFeedMediaObjectKey: vi.fn(
    ({
      order,
      postId,
      uuid,
    }: {
      order: number;
      postId: string;
      uuid: string;
    }) => `feed/v1/${postId}/${String(order).padStart(2, "0")}-${uuid}.webp`,
  ),
  deleteFeedMediaObjects: vi.fn(
    async (
      input?: unknown,
    ): Promise<{ failedObjects: MockStoredObject[]; ok: boolean }> => {
      void input;
      return { failedObjects: [], ok: true };
    },
  ),
  ensureAccountForUser: vi.fn(),
  optimizeFeedMediaImage: vi.fn(),
  resolveFeedMediaStorageWriteTarget: vi.fn(),
  uploadFeedMediaObject: vi.fn(),
}));

vi.mock("@/features/account/server-writes", () => ({
  ensureAccountForUser: mocks.ensureAccountForUser,
}));

vi.mock("@/features/feed/feed-media-image-optimizer", () => ({
  optimizeFeedMediaImage: mocks.optimizeFeedMediaImage,
}));

vi.mock("@/features/feed/feed-media-storage", () => ({
  createFeedMediaObjectKey: mocks.createFeedMediaObjectKey,
  deleteFeedMediaObjects: mocks.deleteFeedMediaObjects,
  resolveFeedMediaStorageWriteTarget: mocks.resolveFeedMediaStorageWriteTarget,
  uploadFeedMediaObject: mocks.uploadFeedMediaObject,
}));

import {
  cleanupDeletedFeedPostMedia,
  uploadFeedPostMedia,
} from "@/features/feed/feed-media-server";

describe("cleanupDeletedFeedPostMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteFeedMediaObjects.mockResolvedValue({
      failedObjects: [],
      ok: true,
    });
  });

  it("processes already-hidden media and durably queues failed deletion before releasing quota", async () => {
    const failedObject = {
      provider: "cloudflare_r2" as const,
      storagePath: "feed/v1/post-1/01-r2.webp",
    };
    const harness = createCleanupClient({
      attachmentPayload: [
        {
          byteSize: 70,
          storagePath: "legacy/post-1/old.webp",
        },
      ],
      mediaRows: [
        {
          byte_size: 250,
          id: "media-1",
          storage_path: failedObject.storagePath,
          storage_provider: failedObject.provider,
          storage_ready: true,
        },
      ],
    });
    mocks.deleteFeedMediaObjects.mockImplementation(async () => {
      harness.events.push("delete-provider-objects");
      return {
        failedObjects: [failedObject],
        ok: false,
      };
    });

    await expect(
      cleanupDeletedFeedPostMedia({
        client: harness.client,
        postId: "post-1",
      }),
    ).resolves.toEqual({ ok: true });

    expect(harness.rpc).toHaveBeenCalledWith("enqueue_media_storage_cleanup", {
      p_byte_size: 250,
      p_reason: "post_delete",
      p_storage_path: failedObject.storagePath,
      p_storage_provider: "cloudflare_r2",
    });
    expect(harness.mediaRead.eq).toHaveBeenNthCalledWith(
      1,
      "post_id",
      "post-1",
    );
    expect(harness.mediaRead.eq).toHaveBeenNthCalledWith(
      2,
      "storage_accounted",
      true,
    );
    expect(harness.mediaRead.not).toHaveBeenCalledWith(
      "deleted_at",
      "is",
      null,
    );
    expect(harness.mediaUpdate).toHaveBeenCalledOnce();
    expect(harness.mediaUpdate).toHaveBeenCalledWith({
      storage_accounted: false,
    });
    expect(harness.postUpdate).toHaveBeenCalledWith({ attachment_payload: [] });
    expect(harness.events).toEqual([
      "delete-provider-objects",
      "enqueue-cleanup",
      "unaccount-media",
      "clear-legacy-attachments",
    ]);
    expect(harness.accountedRows.get("media-1")).toBe(false);
  });

  it("retains media references when failed deletion cannot be queued", async () => {
    const failedObject = {
      provider: "cloudflare_r2" as const,
      storagePath: "feed/v1/post-1/01-r2.webp",
    };
    const harness = createCleanupClient({
      cleanupQueueId: null,
      mediaRows: [
        {
          byte_size: 250,
          id: "media-1",
          storage_path: failedObject.storagePath,
          storage_provider: failedObject.provider,
          storage_ready: true,
        },
      ],
    });
    mocks.deleteFeedMediaObjects.mockImplementation(async () => {
      harness.events.push("delete-provider-objects");
      return {
        failedObjects: [failedObject],
        ok: false,
      };
    });

    await expect(
      cleanupDeletedFeedPostMedia({
        client: harness.client,
        postId: "post-1",
      }),
    ).resolves.toEqual({ ok: false });

    expect(harness.mediaUpdate).not.toHaveBeenCalled();
    expect(harness.postUpdate).not.toHaveBeenCalled();
    expect(harness.accountedRows.get("media-1")).toBe(true);
    expect(harness.events).toEqual([
      "delete-provider-objects",
      "enqueue-cleanup",
    ]);
  });

  it("keeps hidden media accounted when the final accounting write fails", async () => {
    const harness = createCleanupClient({
      mediaAccountingError: {
        code: "PGRST500",
        message: "accounting update failed",
      },
      mediaRows: [
        {
          byte_size: 100,
          id: "media-1",
          storage_path: "feed/v1/post-1/01.webp",
          storage_provider: "supabase",
          storage_ready: true,
        },
      ],
    });
    mocks.deleteFeedMediaObjects.mockImplementation(async () => {
      harness.events.push("delete-provider-objects");
      return { failedObjects: [], ok: true };
    });

    await expect(
      cleanupDeletedFeedPostMedia({
        client: harness.client,
        postId: "post-1",
      }),
    ).resolves.toEqual({ ok: false });

    expect(mocks.deleteFeedMediaObjects).toHaveBeenCalledOnce();
    expect(harness.mediaUpdate).toHaveBeenCalledTimes(1);
    expect(harness.accountedRows.get("media-1")).toBe(true);
    expect(harness.events).toEqual([
      "delete-provider-objects",
      "unaccount-media",
    ]);
  });

  it("hands pending uploads to the delayed DB queue before deleting ready objects", async () => {
    const pendingPath = "feed/v1/post-1/01-pending.webp";
    const readyPath = "feed/v1/post-1/02-ready.webp";
    const harness = createCleanupClient({
      mediaRows: [
        {
          byte_size: 100,
          id: "media-pending",
          storage_path: pendingPath,
          storage_provider: "cloudflare_r2",
          storage_ready: false,
        },
        {
          byte_size: 200,
          id: "media-ready",
          storage_path: readyPath,
          storage_provider: "cloudflare_r2",
          storage_ready: true,
        },
      ],
    });
    mocks.deleteFeedMediaObjects.mockImplementation(async (input?: unknown) => {
      harness.events.push("delete-provider-objects");
      expect(
        (input as { objects?: MockStoredObject[] } | undefined)?.objects,
      ).toEqual([{ provider: "cloudflare_r2", storagePath: readyPath }]);
      return { failedObjects: [], ok: true };
    });

    await expect(
      cleanupDeletedFeedPostMedia({
        client: harness.client,
        postId: "post-1",
      }),
    ).resolves.toEqual({ ok: true });

    expect(harness.mediaDelete).toHaveBeenCalledOnce();
    expect(harness.accountedRows.has("media-pending")).toBe(false);
    expect(harness.accountedRows.get("media-ready")).toBe(false);
    expect(harness.events).toEqual([
      "handoff-pending-media",
      "delete-provider-objects",
      "unaccount-media",
      "clear-legacy-attachments",
    ]);
    expect(JSON.stringify(harness.events)).not.toContain(pendingPath);
  });

  it("does not touch provider storage when pending upload queue handoff fails", async () => {
    const harness = createCleanupClient({
      mediaDeleteError: { code: "PGRST500", message: "handoff failed" },
      mediaRows: [
        {
          byte_size: 100,
          id: "media-pending",
          storage_path: "feed/v1/post-1/01-pending.webp",
          storage_provider: "cloudflare_r2",
          storage_ready: false,
        },
      ],
    });

    await expect(
      cleanupDeletedFeedPostMedia({
        client: harness.client,
        postId: "post-1",
      }),
    ).resolves.toEqual({ ok: false });

    expect(mocks.deleteFeedMediaObjects).not.toHaveBeenCalled();
    expect(harness.mediaUpdate).not.toHaveBeenCalled();
    expect(harness.accountedRows.get("media-pending")).toBe(true);
    expect(harness.events).toEqual(["handoff-pending-media"]);
  });

  it("hands off a pending-only upload without issuing any provider deletion", async () => {
    const harness = createCleanupClient({
      mediaRows: [
        {
          byte_size: 100,
          id: "media-pending",
          storage_path: "feed/v1/post-1/01-pending.webp",
          storage_provider: "cloudflare_r2",
          storage_ready: false,
        },
      ],
    });

    await expect(
      cleanupDeletedFeedPostMedia({
        client: harness.client,
        postId: "post-1",
      }),
    ).resolves.toEqual({ ok: true });

    expect(mocks.deleteFeedMediaObjects).not.toHaveBeenCalled();
    expect(harness.mediaUpdate).not.toHaveBeenCalled();
    expect(harness.accountedRows.has("media-pending")).toBe(false);
    expect(harness.events).toEqual([
      "handoff-pending-media",
      "clear-legacy-attachments",
    ]);
  });
});

describe("uploadFeedPostMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureAccountForUser.mockResolvedValue({
      accountId: "account-1",
      ok: true,
    });
    mocks.resolveFeedMediaStorageWriteTarget.mockReturnValue({
      ok: true,
      provider: "supabase",
      r2: null,
    });
    mocks.deleteFeedMediaObjects.mockResolvedValue({
      failedObjects: [],
      ok: true,
    });
  });

  it("optimizes sequentially, uploads in parallel, and inserts WebP provider metadata", async () => {
    const optimizationResolvers: Array<
      (value: OptimizedFeedMediaImage) => void
    > = [];
    mocks.optimizeFeedMediaImage.mockImplementation(
      () =>
        new Promise<OptimizedFeedMediaImage>((resolve) => {
          optimizationResolvers.push(resolve);
        }),
    );
    const uploadResolvers: Array<(value: { ok: true }) => void> = [];
    mocks.uploadFeedMediaObject.mockImplementation(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          uploadResolvers.push(resolve);
        }),
    );
    const harness = createClient();

    const resultPromise = uploadFeedPostMedia({
      client: harness.client,
      files: [imageFile("one.jpg", 1), imageFile("two.jpg", 2)],
      postId: "post-1",
      user: { id: "user-1" } as User,
    });

    await vi.waitFor(() =>
      expect(mocks.optimizeFeedMediaImage).toHaveBeenCalledTimes(1),
    );
    expect(mocks.uploadFeedMediaObject).not.toHaveBeenCalled();

    optimizationResolvers[0](optimizedImage(1));
    await vi.waitFor(() =>
      expect(mocks.optimizeFeedMediaImage).toHaveBeenCalledTimes(2),
    );
    expect(mocks.uploadFeedMediaObject).not.toHaveBeenCalled();

    optimizationResolvers[1](optimizedImage(2));
    await vi.waitFor(() =>
      expect(mocks.uploadFeedMediaObject).toHaveBeenCalledTimes(2),
    );
    expect(harness.mediaInsert).toHaveBeenCalledTimes(1);
    expect(harness.mediaInsert.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.uploadFeedMediaObject.mock.invocationCallOrder[0],
    );
    uploadResolvers[1]({ ok: true });
    uploadResolvers[0]({ ok: true });

    await expect(resultPromise).resolves.toEqual({ ok: true });
    expect(harness.postReadIs).toHaveBeenCalledWith("deleted_at", null);
    expect(harness.mediaInsert).toHaveBeenCalledTimes(1);
    const insertedRows = harness.mediaInsert.mock.calls[0]?.[0];
    if (!Array.isArray(insertedRows)) {
      throw new Error("Expected feed_post_media rows to be inserted.");
    }
    const rows = insertedRows as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      bucket_id: "feed-media",
      byte_size: 101,
      content_sha256: "1".repeat(64),
      height: 601,
      mime_type: "image/webp",
      post_id: "post-1",
      sort_order: 1,
      source_byte_size: 1_001,
      storage_provider: "supabase",
      storage_ready: false,
      width: 801,
    });
    expect(rows[1]).toMatchObject({
      byte_size: 102,
      content_sha256: "2".repeat(64),
      sort_order: 2,
      source_byte_size: 1_002,
      storage_provider: "supabase",
      storage_ready: false,
    });
    expect(rows[0].optimized_at).toEqual(expect.any(String));
    expect(rows[0].optimized_at).toBe(rows[1].optimized_at);
    expect(rows[0].deleted_at).toEqual(expect.any(String));
    expect(rows[0].deleted_at).toBe(rows[1].deleted_at);
    expect(rows[0].storage_path).toMatch(
      /^feed\/v1\/post-1\/01-[0-9a-f-]+\.webp$/,
    );
    expect(rows[1].storage_path).toMatch(
      /^feed\/v1\/post-1\/02-[0-9a-f-]+\.webp$/,
    );
    expect(mocks.uploadFeedMediaObject).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        body: optimizedImage(1).data,
        client: harness.client,
        contentType: "image/webp",
        object: expect.objectContaining({ provider: "supabase" }),
      }),
    );
    expect(harness.rpc).toHaveBeenCalledWith("activate_feed_post_media", {
      p_post_id: "post-1",
      p_storage_paths: [rows[0].storage_path, rows[1].storage_path],
    });
    expect(harness.mediaUpdate).not.toHaveBeenCalled();
    expect(
      mocks.uploadFeedMediaObject.mock.invocationCallOrder[1],
    ).toBeLessThan(
      harness.rpc.mock.invocationCallOrder[
        harness.rpc.mock.calls.findIndex(
          ([functionName]) => functionName === "activate_feed_post_media",
        )
      ],
    );
    expect(harness.mediaUpdateIn).not.toHaveBeenCalledWith("storage_path", [
      rows[0].storage_path,
      rows[1].storage_path,
    ]);
  });

  it("rolls back the post without uploading when optimization fails", async () => {
    mocks.optimizeFeedMediaImage.mockRejectedValueOnce(
      new Error("invalid image bytes"),
    );
    const harness = createClient();

    await expect(
      uploadFeedPostMedia({
        client: harness.client,
        files: [imageFile("broken.jpg", 1)],
        postId: "post-1",
        user: { id: "user-1" } as User,
      }),
    ).resolves.toEqual({ code: "feed_media_processing_failed", ok: false });

    expect(mocks.uploadFeedMediaObject).not.toHaveBeenCalled();
    expect(harness.mediaInsert).not.toHaveBeenCalled();
    expect(mocks.deleteFeedMediaObjects).toHaveBeenCalledWith({
      client: harness.client,
      objects: [],
    });
    expect(harness.postDelete).toHaveBeenCalledTimes(1);
    expect(harness.postDeleteEq).toHaveBeenCalledWith("id", "post-1");
  });

  it("fails closed and rolls back before upload when R2 reservation is denied", async () => {
    const r2 = readyR2Adapter(1_000);
    mocks.resolveFeedMediaStorageWriteTarget.mockReturnValue({
      ok: true,
      provider: "cloudflare_r2",
      r2,
    });
    mocks.optimizeFeedMediaImage.mockResolvedValue(optimizedImage(1, 201));
    const harness = createClient({ reserveResult: false });

    await expect(
      uploadFeedPostMedia({
        client: harness.client,
        files: [imageFile("one.jpg", 1)],
        postId: "post-1",
        user: { id: "user-1" } as User,
      }),
    ).resolves.toEqual({ code: "feed_media_capacity_reached", ok: false });

    expect(harness.rpc).toHaveBeenCalledWith("reserve_media_storage", {
      p_byte_size: 201,
      p_max_byte_size: 1_000,
      p_post_id: "post-1",
      p_reservation_id: expect.any(String),
      p_storage_provider: "cloudflare_r2",
    });
    expect(harness.listBuckets).not.toHaveBeenCalled();
    expect(mocks.uploadFeedMediaObject).not.toHaveBeenCalled();
    expect(harness.postDelete).toHaveBeenCalledTimes(1);
    expect(mocks.deleteFeedMediaObjects).toHaveBeenCalledWith({
      client: harness.client,
      objects: [],
    });
    expect(harness.rpc).not.toHaveBeenCalledWith(
      "release_media_storage_reservation",
      expect.anything(),
    );
  });

  it("releases R2 capacity after quota-accounted rows exist and before upload", async () => {
    const r2 = readyR2Adapter(8_000_000_000);
    mocks.resolveFeedMediaStorageWriteTarget.mockReturnValue({
      ok: true,
      provider: "cloudflare_r2",
      r2,
    });
    mocks.optimizeFeedMediaImage.mockResolvedValue(optimizedImage(1));
    mocks.uploadFeedMediaObject.mockResolvedValue({ ok: true });
    const harness = createClient({ reserveResult: true });

    await expect(
      uploadFeedPostMedia({
        client: harness.client,
        files: [imageFile("one.jpg", 1)],
        postId: "post-1",
        user: { id: "user-1" } as User,
      }),
    ).resolves.toEqual({ ok: true });

    expect(harness.rpc).toHaveBeenCalledTimes(3);
    const reservationId = (
      harness.rpc.mock.calls[0]?.[1] as Record<string, unknown>
    ).p_reservation_id;
    expect(harness.rpc).toHaveBeenNthCalledWith(1, "reserve_media_storage", {
      p_byte_size: 101,
      p_max_byte_size: 8_000_000_000,
      p_post_id: "post-1",
      p_reservation_id: expect.any(String),
      p_storage_provider: "cloudflare_r2",
    });
    expect(harness.rpc).toHaveBeenNthCalledWith(
      2,
      "release_media_storage_reservation",
      {
        p_reservation_id: reservationId,
        p_storage_provider: "cloudflare_r2",
      },
    );
    expect(harness.rpc).toHaveBeenNthCalledWith(3, "activate_feed_post_media", {
      p_post_id: "post-1",
      p_storage_paths: [expect.stringMatching(/^feed\/v1\/post-1\//)],
    });
    expect(harness.mediaUpdate).not.toHaveBeenCalled();
    expect(harness.mediaInsert.mock.invocationCallOrder[0]).toBeLessThan(
      harness.rpc.mock.invocationCallOrder[1],
    );
    expect(harness.rpc.mock.invocationCallOrder[1]).toBeLessThan(
      mocks.uploadFeedMediaObject.mock.invocationCallOrder[0],
    );
    expect(harness.listBuckets).not.toHaveBeenCalled();
  });

  it("deletes every uploaded key when atomic activation loses to post deletion", async () => {
    const r2 = readyR2Adapter(8_000_000_000);
    mocks.resolveFeedMediaStorageWriteTarget.mockReturnValue({
      ok: true,
      provider: "cloudflare_r2",
      r2,
    });
    mocks.optimizeFeedMediaImage.mockResolvedValue(optimizedImage(1));
    mocks.uploadFeedMediaObject.mockResolvedValue({ ok: true });
    const harness = createClient({
      activationResult: false,
      reserveResult: true,
    });

    await expect(
      uploadFeedPostMedia({
        client: harness.client,
        files: [imageFile("one.jpg", 1)],
        postId: "post-1",
        user: { id: "user-1" } as User,
      }),
    ).resolves.toEqual({ code: "feed_media_upload_failed", ok: false });

    const uploadedObject = mocks.uploadFeedMediaObject.mock.calls[0][0].object;
    expect(harness.rpc).toHaveBeenCalledWith("activate_feed_post_media", {
      p_post_id: "post-1",
      p_storage_paths: [uploadedObject.storagePath],
    });
    expect(mocks.deleteFeedMediaObjects).toHaveBeenLastCalledWith({
      client: harness.client,
      objects: [uploadedObject],
      r2,
    });
    expect(harness.mediaUpdate).not.toHaveBeenCalled();
    expect(harness.postDelete.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteFeedMediaObjects.mock.invocationCallOrder[0],
    );
    expect(harness.rpc).not.toHaveBeenCalledWith(
      "enqueue_media_storage_cleanup",
      expect.anything(),
    );
  });

  it("hands every ambiguous key to the delete trigger before provider cleanup", async () => {
    const r2 = readyR2Adapter(8_000_000_000);
    mocks.resolveFeedMediaStorageWriteTarget.mockReturnValue({
      ok: true,
      provider: "cloudflare_r2",
      r2,
    });
    mocks.optimizeFeedMediaImage
      .mockResolvedValueOnce(optimizedImage(1))
      .mockResolvedValueOnce(optimizedImage(2));
    mocks.uploadFeedMediaObject
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false });
    mocks.deleteFeedMediaObjects.mockImplementationOnce(
      async (input?: unknown) => {
        const objects = (input as { objects?: MockStoredObject[] } | undefined)
          ?.objects;
        return { failedObjects: objects ?? [], ok: false };
      },
    );
    const harness = createClient({
      cleanupQueueId: "cleanup-queue-1",
      reserveResult: true,
    });

    await expect(
      uploadFeedPostMedia({
        client: harness.client,
        files: [imageFile("one.jpg", 1), imageFile("two.jpg", 2)],
        postId: "post-1",
        user: { id: "user-1" } as User,
      }),
    ).resolves.toEqual({ code: "feed_media_upload_failed", ok: false });

    const firstObject = mocks.uploadFeedMediaObject.mock.calls[0][0].object;
    const secondObject = mocks.uploadFeedMediaObject.mock.calls[1][0].object;
    expect(firstObject).toMatchObject({ provider: "cloudflare_r2" });
    expect(secondObject).toMatchObject({ provider: "cloudflare_r2" });
    expect(mocks.deleteFeedMediaObjects).toHaveBeenCalledWith({
      client: harness.client,
      objects: [firstObject, secondObject],
      r2,
    });
    expect(harness.rpc).not.toHaveBeenCalledWith(
      "enqueue_media_storage_cleanup",
      expect.anything(),
    );
    const reserveCall = harness.rpc.mock.calls.find(
      ([functionName]) => functionName === "reserve_media_storage",
    );
    const reservationId = (reserveCall?.[1] as Record<string, unknown>)
      .p_reservation_id;
    expect(harness.rpc).toHaveBeenCalledWith(
      "release_media_storage_reservation",
      {
        p_reservation_id: reservationId,
        p_storage_provider: "cloudflare_r2",
      },
    );
    expect(harness.postDelete).toHaveBeenCalledTimes(1);
    expect(harness.postDelete.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteFeedMediaObjects.mock.invocationCallOrder[0],
    );
    expect(harness.mediaInsert).toHaveBeenCalledTimes(1);
    expect(harness.mediaUpdate).not.toHaveBeenCalled();
  });

  it("retains the trigger queue when immediate provider cleanup still fails", async () => {
    const r2 = readyR2Adapter(8_000_000_000);
    mocks.resolveFeedMediaStorageWriteTarget.mockReturnValue({
      ok: true,
      provider: "cloudflare_r2",
      r2,
    });
    mocks.optimizeFeedMediaImage.mockResolvedValue(optimizedImage(1));
    mocks.uploadFeedMediaObject.mockResolvedValue({ ok: false });
    mocks.deleteFeedMediaObjects.mockImplementationOnce(
      async (input?: unknown) => ({
        failedObjects:
          (input as { objects?: MockStoredObject[] } | undefined)?.objects ??
          [],
        ok: false,
      }),
    );
    const harness = createClient({
      cleanupQueueId: null,
      reserveResult: true,
    });

    await expect(
      uploadFeedPostMedia({
        client: harness.client,
        files: [imageFile("one.jpg", 1)],
        postId: "post-1",
        user: { id: "user-1" } as User,
      }),
    ).resolves.toEqual({ code: "feed_media_upload_failed", ok: false });

    expect(harness.mediaInsert).toHaveBeenCalledTimes(1);
    expect(harness.mediaUpdate).not.toHaveBeenCalled();
    expect(harness.postDelete).toHaveBeenCalledOnce();
    expect(harness.postUpdate).not.toHaveBeenCalled();
    expect(harness.rpc).not.toHaveBeenCalledWith(
      "enqueue_media_storage_cleanup",
      expect.anything(),
    );
  });
});

function createCleanupClient({
  attachmentPayload = [],
  cleanupQueueId = "cleanup-1",
  mediaAccountingError = null,
  mediaDeleteError = null,
  mediaRows,
}: {
  attachmentPayload?: unknown[];
  cleanupQueueId?: string | null;
  mediaAccountingError?: unknown;
  mediaDeleteError?: unknown;
  mediaRows: unknown[];
}) {
  const accountedRows = new Map<string, boolean>(
    mediaRows.flatMap((row) => {
      const id = (row as { id?: unknown }).id;
      return typeof id === "string" ? [[id, true] as const] : [];
    }),
  );
  const events: string[] = [];
  const postRead = {
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({
      data: { attachment_payload: attachmentPayload },
      error: null,
    })),
    select: vi.fn(),
  };
  postRead.select.mockReturnValue(postRead);
  postRead.eq.mockReturnValue(postRead);

  const mediaRead = {
    eq: vi.fn(),
    not: vi.fn(async () => ({ data: mediaRows, error: null })),
    select: vi.fn(),
  };
  mediaRead.select.mockReturnValue(mediaRead);
  mediaRead.eq.mockReturnValue(mediaRead);

  const mediaDelete = vi.fn(() => {
    events.push("handoff-pending-media");
    const mediaIds: string[] = [];
    const builder = {
      eq: vi.fn(() => builder),
      in: vi.fn((_column: string, values: string[]) => {
        mediaIds.push(...values);
        return builder;
      }),
      not: vi.fn(async () => {
        if (!mediaDeleteError) {
          for (const mediaId of mediaIds) accountedRows.delete(mediaId);
        }
        return { error: mediaDeleteError };
      }),
    };
    return builder;
  });

  const mediaUpdate = vi.fn((payload: Record<string, unknown>) => {
    void payload;
    events.push("unaccount-media");
    const mediaIds: string[] = [];
    const builder = {
      eq: vi.fn(() => builder),
      in: vi.fn((_column: string, values: string[]) => {
        mediaIds.push(...values);
        return builder;
      }),
      not: vi.fn(async () => {
        if (!mediaAccountingError) {
          for (const mediaId of mediaIds) accountedRows.set(mediaId, false);
        }
        return { error: mediaAccountingError };
      }),
    };
    return builder;
  });
  const postUpdateEq = vi.fn(async () => ({ error: null }));
  const postUpdate = vi.fn(() => {
    events.push("clear-legacy-attachments");
    return { eq: postUpdateEq };
  });
  const rpc = vi.fn(async () => {
    events.push("enqueue-cleanup");
    return cleanupQueueId
      ? { data: cleanupQueueId, error: null }
      : { data: null, error: { code: "cleanup_enqueue_failed" } };
  });
  const client = {
    schema: () => ({
      from: (table: string) => {
        if (table === "feed_post") {
          return { ...postRead, update: postUpdate };
        }
        return { ...mediaRead, delete: mediaDelete, update: mediaUpdate };
      },
      rpc,
    }),
  } as unknown as SupabaseClient;

  return {
    accountedRows,
    client,
    events,
    mediaDelete,
    mediaRead,
    mediaUpdate,
    postUpdate,
    rpc,
  };
}

function createClient({
  activationResult = true,
  cleanupQueueId = "cleanup-queue-1",
  releaseResult = true,
  reserveResult = true,
}: {
  activationResult?: boolean;
  cleanupQueueId?: string | null;
  releaseResult?: boolean;
  reserveResult?: boolean;
} = {}) {
  const postReadBuilder = {
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn(async () => ({
      data: { attachment_payload: [], id: "post-1" },
      error: null,
    })),
    select: vi.fn(),
  };
  postReadBuilder.select.mockReturnValue(postReadBuilder);
  postReadBuilder.eq.mockReturnValue(postReadBuilder);
  postReadBuilder.is.mockReturnValue(postReadBuilder);

  const postDeleteEq = vi.fn(async () => ({ error: null }));
  const postDelete = vi.fn(() => ({ eq: postDeleteEq }));
  const postUpdateEq = vi.fn(async () => ({ error: null }));
  const postUpdate = vi.fn(() => ({ eq: postUpdateEq }));
  const mediaInsert = vi.fn(async (rows: unknown) => {
    void rows;
    return { error: null };
  });
  const mediaUpdateIn = vi.fn(async () => ({ error: null }));
  const mediaUpdateEq = vi.fn(() => ({ in: mediaUpdateIn }));
  const mediaUpdate = vi.fn(() => ({ eq: mediaUpdateEq, in: mediaUpdateIn }));
  const rpc = vi.fn(
    async (functionName: string, parameters: Record<string, unknown>) => {
      void parameters;
      if (functionName === "reserve_media_storage") {
        return { data: reserveResult, error: null };
      }
      if (functionName === "release_media_storage_reservation") {
        return { data: releaseResult, error: null };
      }
      if (functionName === "enqueue_media_storage_cleanup") {
        return cleanupQueueId
          ? { data: cleanupQueueId, error: null }
          : { data: null, error: { code: "cleanup_enqueue_failed" } };
      }
      if (functionName === "activate_feed_post_media") {
        return { data: activationResult, error: null };
      }
      return { data: null, error: { code: "unexpected_rpc" } };
    },
  );
  const listBuckets = vi.fn(async () => ({
    data: [{ id: "feed-media" }],
    error: null,
  }));
  const client = {
    schema: () => ({
      from: (table: string) => {
        if (table === "feed_post") {
          return {
            ...postReadBuilder,
            delete: postDelete,
            update: postUpdate,
          };
        }
        return { insert: mediaInsert, update: mediaUpdate };
      },
      rpc,
    }),
    storage: { listBuckets },
  } as unknown as SupabaseClient;

  return {
    client,
    listBuckets,
    mediaInsert,
    mediaUpdate,
    mediaUpdateEq,
    mediaUpdateIn,
    postDelete,
    postDeleteEq,
    postUpdate,
    postUpdateEq,
    postReadIs: postReadBuilder.is,
    rpc,
  };
}

function imageFile(name: string, marker: number) {
  return new File([new Uint8Array([marker])], name, {
    type: "image/jpeg",
  });
}

function optimizedImage(
  marker: number,
  byteSize = 100 + marker,
): OptimizedFeedMediaImage {
  return {
    byteSize,
    data: Buffer.from([marker]),
    extension: "webp",
    height: 600 + marker,
    mimeType: "image/webp",
    sha256: String(marker).repeat(64),
    sourceByteSize: 1_000 + marker,
    sourceFormat: "jpeg",
    width: 800 + marker,
  };
}

function readyR2Adapter(maxManagedBytes: number): FeedMediaR2Adapter {
  return {
    createDeliveryUrl: vi.fn(() => "https://media.nuang.example/signed"),
    deleteObject: vi.fn(async () => ({ ok: true as const, status: 204 })),
    maxManagedBytes,
    putObject: vi.fn(async () => ({ ok: true as const, status: 201 })),
    readiness: { status: "ready" },
  };
}
