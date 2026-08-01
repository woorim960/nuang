import {
  resolveTraitMapCanonicalV2,
  type TraitMapRuntimeCanonicalV2,
  type TraitMapRuntimeManifestV2,
  type TraitMapRuntimeResolutionV2,
} from "@/features/nuang-code/trait-map-runtime-resolver-v2";

export const traitMapResultSummaryBaselineId =
  "NUANG-TRAIT-MAP-RESEARCH-BASELINE-2.3";

/**
 * 고객 공개 승인이 0건인 현재 기준선입니다. 이 digest는 승인 전 상태의
 * 불변 manifest로 남기고, 승인 문장이 생기면 기존 값을 수정하지 않은 채
 * 새로운 manifest를 추가해야 완료 당시 결과를 재현할 수 있습니다.
 */
export const closedTraitMapResultSummaryManifestV2 = {
  digest: "NUANG-RESULT-SUMMARY-PUBLICATION-CLOSED-2.3.0",
  surfaceAllowlists: {
    result_summary: [],
  },
} as const satisfies TraitMapRuntimeManifestV2;

export type ResultSummaryPlacementV2 =
  "headline" | "overuse_cost" | "action_experiment";

export type TraitMapResultSummaryClaimRefV2 = {
  canonicalVariantId: string;
  expectedVersion: number;
  placement: ResultSummaryPlacementV2;
};

export type TraitMapResultSummaryPublicationRegistryV2 = {
  baselineId: string;
  canonicalLibrary: ReadonlyMap<string, TraitMapRuntimeCanonicalV2>;
  manifest: TraitMapRuntimeManifestV2;
  profileClaimRefs: Readonly<
    Record<string, readonly TraitMapResultSummaryClaimRefV2[]>
  >;
};

export type ResolvedTraitMapResultSummaryClaimV2 = {
  canonicalVariantId: string;
  contentKey: string;
  placement: ResultSummaryPlacementV2;
  privacyScope: TraitMapRuntimeCanonicalV2["privacyScope"];
  text: string;
  version: number;
};

export type TraitMapResultSummaryResolutionV2 = {
  baselineId: string;
  claims: readonly ResolvedTraitMapResultSummaryClaimV2[];
  diagnostics: readonly {
    canonicalVariantId: string;
    reason: Exclude<
      TraitMapRuntimeResolutionV2,
      { action: "render" }
    >["diagnostic"];
  }[];
  manifestDigest: string;
};

/**
 * 운영 레지스트리는 의도적으로 비어 있습니다. 연구 원장 문장은 이 파일에
 * 직접 복사하지 않고, 7개 역할 검토와 customer_approved 발행을 통과한
 * 생성 산출물만 새 manifest로 교체합니다.
 */
export const activeTraitMapResultSummaryPublicationV2: TraitMapResultSummaryPublicationRegistryV2 =
  {
    baselineId: traitMapResultSummaryBaselineId,
    canonicalLibrary: new Map(),
    manifest: closedTraitMapResultSummaryManifestV2,
    profileClaimRefs: {},
  };

const archivedResultSummaryPublications = new Map<
  string,
  TraitMapResultSummaryPublicationRegistryV2
>([
  [
    closedTraitMapResultSummaryManifestV2.digest,
    activeTraitMapResultSummaryPublicationV2,
  ],
]);

export function getTraitMapResultSummaryPublicationByDigestV2(digest: string) {
  return archivedResultSummaryPublications.get(digest) ?? null;
}

export function resolveTraitMapResultSummaryV2({
  code,
  publication = activeTraitMapResultSummaryPublicationV2,
}: {
  code: string;
  publication?: TraitMapResultSummaryPublicationRegistryV2;
}): TraitMapResultSummaryResolutionV2 {
  const normalizedCode = code.trim().toUpperCase();
  const refs = publication.profileClaimRefs[normalizedCode] ?? [];
  const claims: ResolvedTraitMapResultSummaryClaimV2[] = [];
  const diagnostics: TraitMapResultSummaryResolutionV2["diagnostics"][number][] =
    [];

  for (const ref of refs) {
    const resolution = resolveTraitMapCanonicalV2({
      canonicalLibrary: publication.canonicalLibrary,
      canonicalVariantId: ref.canonicalVariantId,
      expectedVersion: ref.expectedVersion,
      manifest: publication.manifest,
      requestManifestDigest: publication.manifest.digest,
      surface: "result_summary",
    });

    if (resolution.action === "omit") {
      diagnostics.push({
        canonicalVariantId: ref.canonicalVariantId,
        reason: resolution.diagnostic,
      });
      continue;
    }

    const canonical = publication.canonicalLibrary.get(ref.canonicalVariantId);
    if (!canonical) continue;
    claims.push({
      canonicalVariantId: ref.canonicalVariantId,
      contentKey: resolution.claim.contentKey,
      placement: ref.placement,
      privacyScope: canonical.privacyScope,
      text: resolution.claim.text,
      version: resolution.claim.version,
    });
  }

  return {
    baselineId: publication.baselineId,
    claims,
    diagnostics,
    manifestDigest: publication.manifest.digest,
  };
}
