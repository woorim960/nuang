import {
  publicProfileSnapshotContractVersion,
  type PublicAxisSummary,
  type PublicProfileSnapshotPayload,
} from "@/features/together/public-comparison-contract";

export const publicProfileCardContractVersion = "public-profile-card.v0.1";

export type PublicProfileCardPayload = {
  cardId: string;
  contractVersion: typeof publicProfileCardContractVersion;
  display: {
    code: string;
    displayName: string;
    handle?: string;
    motif: PublicProfileSnapshotPayload["displayProfile"]["motif"];
    profileName: string;
    profileMessage?: string;
    profileImage: PublicProfileSnapshotPayload["displayProfile"]["profileImage"];
  };
  highlights: {
    domainHighlights: PublicAxisSummary[];
    facetSummaryCount: number;
  };
  source: {
    communityProfileId?: string;
    publicSnapshotContractVersion: typeof publicProfileSnapshotContractVersion;
    publicSnapshotId: string;
  };
  status: "preview" | "published";
  visibility: PublicProfileSnapshotPayload["visibility"] & {
    cardScope: "public_profile_card";
  };
  privacy: {
    includesAccountIdentity: false;
    includesCrisisHelpInteractions: false;
    includesDirectResponses: false;
    includesRawScorePayload: false;
    includesSensitiveAssessments: false;
  };
};

export function createPublicProfileCardPayload({
  cardId,
  communityProfileId,
  snapshot,
  status = "preview",
}: {
  cardId: string;
  communityProfileId?: string;
  snapshot: PublicProfileSnapshotPayload;
  status?: PublicProfileCardPayload["status"];
}): PublicProfileCardPayload {
  return {
    cardId,
    contractVersion: publicProfileCardContractVersion,
    display: {
      code: snapshot.profile.code,
      displayName: snapshot.displayProfile.displayName,
      handle:
        snapshot.displayProfile.handle ??
        createFallbackHandle(snapshot.displayProfile.displayName),
      motif: snapshot.displayProfile.motif,
      profileName: snapshot.profile.name,
      profileMessage: snapshot.displayProfile.profileMessage ?? "",
      profileImage: snapshot.displayProfile.profileImage,
    },
    highlights: {
      domainHighlights: selectDomainHighlights(
        snapshot.publicData.coreDomainMap,
      ),
      facetSummaryCount: snapshot.publicData.coreFacetSummary.filter(
        (facet) => facet.score !== null,
      ).length,
    },
    source: {
      communityProfileId: communityProfileId ?? snapshot.snapshotId,
      publicSnapshotContractVersion: snapshot.contractVersion,
      publicSnapshotId: snapshot.snapshotId,
    },
    status,
    visibility: {
      ...snapshot.visibility,
      cardScope: "public_profile_card",
    },
    privacy: {
      includesAccountIdentity: false,
      includesCrisisHelpInteractions: false,
      includesDirectResponses: false,
      includesRawScorePayload: false,
      includesSensitiveAssessments: false,
    },
  };
}

function createFallbackHandle(displayName: string) {
  return (
    displayName
      .trim()
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, ".")
      .replace(/^\.+|\.+$/g, "")
      .slice(0, 24) || "nuang.user"
  );
}

function selectDomainHighlights(domains: PublicAxisSummary[]) {
  return [...domains]
    .filter((domain) => domain.score !== null)
    .sort((a, b) => {
      const aBoundaryWeight = a.isBoundary ? -1 : 0;
      const bBoundaryWeight = b.isBoundary ? -1 : 0;
      const scoreDelta = (b.score ?? 0) - (a.score ?? 0);

      return scoreDelta || bBoundaryWeight - aBoundaryWeight;
    })
    .slice(0, 2);
}
