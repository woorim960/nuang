import type {
  TraitMapCustomerSurface,
  TraitMapPrivacyScope,
} from "@/features/nuang-code/trait-map-content-publication-contract-v2";

export type TraitMapRuntimeCanonicalState =
  | "research_only"
  | "approved"
  | "retired"
  | "common_archive";

export type TraitMapRuntimeCanonicalV2 = {
  canonicalVariantId: string;
  contentKey: string;
  text: string;
  version: number;
  state: TraitMapRuntimeCanonicalState;
  privacyScope: TraitMapPrivacyScope;
  axisSignature: string;
};

export type TraitMapRuntimeAllowlistEntryV2 = {
  canonicalVariantId: string;
  version: number;
};

export type TraitMapRuntimeManifestV2 = {
  digest: string;
  surfaceAllowlists: Partial<
    Record<
      TraitMapCustomerSurface,
      readonly TraitMapRuntimeAllowlistEntryV2[]
    >
  >;
};

export type TraitMapRuntimeResolveInputV2 = {
  canonicalVariantId: string;
  expectedVersion: number;
  surface: TraitMapCustomerSurface;
  requestManifestDigest: string;
  manifest: TraitMapRuntimeManifestV2;
  canonicalLibrary: ReadonlyMap<string, TraitMapRuntimeCanonicalV2>;
};

export type TraitMapRuntimeResolutionV2 =
  | {
      action: "render";
      claim: {
        contentKey: string;
        text: string;
        version: number;
      };
      diagnostic: null;
    }
  | {
      action: "omit";
      claim: null;
      diagnostic:
        | "MANIFEST_DIGEST_MISMATCH"
        | "CANONICAL_MISSING"
        | "CANONICAL_RETIRED"
        | "COMMON_PERSONALIZATION_DENIED"
        | "CANONICAL_NOT_APPROVED"
        | "SURFACE_NOT_ALLOWLISTED"
        | "VERSION_NOT_ALLOWLISTED"
        | "PRIVACY_SCOPE_DENIED";
    };

const surfacePrivacyScopes: Record<
  TraitMapCustomerSurface,
  readonly TraitMapPrivacyScope[]
> = {
  result_summary: ["self_only", "user_selected_comparison"],
  trait_map_detail: [
    "self_only",
    "user_selected_comparison",
    "profile_public",
    "share_selected",
  ],
  comparison_report: ["user_selected_comparison"],
  profile_preview: ["profile_public"],
  share_card: ["share_selected"],
};

export function resolveTraitMapCanonicalV2(
  input: TraitMapRuntimeResolveInputV2,
): TraitMapRuntimeResolutionV2 {
  if (input.requestManifestDigest !== input.manifest.digest) {
    return omit("MANIFEST_DIGEST_MISMATCH");
  }

  const canonical = input.canonicalLibrary.get(
    input.canonicalVariantId,
  );
  if (!canonical) return omit("CANONICAL_MISSING");
  if (canonical.state === "retired") {
    return omit("CANONICAL_RETIRED");
  }
  if (
    canonical.state === "common_archive" ||
    canonical.axisSignature === "COMMON"
  ) {
    return omit("COMMON_PERSONALIZATION_DENIED");
  }
  if (canonical.state !== "approved") {
    return omit("CANONICAL_NOT_APPROVED");
  }

  const allowlist =
    input.manifest.surfaceAllowlists[input.surface] ?? [];
  const allowedVersions = allowlist.filter(
    (entry) =>
      entry.canonicalVariantId === canonical.canonicalVariantId,
  );
  if (allowedVersions.length === 0) {
    return omit("SURFACE_NOT_ALLOWLISTED");
  }
  if (
    !allowedVersions.some(
      (entry) =>
        entry.version === input.expectedVersion &&
        canonical.version === input.expectedVersion,
    )
  ) {
    return omit("VERSION_NOT_ALLOWLISTED");
  }
  if (
    !surfacePrivacyScopes[input.surface].includes(
      canonical.privacyScope,
    )
  ) {
    return omit("PRIVACY_SCOPE_DENIED");
  }

  return {
    action: "render",
    claim: {
      contentKey: canonical.contentKey,
      text: canonical.text,
      version: canonical.version,
    },
    diagnostic: null,
  };
}

export type TraitMapProfileClaimRefV2 = {
  canonicalVariantId: string;
  expectedVersion: number;
};

export type TraitMapProfilePayloadInputV2 = {
  code: string;
  claimRefs: readonly TraitMapProfileClaimRefV2[];
};

export type TraitMapResolvedProfilePayloadV2 = {
  client: {
    code: string;
    claims: readonly {
      contentKey: string;
      text: string;
      version: number;
    }[];
  };
  serverDiagnostics: {
    requestedClaims: number;
    renderedClaims: number;
    omittedClaims: number;
    reasons: Readonly<Record<string, number>>;
  };
};

export function resolveTraitMapProfilePayloadV2({
  profile,
  surface,
  requestManifestDigest,
  manifest,
  canonicalLibrary,
}: {
  profile: TraitMapProfilePayloadInputV2;
  surface: TraitMapCustomerSurface;
  requestManifestDigest: string;
  manifest: TraitMapRuntimeManifestV2;
  canonicalLibrary: ReadonlyMap<string, TraitMapRuntimeCanonicalV2>;
}): TraitMapResolvedProfilePayloadV2 {
  const claims: {
    contentKey: string;
    text: string;
    version: number;
  }[] = [];
  const reasons: Record<string, number> = {};

  for (const claimRef of profile.claimRefs) {
    const resolution = resolveTraitMapCanonicalV2({
      canonicalVariantId: claimRef.canonicalVariantId,
      expectedVersion: claimRef.expectedVersion,
      surface,
      requestManifestDigest,
      manifest,
      canonicalLibrary,
    });
    if (resolution.action === "render") {
      claims.push(resolution.claim);
    } else {
      reasons[resolution.diagnostic] =
        (reasons[resolution.diagnostic] ?? 0) + 1;
    }
  }

  return {
    client: {
      code: profile.code,
      claims,
    },
    serverDiagnostics: {
      requestedClaims: profile.claimRefs.length,
      renderedClaims: claims.length,
      omittedClaims: profile.claimRefs.length - claims.length,
      reasons,
    },
  };
}

function omit(
  diagnostic: Extract<
    TraitMapRuntimeResolutionV2,
    { action: "omit" }
  >["diagnostic"],
): TraitMapRuntimeResolutionV2 {
  return {
    action: "omit",
    claim: null,
    diagnostic,
  };
}
