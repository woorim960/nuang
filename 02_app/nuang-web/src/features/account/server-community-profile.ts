import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  readCoreResultPublicationDecision,
  readPublicSnapshotPublicationDecision,
  type CoreResultPublicationDecision,
} from "@/features/assessment/server-core-result-publication-policy";
import { ensureAccountForUser } from "@/features/account/server-writes";
import {
  communityProfileAvatarBucket,
  type CommunityProfileCharacterKey,
  createDefaultCommunityHandle,
  normalizeCommunityProfileRow,
  type CommunityProfileEditorPayload,
  type CommunityProfileRecord,
} from "@/features/account/community-profile";
import {
  createCharacterProfileImage,
  type PublicProfileImage,
} from "@/features/public-profile/profile-image";
import {
  publicProfileSnapshotContractVersion,
  type PublicProfileSnapshotPayload,
} from "@/features/together/public-comparison-contract";
import { profileVisibilityPolicyVersion } from "@/features/together/profile-visibility-policy";

const communityProfileSelect =
  "id,account_id,handle,display_name,bio,avatar_bucket,avatar_object_path,avatar_revision,avatar_character_key,code_visibility,detail_visibility,comparison_enabled,status,revision";
const canonicalUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TrustedPublicSnapshotPublicationTrace = Readonly<{
  accountId: string;
  publicSnapshotId: string;
  resultReportId: string;
}>;

export async function ensureCommunityProfile({
  client,
  user,
}: {
  client: SupabaseClient;
  user: User;
}) {
  const account = await ensureAccountForUser(client, user);
  if (!account.ok) return null;

  const existing = await readCommunityProfileForAccount({
    accountId: account.accountId,
    client,
  });
  if (existing) return existing;

  const response = await client
    .schema("profile")
    .from("community_profile")
    .insert({
      account_id: account.accountId,
      bio: "",
      display_name: getInitialDisplayName(user),
      handle: createDefaultCommunityHandle(account.accountId),
    })
    .select(communityProfileSelect)
    .single();

  if (response.error || !response.data) {
    return readCommunityProfileForAccount({
      accountId: account.accountId,
      client,
    });
  }

  return normalizeCommunityProfileRow(response.data);
}

export async function readCommunityProfileForAccount({
  accountId,
  client,
}: {
  accountId: string;
  client: SupabaseClient;
}) {
  const response = await client
    .schema("profile")
    .from("community_profile")
    .select(communityProfileSelect)
    .eq("account_id", accountId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (response.error || !response.data) return null;
  return normalizeCommunityProfileRow(response.data);
}

export async function readCommunityProfilesForAccounts({
  accountIds,
  client,
}: {
  accountIds: string[];
  client: SupabaseClient;
}) {
  const uniqueAccountIds = [...new Set(accountIds)].filter(Boolean);
  const profiles = new Map<string, CommunityProfileRecord>();
  if (uniqueAccountIds.length === 0) return profiles;

  const response = await client
    .schema("profile")
    .from("community_profile")
    .select(communityProfileSelect)
    .in("account_id", uniqueAccountIds)
    .eq("status", "active")
    .is("deleted_at", null);

  if (response.error) return profiles;

  for (const value of response.data ?? []) {
    const profile = normalizeCommunityProfileRow(value);
    if (profile) profiles.set(profile.accountId, profile);
  }

  return profiles;
}

export type UpdateCommunityProfileResult =
  | {
      ok: true;
      profile: CommunityProfileRecord;
    }
  | {
      code:
        | "profile_handle_taken"
        | "profile_revision_conflict"
        | "profile_unavailable";
      ok: false;
    };

export async function updateCommunityProfile({
  avatar,
  avatarCharacterKey,
  bio,
  client,
  displayName,
  expectedRevision,
  handle,
  profile,
}: {
  avatar?: {
    bucket: string;
    objectPath: string;
  } | null;
  avatarCharacterKey?: CommunityProfileCharacterKey;
  bio: string;
  client: SupabaseClient;
  displayName: string;
  expectedRevision: number;
  handle: string;
  profile: CommunityProfileRecord;
}): Promise<UpdateCommunityProfileResult> {
  const nextRevision = expectedRevision + 1;
  const updateRow: Record<string, unknown> = {
    bio,
    display_name: displayName,
    handle,
    revision: nextRevision,
    updated_at: new Date().toISOString(),
  };

  if (avatar !== undefined) {
    updateRow.avatar_bucket = avatar?.bucket ?? null;
    updateRow.avatar_object_path = avatar?.objectPath ?? null;
    updateRow.avatar_revision = profile.avatarRevision + 1;
  }
  if (avatarCharacterKey !== undefined)
    updateRow.avatar_character_key = avatarCharacterKey;

  const response = await client
    .schema("profile")
    .from("community_profile")
    .update(updateRow)
    .eq("account_id", profile.accountId)
    .eq("revision", expectedRevision)
    .is("deleted_at", null)
    .select(communityProfileSelect)
    .maybeSingle();

  if (response.error) {
    return {
      code:
        response.error.code === "23505"
          ? "profile_handle_taken"
          : "profile_unavailable",
      ok: false,
    };
  }

  const updated = normalizeCommunityProfileRow(response.data);

  if (!updated) {
    return { code: "profile_revision_conflict", ok: false };
  }

  return { ok: true, profile: updated };
}

export async function createCommunityProfileEditorPayload({
  client,
  profile,
}: {
  client: SupabaseClient;
  profile: CommunityProfileRecord;
}): Promise<CommunityProfileEditorPayload> {
  const snapshotRecord = await readLatestSnapshot({
    accountId: profile.accountId,
    client,
  });
  const snapshot = snapshotRecord?.snapshot ?? null;
  const publication = snapshotRecord
    ? await readPublicSnapshotPublicationDecision({
        client,
        ownerAccountId: profile.accountId,
        publicSnapshotId: snapshotRecord.id,
      })
    : null;
  const code = publication?.eligible ? (snapshot?.profile.code ?? null) : null;
  const avatar = await resolveCommunityProfileImage({
    client,
    fallback:
      (publication?.eligible
        ? snapshot?.displayProfile.profileImage
        : undefined) ??
      createCharacterProfileImage({
        alt: `${profile.displayName} 프로필 이미지`,
        motif: profile.avatarCharacterKey,
      }),
    profile,
  });

  return {
    avatar,
    avatarCharacterKey: profile.avatarCharacterKey,
    bio: profile.bio,
    code,
    displayName: profile.displayName,
    handle: profile.handle,
    profileName: code ? (snapshot?.profile.name ?? null) : null,
    publicId: profile.id,
    revision: profile.revision,
  };
}

export async function mergeCommunityProfileIntoSnapshot({
  client,
  profile,
  publicationTrace,
  snapshot,
}: {
  client: SupabaseClient;
  profile: CommunityProfileRecord | null;
  publicationTrace?: TrustedPublicSnapshotPublicationTrace | null;
  snapshot: PublicProfileSnapshotPayload;
}) {
  if (!profile) return redactSnapshotMeasurement(snapshot);

  const publication = await resolveSnapshotPublicationDecision({
    client,
    profile,
    publicationTrace,
    snapshot,
  });

  const includedFields = new Set(snapshot.visibility.includedFields);
  const measurementVisible = publication.eligible;
  const codeVisible =
    measurementVisible &&
    profile.codeVisibility === "public" &&
    includedFields.has("representative_profile");
  const detailsVisible =
    codeVisible &&
    profile.detailVisibility === "public" &&
    includedFields.has("core_domain_map") &&
    includedFields.has("core_facet_summary");

  return {
    ...snapshot,
    displayProfile: {
      ...snapshot.displayProfile,
      displayName: profile.displayName,
      handle: profile.handle,
      motif: profile.avatarCharacterKey,
      profileImage: await resolveCommunityProfileImage({
        client,
        fallback: createCharacterProfileImage({
          alt: `${profile.displayName} 프로필 이미지`,
          motif: profile.avatarCharacterKey,
        }),
        profile,
      }),
      profileMessage: profile.bio,
    },
    profile: codeVisible
      ? snapshot.profile
      : { code: "-----", name: "비공개 성향" },
    publicData: detailsVisible
      ? snapshot.publicData
      : { coreDomainMap: [], coreFacetSummary: [] },
    visibility: {
      ...snapshot.visibility,
      includedFields: snapshot.visibility.includedFields.filter((fieldId) => {
        if (fieldId === "representative_profile") return codeVisible;
        if (fieldId === "core_domain_map" || fieldId === "core_facet_summary") {
          return detailsVisible;
        }
        return true;
      }),
    },
  } satisfies PublicProfileSnapshotPayload;
}

export async function createNeutralCommunityProfileSnapshot({
  client,
  profile,
  snapshotId = profile.id,
}: {
  client: SupabaseClient;
  profile: CommunityProfileRecord;
  snapshotId?: string;
}): Promise<PublicProfileSnapshotPayload> {
  const motif = profile.avatarCharacterKey;

  return {
    contractVersion: publicProfileSnapshotContractVersion,
    createdAt: new Date().toISOString(),
    displayProfile: {
      displayName: profile.displayName,
      handle: profile.handle,
      motif,
      profileImage: await resolveCommunityProfileImage({
        client,
        fallback: createCharacterProfileImage({
          alt: `${profile.displayName} 프로필 이미지`,
          motif,
        }),
        profile,
      }),
      profileMessage: profile.bio,
    },
    privacy: {
      includesAccountIdentity: false,
      includesCrisisHelpInteractions: false,
      includesDirectResponses: false,
      includesRawScorePayload: false,
      includesSensitiveAssessments: false,
    },
    profile: { code: "-----", name: "비공개 성향" },
    publicData: { coreDomainMap: [], coreFacetSummary: [] },
    snapshotId,
    visibility: {
      includedFields: ["display_profile"],
      policyVersion: profileVisibilityPolicyVersion,
    },
  };
}

async function resolveSnapshotPublicationDecision({
  client,
  profile,
  publicationTrace,
  snapshot,
}: {
  client: SupabaseClient;
  profile: CommunityProfileRecord | null;
  publicationTrace?: TrustedPublicSnapshotPublicationTrace | null;
  snapshot: PublicProfileSnapshotPayload;
}): Promise<CoreResultPublicationDecision> {
  if (publicationTrace === undefined) {
    return readPublicSnapshotPublicationDecision({
      client,
      ...(profile ? { ownerAccountId: profile.accountId } : {}),
      publicSnapshotId: snapshot.snapshotId,
    });
  }

  if (
    !isTrustedPublicSnapshotPublicationTrace(
      publicationTrace,
      profile,
      snapshot,
    )
  ) {
    return { eligible: false, reason: "snapshot_not_publicable" };
  }

  return readCoreResultPublicationDecision({
    client,
    ownerAccountId: publicationTrace.accountId,
    resultReportId: publicationTrace.resultReportId,
  });
}

function isTrustedPublicSnapshotPublicationTrace(
  publicationTrace: TrustedPublicSnapshotPublicationTrace | null,
  profile: CommunityProfileRecord | null,
  snapshot: PublicProfileSnapshotPayload,
): publicationTrace is TrustedPublicSnapshotPublicationTrace {
  return Boolean(
    publicationTrace &&
    canonicalUuidPattern.test(publicationTrace.accountId) &&
    canonicalUuidPattern.test(publicationTrace.publicSnapshotId) &&
    canonicalUuidPattern.test(publicationTrace.resultReportId) &&
    publicationTrace.publicSnapshotId === snapshot.snapshotId &&
    (!profile || profile.accountId === publicationTrace.accountId),
  );
}

function redactSnapshotMeasurement(
  snapshot: PublicProfileSnapshotPayload,
): PublicProfileSnapshotPayload {
  const motif = "purple";
  return {
    ...snapshot,
    displayProfile: {
      ...snapshot.displayProfile,
      motif,
      profileImage: createCharacterProfileImage({
        alt: `${snapshot.displayProfile.displayName} 프로필 이미지`,
        motif,
      }),
    },
    profile: { code: "-----", name: "비공개 성향" },
    publicData: { coreDomainMap: [], coreFacetSummary: [] },
    visibility: {
      ...snapshot.visibility,
      includedFields: snapshot.visibility.includedFields.filter(
        (fieldId) =>
          fieldId !== "representative_profile" &&
          fieldId !== "core_domain_map" &&
          fieldId !== "core_facet_summary",
      ),
    },
  };
}

export async function resolveCommunityProfileImage({
  client,
  fallback,
  profile,
}: {
  client: SupabaseClient;
  fallback: PublicProfileImage;
  profile: CommunityProfileRecord;
}) {
  if (
    profile.avatarBucket !== communityProfileAvatarBucket ||
    !profile.avatarObjectPath
  ) {
    return fallback;
  }

  const signed = await client.storage
    .from(communityProfileAvatarBucket)
    .createSignedUrl(profile.avatarObjectPath, 60 * 60);

  if (signed.error || !signed.data?.signedUrl) return fallback;

  return {
    alt: `${profile.displayName} 프로필 이미지`,
    source: "user_uploaded",
    src: signed.data.signedUrl,
  } satisfies PublicProfileImage;
}

async function readLatestSnapshot({
  accountId,
  client,
}: {
  accountId: string;
  client: SupabaseClient;
}) {
  const response = await client
    .schema("profile")
    .from("profile_public_snapshot")
    .select("id,snapshot_payload")
    .eq("account_id", accountId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (response.error || !response.data?.snapshot_payload) return null;
  const snapshot = response.data
    .snapshot_payload as PublicProfileSnapshotPayload;
  if (!snapshot.profile?.code || !snapshot.displayProfile?.motif) return null;
  return { id: String(response.data.id), snapshot };
}

function getInitialDisplayName(user: User) {
  const metadata = user.user_metadata ?? {};
  const value = metadata.nickname ?? metadata.name ?? metadata.full_name;

  if (typeof value !== "string") return "뉴앙 사용자";
  const normalized = value.trim().slice(0, 20);
  return normalized.length >= 2 ? normalized : "뉴앙 사용자";
}
