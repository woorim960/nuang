import type { SupabaseClient, User } from "@supabase/supabase-js";
import type {
  CommunityNotification,
  CommunityNotificationsResult,
  CommunityProfileConnection,
  CommunityProfileConnectionsResult,
  CommunityProfileSocialState,
} from "@/features/feed/community-social-contract";
import { ensureAccountForUser } from "@/features/account/server-writes";
import {
  mergeCommunityProfileIntoSnapshot,
  readCommunityProfilesForAccounts,
} from "@/features/account/server-community-profile";
import { getModerationSeverity } from "@/features/moderation/moderation-queue-contract";
import { isCurrentNuangCode } from "@/features/nuang-code/profile-name-resolution";
import { createCharacterProfileImage } from "@/features/public-profile/profile-image";
import type { PublicProfileSnapshotPayload } from "@/features/together/public-comparison-contract";

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
    return {
      followerCount: 0,
      following: false,
      followingCount: 0,
      isOwnProfile: false,
    };
  }

  const [followerResponse, followingResponse, viewerAccountId] =
    await Promise.all([
      client
        .schema("feed")
        .from("profile_follow")
        .select("id", { count: "exact", head: true })
        .eq("target_account_id", snapshot.accountId)
        .is("deleted_at", null),
      client
        .schema("feed")
        .from("profile_follow")
        .select("id", { count: "exact", head: true })
        .eq("follower_account_id", snapshot.accountId)
        .is("deleted_at", null),
      user ? readAccountId(client, user.id) : Promise.resolve(null),
    ]);

  if (!viewerAccountId) {
    return {
      followerCount: followerResponse.count ?? 0,
      following: false,
      followingCount: followingResponse.count ?? 0,
      isOwnProfile: false,
    };
  }

  if (viewerAccountId === snapshot.accountId) {
    return {
      followerCount: followerResponse.count ?? 0,
      following: false,
      followingCount: followingResponse.count ?? 0,
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
    followingCount: followingResponse.count ?? 0,
    isOwnProfile: false,
  };
}

export async function readCommunityProfileConnections({
  client,
  publicSnapshotId,
}: {
  client: ServiceClient;
  publicSnapshotId: string;
}): Promise<CommunityProfileConnectionsResult> {
  const snapshot = await readSnapshotOwner(client, publicSnapshotId);

  if (!snapshot) {
    return createEmptyConnectionsResult(publicSnapshotId, "profile_not_found");
  }

  const [followerResponse, followingResponse, ownerProfileResponse] =
    await Promise.all([
      client
        .schema("feed")
        .from("profile_follow")
        .select("follower_account_id,created_at")
        .eq("target_account_id", snapshot.accountId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      client
        .schema("feed")
        .from("profile_follow")
        .select("target_account_id,created_at")
        .eq("follower_account_id", snapshot.accountId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      client
        .schema("profile")
        .from("profile_public_snapshot")
        .select("snapshot_payload")
        .eq("id", publicSnapshotId)
        .maybeSingle(),
    ]);

  if (
    followerResponse.error ||
    followingResponse.error ||
    ownerProfileResponse.error
  ) {
    return createEmptyConnectionsResult(publicSnapshotId, "unavailable");
  }

  const followerRows = (followerResponse.data ?? []).map((row) => ({
    accountId: String(row.follower_account_id),
    connectedAt: String(row.created_at),
  }));
  const followingRows = (followingResponse.data ?? []).map((row) => ({
    accountId: String(row.target_account_id),
    connectedAt: String(row.created_at),
  }));
  const profilesByAccountId = await readConnectionProfiles({
    accountIds: [
      ...followerRows.map((row) => row.accountId),
      ...followingRows.map((row) => row.accountId),
    ],
    client,
  });

  if (!profilesByAccountId) {
    return createEmptyConnectionsResult(publicSnapshotId, "unavailable");
  }

  const ownerPayload = coerceSnapshotPayload(
    ownerProfileResponse.data?.snapshot_payload,
    publicSnapshotId,
  );

  return {
    followers: mapConnectionRows(followerRows, profilesByAccountId),
    following: mapConnectionRows(followingRows, profilesByAccountId),
    ownerDisplayName: ownerPayload?.displayProfile.displayName ?? "프로필",
    ownerPublicSnapshotId: publicSnapshotId,
    state: "ready",
  };
}

export async function readCommunityNotifications({
  client,
  user,
}: {
  client: ServiceClient;
  user: User;
}): Promise<CommunityNotificationsResult> {
  const accountId = await readAccountId(client, user.id);
  if (!accountId) return { notifications: [], state: "unavailable" };

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

  if (response.error) return { notifications: [], state: "unavailable" };

  return {
    notifications: (response.data ?? []).map((row) => ({
      actorDisplayName: String(row.actor_display_name ?? "누군가"),
      actorPublicSnapshotId:
        typeof row.actor_public_snapshot_id === "string"
          ? row.actor_public_snapshot_id
          : null,
      createdAt: String(row.created_at),
      eventType: row.event_type as CommunityNotification["eventType"],
      id: String(row.id),
      previewText:
        typeof row.preview_text === "string" ? row.preview_text : null,
      targetId: String(row.target_id),
      targetType: row.target_type as CommunityNotification["targetType"],
    })),
    state: "ready",
  };
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
    ensureAccountForUser(client, user).then((result) =>
      result.ok ? result.accountId : null,
    ),
  ]);

  if (!snapshot || !followerAccountId) {
    return { code: "profile_not_found" as const, ok: false as const };
  }

  if (snapshot.accountId === followerAccountId) {
    return { code: "cannot_follow_self" as const, ok: false as const };
  }

  if (
    await hasBlockRelationship({
      accountId: followerAccountId,
      client,
      targetAccountId: snapshot.accountId,
    })
  ) {
    return { code: "profile_not_found" as const, ok: false as const };
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
      .select("id,snapshot_payload")
      .eq("account_id", followerAccountId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const actorSnapshot = coerceSnapshotPayload(
      actorSnapshotResponse.data?.snapshot_payload,
      actorSnapshotResponse.data?.id ?? "",
    );

    await client
      .schema("feed")
      .from("activity_notification")
      .update({ deleted_at: now })
      .eq("recipient_account_id", snapshot.accountId)
      .eq("actor_account_id", followerAccountId)
      .eq("event_type", "follow")
      .is("deleted_at", null);

    const notificationResponse = await client
      .schema("feed")
      .from("activity_notification")
      .insert({
        actor_account_id: followerAccountId,
        actor_display_name:
          actorSnapshot?.displayProfile.displayName ?? getDisplayName(user),
        actor_public_snapshot_id: actorSnapshotResponse.data?.id ?? null,
        event_type: "follow",
        preview_text: "새로운 팔로우가 시작됐어요.",
        recipient_account_id: snapshot.accountId,
        target_id: publicSnapshotId,
        target_type: "public_profile",
      });

    if (notificationResponse.error) {
      console.error("[community-follow] activity notification insert failed", {
        code: notificationResponse.error.code,
        message: notificationResponse.error.message,
      });
    }
  } else {
    await client
      .schema("feed")
      .from("activity_notification")
      .update({ deleted_at: now })
      .eq("recipient_account_id", snapshot.accountId)
      .eq("actor_account_id", followerAccountId)
      .eq("event_type", "follow")
      .is("deleted_at", null);
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

  const [blockedByMe, blockedMe] = await Promise.all([
    client
      .schema("feed")
      .from("profile_block")
      .select("blocked_account_id")
      .eq("blocker_account_id", accountId)
      .is("deleted_at", null),
    client
      .schema("feed")
      .from("profile_block")
      .select("blocker_account_id")
      .eq("blocked_account_id", accountId)
      .is("deleted_at", null),
  ]);

  if (blockedByMe.error || blockedMe.error) return new Set<string>();

  return new Set([
    ...(blockedByMe.data ?? []).map((row) => String(row.blocked_account_id)),
    ...(blockedMe.data ?? []).map((row) => String(row.blocker_account_id)),
  ]);
}

async function hasBlockRelationship({
  accountId,
  client,
  targetAccountId,
}: {
  accountId: string;
  client: ServiceClient;
  targetAccountId: string;
}) {
  const [outgoing, incoming] = await Promise.all([
    client
      .schema("feed")
      .from("profile_block")
      .select("id", { count: "exact", head: true })
      .eq("blocker_account_id", accountId)
      .eq("blocked_account_id", targetAccountId)
      .is("deleted_at", null),
    client
      .schema("feed")
      .from("profile_block")
      .select("id", { count: "exact", head: true })
      .eq("blocker_account_id", targetAccountId)
      .eq("blocked_account_id", accountId)
      .is("deleted_at", null),
  ]);

  return (
    (!outgoing.error && (outgoing.count ?? 0) > 0) ||
    (!incoming.error && (incoming.count ?? 0) > 0)
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

function createEmptyConnectionsResult(
  publicSnapshotId: string,
  state: CommunityProfileConnectionsResult["state"],
): CommunityProfileConnectionsResult {
  return {
    followers: [],
    following: [],
    ownerDisplayName: "프로필",
    ownerPublicSnapshotId: publicSnapshotId,
    state,
  };
}

async function readConnectionProfiles({
  accountIds,
  client,
}: {
  accountIds: string[];
  client: ServiceClient;
}) {
  const uniqueAccountIds = [...new Set(accountIds)].filter(Boolean);
  const profilesByAccountId = new Map<string, CommunityProfileConnection>();
  if (uniqueAccountIds.length === 0) return profilesByAccountId;

  const response = await client
    .schema("profile")
    .from("profile_public_snapshot")
    .select("id,account_id,snapshot_payload,created_at")
    .in("account_id", uniqueAccountIds)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (response.error) return null;

  const communityProfiles = await readCommunityProfilesForAccounts({
    accountIds: uniqueAccountIds,
    client,
  });

  for (const row of response.data ?? []) {
    const accountId = String(row.account_id);
    if (profilesByAccountId.has(accountId)) continue;

    const publicSnapshotId = String(row.id);
    const baseSnapshot = coerceSnapshotPayload(
      row.snapshot_payload,
      publicSnapshotId,
    );
    if (!baseSnapshot || !isCurrentNuangCode(baseSnapshot.profile.code)) {
      continue;
    }

    const communityProfile = communityProfiles.get(accountId) ?? null;
    const snapshot = await mergeCommunityProfileIntoSnapshot({
      client,
      profile: communityProfile,
      snapshot: baseSnapshot,
    });
    if (!isCurrentNuangCode(snapshot.profile.code)) continue;

    profilesByAccountId.set(accountId, {
      code: snapshot.profile.code,
      communityProfileId: communityProfile?.id,
      connectedAt: "",
      displayName: snapshot.displayProfile.displayName,
      profileImage: snapshot.displayProfile.profileImage,
      profileName: snapshot.profile.name,
      publicSnapshotId,
    });
  }

  return profilesByAccountId;
}

function mapConnectionRows(
  rows: Array<{ accountId: string; connectedAt: string }>,
  profilesByAccountId: Map<string, CommunityProfileConnection>,
) {
  return rows.flatMap((row) => {
    const profile = profilesByAccountId.get(row.accountId);
    return profile ? [{ ...profile, connectedAt: row.connectedAt }] : [];
  });
}

function coerceSnapshotPayload(
  value: unknown,
  fallbackSnapshotId: string,
): PublicProfileSnapshotPayload | null {
  if (!value || typeof value !== "object") return null;

  const snapshot = value as PublicProfileSnapshotPayload;
  const displayName = snapshot.displayProfile?.displayName;
  const motif = snapshot.displayProfile?.motif;

  if (
    !displayName ||
    !motif ||
    !snapshot.profile?.code ||
    !snapshot.profile.name
  ) {
    return null;
  }

  return {
    ...snapshot,
    displayProfile: {
      ...snapshot.displayProfile,
      profileImage:
        snapshot.displayProfile.profileImage ??
        createCharacterProfileImage({
          alt: `${displayName} 프로필 이미지`,
          motif,
        }),
    },
    snapshotId: snapshot.snapshotId || fallbackSnapshotId,
  };
}

function getDisplayName(user: User) {
  const metadata = user.user_metadata ?? {};
  const value = metadata.name ?? metadata.full_name ?? metadata.nickname;
  return typeof value === "string" && value.trim() ? value.trim() : "누군가";
}
