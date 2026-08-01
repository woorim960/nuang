import type { AccountResultSummary } from "@/features/account/account-result-contract";
import { betaScoringRelease } from "@/features/assessment/beta-core-seed";
import { candidateFullScoringRelease } from "@/features/assessment/candidate-full-core-seed";
import { candidateQuickScoringRelease } from "@/features/assessment/candidate-quick-core-seed";
import { fullScoringRelease } from "@/features/assessment/full-core-seed";
import { getValidatedLocalResultSnapshot } from "@/features/assessment/assessment-result-snapshot";
import { quickScoringRelease } from "@/features/assessment/quick-core-seed";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import {
  candidateProfileNarrativeVersion,
  candidateProfileNameReleaseId,
  getCandidateProfileDefinition,
} from "@/features/nuang-code/candidate-profile-names";
import { getPublishedTraitMapCustomerGuide } from "@/features/nuang-code/trait-map-customer-guide-registry";
import { resolveTraitMapResultSummaryV2 } from "@/features/nuang-code/trait-map-result-summary-publication-v2";
import type {
  DomainScore,
  FacetScore,
  ScoringRelease,
} from "@/lib/scoring/types";
import { precisionFacetInsightCopyVersion } from "@/features/result/precision-report-insights";
import type {
  CoreResultReportModel,
  CoreResultVersionBundle,
} from "@/features/result/unified-core-report/core-result-report-model";
import {
  buildReleaseOneOwnerSections,
  buildReleaseOnePublicSections,
  buildReleaseTwoOwnerSections,
  getReleaseOneOmissionCodes,
} from "@/features/result/unified-core-report/core-result-section-contract";
import {
  reportContentSnapshotSchema,
  resolveReportContentSnapshot,
} from "@/features/result/unified-core-report/report-content-snapshot";
import { buildCoreResultExcerpt } from "@/features/result/unified-core-report/core-result-excerpt-manifest";

type ReleaseSupport = "current" | "legacy" | "unsupported";

type ReleaseDefinition = {
  kind: "quick" | "full";
  release: ScoringRelease;
  support: Exclude<ReleaseSupport, "unsupported">;
};

const releaseDefinitions: ReleaseDefinition[] = [
  {
    kind: "quick",
    release: candidateQuickScoringRelease,
    support: "current",
  },
  {
    kind: "full",
    release: candidateFullScoringRelease,
    support: "current",
  },
  { kind: "full", release: betaScoringRelease, support: "legacy" },
  { kind: "quick", release: quickScoringRelease, support: "legacy" },
  { kind: "full", release: fullScoringRelease, support: "legacy" },
];

export type PublicCoreResultProjection = {
  completedAt: string;
  kind: "quick" | "full";
  profileCode: string;
  profileName: string | null;
  resultReportId: string;
};

export function adaptValidatedLocalCoreResult(
  attempt: LocalAssessmentAttempt,
): CoreResultReportModel | null {
  const snapshot = getValidatedLocalResultSnapshot(attempt);
  const profile = snapshot?.scoreResult.code
    ? getCandidateProfileDefinition(snapshot.scoreResult.code)
    : null;
  const completedAt = attempt.completedAt;

  if (!snapshot || !completedAt) return null;

  const versionBundle: CoreResultVersionBundle = {
    assessmentReleaseId: snapshot.assessmentReleaseId,
    codeSchemeVersion: snapshot.codeSchemeVersion,
    scoringModelVersion: snapshot.scoringModelVersion,
    scoringReleaseId: snapshot.scoringReleaseId,
  };
  if (!profile || !snapshot.scoreResult.code) {
    return buildUnsupportedLocalModel({
      attempt,
      completedAt,
      snapshot,
      versionBundle,
    });
  }
  const releaseSupport = getReleaseSupport(attempt.mode, versionBundle);
  const isCurrentComplete =
    releaseSupport === "current" &&
    (attempt.resultEvidenceStatus === "clear" ||
      attempt.resultEvidenceStatus === "near_boundary");
  const guide = getPublishedTraitMapCustomerGuide(snapshot.scoreResult.code!);
  const canonicalResolution = resolveTraitMapResultSummaryV2({
    code: snapshot.scoreResult.code!,
  });
  const contentSnapshotParse = snapshot.reportContentSnapshot
    ? reportContentSnapshotSchema.safeParse(snapshot.reportContentSnapshot)
    : null;
  const contentSnapshot = contentSnapshotParse?.success
    ? contentSnapshotParse.data
    : null;
  const contentSnapshotResolution = contentSnapshot
    ? resolveReportContentSnapshot({
        code: snapshot.scoreResult.code!,
        kind: attempt.mode,
        measurementVersion: snapshot.resultCopyVersion,
        snapshot: contentSnapshot,
      })
    : null;
  const fallbackSections = buildReleaseTwoOwnerSections(
    {
      code: snapshot.scoreResult.code!,
      facetContentVersion: precisionFacetInsightCopyVersion,
      guideVersion: guide?.version ?? null,
      kind: attempt.mode,
      measurementVersion: snapshot.resultCopyVersion,
      profileContentVersion: candidateProfileNarrativeVersion,
      renderGuide: Boolean(guide),
      renderMeasurement: true,
    },
    isCurrentComplete ? canonicalResolution.claims : [],
  );
  const sections =
    contentSnapshotParse && !contentSnapshotParse.success
      ? buildReleaseOneOwnerSections({
          code: snapshot.scoreResult.code!,
          facetContentVersion: precisionFacetInsightCopyVersion,
          guideVersion: guide?.version ?? null,
          kind: attempt.mode,
          measurementVersion: snapshot.resultCopyVersion,
          profileContentVersion: candidateProfileNarrativeVersion,
          renderGuide: Boolean(guide),
          renderMeasurement: true,
        })
      : contentSnapshotResolution?.status === "resolved"
        ? contentSnapshotResolution.sections
        : contentSnapshotResolution?.status === "unavailable"
          ? buildReleaseOneOwnerSections({
              code: snapshot.scoreResult.code!,
              facetContentVersion: precisionFacetInsightCopyVersion,
              guideVersion: guide?.version ?? null,
              kind: attempt.mode,
              measurementVersion: snapshot.resultCopyVersion,
              profileContentVersion: candidateProfileNarrativeVersion,
              renderGuide: Boolean(guide),
              renderMeasurement: true,
            })
          : fallbackSections;

  return {
    identity: {
      accountResultReportId: null,
      assessmentAttemptId: null,
      canonicalResultId: `local:${attempt.id}`,
      completedAt,
      kind: attempt.mode,
      localResultId: attempt.id,
      originResultId: attempt.id,
      sourceState: isCurrentComplete ? "local" : "legacy_partial",
    },
    interpretation: {
      canonicalRefs:
        contentSnapshotResolution?.status === "resolved"
          ? contentSnapshotResolution.canonicalRefs
          : isCurrentComplete && !snapshot.reportContentSnapshot
            ? canonicalResolution.claims.map((claim) => ({
                canonicalVariantId: claim.canonicalVariantId,
                contentKey: claim.contentKey,
                version: claim.version,
              }))
            : [],
      contentResolution:
        contentSnapshotResolution?.status === "resolved"
          ? "completion_snapshot"
          : guide
            ? "current_customer_guide_fallback"
            : "legacy_limited",
      excerptManifestDigest:
        contentSnapshotResolution?.status === "resolved"
          ? contentSnapshotResolution.excerptManifestDigest
          : guide
            ? buildCoreResultExcerpt(guide, attempt.mode).manifest.digest
            : null,
      guideVersion:
        contentSnapshotResolution?.status === "resolved"
          ? contentSnapshotResolution.guideVersion
          : (guide?.version ?? null),
      manifestDigest:
        contentSnapshotResolution?.status === "resolved"
          ? (contentSnapshot?.manifestDigest ?? null)
          : isCurrentComplete && !snapshot.reportContentSnapshot
            ? canonicalResolution.manifestDigest
            : null,
      traitMapBaselineId:
        contentSnapshotResolution?.status === "resolved"
          ? (contentSnapshot?.traitMapBaselineId ?? null)
          : isCurrentComplete && !snapshot.reportContentSnapshot
            ? canonicalResolution.baselineId
            : null,
    },
    measurement: {
      ...versionBundle,
      responseSnapshotHash: snapshot.responseSnapshotHash,
      resultCopyVersion: snapshot.resultCopyVersion,
    },
    result: {
      alternativeCodes: [...snapshot.scoreResult.alternativeCodes],
      boundaryDomainIds: snapshot.scoreResult.domains
        .filter((domain) => domain.isBoundary)
        .map((domain) => domain.domainId),
      code: snapshot.scoreResult.code!,
      currentProfileName: profile.displayName,
      domains: snapshot.scoreResult.domains.map((domain) => ({ ...domain })),
      facets: snapshot.scoreResult.facets.map((facet) => ({ ...facet })),
      profileNameAtCompletion: snapshot.scoreResult.profileName,
      profileNameReleaseId: candidateProfileNameReleaseId,
      profileNameValidationState: "product_published",
      responseEvidenceStatus: attempt.resultEvidenceStatus ?? "unknown_legacy",
    },
    sections,
    completeness: {
      missingFieldCodes:
        contentSnapshotParse && !contentSnapshotParse.success
          ? ["REPORT_CONTENT_SNAPSHOT_INVALID"]
          : contentSnapshotResolution?.status === "unavailable"
            ? [
                `REPORT_CONTENT_SNAPSHOT_${contentSnapshotResolution.diagnostic}`,
                ...(isCurrentComplete
                  ? []
                  : [
                      releaseSupport === "current"
                        ? "RESULT_EVIDENCE_STATUS"
                        : "LEGACY_RELEASE",
                    ]),
              ]
            : isCurrentComplete
              ? []
              : [
                  releaseSupport === "current"
                    ? "RESULT_EVIDENCE_STATUS"
                    : "LEGACY_RELEASE",
                ],
      omittedSectionCodes: getReleaseOneOmissionCodes({
        kind: attempt.mode,
        renderGuide: Boolean(guide),
        renderMeasurement: true,
      }),
      state: isCurrentComplete ? "complete" : "partial",
    },
  };
}

export function adaptAccountCoreResult(
  accountResult: AccountResultSummary,
): CoreResultReportModel | null {
  const profile = getCandidateProfileDefinition(accountResult.profileCode);

  if (!profile) return buildUnsupportedAccountModel(accountResult);

  const versionBundle = normalizeAccountVersionBundle(accountResult);
  const releaseDefinition = getReleaseDefinition(
    accountResult.kind,
    versionBundle,
  );
  const releaseSupport = releaseDefinition?.support ?? "unsupported";
  const completeDomains = accountResult.domains.flatMap(
    (domain): DomainScore[] =>
      typeof domain.isBoundary === "boolean" && domain.status
        ? [
            {
              domainId: domain.domainId,
              isBoundary: domain.isBoundary,
              label: domain.label,
              score: domain.score,
              status: domain.status,
              symbol: domain.symbol ?? null,
            },
          ]
        : [],
  );
  const completeFacets = accountResult.facets.flatMap((facet): FacetScore[] =>
    facet.status && facet.validResponses !== undefined
      ? [
          {
            facetId: facet.facetId,
            label: facet.label,
            score: facet.score,
            status: facet.status,
            validResponses: facet.validResponses,
          },
        ]
      : [],
  );
  const missingFieldCodes = getAccountMissingFieldCodes({
    accountResult,
    completeDomains,
    completeFacets,
    releaseDefinition,
  });
  const isCurrentComplete =
    releaseSupport === "current" && missingFieldCodes.length === 0;
  const hasStructuralConflict = missingFieldCodes.some((code) =>
    code.endsWith("_STRUCTURE_INVALID"),
  );
  const state = hasStructuralConflict
    ? "unsupported"
    : isCurrentComplete
      ? "complete"
      : "partial";
  const contentSnapshot = accountResult.reportContentSnapshot ?? null;
  const guide = getPublishedTraitMapCustomerGuide(accountResult.profileCode);
  const snapshotResolution =
    contentSnapshot && accountResult.resultCopyVersion
      ? resolveReportContentSnapshot({
          code: accountResult.profileCode,
          kind: accountResult.kind,
          measurementVersion: accountResult.resultCopyVersion,
          snapshot: contentSnapshot,
        })
      : null;
  const snapshotUnavailable = snapshotResolution?.status === "unavailable";
  const fallbackSections = buildReleaseOneOwnerSections({
    code: accountResult.profileCode,
    facetContentVersion: precisionFacetInsightCopyVersion,
    guideVersion: guide?.version ?? null,
    kind: accountResult.kind,
    measurementVersion: accountResult.resultCopyVersion ?? null,
    profileContentVersion: candidateProfileNarrativeVersion,
    renderGuide: Boolean(guide),
    renderMeasurement: completeDomains.length === 5,
  });
  const accountSections =
    snapshotResolution?.status === "resolved"
      ? snapshotResolution.sections
      : fallbackSections;

  return {
    identity: {
      accountResultReportId: accountResult.resultReportId,
      assessmentAttemptId: accountResult.assessmentAttemptId,
      canonicalResultId: `account:${accountResult.resultReportId}`,
      completedAt: accountResult.completedAt,
      kind: accountResult.kind,
      localResultId: accountResult.localResultId,
      originResultId: accountResult.originResultId ?? null,
      sourceState: state === "complete" ? "account" : "legacy_partial",
    },
    interpretation:
      snapshotResolution?.status === "resolved"
        ? {
            canonicalRefs: snapshotResolution.canonicalRefs,
            contentResolution: "completion_snapshot",
            excerptManifestDigest:
              snapshotResolution.excerptManifestDigest ?? null,
            guideVersion: snapshotResolution.guideVersion ?? null,
            manifestDigest: contentSnapshot?.manifestDigest ?? null,
            traitMapBaselineId: contentSnapshot?.traitMapBaselineId ?? null,
          }
        : {
            canonicalRefs: [],
            contentResolution: guide
              ? "current_customer_guide_fallback"
              : "legacy_limited",
            excerptManifestDigest: guide
              ? buildCoreResultExcerpt(guide, accountResult.kind).manifest
                  .digest
              : null,
            guideVersion: guide?.version ?? null,
            manifestDigest: null,
            traitMapBaselineId: null,
          },
    measurement: {
      ...versionBundle,
      responseSnapshotHash: accountResult.responseSnapshotHash ?? null,
      resultCopyVersion: accountResult.resultCopyVersion ?? null,
    },
    result: {
      alternativeCodes: [...(accountResult.alternativeCodes ?? [])],
      boundaryDomainIds: completeDomains
        .filter((domain) => domain.isBoundary)
        .map((domain) => domain.domainId),
      code: accountResult.profileCode,
      currentProfileName: profile.displayName,
      domains: completeDomains,
      facets: completeFacets,
      profileNameAtCompletion: accountResult.profileName || null,
      profileNameReleaseId: candidateProfileNameReleaseId,
      profileNameValidationState: "product_published",
      responseEvidenceStatus:
        accountResult.resultEvidenceStatus ?? "unknown_legacy",
    },
    sections: accountSections,
    completeness: {
      missingFieldCodes: snapshotUnavailable
        ? [
            ...missingFieldCodes,
            `REPORT_CONTENT_SNAPSHOT_${snapshotResolution.diagnostic}`,
          ]
        : missingFieldCodes,
      omittedSectionCodes: getReleaseOneOmissionCodes({
        kind: accountResult.kind,
        renderGuide: Boolean(guide),
        renderMeasurement: completeDomains.length === 5,
      }),
      state: state === "complete" && snapshotUnavailable ? "partial" : state,
    },
  };
}

/**
 * Builds only an explicitly allowlisted public projection. Owner-only origin,
 * attempt, response hash, score and facet data never enter this adapter.
 */
export function adaptPublicCoreResult(
  projection: PublicCoreResultProjection,
): CoreResultReportModel | null {
  const profile = getCandidateProfileDefinition(projection.profileCode);

  if (!profile) return null;
  const guide = getPublishedTraitMapCustomerGuide(projection.profileCode);

  return {
    identity: {
      accountResultReportId: null,
      assessmentAttemptId: null,
      canonicalResultId: "public:projection",
      completedAt: projection.completedAt,
      kind: projection.kind,
      localResultId: null,
      originResultId: null,
      sourceState: "legacy_partial",
    },
    interpretation: {
      canonicalRefs: [],
      contentResolution: guide
        ? "current_customer_guide_fallback"
        : "legacy_limited",
      excerptManifestDigest: guide
        ? buildCoreResultExcerpt(guide, projection.kind).manifest.digest
        : null,
      guideVersion: guide?.version ?? null,
      manifestDigest: null,
      traitMapBaselineId: null,
    },
    measurement: {
      assessmentReleaseId: null,
      codeSchemeVersion: null,
      responseSnapshotHash: null,
      resultCopyVersion: null,
      scoringModelVersion: null,
      scoringReleaseId: null,
    },
    result: {
      alternativeCodes: [],
      boundaryDomainIds: [],
      code: projection.profileCode,
      currentProfileName: profile.displayName,
      domains: [],
      facets: [],
      profileNameAtCompletion: projection.profileName,
      profileNameReleaseId: candidateProfileNameReleaseId,
      profileNameValidationState: "product_published",
      responseEvidenceStatus: "unknown_legacy",
    },
    sections: buildReleaseOnePublicSections({
      code: projection.profileCode,
      guideVersion: guide?.version ?? null,
      profileContentVersion: candidateProfileNarrativeVersion,
    }),
    completeness: {
      missingFieldCodes: ["PUBLIC_PROJECTION_MEASUREMENT_WITHHELD"],
      omittedSectionCodes: getReleaseOneOmissionCodes({
        kind: projection.kind,
        publicProjection: true,
        renderGuide: Boolean(guide),
        renderMeasurement: false,
      }),
      state: "partial",
    },
  };
}

export function isRenderableCoreResultModel(model: CoreResultReportModel) {
  return (
    model.completeness.state !== "unsupported" &&
    model.result.responseEvidenceStatus !== "insufficient_evidence" &&
    Boolean(getPublishedTraitMapCustomerGuide(model.result.code))
  );
}

function normalizeAccountVersionBundle(
  accountResult: AccountResultSummary,
): CoreResultReportModel["measurement"] {
  return {
    assessmentReleaseId:
      accountResult.versionBundle?.assessmentReleaseId ?? null,
    codeSchemeVersion: accountResult.versionBundle?.codeSchemeVersion ?? null,
    responseSnapshotHash: accountResult.responseSnapshotHash ?? null,
    resultCopyVersion: accountResult.resultCopyVersion ?? null,
    scoringModelVersion:
      accountResult.versionBundle?.scoringModelVersion ?? null,
    scoringReleaseId: accountResult.versionBundle?.scoringReleaseId ?? null,
  };
}

function getReleaseSupport(
  kind: "quick" | "full",
  bundle: CoreResultVersionBundle,
): ReleaseSupport {
  return getReleaseDefinition(kind, bundle)?.support ?? "unsupported";
}

function getReleaseDefinition(
  kind: "quick" | "full",
  bundle: {
    assessmentReleaseId: string | null;
    codeSchemeVersion: string | null;
    scoringModelVersion: string | null;
    scoringReleaseId: string | null;
  },
) {
  return (
    releaseDefinitions.find(
      (definition) =>
        definition.kind === kind &&
        definition.release.assessmentReleaseId === bundle.assessmentReleaseId &&
        definition.release.codeSchemeVersion === bundle.codeSchemeVersion &&
        definition.release.scoringModelVersion === bundle.scoringModelVersion &&
        definition.release.scoringReleaseId === bundle.scoringReleaseId,
    ) ?? null
  );
}

function getAccountMissingFieldCodes({
  accountResult,
  completeDomains,
  completeFacets,
  releaseDefinition,
}: {
  accountResult: AccountResultSummary;
  completeDomains: DomainScore[];
  completeFacets: FacetScore[];
  releaseDefinition: ReleaseDefinition | null;
}) {
  const missing: string[] = [];

  if (!accountResult.versionBundle) missing.push("VERSION_BUNDLE");
  if (!releaseDefinition) missing.push("SUPPORTED_RELEASE");
  if (accountResult.resultStatus !== "ready") missing.push("RESULT_STATUS");
  if (!accountResult.resultEvidenceStatus)
    missing.push("RESULT_EVIDENCE_STATUS");
  if (!accountResult.resultCopyVersion) missing.push("RESULT_COPY_VERSION");
  if (!accountResult.originResultId && !accountResult.responseSnapshotHash)
    missing.push("RESULT_ORIGIN_IDENTITY");
  if (!accountResult.alternativeCodes) missing.push("ALTERNATIVE_CODES");
  if (
    !releaseDefinition ||
    completeDomains.length !== releaseDefinition.release.domains.length
  ) {
    missing.push("COMPLETE_DOMAIN_SCORES");
  } else if (
    !hasExactDomainStructure(
      accountResult.profileCode,
      completeDomains,
      releaseDefinition.release,
    )
  ) {
    missing.push("DOMAIN_STRUCTURE_INVALID");
  }
  if (
    !releaseDefinition ||
    completeFacets.length !== releaseDefinition.release.facets.length
  ) {
    missing.push("COMPLETE_FACET_SCORES");
  } else if (
    !hasExactFacetStructure(completeFacets, releaseDefinition.release)
  ) {
    missing.push("FACET_STRUCTURE_INVALID");
  }

  return Array.from(new Set(missing));
}

function hasExactDomainStructure(
  profileCode: string,
  domains: DomainScore[],
  release: ScoringRelease,
) {
  const actualById = new Map(
    domains.map((domain) => [domain.domainId, domain]),
  );
  if (actualById.size !== domains.length) return false;

  return release.domains.every((definition, index) => {
    const domain = actualById.get(definition.domainId);
    const position = definition.codePosition ?? index + 1;
    if (!domain || domain.label !== definition.label) return false;
    if (
      domain.status !== "valid" ||
      domain.score === null ||
      domain.symbol !== profileCode[position - 1]
    ) {
      return false;
    }
    return domain.isBoundary === (domain.score >= 45 && domain.score <= 55);
  });
}

function hasExactFacetStructure(facets: FacetScore[], release: ScoringRelease) {
  const actualById = new Map(facets.map((facet) => [facet.facetId, facet]));
  if (actualById.size !== facets.length) return false;

  return release.facets.every((definition) => {
    const facet = actualById.get(definition.facetId);
    return Boolean(
      facet &&
      facet.label === definition.label &&
      facet.status === "valid" &&
      facet.score !== null &&
      facet.validResponses >= definition.minValidResponses,
    );
  });
}

function buildUnsupportedLocalModel({
  attempt,
  completedAt,
  snapshot,
  versionBundle,
}: {
  attempt: LocalAssessmentAttempt;
  completedAt: string;
  snapshot: NonNullable<ReturnType<typeof getValidatedLocalResultSnapshot>>;
  versionBundle: CoreResultVersionBundle;
}): CoreResultReportModel {
  return {
    identity: {
      accountResultReportId: null,
      assessmentAttemptId: null,
      canonicalResultId: `local:${attempt.id}`,
      completedAt,
      kind: attempt.mode,
      localResultId: attempt.id,
      originResultId: attempt.id,
      sourceState: "legacy_partial",
    },
    interpretation: {
      canonicalRefs: [],
      contentResolution: "legacy_limited",
      excerptManifestDigest: null,
      guideVersion: null,
      manifestDigest: null,
      traitMapBaselineId: null,
    },
    measurement: {
      ...versionBundle,
      responseSnapshotHash: snapshot.responseSnapshotHash,
      resultCopyVersion: snapshot.resultCopyVersion,
    },
    result: {
      alternativeCodes: [...snapshot.scoreResult.alternativeCodes],
      boundaryDomainIds: snapshot.scoreResult.domains
        .filter((domain) => domain.isBoundary)
        .map((domain) => domain.domainId),
      code: snapshot.scoreResult.code ?? "-----",
      currentProfileName: snapshot.scoreResult.profileName ?? "이전 성향 결과",
      domains: snapshot.scoreResult.domains.map((domain) => ({ ...domain })),
      facets: snapshot.scoreResult.facets.map((facet) => ({ ...facet })),
      profileNameAtCompletion: snapshot.scoreResult.profileName,
      profileNameReleaseId: null,
      profileNameValidationState: "legacy_published",
      responseEvidenceStatus: attempt.resultEvidenceStatus ?? "unknown_legacy",
    },
    sections: [],
    completeness: {
      missingFieldCodes: ["UNKNOWN_PROFILE_CODE", "LEGACY_COMPATIBILITY"],
      omittedSectionCodes: getReleaseOneOmissionCodes({
        kind: attempt.mode,
        renderGuide: false,
        renderMeasurement: false,
      }),
      state: "unsupported",
    },
  };
}

function buildUnsupportedAccountModel(
  accountResult: AccountResultSummary,
): CoreResultReportModel {
  return {
    identity: {
      accountResultReportId: accountResult.resultReportId,
      assessmentAttemptId: accountResult.assessmentAttemptId,
      canonicalResultId: `account:${accountResult.resultReportId}`,
      completedAt: accountResult.completedAt,
      kind: accountResult.kind,
      localResultId: accountResult.localResultId,
      originResultId: accountResult.originResultId ?? null,
      sourceState: "legacy_partial",
    },
    interpretation: {
      canonicalRefs: [],
      contentResolution: "legacy_limited",
      excerptManifestDigest: null,
      guideVersion: null,
      manifestDigest: null,
      traitMapBaselineId: null,
    },
    measurement: normalizeAccountVersionBundle(accountResult),
    result: {
      alternativeCodes: [...(accountResult.alternativeCodes ?? [])],
      boundaryDomainIds: [],
      code: accountResult.profileCode,
      currentProfileName: accountResult.profileName,
      domains: [],
      facets: [],
      profileNameAtCompletion: accountResult.profileName,
      profileNameReleaseId: null,
      profileNameValidationState: "legacy_published",
      responseEvidenceStatus:
        accountResult.resultEvidenceStatus ?? "unknown_legacy",
    },
    sections: [],
    completeness: {
      missingFieldCodes: ["UNKNOWN_PROFILE_CODE", "LEGACY_COMPATIBILITY"],
      omittedSectionCodes: getReleaseOneOmissionCodes({
        kind: accountResult.kind,
        renderGuide: false,
        renderMeasurement: false,
      }),
      state: "unsupported",
    },
  };
}
