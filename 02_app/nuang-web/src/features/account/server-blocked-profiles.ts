import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { BlockedProfile } from "@/features/account/blocked-profile-contract";
import {
  readCommunityProfilesForAccounts,
  resolveCommunityProfileImage,
} from "@/features/account/server-community-profile";
import {
  createCharacterProfileImage,
  type PublicProfileImage,
} from "@/features/public-profile/profile-image";
import {
  callCommunityStableProfileMutationRpc,
  readCommunityStableProfileMutationReadiness,
} from "@/features/feed/server-community-stable-mutations";

type BlockRow = {
  blocked_account_id: string;
  created_at: string;
  target_community_profile_id?: string | null;
  target_public_snapshot_id: string | null;
};

type SnapshotRow = {
  account_id: string;
  id: string;
  snapshot_payload: unknown;
};

export async function readBlockedProfiles({
  client,
  user,
}: {
  client: SupabaseClient;
  user: User;
}): Promise<{ blockedProfiles: BlockedProfile[]; ok: true } | { ok: false }> {
  const accountId = await readAccountId(client, user.id);
  if (!accountId) return { ok: false };

  const stableMutationReadiness =
    await readCommunityStableProfileMutationReadiness({ client });
  const blockResponse =
    stableMutationReadiness.state === "ready"
      ? await client
          .schema("feed")
          .from("profile_block")
          .select(
            "blocked_account_id,target_community_profile_id,target_public_snapshot_id,created_at",
          )
          .eq("blocker_account_id", accountId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
      : await client
          .schema("feed")
          .from("profile_block")
          .select("blocked_account_id,target_public_snapshot_id,created_at")
          .eq("blocker_account_id", accountId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

  if (blockResponse.error) return { ok: false };

  const blocks = (blockResponse.data ?? []) as unknown as BlockRow[];
  if (blocks.length === 0) return { blockedProfiles: [], ok: true };

  const blockedAccountIds = blocks.map((row) => row.blocked_account_id);
  const snapshotResponse = await client
    .schema("profile")
    .from("profile_public_snapshot")
    .select("id,account_id,snapshot_payload,created_at")
    .in("account_id", blockedAccountIds)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (snapshotResponse.error) return { ok: false };

  const snapshotByAccountId = new Map<string, SnapshotRow>();
  for (const row of (snapshotResponse.data ?? []) as SnapshotRow[]) {
    if (!snapshotByAccountId.has(row.account_id)) {
      snapshotByAccountId.set(row.account_id, row);
    }
  }

  const communityProfiles = await readCommunityProfilesForAccounts({
    accountIds: blockedAccountIds,
    client,
  });
  const blockedProfiles = await Promise.all(
    blocks.map(async (block) => {
      const fallback = toBlockedProfile(
        block,
        snapshotByAccountId.get(block.blocked_account_id),
      );
      const communityProfile = communityProfiles.get(block.blocked_account_id);

      if (!communityProfile) return fallback;

      return {
        ...fallback,
        communityProfileId:
          block.target_community_profile_id ?? communityProfile.id,
        displayName: communityProfile.displayName,
        profileImage: await resolveCommunityProfileImage({
          client,
          fallback: createCharacterProfileImage({
            alt: `${communityProfile.displayName} 프로필 이미지`,
            motif: communityProfile.avatarCharacterKey,
          }),
          profile: communityProfile,
        }),
      };
    }),
  );

  return {
    blockedProfiles,
    ok: true,
  };
}

export async function unblockProfileByAccountId({
  blockedAccountId,
  client,
  communityProfileId,
  user,
}: {
  blockedAccountId: string;
  client: SupabaseClient;
  communityProfileId?: string | null;
  user: User;
}) {
  const accountId = await readAccountId(client, user.id);
  if (!accountId || accountId === blockedAccountId)
    return { ok: false as const };

  const stableMutationReadiness =
    await readCommunityStableProfileMutationReadiness({ client });
  if (stableMutationReadiness.state === "ready") {
    const stableTarget =
      communityProfileId ??
      (await readBlockedCommunityProfileId({
        accountId,
        blockedAccountId,
        client,
      }));

    if (stableTarget === undefined) {
      return { ok: false as const };
    }

    if (stableTarget) {
      const mutation = await callCommunityStableProfileMutationRpc({
        client,
        name: "set_profile_block_v2",
        params: {
          p_blocked: false,
          p_blocker_account_id: accountId,
          p_expected_target_account_id: blockedAccountId,
          p_target_community_profile_id: stableTarget,
        },
      });

      if (
        mutation.state !== "ready" ||
        !mutation.result.ok ||
        mutation.result.code !== "unblocked" ||
        mutation.result.blocked !== false
      ) {
        return { ok: false as const };
      }

      return { ok: true as const };
    }
  }

  const response = await client
    .schema("feed")
    .from("profile_block")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("blocker_account_id", accountId)
    .eq("blocked_account_id", blockedAccountId)
    .is("deleted_at", null)
    .select("id");

  return response.error ? { ok: false as const } : { ok: true as const };
}

async function readBlockedCommunityProfileId({
  accountId,
  blockedAccountId,
  client,
}: {
  accountId: string;
  blockedAccountId: string;
  client: SupabaseClient;
}): Promise<string | null | undefined> {
  const blockResponse = await client
    .schema("feed")
    .from("profile_block")
    .select("target_community_profile_id")
    .eq("blocker_account_id", accountId)
    .eq("blocked_account_id", blockedAccountId)
    .is("deleted_at", null)
    .maybeSingle();

  if (blockResponse.error) return undefined;
  if (blockResponse.data?.target_community_profile_id) {
    return String(blockResponse.data.target_community_profile_id);
  }

  const profileResponse = await client
    .schema("profile")
    .from("community_profile")
    .select("id")
    .eq("account_id", blockedAccountId)
    .limit(1)
    .maybeSingle();

  if (profileResponse.error) return undefined;
  return profileResponse.data?.id ? String(profileResponse.data.id) : null;
}

async function readAccountId(client: SupabaseClient, supabaseUserId: string) {
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

function toBlockedProfile(
  block: BlockRow,
  snapshot: SnapshotRow | undefined,
): BlockedProfile {
  const display = readSnapshotDisplay(snapshot?.snapshot_payload);

  return {
    blockedAccountId: block.blocked_account_id,
    blockedAt: block.created_at,
    code: display.code,
    communityProfileId: block.target_community_profile_id ?? null,
    displayName: display.displayName,
    profileImage: display.profileImage,
    profileName: display.profileName,
    publicSnapshotId: snapshot?.id ?? block.target_public_snapshot_id,
  };
}

function readSnapshotDisplay(value: unknown): {
  code: string | null;
  displayName: string;
  profileImage: PublicProfileImage;
  profileName: string | null;
} {
  const fallbackImage = createCharacterProfileImage({
    alt: "차단한 프로필의 기본 이미지",
    motif: "purple",
  });

  if (!value || typeof value !== "object") {
    return {
      code: null,
      displayName: "비공개된 프로필",
      profileImage: fallbackImage,
      profileName: null,
    };
  }

  const payload = value as {
    displayProfile?: {
      displayName?: unknown;
      profileImage?: unknown;
    };
    profile?: { code?: unknown; name?: unknown };
  };
  const displayName =
    typeof payload.displayProfile?.displayName === "string" &&
    payload.displayProfile.displayName.trim()
      ? payload.displayProfile.displayName.trim()
      : "비공개된 프로필";
  return {
    // Block rows/snapshots do not carry a trusted public release trace. Keep
    // the relationship and general profile projection, but never expose the
    // stored candidate code identity from this settings API.
    code: null,
    displayName,
    // The archived snapshot image may itself be a code-derived trait asset.
    // Use a neutral character here; an active community profile can replace it
    // with the user's selected character or uploaded avatar above.
    profileImage: createCharacterProfileImage({
      alt: `${displayName} 프로필 이미지`,
      motif: "purple",
    }),
    profileName: null,
  };
}
