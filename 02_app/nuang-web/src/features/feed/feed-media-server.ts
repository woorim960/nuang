import { randomUUID } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ensureAccountForUser } from "@/features/account/server-writes";
import {
  feedMediaBucket,
  maxFeedPhotoTotalBytes,
  validateFeedPhotoFiles,
} from "@/features/feed/feed-media";
import {
  optimizeFeedMediaImage,
  type OptimizedFeedMediaImage,
} from "@/features/feed/feed-media-image-optimizer";
import type { FeedMediaR2Adapter } from "@/features/feed/feed-media-r2";
import {
  createFeedMediaObjectKey,
  deleteFeedMediaObjects,
  resolveFeedMediaStorageWriteTarget,
  uploadFeedMediaObject,
  type FeedMediaStoredObject,
} from "@/features/feed/feed-media-storage";
import type { FeedWriteFailureCode } from "@/features/feed/feed-write-contract";

type FeedMediaWriteResult =
  { ok: true } | { code: FeedWriteFailureCode; ok: false };

type PreparedMediaRow = {
  bucket_id: typeof feedMediaBucket;
  byte_size: number;
  content_sha256: string;
  deleted_at: string;
  height: number;
  mime_type: "image/webp";
  optimized_at: string;
  post_id: string;
  sort_order: number;
  source_byte_size: number;
  storage_path: string;
  storage_provider: "cloudflare_r2" | "supabase";
  storage_ready: false;
  width: number;
};

type StorageReservation = {
  id: string;
  provider: "cloudflare_r2";
};

export async function cleanupDeletedFeedPostMedia({
  client,
  postId,
}: {
  client: SupabaseClient;
  postId: string;
}) {
  const postResponse = await client
    .schema("feed")
    .from("feed_post")
    .select("attachment_payload")
    .eq("id", postId)
    .maybeSingle();
  if (postResponse.error || !postResponse.data) return { ok: false } as const;

  let mediaResponse = (await client
    .schema("feed")
    .from("feed_post_media")
    .select("id,storage_path,storage_provider,storage_ready,byte_size")
    .eq("post_id", postId)
    .eq("storage_accounted", true)
    .not("deleted_at", "is", null)) as {
    data: unknown[] | null;
    error: unknown;
  };
  if (isMissingMediaStorageColumns(mediaResponse.error)) {
    mediaResponse = (await client
      .schema("feed")
      .from("feed_post_media")
      .select("id,storage_path,byte_size")
      .eq("post_id", postId)
      .eq("storage_accounted", true)
      .not("deleted_at", "is", null)) as {
      data: unknown[] | null;
      error: unknown;
    };
  }
  if (mediaResponse.error && !isMissingMediaTable(mediaResponse.error)) {
    return { ok: false } as const;
  }

  const objectBytes = new Map<string, number>();
  const pendingMediaRowIds: string[] = [];
  const readyMediaRowIds: string[] = [];
  const objects: FeedMediaStoredObject[] = (mediaResponse.data ?? []).flatMap(
    (rawRow) => {
      const row = rawRow as {
        byte_size?: unknown;
        id?: unknown;
        storage_path?: unknown;
        storage_provider?: unknown;
        storage_ready?: unknown;
      };
      if (typeof row.id !== "string") {
        return [];
      }
      const storageReady = row.storage_ready ?? true;
      if (typeof storageReady !== "boolean") return [];
      if (!storageReady) {
        pendingMediaRowIds.push(row.id);
        return [];
      }
      if (typeof row.storage_path !== "string") return [];
      const provider = row.storage_provider ?? "supabase";
      if (provider !== "supabase" && provider !== "cloudflare_r2") return [];
      readyMediaRowIds.push(row.id);
      const byteSize =
        typeof row.byte_size === "string"
          ? Number(row.byte_size)
          : row.byte_size;
      objectBytes.set(
        `${provider}\n${row.storage_path}`,
        typeof byteSize === "number" &&
          Number.isSafeInteger(byteSize) &&
          byteSize > 0
          ? byteSize
          : 1,
      );
      return [{ provider, storagePath: row.storage_path }];
    },
  );

  if (
    pendingMediaRowIds.length > 0 &&
    !isMissingMediaTable(mediaResponse.error)
  ) {
    let pendingHandoffError = true;
    try {
      const pendingHandoff = await client
        .schema("feed")
        .from("feed_post_media")
        .delete()
        .in("id", pendingMediaRowIds)
        .eq("storage_accounted", true)
        .eq("storage_ready", false)
        .not("deleted_at", "is", null);
      pendingHandoffError = Boolean(pendingHandoff.error);
    } catch {
      pendingHandoffError = true;
    }
    if (pendingHandoffError) return { ok: false } as const;
  }

  if (Array.isArray(postResponse.data.attachment_payload)) {
    for (const attachment of postResponse.data.attachment_payload) {
      if (
        attachment &&
        typeof attachment === "object" &&
        "storagePath" in attachment &&
        typeof attachment.storagePath === "string"
      ) {
        const object = {
          provider: "supabase",
          storagePath: attachment.storagePath,
        } as const;
        objects.push(object);
        const byteSize =
          "byteSize" in attachment ? attachment.byteSize : undefined;
        objectBytes.set(
          `${object.provider}\n${object.storagePath}`,
          typeof byteSize === "number" &&
            Number.isSafeInteger(byteSize) &&
            byteSize > 0
            ? byteSize
            : 1,
        );
      }
    }
  }

  let removal: Awaited<ReturnType<typeof deleteFeedMediaObjects>> = {
    failedObjects: [],
    ok: true,
  };
  if (objects.length > 0) {
    try {
      removal = await deleteFeedMediaObjects({ client, objects });
    } catch {
      removal = { failedObjects: objects, ok: false };
    }
  }
  if (!removal.ok || removal.failedObjects.length > 0) {
    const failedObjects =
      removal.failedObjects.length > 0 ? removal.failedObjects : objects;
    const queued = await Promise.all(
      failedObjects.map((object) =>
        enqueuePendingCleanup({
          byteSize:
            objectBytes.get(`${object.provider}\n${object.storagePath}`) ?? 1,
          client,
          object,
          reason: "post_delete",
        }),
      ),
    );
    // If durable tracking itself fails, retain every media reference. The post
    // is already hidden, and a later retry can safely reconcile the objects
    // without losing quota accounting or forgetting an orphan.
    if (!queued.every(Boolean)) return { ok: false } as const;
  }

  if (
    readyMediaRowIds.length > 0 &&
    !isMissingMediaTable(mediaResponse.error)
  ) {
    const mediaAccounting = await client
      .schema("feed")
      .from("feed_post_media")
      .update({ storage_accounted: false })
      .in("id", readyMediaRowIds)
      .eq("storage_accounted", true)
      .not("deleted_at", "is", null);
    if (mediaAccounting.error) return { ok: false } as const;
  }

  if (Array.isArray(postResponse.data.attachment_payload)) {
    const legacyDelete = await client
      .schema("feed")
      .from("feed_post")
      .update({ attachment_payload: [] })
      .eq("id", postId);
    if (legacyDelete.error) return { ok: false } as const;
  }

  return { ok: true } as const;
}

export async function uploadFeedPostMedia({
  client,
  files,
  postId,
  user,
}: {
  client: SupabaseClient;
  files: File[];
  postId: string;
  user: User;
}): Promise<FeedMediaWriteResult> {
  if (files.length === 0) return { ok: true };
  if (validateFeedPhotoFiles(files)) {
    await rollbackPostWithMedia({ client, objects: [], postId });
    return { code: "feed_target_invalid", ok: false };
  }

  let account: Awaited<ReturnType<typeof ensureAccountForUser>>;
  try {
    account = await ensureAccountForUser(client, user);
  } catch {
    await rollbackPostWithMedia({ client, objects: [], postId });
    return { code: "feed_media_upload_failed", ok: false };
  }

  if (!account.ok) {
    await rollbackPostWithMedia({ client, objects: [], postId });
    return { code: "account_link_missing", ok: false };
  }

  let postResponse: {
    data: { attachment_payload: unknown; id: string } | null;
    error: unknown;
  };
  try {
    postResponse = (await client
      .schema("feed")
      .from("feed_post")
      .select("id, attachment_payload")
      .eq("id", postId)
      .eq("author_account_id", account.accountId)
      .is("deleted_at", null)
      .maybeSingle()) as typeof postResponse;
  } catch {
    await rollbackPostWithMedia({ client, objects: [], postId });
    return { code: "feed_media_upload_failed", ok: false };
  }

  if (postResponse.error || !postResponse.data) {
    await rollbackPostWithMedia({ client, objects: [], postId });
    return { code: "feed_target_invalid", ok: false };
  }

  let target: ReturnType<typeof resolveFeedMediaStorageWriteTarget>;
  try {
    target = resolveFeedMediaStorageWriteTarget({
      accountId: account.accountId,
    });
  } catch {
    await rollbackPostWithMedia({ client, objects: [], postId });
    return { code: "feed_media_upload_failed", ok: false };
  }
  if (!target.ok) {
    await rollbackPostWithMedia({ client, objects: [], postId });
    return { code: "feed_media_upload_failed", ok: false };
  }
  if (target.provider === "supabase") {
    const bucketReady = await ensureFeedMediaBucket(client);
    if (!bucketReady) {
      await rollbackPostWithMedia({ client, objects: [], postId });
      return { code: "feed_media_upload_failed", ok: false };
    }
  }

  const optimizedImages: OptimizedFeedMediaImage[] = [];
  try {
    // Decode one source at a time so multiple large pixel buffers cannot
    // compete for the function's memory budget.
    for (const file of files) {
      optimizedImages.push(
        await optimizeFeedMediaImage(await file.arrayBuffer()),
      );
    }
  } catch {
    await rollbackPostWithMedia({ client, objects: [], postId });
    return { code: "feed_media_processing_failed", ok: false };
  }

  const optimizedTotalBytes = optimizedImages.reduce(
    (total, image) => total + image.byteSize,
    0,
  );
  if (
    optimizedImages.some((image) => image.byteSize > 8 * 1024 * 1024) ||
    optimizedTotalBytes > maxFeedPhotoTotalBytes
  ) {
    await rollbackPostWithMedia({ client, objects: [], postId });
    return { code: "feed_media_processing_failed", ok: false };
  }

  const uploadPlans = optimizedImages.map((image, index) => ({
    image,
    object: {
      provider: target.provider,
      storagePath: createFeedMediaObjectKey({
        order: index + 1,
        postId,
        uuid: randomUUID(),
      }),
    } satisfies FeedMediaStoredObject,
  }));
  const optimizedAt = new Date().toISOString();
  const mediaRows: PreparedMediaRow[] = optimizedImages.map((image, index) => ({
    bucket_id: feedMediaBucket,
    byte_size: image.byteSize,
    content_sha256: image.sha256,
    // Rows stay invisible while their immutable objects are being written.
    deleted_at: optimizedAt,
    height: image.height,
    mime_type: image.mimeType,
    optimized_at: optimizedAt,
    post_id: postId,
    sort_order: index + 1,
    source_byte_size: image.sourceByteSize,
    storage_path: uploadPlans[index].object.storagePath,
    storage_provider: uploadPlans[index].object.provider,
    storage_ready: false,
    width: image.width,
  }));

  let reservation: StorageReservation | null = null;
  if (target.provider === "cloudflare_r2") {
    reservation = { id: randomUUID(), provider: target.provider };
    if (
      target.r2.maxManagedBytes === null ||
      !(await reserveProviderCapacity({
        byteSize: optimizedTotalBytes,
        client,
        maxByteSize: target.r2.maxManagedBytes,
        postId,
        reservation,
      }))
    ) {
      await rollbackPostWithMedia({ client, objects: [], postId });
      return { code: "feed_media_capacity_reached", ok: false };
    }
  }

  let mediaResponse: { error: unknown };
  try {
    mediaResponse = await client
      .schema("feed")
      .from("feed_post_media")
      .insert(mediaRows);
  } catch {
    // The insert may have committed even though its response was lost. Never
    // delete the parent here: a canonical concurrent/committed request owns
    // that row set. The pending barrier and stale takeover provide recovery.
    await releaseProviderReservation(client, reservation);
    return { code: "feed_media_upload_in_progress", ok: false };
  }
  let usesDurablePendingMediaRows = !mediaResponse.error;

  if (
    target.provider === "supabase" &&
    isMissingMediaStorageColumns(mediaResponse.error)
  ) {
    usesDurablePendingMediaRows = false;
    try {
      mediaResponse = await client
        .schema("feed")
        .from("feed_post_media")
        .insert(mediaRows.map(toLegacyMediaRow));
    } catch {
      await releaseProviderReservation(client, reservation);
      return { code: "feed_media_upload_in_progress", ok: false };
    }
  }

  const usesLegacyAttachmentFallback =
    target.provider === "supabase" && isMissingMediaTable(mediaResponse.error);
  if (isUniqueViolation(mediaResponse.error)) {
    // Another request already owns this post's unique sort-order slots. It is
    // unsafe for the loser to roll back the shared parent.
    await releaseProviderReservation(client, reservation);
    return { code: "feed_media_upload_in_progress", ok: false };
  }
  if (mediaResponse.error && !usesLegacyAttachmentFallback) {
    await rollbackPostWithMedia({
      client,
      objects: [],
      postId,
      reservation,
      ...(target.r2 ? { r2: target.r2 } : {}),
    });
    return { code: "feed_media_upload_failed", ok: false };
  }

  // The hidden media rows are quota-accounted from this point onward. Release
  // the short reservation before external I/O to avoid double-counting while
  // still retaining a conservative ledger if the process stops mid-upload.
  if (reservation && (await releaseProviderReservation(client, reservation))) {
    reservation = null;
  }

  const uploadResponses = await Promise.all(
    uploadPlans.map(async ({ image, object }) => {
      try {
        return {
          object,
          response: await uploadFeedMediaObject({
            body: image.data,
            client,
            contentType: image.mimeType,
            object,
            ...(target.r2 ? { r2: target.r2 } : {}),
          }),
        };
      } catch {
        return { object, response: { ok: false } as const };
      }
    }),
  );
  const uploadedObjects = uploadResponses
    .filter(({ response }) => response.ok)
    .map(({ object }) => object);

  if (uploadResponses.some(({ response }) => !response.ok)) {
    await rollbackPostWithMedia({
      client,
      mediaRows,
      // A timeout is commit-ambiguous: the provider may have stored an object
      // even though no success response reached us. Delete every planned
      // immutable key so those bytes can never escape quota accounting.
      objects: uploadPlans.map(({ object }) => object),
      postId,
      reservation,
      usesDurablePendingMediaRows,
      ...(target.r2 ? { r2: target.r2 } : {}),
    });
    return { code: "feed_media_upload_failed", ok: false };
  }

  if (usesLegacyAttachmentFallback) {
    const previousAttachments = Array.isArray(
      postResponse.data.attachment_payload,
    )
      ? postResponse.data.attachment_payload
      : [];
    let fallbackResponse: { error: unknown };
    try {
      fallbackResponse = await client
        .schema("feed")
        .from("feed_post")
        .update({
          attachment_payload: [
            ...previousAttachments,
            ...mediaRows.map((row, index) => ({
              alt: `게시물 사진 ${index + 1}`,
              byteSize: row.byte_size,
              id: randomUUID(),
              mimeType: row.mime_type,
              sortOrder: row.sort_order,
              storagePath: row.storage_path,
              type: "image",
            })),
          ],
        })
        .eq("id", postId);
    } catch {
      fallbackResponse = { error: new Error("feed media fallback failed") };
    }

    if (!fallbackResponse.error) return { ok: true };
    await rollbackPostWithMedia({
      client,
      mediaRows,
      objects: uploadedObjects,
      postId,
      reservation,
      usesDurablePendingMediaRows,
    });
    return { code: "feed_media_upload_failed", ok: false };
  }

  const storagePaths = mediaRows.map((row) => row.storage_path);
  const activation = await activateFeedPostMediaSafely({
    client,
    postId,
    storagePaths,
  });
  if (activation === "rejected") {
    await rollbackPostWithMedia({
      client,
      mediaRows,
      objects: uploadedObjects,
      postId,
      reservation,
      usesDurablePendingMediaRows,
      ...(target.r2 ? { r2: target.r2 } : {}),
    });
    return { code: "feed_media_upload_failed", ok: false };
  }
  if (activation === "unknown") {
    // All objects and their hidden rows remain quota-accounted. Deleting them
    // would be unsafe because the first RPC may have committed atomically.
    await releaseProviderReservation(client, reservation);
    return { code: "feed_media_upload_in_progress", ok: false };
  }

  if (!(await releaseProviderReservation(client, reservation))) {
    console.warn("[feed-media] storage reservation will expire automatically");
  }

  return { ok: true };
}

async function ensureFeedMediaBucket(client: SupabaseClient) {
  try {
    const buckets = await client.storage.listBuckets();
    if (buckets.error) return false;
    if (buckets.data.some((bucket) => bucket.id === feedMediaBucket))
      return true;

    const created = await client.storage.createBucket(feedMediaBucket, {
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      fileSizeLimit: 8 * 1024 * 1024,
      public: false,
    });
    return !created.error;
  } catch {
    return false;
  }
}

async function activateFeedPostMediaSafely({
  client,
  postId,
  storagePaths,
}: {
  client: SupabaseClient;
  postId: string;
  storagePaths: string[];
}): Promise<"activated" | "rejected" | "unknown"> {
  const first = await callFeedMediaActivation({ client, postId, storagePaths });
  if (!first.error && first.data === true) return "activated";
  if (!first.error && first.data === false) return "rejected";
  if (await confirmFeedPostMediaActivated({ client, postId, storagePaths })) {
    return "activated";
  }

  // The 004 RPC is idempotent for the exact already-active set. Retrying the
  // same call resolves a lost-success response without exposing a second set.
  const retry = await callFeedMediaActivation({ client, postId, storagePaths });
  if (!retry.error && retry.data === true) return "activated";
  if (await confirmFeedPostMediaActivated({ client, postId, storagePaths })) {
    return "activated";
  }
  if (!retry.error && retry.data === false) return "rejected";
  return "unknown";
}

async function callFeedMediaActivation({
  client,
  postId,
  storagePaths,
}: {
  client: SupabaseClient;
  postId: string;
  storagePaths: string[];
}): Promise<{ data: unknown; error: unknown }> {
  try {
    return await client.schema("feed").rpc("activate_feed_post_media", {
      p_post_id: postId,
      p_storage_paths: storagePaths,
    });
  } catch {
    return {
      data: null,
      error: new Error("feed media activation response unavailable"),
    };
  }
}

async function confirmFeedPostMediaActivated({
  client,
  postId,
  storagePaths,
}: {
  client: SupabaseClient;
  postId: string;
  storagePaths: string[];
}) {
  try {
    const post = await client
      .schema("feed")
      .from("feed_post")
      .select("id,media_upload_state")
      .eq("id", postId)
      .is("deleted_at", null)
      .maybeSingle();
    if (post.error || post.data?.media_upload_state !== "ready") return false;

    const media = await client
      .schema("feed")
      .from("feed_post_media")
      .select("storage_path,storage_ready,storage_accounted,deleted_at")
      .eq("post_id", postId)
      .order("sort_order", { ascending: true });
    if (media.error || !Array.isArray(media.data)) return false;
    if (media.data.length !== storagePaths.length) return false;

    const expected = new Set(storagePaths);
    return media.data.every(
      (row) =>
        expected.has(row.storage_path) &&
        row.storage_ready === true &&
        row.storage_accounted === true &&
        row.deleted_at === null,
    );
  } catch {
    return false;
  }
}

function isMissingMediaTable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  const message =
    typeof candidate.message === "string"
      ? candidate.message.toLocaleLowerCase("en-US")
      : "";
  return (
    candidate.code === "PGRST205" ||
    candidate.code === "42P01" ||
    message.includes("feed_post_media")
  );
}

function isUniqueViolation(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    (error as { code?: unknown }).code === "23505",
  );
}

function isMissingMediaStorageColumns(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  const message =
    typeof candidate.message === "string"
      ? candidate.message.toLocaleLowerCase("en-US")
      : "";
  return (
    candidate.code === "42703" ||
    candidate.code === "PGRST204" ||
    message.includes("storage_provider") ||
    message.includes("storage_ready") ||
    message.includes("content_sha256") ||
    message.includes("source_byte_size") ||
    message.includes("optimized_at")
  );
}

async function reserveProviderCapacity({
  byteSize,
  client,
  maxByteSize,
  postId,
  reservation,
}: {
  byteSize: number;
  client: SupabaseClient;
  maxByteSize: number;
  postId: string;
  reservation: StorageReservation;
}) {
  try {
    const response = await client.schema("feed").rpc("reserve_media_storage", {
      p_byte_size: byteSize,
      p_max_byte_size: maxByteSize,
      p_post_id: postId,
      p_reservation_id: reservation.id,
      p_storage_provider: reservation.provider,
    });
    return !response.error && response.data === true;
  } catch {
    return false;
  }
}

async function releaseProviderReservation(
  client: SupabaseClient,
  reservation: StorageReservation | null,
) {
  if (!reservation) return true;
  try {
    const response = await client
      .schema("feed")
      .rpc("release_media_storage_reservation", {
        p_reservation_id: reservation.id,
        p_storage_provider: reservation.provider,
      });
    return !response.error && response.data === true;
  } catch {
    return false;
  }
}

async function rollbackPostWithMedia({
  client,
  mediaRows = [],
  objects,
  postId,
  r2,
  reservation = null,
  usesDurablePendingMediaRows = false,
}: {
  client: SupabaseClient;
  mediaRows?: PreparedMediaRow[];
  objects: FeedMediaStoredObject[];
  postId: string;
  r2?: FeedMediaR2Adapter;
  reservation?: StorageReservation | null;
  usesDurablePendingMediaRows?: boolean;
}) {
  if (usesDurablePendingMediaRows && mediaRows.length > 0) {
    // Transfer every never-activated key to the physical-delete trigger before
    // trusting an external DELETE response. A timed-out PUT may commit after a
    // seemingly successful/404 rollback DELETE; the trigger's fifteen-minute
    // unresolved queue entry remains quota-accounted and deletes it again.
    const deletion = await client
      .schema("feed")
      .from("feed_post")
      .delete()
      .eq("id", postId);
    if (deletion.error) {
      await hidePostAfterRollback(client, postId);
    }
    try {
      await deleteFeedMediaObjects({
        client,
        objects,
        ...(r2 ? { r2 } : {}),
      });
    } catch {
      // The trigger-created queue is already the durable retry boundary.
    }
    await releaseProviderReservation(client, reservation);
    return;
  }

  const removal = await deleteFeedMediaObjects({
    client,
    objects,
    ...(r2 ? { r2 } : {}),
  });
  let cleanupTracked = removal.ok;
  if (!removal.ok) {
    const bytesByPath = new Map(
      mediaRows.map((row) => [row.storage_path, row.byte_size]),
    );
    const queued = await Promise.all(
      removal.failedObjects.map((object) =>
        enqueuePendingCleanup({
          byteSize: bytesByPath.get(object.storagePath) ?? 1,
          client,
          object,
        }),
      ),
    );
    cleanupTracked = queued.every(Boolean);
  }

  const accountingTransferred =
    cleanupTracked &&
    (await releaseRollbackMediaAccounting({ client, mediaRows }));

  if (accountingTransferred) {
    const deletion = await client
      .schema("feed")
      .from("feed_post")
      .delete()
      .eq("id", postId);
    if (deletion.error) await hidePostAfterRollback(client, postId);
  } else {
    await hidePostAfterRollback(client, postId);
  }
  await releaseProviderReservation(client, reservation);
}

async function releaseRollbackMediaAccounting({
  client,
  mediaRows,
}: {
  client: SupabaseClient;
  mediaRows: PreparedMediaRow[];
}) {
  if (mediaRows.length === 0) return true;
  const response = await client
    .schema("feed")
    .from("feed_post_media")
    .update({ storage_accounted: false })
    .in(
      "storage_path",
      mediaRows.map((row) => row.storage_path),
    );
  return (
    !response.error ||
    isMissingMediaTable(response.error) ||
    isMissingMediaStorageColumns(response.error)
  );
}

async function hidePostAfterRollback(client: SupabaseClient, postId: string) {
  const deletedAt = new Date().toISOString();
  await client
    .schema("feed")
    .from("feed_post")
    .update({
      deleted_at: deletedAt,
      moderation_status: "removed",
      removed_at: deletedAt,
    })
    .eq("id", postId);
}

async function enqueuePendingCleanup({
  byteSize,
  client,
  object,
  reason = "upload_rollback",
}: {
  byteSize: number;
  client: SupabaseClient;
  object: FeedMediaStoredObject;
  reason?: "post_delete" | "upload_rollback";
}) {
  try {
    const response = await client
      .schema("feed")
      .rpc("enqueue_media_storage_cleanup", {
        p_byte_size: byteSize,
        p_reason: reason,
        p_storage_path: object.storagePath,
        p_storage_provider: object.provider,
      });
    return !response.error && typeof response.data === "string";
  } catch {
    return false;
  }
}

function toLegacyMediaRow(row: PreparedMediaRow) {
  return {
    bucket_id: row.bucket_id,
    byte_size: row.byte_size,
    deleted_at: row.deleted_at,
    height: row.height,
    mime_type: row.mime_type,
    post_id: row.post_id,
    sort_order: row.sort_order,
    storage_path: row.storage_path,
    width: row.width,
  };
}
