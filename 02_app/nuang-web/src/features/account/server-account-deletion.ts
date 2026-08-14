import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { communityProfileAvatarBucket } from "@/features/account/community-profile";
import { ensureAccountForUser } from "@/features/account/server-writes";
import {
  feedMediaBucket,
  isFeedMediaStorageProvider,
} from "@/features/feed/feed-media";
import {
  deleteFeedMediaObjects,
  type FeedMediaStoredObject,
} from "@/features/feed/feed-media-storage";

type AccountDeletionResult =
  | { ok: true }
  | {
      code:
        | "account_delete_failed"
        | "account_link_missing"
        | "media_cleanup_failed";
      ok: false;
    };

export async function deleteOwnAccount({
  client,
  user,
}: {
  client: SupabaseClient;
  user: User;
}): Promise<AccountDeletionResult> {
  const account = await ensureAccountForUser(client, user);
  if (!account.ok) return { code: "account_link_missing", ok: false };

  const media = await readOwnedMedia(client, account.accountId);
  if (!media.ok) return { code: "media_cleanup_failed", ok: false };

  for (const [bucket, paths] of media.pathsByBucket) {
    for (let index = 0; index < paths.length; index += 100) {
      const removal = await client.storage
        .from(bucket)
        .remove(paths.slice(index, index + 100));
      if (removal.error) {
        return { code: "media_cleanup_failed", ok: false };
      }
    }
  }

  const deletion = await client.rpc("delete_own_nuang_account", {
    p_account_id: account.accountId,
    p_supabase_user_id: user.id,
  });

  if (deletion.error || deletion.data !== true) {
    return { code: "account_delete_failed", ok: false };
  }

  // Only fully activated objects are safe to delete immediately. Physically
  // deleting the account has already queued every accounted media row in the
  // same database transaction. Hidden uploads keep that trigger-created
  // fifteen-minute grace so a late immutable PUT cannot land after resolution.
  const immediateFeedObjects = media.feedObjects.filter(
    (object) => object.deleteImmediately,
  );
  const feedRemoval = await deleteFeedMediaObjects({
    client,
    objects: immediateFeedObjects.map(({ provider, storagePath }) => ({
      provider,
      storagePath,
    })),
  });
  const failedKeys = new Set(
    feedRemoval.failedObjects.map(
      (object) => `${object.provider}\n${object.storagePath}`,
    ),
  );
  await resolveFeedCleanup(
    client,
    immediateFeedObjects.filter(
      (object) => !failedKeys.has(`${object.provider}\n${object.storagePath}`),
    ),
  );

  return { ok: true };
}

async function readOwnedMedia(client: SupabaseClient, accountId: string) {
  const profile = await client
    .schema("profile")
    .from("community_profile")
    .select("avatar_bucket,avatar_object_path")
    .eq("account_id", accountId)
    .maybeSingle();

  if (profile.error) return { ok: false as const };

  const postRows: Array<{
    attachment_payload: unknown;
    id: string;
  }> = [];

  for (let start = 0; ; start += 1000) {
    const response = await client
      .schema("feed")
      .from("feed_post")
      .select("id,attachment_payload")
      .eq("author_account_id", accountId)
      .range(start, start + 999);

    if (response.error) return { ok: false as const };
    postRows.push(...(response.data ?? []));
    if ((response.data?.length ?? 0) < 1000) break;
  }

  const mediaRows: Array<{
    bucket_id: string;
    deleted_at?: unknown;
    storage_accounted?: unknown;
    storage_path: string;
    storage_provider?: unknown;
    storage_ready?: unknown;
  }> = [];
  const postIds = postRows.map((post) => post.id);

  for (let index = 0; index < postIds.length; index += 200) {
    let response = (await client
      .schema("feed")
      .from("feed_post_media")
      .select(
        "bucket_id,storage_path,storage_provider,storage_ready,deleted_at,storage_accounted",
      )
      .in("post_id", postIds.slice(index, index + 200))) as {
      data: Array<{
        bucket_id: string;
        deleted_at?: unknown;
        storage_accounted?: unknown;
        storage_path: string;
        storage_provider?: unknown;
        storage_ready?: unknown;
      }> | null;
      error: unknown;
    };

    if (isMissingStorageProviderColumn(response.error)) {
      response = (await client
        .schema("feed")
        .from("feed_post_media")
        .select("bucket_id,storage_path,deleted_at")
        .in("post_id", postIds.slice(index, index + 200))) as {
        data: Array<{
          bucket_id: string;
          deleted_at?: unknown;
          storage_accounted?: unknown;
          storage_path: string;
          storage_provider?: unknown;
          storage_ready?: unknown;
        }> | null;
        error: unknown;
      };
    }

    if (
      response.error &&
      !isMissingMediaTable(
        response.error as { code?: string; message?: string },
      )
    ) {
      return { ok: false as const };
    }
    mediaRows.push(...(response.data ?? []));
  }

  const pathsByBucket = new Map<string, string[]>();
  const feedObjects: Array<
    FeedMediaStoredObject & { deleteImmediately: boolean }
  > = [];
  const supabaseMediaPaths = new Set<string>();
  const add = (bucket: string, path: string) => {
    const paths = pathsByBucket.get(bucket) ?? [];
    if (!paths.includes(path)) paths.push(path);
    pathsByBucket.set(bucket, paths);
  };
  const profileRow = profile.data as {
    avatar_bucket: string | null;
    avatar_object_path: string | null;
  } | null;

  if (
    profileRow?.avatar_bucket === communityProfileAvatarBucket &&
    profileRow.avatar_object_path
  ) {
    add(profileRow.avatar_bucket, profileRow.avatar_object_path);
  }

  for (const row of mediaRows) {
    const provider = row.storage_provider ?? "supabase";
    if (
      row.bucket_id === feedMediaBucket &&
      row.storage_path &&
      isFeedMediaStorageProvider(provider)
    ) {
      feedObjects.push({
        deleteImmediately:
          row.storage_ready !== false && row.storage_accounted !== false,
        provider,
        storagePath: row.storage_path,
      });
      if (provider === "supabase") supabaseMediaPaths.add(row.storage_path);
    }
  }

  for (const post of postRows) {
    if (!Array.isArray(post.attachment_payload)) continue;
    for (const attachment of post.attachment_payload) {
      if (
        attachment &&
        typeof attachment === "object" &&
        "storagePath" in attachment &&
        typeof attachment.storagePath === "string"
      ) {
        // Attachment-only fallback objects predate the media table and have no
        // physical-delete trigger to create durable cleanup work. Preserve the
        // original fail-closed account-deletion order for only those paths.
        if (!supabaseMediaPaths.has(attachment.storagePath)) {
          add(feedMediaBucket, attachment.storagePath);
        }
      }
    }
  }

  return { feedObjects, ok: true as const, pathsByBucket };
}

async function resolveFeedCleanup(
  client: SupabaseClient,
  objects: FeedMediaStoredObject[],
) {
  await Promise.all(
    objects.map((object) =>
      client.schema("feed").rpc("resolve_media_storage_cleanup", {
        p_storage_path: object.storagePath,
        p_storage_provider: object.provider,
      }),
    ),
  );
}

function isMissingStorageProviderColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return (
    candidate.code === "42703" ||
    candidate.code === "PGRST204" ||
    (typeof candidate.message === "string" &&
      (candidate.message.includes("storage_provider") ||
        candidate.message.includes("storage_ready")))
  );
}

function isMissingMediaTable(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.message?.includes("feed_post_media") === true
  );
}
