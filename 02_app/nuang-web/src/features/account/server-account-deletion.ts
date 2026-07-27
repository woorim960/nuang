import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { communityProfileAvatarBucket } from "@/features/account/community-profile";
import { ensureAccountForUser } from "@/features/account/server-writes";
import { feedMediaBucket } from "@/features/feed/feed-media";

type AccountDeletionResult =
  | { cleanupPending?: boolean; ok: true }
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

  const deletion = await client.rpc("delete_own_nuang_account", {
    p_account_id: account.accountId,
    p_supabase_user_id: user.id,
  });

  if (deletion.error || deletion.data !== true) {
    return { code: "account_delete_failed", ok: false };
  }

  let cleanupPending = false;

  for (const [bucket, paths] of media.pathsByBucket) {
    for (let index = 0; index < paths.length; index += 100) {
      const removal = await client.storage
        .from(bucket)
        .remove(paths.slice(index, index + 100));
      if (removal.error) {
        cleanupPending = true;
      }
    }
  }

  if (cleanupPending) {
    console.error("Account deleted but owned media cleanup is pending.", {
      accountId: account.accountId,
    });
  }

  return cleanupPending ? { cleanupPending: true, ok: true } : { ok: true };
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

  const mediaRows: Array<{ bucket_id: string; storage_path: string }> = [];
  const postIds = postRows.map((post) => post.id);

  for (let index = 0; index < postIds.length; index += 200) {
    const response = await client
      .schema("feed")
      .from("feed_post_media")
      .select("bucket_id,storage_path")
      .in("post_id", postIds.slice(index, index + 200));

    if (response.error && !isMissingMediaTable(response.error)) {
      return { ok: false as const };
    }
    mediaRows.push(...(response.data ?? []));
  }

  const pathsByBucket = new Map<string, string[]>();
  const add = (bucket: string, path: string) => {
    const paths = pathsByBucket.get(bucket) ?? [];
    if (!paths.includes(path)) paths.push(path);
    pathsByBucket.set(bucket, paths);
  };
  const profileRow = profile.data as
    | { avatar_bucket: string | null; avatar_object_path: string | null }
    | null;

  if (
    profileRow?.avatar_bucket === communityProfileAvatarBucket &&
    profileRow.avatar_object_path
  ) {
    add(profileRow.avatar_bucket, profileRow.avatar_object_path);
  }

  for (const row of mediaRows) {
    if (row.bucket_id === feedMediaBucket && row.storage_path) {
      add(row.bucket_id, row.storage_path);
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
        add(feedMediaBucket, attachment.storagePath);
      }
    }
  }

  return { ok: true as const, pathsByBucket };
}

function isMissingMediaTable(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.message?.includes("feed_post_media") === true
  );
}
