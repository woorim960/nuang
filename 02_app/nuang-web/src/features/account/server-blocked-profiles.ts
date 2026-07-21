import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { BlockedProfile } from "@/features/account/blocked-profile-contract";
import {
  readCommunityProfilesForAccounts,
  resolveCommunityProfileImage,
} from "@/features/account/server-community-profile";
import { getCurrentNuangProfileName } from "@/features/nuang-code/profile-name-resolution";
import {
  createCharacterProfileImage,
  type PublicProfileImage,
} from "@/features/public-profile/profile-image";

type BlockRow = {
  blocked_account_id: string;
  created_at: string;
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

  const blockResponse = await client
    .schema("feed")
    .from("profile_block")
    .select("blocked_account_id,target_public_snapshot_id,created_at")
    .eq("blocker_account_id", accountId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (blockResponse.error) return { ok: false };

  const blocks = (blockResponse.data ?? []) as BlockRow[];
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
        displayName: communityProfile.displayName,
        profileImage: await resolveCommunityProfileImage({
          client,
          fallback: fallback.profileImage,
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
  user,
}: {
  blockedAccountId: string;
  client: SupabaseClient;
  user: User;
}) {
  const accountId = await readAccountId(client, user.id);
  if (!accountId || accountId === blockedAccountId)
    return { ok: false as const };

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
  const code =
    typeof payload.profile?.code === "string" &&
    getCurrentNuangProfileName(payload.profile.code)
      ? payload.profile.code
      : null;
  const profileName =
    typeof payload.profile?.name === "string" && payload.profile.name.trim()
      ? payload.profile.name.trim()
      : code
        ? getCurrentNuangProfileName(code)
        : null;

  return {
    code,
    displayName,
    profileImage: isPublicProfileImage(payload.displayProfile?.profileImage)
      ? payload.displayProfile.profileImage
      : createCharacterProfileImage({
          alt: `${displayName} 프로필 이미지`,
          motif: "purple",
        }),
    profileName,
  };
}

function isPublicProfileImage(value: unknown): value is PublicProfileImage {
  if (!value || typeof value !== "object") return false;

  const image = value as { alt?: unknown; source?: unknown; src?: unknown };
  return (
    typeof image.alt === "string" &&
    typeof image.src === "string" &&
    image.src.length > 0 &&
    (image.source === "character" ||
      image.source === "trait_image" ||
      image.source === "user_uploaded")
  );
}
