import { randomUUID } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ensureAccountForUser } from "@/features/account/server-writes";
import {
  feedMediaBucket,
  getFeedPhotoExtension,
  isSupportedFeedPhotoType,
  validateFeedPhotoFiles,
} from "@/features/feed/feed-media";
import type { FeedWriteFailureCode } from "@/features/feed/feed-write-contract";

type FeedMediaWriteResult =
  { ok: true } | { code: FeedWriteFailureCode; ok: false };

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
    return { code: "feed_target_invalid", ok: false };
  }

  const account = await ensureAccountForUser(client, user);

  if (!account.ok) {
    return { code: "account_link_missing", ok: false };
  }

  const postResponse = await client
    .schema("feed")
    .from("feed_post")
    .select("id, attachment_payload")
    .eq("id", postId)
    .eq("author_account_id", account.accountId)
    .maybeSingle();

  if (postResponse.error || !postResponse.data) {
    return { code: "feed_target_invalid", ok: false };
  }

  const bucketReady = await ensureFeedMediaBucket(client);
  if (!bucketReady) return { code: "feed_media_upload_failed", ok: false };

  const uploadedPaths: string[] = [];

  for (const [index, file] of files.entries()) {
    if (!isSupportedFeedPhotoType(file.type)) {
      await rollbackPostWithMedia({
        client,
        postId,
        storagePaths: uploadedPaths,
      });
      return { code: "feed_target_invalid", ok: false };
    }

    const order = index + 1;
    const extension = getFeedPhotoExtension(file.type);
    const path = `${account.accountId}/${postId}/${String(order).padStart(2, "0")}-${randomUUID()}.${extension}`;
    const uploadResponse = await client.storage
      .from(feedMediaBucket)
      .upload(path, await file.arrayBuffer(), {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadResponse.error) {
      await rollbackPostWithMedia({
        client,
        postId,
        storagePaths: uploadedPaths,
      });
      return { code: "feed_media_upload_failed", ok: false };
    }

    uploadedPaths.push(path);
  }

  const mediaRows = files.map((file, index) => ({
    bucket_id: feedMediaBucket,
    byte_size: file.size,
    mime_type: file.type,
    post_id: postId,
    sort_order: index + 1,
    storage_path: uploadedPaths[index],
  }));
  const mediaResponse = await client
    .schema("feed")
    .from("feed_post_media")
    .insert(mediaRows);

  if (isMissingMediaTable(mediaResponse.error)) {
    const previousAttachments = Array.isArray(postResponse.data.attachment_payload)
      ? postResponse.data.attachment_payload
      : [];
    const fallbackResponse = await client
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

    if (!fallbackResponse.error) return { ok: true };
  }

  if (mediaResponse.error) {
    await rollbackPostWithMedia({
      client,
      postId,
      storagePaths: uploadedPaths,
    });
    return { code: "feed_media_upload_failed", ok: false };
  }

  return { ok: true };
}

async function ensureFeedMediaBucket(client: SupabaseClient) {
  const buckets = await client.storage.listBuckets();
  if (buckets.error) return false;
  if (buckets.data.some((bucket) => bucket.id === feedMediaBucket)) return true;

  const created = await client.storage.createBucket(feedMediaBucket, {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    fileSizeLimit: 8 * 1024 * 1024,
    public: false,
  });
  return !created.error;
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

async function rollbackPostWithMedia({
  client,
  postId,
  storagePaths,
}: {
  client: SupabaseClient;
  postId: string;
  storagePaths: string[];
}) {
  if (storagePaths.length > 0) {
    await client.storage.from(feedMediaBucket).remove(storagePaths);
  }

  await client.schema("feed").from("feed_post").delete().eq("id", postId);
}
