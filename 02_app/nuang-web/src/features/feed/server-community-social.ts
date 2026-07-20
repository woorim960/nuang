import type { SupabaseClient, User } from "@supabase/supabase-js";
import type {
  CommunityNotification,
  CommunityProfileSocialState,
} from "@/features/feed/community-social-contract";
import { getModerationSeverity } from "@/features/moderation/moderation-queue-contract";

type ServiceClient = SupabaseClient;

export async function readCommunityProfileSocialState({
  client,
  publicSnapshotId,
  user,
}: {
  client: ServiceClient;
  publicSnapshotId: string;
  user: User | null;
}): Promise<CommunityProfileSocialState> {
  const snapshot = await readSnapshotOwner(client, publicSnapshotId);

  if (!snapshot) {
    return { followerCount: 0, following: false, isOwnProfile: false };
  }

  const [followerResponse, viewerAccountId] = await Promise.all([
    client
      .schema("feed")
      .from("profile_follow")
      .select("id", { count: "exact", head: true })
      .eq("target_account_id", snapshot.accountId)
      .is("deleted_at", null),
    user ? readAccountId(client, user.id) : Promise.resolve(null),
  ]);

  if (!viewerAccountId) {
    return {
      followerCount: followerResponse.count ?? 0,
      following: false,
      isOwnProfile: false,
    };
  }

  if (viewerAccountId === snapshot.accountId) {
    return {
      followerCount: followerResponse.count ?? 0,
      following: false,
      isOwnProfile: true,
    };
  }

  const followResponse = await client
    .schema("feed")
    .from("profile_follow")
    .select("id")
    .eq("follower_account_id", viewerAccountId)
    .eq("target_account_id", snapshot.accountId)
    .is("deleted_at", null)
    .maybeSingle();

  return {
    followerCount: followerResponse.count ?? 0,
    following: Boolean(followResponse.data),
    isOwnProfile: false,
  };
}

export async function readCommunityNotifications({
  client,
  user,
}: {
  client: ServiceClient;
  user: User;
}): Promise<CommunityNotification[]> {
  const accountId = await readAccountId(client, user.id);
  if (!accountId) return [];

  const response = await client
    .schema("feed")
    .from("activity_notification")
    .select(
      "id,event_type,actor_display_name,actor_public_snapshot_id,target_type,target_id,preview_text,created_at",
    )
    .eq("recipient_account_id", accountId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (response.error) return [];

  return (response.data ?? []).map((row) => ({
    actorDisplayName: String(row.actor_display_name ?? "누군가"),
    actorPublicSnapshotId:
      typeof row.actor_public_snapshot_id === "string"
        ? row.actor_public_snapshot_id
        : null,
    createdAt: String(row.created_at),
    eventType: row.event_type as CommunityNotification["eventType"],
    id: String(row.id),
    previewText: typeof row.preview_text === "string" ? row.preview_text : null,
    targetId: String(row.target_id),
    targetType: row.target_type as CommunityNotification["targetType"],
  }));
}

export async function writeProfileFollow({
  action,
  client,
  publicSnapshotId,
  user,
}: {
  action: "follow" | "unfollow";
  client: ServiceClient;
  publicSnapshotId: string;
  user: User;
}) {
  const [snapshot, followerAccountId] = await Promise.all([
    readSnapshotOwner(client, publicSnapshotId),
    readAccountId(client, user.id),
  ]);

  if (!snapshot || !followerAccountId) {
    return { code: "profile_not_found" as const, ok: false as const };
  }

  if (snapshot.accountId === followerAccountId) {
    return { code: "cannot_follow_self" as const, ok: false as const };
  }

  const now = new Date().toISOString();
  const mutation = await client
    .schema("feed")
    .from("profile_follow")
    .upsert(
      {
        created_at: now,
        deleted_at: action === "follow" ? null : now,
        follower_account_id: followerAccountId,
        target_account_id: snapshot.accountId,
        target_public_snapshot_id: publicSnapshotId,
        updated_at: now,
      },
      { onConflict: "follower_account_id,target_account_id" },
    );

  if (mutation.error) {
    console.error("[community-follow] profile_follow upsert failed", {
      code: mutation.error.code,
      message: mutation.error.message,
    });
    return { code: "follow_write_failed" as const, ok: false as const };
  }

  if (action === "follow") {
    const actorSnapshotResponse = await client
      .schema("profile")
      .from("profile_public_snapshot")
      .select("id")
      .eq("account_id", followerAccountId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    await client
      .schema("feed")
      .from("activity_notification")
      .insert({
        actor_account_id: followerAccountId,
        actor_display_name: getDisplayName(user),
        actor_public_snapshot_id: actorSnapshotResponse.data?.id ?? null,
        event_type: "follow",
        preview_text: "새로운 팔로우가 시작됐어요.",
        recipient_account_id: snapshot.accountId,
        target_id: publicSnapshotId,
        target_type: "public_profile",
      });
  }

  const countResponse = await client
    .schema("feed")
    .from("profile_follow")
    .select("id", { count: "exact", head: true })
    .eq("target_account_id", snapshot.accountId)
    .is("deleted_at", null);

  return {
    data: {
      followerCount: countResponse.count ?? 0,
      following: action === "follow",
    },
    ok: true as const,
  };
}

export async function readBlockedCommunityAccountIds({
  accountId,
  client,
}: {
  accountId: string | null;
  client: ServiceClient;
}) {
  if (!accountId) return new Set<string>();

  const response = await client
    .schema("feed")
    .from("profile_block")
    .select("blocked_account_id")
    .eq("blocker_account_id", accountId)
    .is("deleted_at", null);

  if (response.error) return new Set<string>();
  return new Set(
    (response.data ?? []).map((row) => String(row.blocked_account_id)),
  );
}

export async function writeProfileSafetyAction({
  action,
  client,
  details,
  publicSnapshotId,
  reason,
  user,
}: {
  action: "block" | "report" | "unblock";
  client: ServiceClient;
  details?: string;
  publicSnapshotId: string;
  reason?: "privacy" | "harassment" | "sensitive_content" | "spam" | "other";
  user: User;
}) {
  const [snapshot, viewerAccountId] = await Promise.all([
    readSnapshotOwner(client, publicSnapshotId),
    readAccountId(client, user.id),
  ]);

  if (!snapshot || !viewerAccountId) {
    return { code: "profile_not_found" as const, ok: false as const };
  }

  if (snapshot.accountId === viewerAccountId) {
    return { code: "cannot_target_self" as const, ok: false as const };
  }

  const now = new Date().toISOString();

  if (action === "report") {
    if (!reason) {
      return { code: "report_reason_required" as const, ok: false as const };
    }

    const response = await client
      .schema("feed")
      .from("profile_report")
      .insert({
        created_at: now,
        details: details?.trim() || null,
        reason,
        reporter_account_id: viewerAccountId,
        severity: getModerationSeverity(reason),
        status: "queued",
        target_account_id: snapshot.accountId,
        target_public_snapshot_id: publicSnapshotId,
      });

    return response.error
      ? { code: "profile_report_failed" as const, ok: false as const }
      : { data: { reported: true }, ok: true as const };
  }

  const response = await client
    .schema("feed")
    .from("profile_block")
    .upsert(
      {
        blocked_account_id: snapshot.accountId,
        blocker_account_id: viewerAccountId,
        created_at: now,
        deleted_at: action === "block" ? null : now,
        target_public_snapshot_id: publicSnapshotId,
        updated_at: now,
      },
      { onConflict: "blocker_account_id,blocked_account_id" },
    );

  return response.error
    ? { code: "profile_block_failed" as const, ok: false as const }
    : { data: { blocked: action === "block" }, ok: true as const };
}

async function readSnapshotOwner(
  client: ServiceClient,
  publicSnapshotId: string,
) {
  const response = await client
    .schema("profile")
    .from("profile_public_snapshot")
    .select("account_id,status")
    .eq("id", publicSnapshotId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (response.error || !response.data) return null;

  return { accountId: String(response.data.account_id) };
}

async function readAccountId(client: ServiceClient, supabaseUserId: string) {
  const response = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", supabaseUserId)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return response.data ? String(response.data.account_id) : null;
}

function getDisplayName(user: User) {
  const metadata = user.user_metadata ?? {};
  const value = metadata.name ?? metadata.full_name ?? metadata.nickname;
  return typeof value === "string" && value.trim() ? value.trim() : "누군가";
}
