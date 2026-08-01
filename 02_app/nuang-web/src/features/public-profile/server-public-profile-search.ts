import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { nuangCharacterMotifs } from "@/components/character/nuang-character-assets";
import { mergeCommunityProfileIntoSnapshot } from "@/features/account/server-community-profile";
import {
  normalizeCommunityProfileRow,
  type CommunityProfileRecord,
} from "@/features/account/community-profile";
import { readOperatorAccountIds } from "@/features/admin/server-operator-identity";
import { readBlockedCommunityAccountIds } from "@/features/feed/server-community-social";
import { candidateProfileNameCatalog } from "@/features/nuang-code/candidate-profile-names";
import {
  getCurrentNuangProfileName,
  isCurrentNuangCode,
} from "@/features/nuang-code/profile-name-resolution";
import {
  createPublicProfileCardPayload,
  type PublicProfileCardPayload,
} from "@/features/public-profile/public-profile-card-contract";
import {
  normalizePublicProfileSearchQuery,
  publicProfileSearchMaxResults,
  type PublicProfileSearchItem,
} from "@/features/public-profile/public-profile-search-contract";
import { createCharacterProfileImage } from "@/features/public-profile/profile-image";
import type { PublicProfileSnapshotPayload } from "@/features/together/public-comparison-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type CommunityProfileRow = Record<string, unknown> & {
  account_id?: string;
};

type PublicSnapshotRow = {
  account_id: string;
  id: string;
  snapshot_payload: unknown;
};

const communityProfileSearchSelect =
  "id,account_id,handle,display_name,bio,avatar_bucket,avatar_object_path,avatar_revision,avatar_character_key,code_visibility,detail_visibility,comparison_enabled,status,revision";
const candidateReadLimit = publicProfileSearchMaxResults * 2;

export async function searchServerPublicProfiles(rawQuery: string) {
  const normalized = normalizePublicProfileSearchQuery(rawQuery);
  if (!normalized.ok) {
    return { code: "invalid_query" as const, ok: false as const };
  }

  const client = createSupabaseServiceClient();
  if (!client) {
    return { code: "search_unavailable" as const, ok: false as const };
  }

  try {
    const viewerAccountId = await readViewerAccountId(client);
    const blockedAccountIds = await readBlockedCommunityAccountIds({
      accountId: viewerAccountId,
      client,
    });
    const profiles = await searchPublicProfiles({
      blockedAccountIds,
      client,
      query: normalized.value,
      viewerAccountId,
    });

    return { ok: true as const, profiles };
  } catch {
    return { code: "search_unavailable" as const, ok: false as const };
  }
}

async function searchPublicProfiles({
  blockedAccountIds,
  client,
  query,
  viewerAccountId,
}: {
  blockedAccountIds: Set<string>;
  client: SupabaseClient;
  query: string;
  viewerAccountId: string | null;
}): Promise<PublicProfileSearchItem[]> {
  const matchingCodes = getMatchingCurrentCodes(query);
  const pattern = `%${query}%`;
  const [displayNameResponse, handleResponse, codeSnapshotResponse] =
    await Promise.all([
      createCommunityProfileSearchQuery(client)
        .ilike("display_name", pattern)
        .limit(candidateReadLimit),
      createCommunityProfileSearchQuery(client)
        .ilike("handle", pattern.toLocaleLowerCase("ko-KR"))
        .limit(candidateReadLimit),
      matchingCodes.length > 0
        ? client
            .schema("profile")
            .from("profile_public_snapshot")
            .select("id,account_id,snapshot_payload")
            .in("snapshot_payload->profile->>code", matchingCodes)
            .eq("status", "active")
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(candidateReadLimit * 2)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (
    displayNameResponse.error ||
    handleResponse.error ||
    codeSnapshotResponse.error
  ) {
    throw new Error("public_profile_search_failed");
  }

  const profilesByAccountId = new Map<string, CommunityProfileRecord>();
  for (const row of [
    ...(displayNameResponse.data ?? []),
    ...(handleResponse.data ?? []),
  ] as CommunityProfileRow[]) {
    const profile = normalizeCommunityProfileRow(row);
    if (profile) profilesByAccountId.set(profile.accountId, profile);
  }

  const codeMatchedAccountIds = [
    ...new Set(
      ((codeSnapshotResponse.data ?? []) as PublicSnapshotRow[]).map(
        (row) => row.account_id,
      ),
    ),
  ];
  if (codeMatchedAccountIds.length > 0) {
    const response = await client
      .schema("profile")
      .from("community_profile")
      .select(communityProfileSearchSelect)
      .in("account_id", codeMatchedAccountIds)
      .eq("code_visibility", "public")
      .eq("status", "active")
      .is("deleted_at", null);
    if (response.error) throw new Error("public_profile_search_failed");

    for (const row of (response.data ?? []) as CommunityProfileRow[]) {
      const profile = normalizeCommunityProfileRow(row);
      if (profile) profilesByAccountId.set(profile.accountId, profile);
    }
  }

  const candidateAccountIds = [...profilesByAccountId.keys()].filter(
    (accountId) =>
      !blockedAccountIds.has(accountId) && accountId !== viewerAccountId,
  );
  if (candidateAccountIds.length === 0) return [];

  const snapshotsResponse = await client
    .schema("profile")
    .from("profile_public_snapshot")
    .select("id,account_id,snapshot_payload")
    .in("account_id", candidateAccountIds)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (snapshotsResponse.error) throw new Error("public_profile_search_failed");

  const latestSnapshotByAccountId = new Map<string, PublicSnapshotRow>();
  for (const row of (snapshotsResponse.data ?? []) as PublicSnapshotRow[]) {
    if (!latestSnapshotByAccountId.has(row.account_id)) {
      latestSnapshotByAccountId.set(row.account_id, row);
    }
  }

  const rankedCandidates = [...profilesByAccountId.values()]
    .map((profile) => {
      const row = latestSnapshotByAccountId.get(profile.accountId);
      const snapshot = row
        ? coercePublicProfileSnapshot(row.snapshot_payload, row.id)
        : null;
      if (!row || !snapshot) return null;

      const rank = getProfileSearchRank({ profile, query, snapshot });
      return rank === null ? null : { profile, rank, row, snapshot };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> =>
      Boolean(candidate),
    )
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        left.profile.displayName.localeCompare(right.profile.displayName, "ko"),
    )
    .slice(0, publicProfileSearchMaxResults);
  const operatorAccountIds = await readOperatorAccountIds({
    accountIds: rankedCandidates.map(({ profile }) => profile.accountId),
    client,
  });

  return Promise.all(
    rankedCandidates.map(async ({ profile, row, snapshot }) => {
      const mergedSnapshot = await mergeCommunityProfileIntoSnapshot({
        client,
        profile,
        snapshot,
      });
      const profileCard = createPublicProfileCardPayload({
        cardId: `profile_${row.id}`,
        communityProfileId: profile.id,
        isOperator: operatorAccountIds.has(profile.accountId),
        snapshot: mergedSnapshot,
        status: "published",
      });

      return toSearchItem(profileCard, profile);
    }),
  );
}

function createCommunityProfileSearchQuery(client: SupabaseClient) {
  return client
    .schema("profile")
    .from("community_profile")
    .select(communityProfileSearchSelect)
    .eq("status", "active")
    .is("deleted_at", null);
}

function getMatchingCurrentCodes(query: string) {
  const normalized = query.toLocaleLowerCase("ko-KR");
  const upperQuery = query.toUpperCase();

  return Object.entries(candidateProfileNameCatalog)
    .filter(
      ([code, profile]) =>
        code.includes(upperQuery) ||
        profile.displayName.toLocaleLowerCase("ko-KR").includes(normalized) ||
        profile.shortName.toLocaleLowerCase("ko-KR").includes(normalized),
    )
    .map(([code]) => code);
}

function getProfileSearchRank({
  profile,
  query,
  snapshot,
}: {
  profile: CommunityProfileRecord;
  query: string;
  snapshot: PublicProfileSnapshotPayload;
}) {
  const normalized = query.toLocaleLowerCase("ko-KR");
  const displayName = profile.displayName.toLocaleLowerCase("ko-KR");
  const handle = profile.handle.toLocaleLowerCase("ko-KR");
  const code = snapshot.profile.code.toLocaleLowerCase("ko-KR");
  const roleName = (
    getCurrentNuangProfileName(snapshot.profile.code) ?? ""
  ).toLocaleLowerCase("ko-KR");
  const codeVisible = profile.codeVisibility === "public";

  if (handle === normalized) return 0;
  if (displayName === normalized) return 1;
  if (codeVisible && code === normalized) return 2;
  if (displayName.startsWith(normalized) || handle.startsWith(normalized)) {
    return 3;
  }
  if (codeVisible && roleName.startsWith(normalized)) return 4;
  if (displayName.includes(normalized) || handle.includes(normalized)) return 5;
  if (
    codeVisible &&
    (code.includes(normalized) || roleName.includes(normalized))
  ) {
    return 6;
  }
  return null;
}

function coercePublicProfileSnapshot(
  value: unknown,
  fallbackSnapshotId: string,
): PublicProfileSnapshotPayload | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as PublicProfileSnapshotPayload;
  const displayName = snapshot.displayProfile?.displayName;
  const motif = snapshot.displayProfile?.motif;

  if (
    !isCurrentNuangCode(snapshot.profile?.code) ||
    !snapshot.profile?.name ||
    !displayName ||
    !nuangCharacterMotifs.includes(motif) ||
    !Array.isArray(snapshot.publicData?.coreDomainMap) ||
    !Array.isArray(snapshot.publicData?.coreFacetSummary)
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
    snapshotId: snapshot.snapshotId ?? fallbackSnapshotId,
  };
}

function toSearchItem(
  card: PublicProfileCardPayload,
  profile: CommunityProfileRecord,
): PublicProfileSearchItem {
  const codeVisible = card.display.code !== "-----";
  const includedFields = new Set(card.visibility.includedFields);

  return {
    code: codeVisible ? card.display.code : null,
    comparisonAvailable:
      profile.comparisonEnabled &&
      includedFields.has("representative_profile") &&
      includedFields.has("core_domain_map") &&
      includedFields.has("core_facet_summary"),
    displayName: card.display.displayName,
    handle: card.display.handle ?? profile.handle,
    isOperator: Boolean(card.operator),
    profileImage: card.display.profileImage,
    profileMessage: card.display.profileMessage ?? "",
    publicProfileId:
      card.source.communityProfileId ?? card.source.publicSnapshotId,
    publicSnapshotId: card.source.publicSnapshotId,
    roleName: codeVisible
      ? (getCurrentNuangProfileName(card.display.code) ??
        card.display.profileName)
      : null,
  };
}

async function readViewerAccountId(client: SupabaseClient) {
  const serverClient = await createServerSupabaseClient();
  if (!serverClient) return null;

  const { data, error } = await serverClient.auth.getUser();
  if (error || !data.user) return null;

  const response = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", data.user.id)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (response.error || !response.data?.account_id) return null;
  return String(response.data.account_id);
}
