import type { SupabaseClient, User } from "@supabase/supabase-js";
import { checkCommunityWriteGuard } from "@/features/feed/server-write-guard";
import { sendAdminReviewNotification } from "@/features/admin/server-admin-review-notification";
import type {
  CommunityNotification,
  CommunityNotificationsResult,
  CommunityProfileConnection,
  CommunityProfileConnectionsResult,
  CommunityProfileSocialState,
} from "@/features/feed/community-social-contract";
import { ensureAccountForUser } from "@/features/account/server-writes";
import {
  createNeutralCommunityProfileSnapshot,
  mergeCommunityProfileIntoSnapshot,
  readCommunityProfilesForAccounts,
} from "@/features/account/server-community-profile";
import { getModerationSeverity } from "@/features/moderation/moderation-queue-contract";
import { isCurrentNuangCode } from "@/features/nuang-code/profile-name-resolution";
import { createCharacterProfileImage } from "@/features/public-profile/profile-image";
import type { PublicProfileSnapshotPayload } from "@/features/together/public-comparison-contract";
import {
  callCommunityStableProfileMutationRpc,
  readCommunityStableProfileMutationReadiness,
} from "@/features/feed/server-community-stable-mutations";

type ServiceClient = SupabaseClient;
type PublicSnapshotConnectionRow = {
  account_id: string;
  id: string;
  snapshot_payload: unknown;
};

type CommunityProfileMutationTarget = {
  accountId: string;
  communityProfileId: string | null;
  displayName: string | null;
  publicSnapshotId: string | null;
};

export type BlockedCommunityAccountIdsResult =
  | {
      blockedAccountIds: Set<string>;
      state: "ready";
    }
  | {
      state: "unavailable";
    };

export async function readCommunityProfileSocialState({
  client,
  communityProfileId,
  publicSnapshotId,
  user,
}: {
  client: ServiceClient;
  communityProfileId?: string;
  publicSnapshotId: string;
  user: User | null;
}): Promise<CommunityProfileSocialState> {
  const snapshot = await resolveCommunityProfileMutationTarget({
    client,
    communityProfileId,
    publicSnapshotId,
  });

  if (!snapshot) {
    return {
      actions: createProfileActionAvailability(null, false),
      followerCount: 0,
      following: false,
      followingCount: 0,
      isOwnProfile: false,
    };
  }

  const [
    followerResponse,
    followingResponse,
    viewerAccountId,
    stableMutationReadiness,
  ] = await Promise.all([
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
    snapshot.communityProfileId
      ? readCommunityStableProfileMutationReadiness({ client })
      : Promise.resolve({ state: "disabled" as const }),
  ]);

  if (!viewerAccountId) {
    return {
      actions: createProfileActionAvailability(
        snapshot.publicSnapshotId,
        false,
        stableMutationReadiness.state,
      ),
      followerCount: followerResponse.count ?? 0,
      following: false,
      followingCount: followingResponse.count ?? 0,
      isOwnProfile: false,
    };
  }

  if (viewerAccountId === snapshot.accountId) {
    return {
      actions: createProfileActionAvailability(
        snapshot.publicSnapshotId,
        false,
        stableMutationReadiness.state,
      ),
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

  const following = Boolean(followResponse.data);

  return {
    actions: createProfileActionAvailability(
      snapshot.publicSnapshotId,
      following,
      stableMutationReadiness.state,
    ),
    followerCount: followerResponse.count ?? 0,
    following,
    followingCount: followingResponse.count ?? 0,
    isOwnProfile: false,
  };
}

export async function readCommunityProfileConnections({
  client,
  publicSnapshotId,
  user,
}: {
  client: ServiceClient;
  publicSnapshotId: string;
  user: User | null;
}): Promise<CommunityProfileConnectionsResult> {
  const [snapshot, viewerAccount] = await Promise.all([
    readPublicProfileOwner(client, publicSnapshotId),
    user
      ? readAccountIdResult(client, user.id)
      : Promise.resolve({ accountId: null, state: "ready" } as const),
  ]);

  if (!snapshot) {
    return createEmptyConnectionsResult(publicSnapshotId, "profile_not_found");
  }

  if (viewerAccount.state === "unavailable") {
    return createEmptyConnectionsResult(publicSnapshotId, "unavailable");
  }

  const blockedAccountIdsResult = await readBlockedCommunityAccountIds({
    accountId: viewerAccount.accountId,
    client,
  });
  if (blockedAccountIdsResult.state === "unavailable") {
    return createEmptyConnectionsResult(publicSnapshotId, "unavailable");
  }

  const { blockedAccountIds } = blockedAccountIdsResult;
  if (blockedAccountIds.has(snapshot.accountId)) {
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

  const followerRows = (followerResponse.data ?? [])
    .map((row) => ({
      accountId: String(row.follower_account_id),
      connectedAt: String(row.created_at),
    }))
    .filter((row) => !blockedAccountIds.has(row.accountId));
  const followingRows = (followingResponse.data ?? [])
    .map((row) => ({
      accountId: String(row.target_account_id),
      connectedAt: String(row.created_at),
    }))
    .filter((row) => !blockedAccountIds.has(row.accountId));
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
    ownerDisplayName:
      snapshot.displayName ??
      ownerPayload?.displayProfile.displayName ??
      "프로필",
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
  communityProfileId,
  publicSnapshotId,
  user,
}: {
  action: "follow" | "unfollow";
  client: ServiceClient;
  communityProfileId?: string;
  publicSnapshotId?: string;
  user: User;
}) {
  const [snapshot, followerAccountId] = await Promise.all([
    resolveCommunityProfileMutationTarget({
      allowInactiveTarget: action === "unfollow",
      client,
      communityProfileId,
      publicSnapshotId,
    }),
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

  if (snapshot.communityProfileId) {
    const readiness = await readCommunityStableProfileMutationReadiness({
      client,
    });
    if (readiness.state === "ready") {
      return writeStableProfileFollow({
        action,
        client,
        followerAccountId,
        target: {
          ...snapshot,
          communityProfileId: snapshot.communityProfileId,
        },
      });
    }
    if (readiness.state === "unavailable" && action === "follow") {
      return {
        code: "profile_action_unavailable" as const,
        ok: false as const,
      };
    }
  }

  if (action === "follow") {
    if (!snapshot.publicSnapshotId) {
      return {
        code: "profile_action_unavailable" as const,
        ok: false as const,
      };
    }

    const blockRelationship = await readBlockRelationship({
      accountId: followerAccountId,
      client,
      targetAccountId: snapshot.accountId,
    });
    if (blockRelationship.state === "unavailable") {
      return { code: "follow_write_failed" as const, ok: false as const };
    }
    if (blockRelationship.blocked) {
      return { code: "profile_not_found" as const, ok: false as const };
    }

    const guardFailure = await checkCommunityWriteGuard({
      accountId: followerAccountId,
      action: "follow_profile",
      client,
      target: {
        id: snapshot.publicSnapshotId,
        key: null,
        type: "public_profile",
      },
    });
    if (guardFailure) {
      return { code: "follow_write_failed" as const, ok: false as const };
    }
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
        target_public_snapshot_id: snapshot.publicSnapshotId,
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
        target_id:
          snapshot.communityProfileId ??
          snapshot.publicSnapshotId ??
          snapshot.accountId,
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

async function writeStableProfileFollow({
  action,
  client,
  followerAccountId,
  target,
}: {
  action: "follow" | "unfollow";
  client: ServiceClient;
  followerAccountId: string;
  target: CommunityProfileMutationTarget & { communityProfileId: string };
}) {
  const response = await callCommunityStableProfileMutationRpc({
    client,
    name: "set_profile_follow_v2",
    params: {
      p_expected_target_account_id: target.accountId,
      p_follower_account_id: followerAccountId,
      p_following: action === "follow",
      p_target_community_profile_id: target.communityProfileId,
    },
  });

  if (response.state !== "ready") {
    return { code: "follow_write_failed" as const, ok: false as const };
  }
  if (!response.result.ok) {
    return response.result.code === "blocked_relationship" ||
      response.result.code === "target_invalid"
      ? { code: "profile_not_found" as const, ok: false as const }
      : { code: "follow_write_failed" as const, ok: false as const };
  }

  const expectedCode = action === "follow" ? "following" : "unfollowed";
  if (
    response.result.code !== expectedCode ||
    response.result.following !== (action === "follow")
  ) {
    return { code: "follow_write_failed" as const, ok: false as const };
  }

  const countResponse = await client
    .schema("feed")
    .from("profile_follow")
    .select("id", { count: "exact", head: true })
    .eq("target_account_id", target.accountId)
    .is("deleted_at", null);

  if (countResponse.error) {
    return { code: "follow_write_failed" as const, ok: false as const };
  }

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
}): Promise<BlockedCommunityAccountIdsResult> {
  if (!accountId) {
    return { blockedAccountIds: new Set<string>(), state: "ready" };
  }

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

  if (blockedByMe.error || blockedMe.error) {
    console.error("[community-block] relationship read failed", {
      blockedByMeCode: blockedByMe.error?.code ?? null,
      blockedMeCode: blockedMe.error?.code ?? null,
    });
    return { state: "unavailable" };
  }

  return {
    blockedAccountIds: new Set([
      ...(blockedByMe.data ?? []).map((row) => String(row.blocked_account_id)),
      ...(blockedMe.data ?? []).map((row) => String(row.blocker_account_id)),
    ]),
    state: "ready",
  };
}

async function readBlockRelationship({
  accountId,
  client,
  targetAccountId,
}: {
  accountId: string;
  client: ServiceClient;
  targetAccountId: string;
}): Promise<{ blocked: boolean; state: "ready" } | { state: "unavailable" }> {
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

  if (outgoing.error || incoming.error) {
    return { state: "unavailable" };
  }

  return {
    blocked: (outgoing.count ?? 0) > 0 || (incoming.count ?? 0) > 0,
    state: "ready",
  };
}

export async function writeProfileSafetyAction({
  action,
  client,
  communityProfileId,
  details,
  publicSnapshotId,
  reason,
  user,
}: {
  action: "block" | "report" | "unblock";
  client: ServiceClient;
  communityProfileId?: string;
  details?: string;
  publicSnapshotId?: string;
  reason?: "privacy" | "harassment" | "sensitive_content" | "spam" | "other";
  user: User;
}) {
  const [snapshot, viewerAccountId] = await Promise.all([
    resolveCommunityProfileMutationTarget({
      allowInactiveTarget: action === "unblock",
      client,
      communityProfileId,
      publicSnapshotId,
    }),
    readAccountId(client, user.id),
  ]);

  if (!snapshot || !viewerAccountId) {
    return { code: "profile_not_found" as const, ok: false as const };
  }

  if (snapshot.accountId === viewerAccountId) {
    return { code: "cannot_target_self" as const, ok: false as const };
  }

  if (snapshot.communityProfileId) {
    const readiness = await readCommunityStableProfileMutationReadiness({
      client,
    });
    if (readiness.state === "ready") {
      return writeStableProfileSafetyAction({
        action,
        client,
        details,
        reason,
        target: {
          ...snapshot,
          communityProfileId: snapshot.communityProfileId,
        },
        viewerAccountId,
      });
    }
    if (readiness.state === "unavailable" && action !== "unblock") {
      return {
        code: "profile_action_unavailable" as const,
        ok: false as const,
      };
    }
  }

  if (action === "report") {
    const now = new Date().toISOString();
    if (!reason) {
      return { code: "report_reason_required" as const, ok: false as const };
    }
    if (!snapshot.publicSnapshotId) {
      return {
        code: "profile_action_unavailable" as const,
        ok: false as const,
      };
    }

    const guardFailure = await checkCommunityWriteGuard({
      accountId: viewerAccountId,
      action: "report_profile",
      client,
      target: {
        id: snapshot.publicSnapshotId,
        key: null,
        type: "public_profile",
      },
    });
    if (guardFailure === "rate_limited") {
      return {
        code: "profile_report_rate_limited" as const,
        ok: false as const,
      };
    }
    if (guardFailure) {
      return { code: "profile_report_failed" as const, ok: false as const };
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
        target_public_snapshot_id: snapshot.publicSnapshotId,
      })
      .select("id,created_at")
      .single();

    if (response.error?.code === "23505") {
      return {
        code: "profile_already_reported" as const,
        ok: false as const,
      };
    }

    if (response.error || !response.data) {
      return { code: "profile_report_failed" as const, ok: false as const };
    }

    await sendAdminReviewNotification({
      id: String(response.data.id),
      kind: "profile_report",
      occurredAt: String(response.data.created_at ?? now),
    });

    return { data: { reported: true }, ok: true as const };
  }

  if (!snapshot.publicSnapshotId) {
    return {
      code: "profile_action_unavailable" as const,
      ok: false as const,
    };
  }

  const response = await client.schema("feed").rpc("set_profile_block", {
    p_blocked: action === "block",
    p_blocked_account_id: snapshot.accountId,
    p_blocker_account_id: viewerAccountId,
    p_target_public_snapshot_id: snapshot.publicSnapshotId,
  });

  return response.error || response.data !== (action === "block")
    ? { code: "profile_block_failed" as const, ok: false as const }
    : { data: { blocked: action === "block" }, ok: true as const };
}

async function writeStableProfileSafetyAction({
  action,
  client,
  details,
  reason,
  target,
  viewerAccountId,
}: {
  action: "block" | "report" | "unblock";
  client: ServiceClient;
  details?: string;
  reason?: "privacy" | "harassment" | "sensitive_content" | "spam" | "other";
  target: CommunityProfileMutationTarget & { communityProfileId: string };
  viewerAccountId: string;
}) {
  if (action === "report") {
    if (!reason) {
      return { code: "report_reason_required" as const, ok: false as const };
    }

    const response = await callCommunityStableProfileMutationRpc({
      client,
      name: "create_profile_report_v2",
      params: {
        p_details: details?.trim() || null,
        p_expected_target_account_id: target.accountId,
        p_reason: reason,
        p_reporter_account_id: viewerAccountId,
        p_target_community_profile_id: target.communityProfileId,
      },
    });

    if (response.state !== "ready") {
      return { code: "profile_report_failed" as const, ok: false as const };
    }
    if (!response.result.ok) {
      if (response.result.code === "rate_limited") {
        return {
          code: "profile_report_rate_limited" as const,
          ok: false as const,
        };
      }
      return response.result.code === "target_invalid"
        ? { code: "profile_not_found" as const, ok: false as const }
        : { code: "profile_report_failed" as const, ok: false as const };
    }
    if (
      (response.result.code !== "reported" &&
        response.result.code !== "already_reported") ||
      response.result.reported !== true
    ) {
      return { code: "profile_report_failed" as const, ok: false as const };
    }

    if (response.result.code === "reported") {
      if (
        !response.result.changed ||
        !response.result.reportId ||
        !response.result.createdAt
      ) {
        return { code: "profile_report_failed" as const, ok: false as const };
      }
      await sendAdminReviewNotification({
        id: response.result.reportId,
        kind: "profile_report",
        occurredAt: response.result.createdAt,
      });
    }

    return { data: { reported: true }, ok: true as const };
  }

  const response = await callCommunityStableProfileMutationRpc({
    client,
    name: "set_profile_block_v2",
    params: {
      p_blocked: action === "block",
      p_blocker_account_id: viewerAccountId,
      p_expected_target_account_id: target.accountId,
      p_target_community_profile_id: target.communityProfileId,
    },
  });

  if (response.state !== "ready") {
    return { code: "profile_block_failed" as const, ok: false as const };
  }
  if (!response.result.ok) {
    if (response.result.code === "rate_limited") {
      return {
        code: "profile_block_rate_limited" as const,
        ok: false as const,
      };
    }
    return response.result.code === "target_invalid"
      ? { code: "profile_not_found" as const, ok: false as const }
      : { code: "profile_block_failed" as const, ok: false as const };
  }

  const blocked = action === "block";
  const expectedCode = blocked ? "blocked" : "unblocked";
  if (
    response.result.code !== expectedCode ||
    response.result.blocked !== blocked
  ) {
    return { code: "profile_block_failed" as const, ok: false as const };
  }

  return { data: { blocked }, ok: true as const };
}

function createProfileActionAvailability(
  publicSnapshotId: string | null,
  following: boolean,
  stableMutationState: "disabled" | "ready" | "unavailable" = "disabled",
): CommunityProfileSocialState["actions"] {
  if (stableMutationState === "ready") {
    return { block: "ready", follow: "ready", report: "ready" };
  }

  if (stableMutationState === "unavailable") {
    return {
      block: "unavailable",
      follow: following ? "unfollow_only" : "unavailable",
      report: "unavailable",
    };
  }

  if (publicSnapshotId) {
    return { block: "ready", follow: "ready", report: "ready" };
  }

  return {
    block: "unavailable",
    follow: following ? "unfollow_only" : "unavailable",
    report: "unavailable",
  };
}

async function readPublicProfileOwner(
  client: ServiceClient,
  publicSnapshotId: string,
) {
  return resolveCommunityProfileMutationTarget({ client, publicSnapshotId });
}

async function resolveCommunityProfileMutationTarget({
  allowInactiveTarget = false,
  client,
  communityProfileId,
  publicSnapshotId,
}: {
  allowInactiveTarget?: boolean;
  client: ServiceClient;
  communityProfileId?: string;
  publicSnapshotId?: string;
}): Promise<CommunityProfileMutationTarget | null> {
  if (communityProfileId) {
    const communityProfile = await readCommunityProfileById({
      allowInactiveTarget,
      client,
      communityProfileId,
    });
    if (communityProfile.state === "unavailable") return null;

    if (communityProfile.data) {
      const snapshot =
        publicSnapshotId && publicSnapshotId !== communityProfileId
          ? await readProfileSnapshotById({
              allowInactiveTarget,
              client,
              publicSnapshotId,
            })
          : ({ data: null, state: "ready" } as const);
      if (snapshot.state === "unavailable") return null;
      if (
        publicSnapshotId &&
        publicSnapshotId !== communityProfileId &&
        !snapshot.data
      ) {
        return null;
      }
      if (
        snapshot.data &&
        snapshot.data.accountId !== communityProfile.data.accountId
      ) {
        return null;
      }

      return {
        accountId: communityProfile.data.accountId,
        communityProfileId,
        displayName: communityProfile.data.displayName,
        publicSnapshotId: snapshot.data?.publicSnapshotId ?? null,
      };
    }

    // Existing clients used the snapshot UUID as a communityProfileId
    // fallback. Accept that rolling shape only when both identifiers match.
    if (!publicSnapshotId || publicSnapshotId !== communityProfileId) {
      return null;
    }
  }

  if (!publicSnapshotId) return null;

  const snapshot = await readProfileSnapshotById({
    allowInactiveTarget,
    client,
    publicSnapshotId,
  });
  if (snapshot.state === "unavailable") return null;
  if (snapshot.data) {
    return {
      accountId: snapshot.data.accountId,
      // A legacy request may only carry a snapshot UUID. Do not invent a
      // canonical stable target from another lookup during rolling deploy.
      communityProfileId: null,
      displayName: null,
      publicSnapshotId: snapshot.data.publicSnapshotId,
    };
  }

  const communityProfile = await readCommunityProfileById({
    allowInactiveTarget,
    client,
    communityProfileId: publicSnapshotId,
  });
  if (communityProfile.state === "unavailable" || !communityProfile.data) {
    return null;
  }

  return {
    accountId: communityProfile.data.accountId,
    communityProfileId: publicSnapshotId,
    displayName: communityProfile.data.displayName,
    publicSnapshotId: null,
  };
}

async function readProfileSnapshotById({
  allowInactiveTarget,
  client,
  publicSnapshotId,
}: {
  allowInactiveTarget: boolean;
  client: ServiceClient;
  publicSnapshotId: string;
}) {
  const query = client
    .schema("profile")
    .from("profile_public_snapshot")
    .select("account_id,status")
    .eq("id", publicSnapshotId)
    .is("revoked_at", null);
  const response = allowInactiveTarget
    ? await query.maybeSingle()
    : await query.eq("status", "active").is("deleted_at", null).maybeSingle();

  if (response.error) return { state: "unavailable" as const };
  return {
    data: response.data
      ? {
          accountId: String(response.data.account_id),
          publicSnapshotId,
        }
      : null,
    state: "ready" as const,
  };
}

async function readCommunityProfileById({
  allowInactiveTarget,
  client,
  communityProfileId,
}: {
  allowInactiveTarget: boolean;
  client: ServiceClient;
  communityProfileId: string;
}) {
  const query = client
    .schema("profile")
    .from("community_profile")
    .select("account_id,display_name")
    .eq("id", communityProfileId);
  const response = allowInactiveTarget
    ? await query.maybeSingle()
    : await query.eq("status", "active").is("deleted_at", null).maybeSingle();

  if (response.error) return { state: "unavailable" as const };
  return {
    data: response.data
      ? {
          accountId: String(response.data.account_id),
          displayName:
            typeof response.data.display_name === "string"
              ? response.data.display_name
              : null,
        }
      : null,
    state: "ready" as const,
  };
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

async function readAccountIdResult(
  client: ServiceClient,
  supabaseUserId: string,
): Promise<{ accountId: string; state: "ready" } | { state: "unavailable" }> {
  const response = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", supabaseUserId)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (response.error || !response.data?.account_id) {
    return { state: "unavailable" };
  }

  return { accountId: String(response.data.account_id), state: "ready" };
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

  const communityProfiles = await readCommunityProfilesForAccounts({
    accountIds: uniqueAccountIds,
    client,
  });

  const latestSnapshotByAccountId = new Map<
    string,
    PublicSnapshotConnectionRow
  >();
  for (const row of (response.error
    ? []
    : (response.data ?? [])) as PublicSnapshotConnectionRow[]) {
    const accountId = String(row.account_id);
    if (!latestSnapshotByAccountId.has(accountId)) {
      latestSnapshotByAccountId.set(accountId, row);
    }
  }

  for (const accountId of uniqueAccountIds) {
    const communityProfile = communityProfiles.get(accountId);
    if (!communityProfile) continue;
    const row = latestSnapshotByAccountId.get(accountId);

    const publicSnapshotId = row ? String(row.id) : communityProfile.id;
    const baseSnapshot = row
      ? coerceSnapshotPayload(row.snapshot_payload, publicSnapshotId)
      : null;

    const snapshot = baseSnapshot
      ? await mergeCommunityProfileIntoSnapshot({
          client,
          profile: communityProfile,
          snapshot: baseSnapshot,
        })
      : await createNeutralCommunityProfileSnapshot({
          client,
          profile: communityProfile,
        });
    const mayExposeCode = isCurrentNuangCode(snapshot.profile.code);

    profilesByAccountId.set(accountId, {
      code: mayExposeCode ? snapshot.profile.code : null,
      communityProfileId: communityProfile.id,
      connectedAt: "",
      displayName: snapshot.displayProfile.displayName,
      profileImage:
        !mayExposeCode &&
        snapshot.displayProfile.profileImage.source === "trait_image"
          ? createCharacterProfileImage({
              alt: `${snapshot.displayProfile.displayName} 프로필 이미지`,
              motif: snapshot.displayProfile.motif,
            })
          : snapshot.displayProfile.profileImage,
      profileName: mayExposeCode ? snapshot.profile.name : null,
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

  if (!displayName || !motif) return null;

  const code =
    typeof snapshot.profile?.code === "string" && snapshot.profile.code
      ? snapshot.profile.code
      : "-----";
  const profileName =
    typeof snapshot.profile?.name === "string" && snapshot.profile.name
      ? snapshot.profile.name
      : "비공개 성향";

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
    profile: { code, name: profileName },
    snapshotId: snapshot.snapshotId || fallbackSnapshotId,
  };
}

function getDisplayName(user: User) {
  const metadata = user.user_metadata ?? {};
  const value = metadata.name ?? metadata.full_name ?? metadata.nickname;
  return typeof value === "string" && value.trim() ? value.trim() : "누군가";
}
