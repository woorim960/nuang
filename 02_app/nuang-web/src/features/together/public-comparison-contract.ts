import type {
  CoreScoreResult,
  DomainScore,
  FacetScore,
} from "@/lib/scoring/types";
import {
  createCharacterProfileImage,
  type PublicProfileImage,
} from "@/features/public-profile/profile-image";
import {
  listDefaultComparableFields,
  oneToOneComparisonPolicy,
  profileVisibilityPolicyVersion,
  type ProfileVisibilityFieldId,
} from "@/features/together/profile-visibility-policy";
import {
  getCandidateDirectionCopy,
  getCandidateProfileDefinition,
} from "@/features/nuang-code/candidate-profile-names";
import { nextNuangCodeScheme } from "@/features/nuang-code/next-code-scheme";

export const publicProfileSnapshotContractVersion =
  "public-profile-snapshot.v0.1";

export const publicComparisonReportContractVersion =
  "public-comparison-report.v0.5";

export const publicComparisonFacetModelVersion =
  "nuang-public-facets.candidate-1.0";
export const publicComparisonCopyVersion = "comparison-copy.1.1";
export const publicComparisonFacetIds = [
  "SE-RE",
  "SE-AI",
  "OE-AE",
  "OE-CI",
  "OE-IE",
  "RO-EC",
  "SM-EP",
  "SM-OS",
  "ER-IR",
  "ER-WD",
] as const;

const publicComparisonDomainIds = nextNuangCodeScheme.positions.map(
  (position) => position.domainId,
);
const publicComparisonFacetIdSet = new Set<string>(publicComparisonFacetIds);

type CandidateDomainId =
  (typeof nextNuangCodeScheme.positions)[number]["domainId"];

export type PublicProfileDisplay = {
  displayName: string;
  handle?: string;
  motif: "flame" | "forest" | "purple" | "sun" | "water";
  profileMessage?: string;
  profileImage: PublicProfileImage;
};

export type CreatePublicProfileDisplayInput = Omit<
  PublicProfileDisplay,
  "profileImage"
> & {
  profileImage?: PublicProfileImage;
};

export type PublicAxisSummary = {
  id: string;
  isBoundary?: boolean;
  label: string;
  score: number | null;
  status: string;
  symbol?: string | null;
};

export type PublicProfileSnapshotPayload = {
  contractVersion: typeof publicProfileSnapshotContractVersion;
  createdAt: string;
  displayProfile: PublicProfileDisplay;
  profile: {
    code: string;
    name: string;
  };
  publicData: {
    coreDomainMap: PublicAxisSummary[];
    coreFacetSummary: PublicAxisSummary[];
  };
  snapshotId: string;
  visibility: {
    includedFields: ProfileVisibilityFieldId[];
    policyVersion: typeof profileVisibilityPolicyVersion;
  };
  privacy: {
    includesAccountIdentity: false;
    includesCrisisHelpInteractions: false;
    includesDirectResponses: false;
    includesRawScorePayload: false;
    includesSensitiveAssessments: false;
  };
};

export type CreatePublicProfileSnapshotInput = {
  createdAt: string;
  displayProfile: CreatePublicProfileDisplayInput;
  result: CoreScoreResult;
  snapshotId: string;
};

export type PublicComparisonFailureCode =
  | "viewer_full_core_missing"
  | "viewer_comparison_scope_missing"
  | "target_public_snapshot_missing"
  | "snapshot_policy_version_mismatch"
  | "target_public_snapshot_not_active"
  | "target_comparison_scope_missing"
  | "comparison_report_build_failed"
  | "comparison_audit_write_failed";

export type PublicComparisonWriteStepId =
  | "ensure_viewer_full_core"
  | "read_target_public_snapshot"
  | "validate_snapshot_policy_version"
  | "revalidate_target_public_scope"
  | "project_allowed_fields"
  | "build_comparison_report"
  | "record_comparison_audit_event";

export const publicComparisonWriteSteps = [
  {
    id: "ensure_viewer_full_core",
    table: "report.result_report",
    operation: "read_viewer_full_core_summary",
  },
  {
    id: "read_target_public_snapshot",
    table: "profile.profile_public_snapshot",
    operation: "read_published_scope_only",
  },
  {
    id: "validate_snapshot_policy_version",
    table: "profile.visibility_policy_release",
    operation: "assert_snapshot_version_supported",
  },
  {
    id: "revalidate_target_public_scope",
    table: "profile.profile_public_snapshot",
    operation: "assert_snapshot_active_and_scope_current",
  },
  {
    id: "project_allowed_fields",
    table: "profile.profile_visibility_setting",
    operation: "intersect_public_comparison_scope",
  },
  {
    id: "build_comparison_report",
    table: "comparison.comparison_report",
    operation: "insert_public_scope_report",
  },
  {
    id: "record_comparison_audit_event",
    table: "audit.visibility_audit_event",
    operation: "insert_comparison_scope_event",
  },
] as const satisfies ReadonlyArray<{
  id: PublicComparisonWriteStepId;
  operation: string;
  table: string;
}>;

export const publicComparisonFailures: Record<
  PublicComparisonFailureCode,
  {
    httpStatus: 400 | 403 | 404 | 409 | 500;
    message: string;
    retryable: boolean;
    step: PublicComparisonWriteStepId;
  }
> = {
  viewer_full_core_missing: {
    httpStatus: 403,
    message: "내 정밀 코어 결과가 있어야 1:1 비교를 만들 수 있어요.",
    retryable: false,
    step: "ensure_viewer_full_core",
  },
  viewer_comparison_scope_missing: {
    httpStatus: 403,
    message: "내 비교 공개 범위를 확인해 주세요.",
    retryable: false,
    step: "project_allowed_fields",
  },
  target_public_snapshot_missing: {
    httpStatus: 404,
    message: "상대의 공개 프로필을 찾을 수 없어요.",
    retryable: false,
    step: "read_target_public_snapshot",
  },
  snapshot_policy_version_mismatch: {
    httpStatus: 409,
    message: "상대 공개 프로필 정책 버전이 바뀌었어요. 다시 불러와 주세요.",
    retryable: false,
    step: "validate_snapshot_policy_version",
  },
  target_public_snapshot_not_active: {
    httpStatus: 409,
    message: "상대 공개 프로필 공개 범위가 바뀌었어요. 다시 확인해 주세요.",
    retryable: false,
    step: "revalidate_target_public_scope",
  },
  target_comparison_scope_missing: {
    httpStatus: 409,
    message: "이 프로필은 아직 비교 정보를 준비하고 있어요.",
    retryable: false,
    step: "project_allowed_fields",
  },
  comparison_report_build_failed: {
    httpStatus: 500,
    message: "비교 리포트를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "build_comparison_report",
  },
  comparison_audit_write_failed: {
    httpStatus: 500,
    message: "비교 접근 기록을 남기지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "record_comparison_audit_event",
  },
};

export type PublicComparisonReportPayload = {
  ok: true;
  comparison: {
    basis: typeof oneToOneComparisonPolicy.defaultTargetAccess;
    contractVersion: typeof publicComparisonReportContractVersion;
    createdAt: string;
    id: string;
    policyVersion: typeof profileVisibilityPolicyVersion;
    requiresCounterpartyApproval: false;
    model: {
      codeSchemeVersion: typeof nextNuangCodeScheme.version;
      copyVersion: typeof publicComparisonCopyVersion;
      facetModelVersion: typeof publicComparisonFacetModelVersion;
      scoreInterpretation: "response_direction_0_100";
    };
    access: {
      reevaluateOnVisibilityChange: true;
      targetSnapshotStatusRequired: "active";
      viewerResultDeletionDisablesReport: true;
    };
    safety: {
      compatibilityScoreProvided: false;
      directResponsesUsed: false;
      privateInferenceUsed: false;
      rawScoresUsed: false;
      rankingProvided: false;
    };
    sections: {
      adjustmentGuide: string[];
      axisComparisons: PublicComparisonAxisInsight[];
      commonGround: PublicComparisonAxisDelta[];
      conversationStarters: string[];
      differences: PublicComparisonAxisDelta[];
      facetComparisons: PublicComparisonFacetInsight[];
      misunderstandingScenes: string[];
      summary: PublicComparisonSummary;
    };
    sharedFields: ProfileVisibilityFieldId[];
    target: PublicComparisonProfileCard;
    targetPublicSnapshotId: string;
    viewer: PublicComparisonProfileCard;
    viewerPublicSnapshotId: string;
  };
};

export type PublicComparisonProfileCard = {
  code: string;
  displayName: string;
  motif: PublicProfileDisplay["motif"];
  profileName: string;
  profileImage: PublicProfileImage;
};

export type PublicComparisonAxisDelta = {
  difference: number;
  domainId: string;
  hasBoundarySignal?: boolean;
  label: string;
  positionId?: CandidateDomainId;
  targetIsBoundary?: boolean;
  targetEvidenceStatus?: string;
  targetScore: number;
  targetSymbol?: string | null;
  viewerIsBoundary?: boolean;
  viewerEvidenceStatus?: string;
  viewerScore: number;
  viewerSymbol?: string | null;
};

export type PublicComparisonSummary = {
  body: string;
  closestAxisLabel: string | null;
  headline: string;
  strongestDifferenceLabel: string | null;
};

export type PublicComparisonAxisInsight = PublicComparisonAxisDelta & {
  adjustmentTip: string;
  closeness:
    "close" | "different" | "moderate" | "very_close" | "very_different";
  interpretation: string;
  possibleMisread: string;
  targetPattern: string;
  viewerPattern: string;
};

export type PublicComparisonFacetInsight = {
  closeness: PublicComparisonAxisInsight["closeness"];
  difference: number;
  domainId: string;
  facetId: string;
  interpretation: string;
  label: string;
  targetEvidenceStatus: string;
  targetScore: number;
  viewerEvidenceStatus: string;
  viewerScore: number;
};

export function createPublicProfileSnapshotPayload({
  createdAt,
  displayProfile,
  result,
  snapshotId,
}: CreatePublicProfileSnapshotInput): PublicProfileSnapshotPayload {
  const normalizedDisplayProfile =
    normalizePublicProfileDisplay(displayProfile);

  return {
    contractVersion: publicProfileSnapshotContractVersion,
    createdAt,
    displayProfile: normalizedDisplayProfile,
    profile: {
      code: result.code ?? "-----",
      name: result.profileName ?? "결과 이름 준비 중",
    },
    publicData: {
      coreDomainMap: result.domains.map(toPublicDomainSummary),
      coreFacetSummary: result.facets.map(toPublicFacetSummary),
    },
    snapshotId,
    visibility: {
      includedFields: listDefaultComparableFields().map((rule) => rule.fieldId),
      policyVersion: profileVisibilityPolicyVersion,
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

export function hasRequiredPublicComparisonScope(
  snapshot: PublicProfileSnapshotPayload,
) {
  const includedFields = new Set(snapshot.visibility.includedFields);
  const domainIds = new Set(
    snapshot.publicData.coreDomainMap.map((domain) => domain.id),
  );
  const facetIds = new Set(
    snapshot.publicData.coreFacetSummary.map((facet) => facet.id),
  );

  return (
    listDefaultComparableFields().every((rule) =>
      includedFields.has(rule.fieldId),
    ) &&
    publicComparisonDomainIds.every((domainId) => domainIds.has(domainId)) &&
    publicComparisonFacetIds.every((facetId) => facetIds.has(facetId))
  );
}

export function createPublicComparisonFailurePayload(
  code: PublicComparisonFailureCode,
) {
  const failure = publicComparisonFailures[code];

  return {
    ok: false,
    error: "public_comparison_failed",
    code,
    message: failure.message,
    retryable: failure.retryable,
    step: failure.step,
  } as const;
}

export function createPublicComparisonReportPayload({
  comparisonId,
  createdAt,
  target,
  viewer,
}: {
  comparisonId: string;
  createdAt: string;
  target: PublicProfileSnapshotPayload;
  viewer: PublicProfileSnapshotPayload;
}): PublicComparisonReportPayload {
  const deltas = getComparableDomainDeltas(viewer, target);
  const axisComparisons = deltas.map(toAxisInsight);
  const facetComparisons = getComparableFacetInsights(viewer, target);
  const commonGround = [...deltas]
    .filter((delta) => delta.difference <= 16)
    .sort((a, b) => a.difference - b.difference)
    .slice(0, 2);
  const differences = [...deltas]
    .filter((delta) => delta.difference > 16)
    .sort((a, b) => b.difference - a.difference)
    .slice(0, 3);

  return {
    ok: true,
    comparison: {
      basis: oneToOneComparisonPolicy.defaultTargetAccess,
      contractVersion: publicComparisonReportContractVersion,
      createdAt,
      id: comparisonId,
      policyVersion: profileVisibilityPolicyVersion,
      requiresCounterpartyApproval: false,
      model: {
        codeSchemeVersion: nextNuangCodeScheme.version,
        copyVersion: publicComparisonCopyVersion,
        facetModelVersion: publicComparisonFacetModelVersion,
        scoreInterpretation: "response_direction_0_100",
      },
      access: {
        reevaluateOnVisibilityChange: true,
        targetSnapshotStatusRequired: "active",
        viewerResultDeletionDisablesReport: true,
      },
      safety: {
        compatibilityScoreProvided: false,
        directResponsesUsed: false,
        privateInferenceUsed: false,
        rawScoresUsed: false,
        rankingProvided: false,
      },
      sections: {
        adjustmentGuide: buildAdjustmentGuide(differences, viewer, target),
        axisComparisons,
        commonGround,
        conversationStarters: buildConversationStarters(
          commonGround,
          differences,
        ),
        differences,
        facetComparisons,
        misunderstandingScenes: buildMisunderstandingScenes(differences),
        summary: buildComparisonSummary(
          commonGround,
          differences,
          viewer,
          target,
        ),
      },
      sharedFields: listDefaultComparableFields().map((rule) => rule.fieldId),
      target: toComparisonProfileCard(target),
      targetPublicSnapshotId: target.snapshotId,
      viewer: toComparisonProfileCard(viewer),
      viewerPublicSnapshotId: viewer.snapshotId,
    },
  };
}

function getComparableFacetInsights(
  viewer: PublicProfileSnapshotPayload,
  target: PublicProfileSnapshotPayload,
) {
  const targetFacetsById = new Map(
    target.publicData.coreFacetSummary
      .filter(
        (facet) =>
          facet.score !== null && publicComparisonFacetIdSet.has(facet.id),
      )
      .map((facet) => [facet.id, facet]),
  );

  return viewer.publicData.coreFacetSummary.flatMap((viewerFacet) => {
    if (
      viewerFacet.score === null ||
      !publicComparisonFacetIdSet.has(viewerFacet.id)
    ) {
      return [];
    }

    const targetFacet = targetFacetsById.get(viewerFacet.id);

    if (!targetFacet || targetFacet.score === null) return [];

    const difference = Math.abs(viewerFacet.score - targetFacet.score);

    return [
      {
        closeness: getCloseness(difference),
        difference,
        domainId: viewerFacet.id.split("-")[0] ?? "",
        facetId: viewerFacet.id,
        interpretation: buildFacetInterpretation({
          difference,
          label: viewerFacet.label,
          targetScore: targetFacet.score,
          viewerScore: viewerFacet.score,
        }),
        label: viewerFacet.label,
        targetEvidenceStatus: targetFacet.status,
        targetScore: targetFacet.score,
        viewerEvidenceStatus: viewerFacet.status,
        viewerScore: viewerFacet.score,
      },
    ];
  });
}

function buildFacetInterpretation({
  difference,
  label,
  targetScore,
  viewerScore,
}: {
  difference: number;
  label: string;
  targetScore: number;
  viewerScore: number;
}) {
  if (difference <= 8) {
    return `${label}${topicParticle(label)} 두 사람에게 거의 비슷한 정도로 나타나요.`;
  }

  if (difference <= 16) {
    return `${label}${topicParticle(label)} 두 사람에게 비슷한 정도로 나타나요.`;
  }

  return viewerScore > targetScore
    ? `${label}${topicParticle(label)} 나에게 상대보다 더 자주 나타나는 편이에요.`
    : `${label}${topicParticle(label)} 상대에게 나보다 더 자주 나타나는 편이에요.`;
}

function toPublicDomainSummary(domain: DomainScore): PublicAxisSummary {
  return {
    id: domain.domainId,
    isBoundary: domain.isBoundary,
    label: domain.label,
    score: roundPublicScore(domain.score),
    status: domain.status,
    symbol: domain.symbol,
  };
}

function toPublicFacetSummary(facet: FacetScore): PublicAxisSummary {
  return {
    id: facet.facetId,
    label: facet.label,
    score: roundPublicScore(facet.score),
    status: facet.status,
  };
}

function roundPublicScore(value: number | null) {
  return value === null ? null : Math.round(value);
}

function toComparisonProfileCard(
  snapshot: PublicProfileSnapshotPayload,
): PublicComparisonProfileCard {
  return {
    code: snapshot.profile.code,
    displayName: snapshot.displayProfile.displayName,
    motif: snapshot.displayProfile.motif,
    profileName: snapshot.profile.name,
    profileImage: snapshot.displayProfile.profileImage,
  };
}

function normalizePublicProfileDisplay(
  displayProfile: CreatePublicProfileDisplayInput,
): PublicProfileDisplay {
  return {
    ...displayProfile,
    profileImage:
      displayProfile.profileImage ??
      createCharacterProfileImage({
        alt: `${displayProfile.displayName} 프로필 이미지`,
        motif: displayProfile.motif,
      }),
  };
}

function getComparableDomainDeltas(
  viewer: PublicProfileSnapshotPayload,
  target: PublicProfileSnapshotPayload,
) {
  const targetDomainsById = new Map(
    target.publicData.coreDomainMap
      .filter((domain) => domain.score !== null)
      .map((domain, index) => [getAxisId(domain, index), domain]),
  );

  return viewer.publicData.coreDomainMap.flatMap((viewerDomain, index) => {
    if (viewerDomain.score === null) return [];
    const axisId = getAxisId(viewerDomain, index);
    const position = getCandidateCodePosition(axisId);
    const targetDomain = targetDomainsById.get(axisId);

    if (!targetDomain || targetDomain.score === null) return [];

    const positionIndex = position ? position.codePosition - 1 : index;
    const viewerSymbol =
      viewerDomain.symbol ??
      getCandidateCodeSymbolAt(viewer.profile.code, positionIndex);
    const targetSymbol =
      targetDomain.symbol ??
      getCandidateCodeSymbolAt(target.profile.code, positionIndex);

    return [
      {
        difference: Math.abs(viewerDomain.score - targetDomain.score),
        domainId: axisId,
        hasBoundarySignal: Boolean(
          viewerDomain.isBoundary || targetDomain.isBoundary,
        ),
        label: position?.label ?? viewerDomain.label,
        positionId: position?.domainId,
        targetIsBoundary: Boolean(targetDomain.isBoundary),
        targetEvidenceStatus: targetDomain.status,
        targetScore: targetDomain.score,
        targetSymbol,
        viewerIsBoundary: Boolean(viewerDomain.isBoundary),
        viewerEvidenceStatus: viewerDomain.status,
        viewerScore: viewerDomain.score,
        viewerSymbol,
      },
    ];
  });
}

function getAxisId(axis: PublicAxisSummary, index: number) {
  return axis.id || `axis_${index + 1}`;
}

function buildComparisonSummary(
  commonGround: PublicComparisonAxisDelta[],
  differences: PublicComparisonAxisDelta[],
  viewer: PublicProfileSnapshotPayload,
  target: PublicProfileSnapshotPayload,
): PublicComparisonSummary {
  const closestAxis = commonGround[0] ?? null;
  const strongestDifference = differences[0] ?? null;
  const pairSubject = formatPairSubject(
    viewer.displayProfile.displayName,
    target.displayProfile.displayName,
  );

  return {
    body:
      closestAxis && strongestDifference
        ? `${pairSubject} ${closestAxis.label}에서는 편하게 맞는 부분이 있고, ${strongestDifference.label}에서는 서로 필요한 신호가 다르게 나타나요.`
        : closestAxis
          ? `${pairSubject} ${closestAxis.label}에서 서로 편한 흐름이 가까워요.`
          : `${pairSubject} 공개된 뉴앙 코드를 기준으로 관계에서 나타나는 방식을 정리했어요.`,
    closestAxisLabel: closestAxis?.label ?? null,
    headline: buildSummaryHeadline(closestAxis, strongestDifference),
    strongestDifferenceLabel: strongestDifference?.label ?? null,
  };
}

function buildSummaryHeadline(
  closestAxis: PublicComparisonAxisDelta | null,
  strongestDifference: PublicComparisonAxisDelta | null,
) {
  if (closestAxis && strongestDifference) {
    return `편하게 맞는 자리는 ${closestAxis.label}, 신호를 맞출 자리는 ${withCopula(strongestDifference.label)}.`;
  }

  if (strongestDifference) {
    return `${strongestDifference.label}에서 서로 필요한 신호가 다르게 보여요.`;
  }

  if (closestAxis) {
    return `${closestAxis.label}에서 비슷한 방식이 보여요.`;
  }

  return "공개된 성향 정보를 기준으로 서로의 반응 방식을 확인했어요.";
}

function toAxisInsight(
  delta: PublicComparisonAxisDelta,
): PublicComparisonAxisInsight {
  const closeness = getCloseness(delta.difference);

  return {
    ...delta,
    adjustmentTip: buildAdjustmentTip(delta),
    closeness,
    interpretation: buildAxisInterpretation(delta, closeness),
    possibleMisread: buildPossibleMisread(delta),
    targetPattern: buildPatternText(
      "상대",
      delta.targetSymbol,
      delta.targetIsBoundary,
    ),
    viewerPattern: buildPatternText(
      "나",
      delta.viewerSymbol,
      delta.viewerIsBoundary,
    ),
  };
}

function getCloseness(
  difference: number,
): PublicComparisonAxisInsight["closeness"] {
  if (difference <= 8) return "very_close";
  if (difference <= 16) return "close";
  if (difference <= 28) return "moderate";
  if (difference <= 42) return "different";
  return "very_different";
}

function buildAxisInterpretation(
  delta: PublicComparisonAxisDelta,
  closeness: PublicComparisonAxisInsight["closeness"],
) {
  const copy = getComparisonCopy(delta);
  const viewerInsight = getCandidateAxisDirection(delta, delta.viewerSymbol);
  const targetInsight = getCandidateAxisDirection(delta, delta.targetSymbol);
  const boundarySuffix = delta.hasBoundarySignal ? ` ${boundaryCopy}` : "";

  if (isSameCodePosition(delta) && delta.difference <= 16) {
    const sharedName = viewerInsight?.shortToken ?? "비슷한 방식";

    return `${delta.label}에서는 둘 다 ${sharedName} 쪽으로 가까워요. ${copy.same}${boundarySuffix}`;
  }

  if (isSameCodePosition(delta)) {
    const sharedName = viewerInsight?.shortToken ?? "같은 방향";

    return `${delta.label}에서는 둘 다 ${sharedName} 쪽이지만, 나타나는 정도에는 차이가 있어요. ${copy.same}${boundarySuffix}`;
  }

  if (delta.difference <= 16) {
    return `${delta.label}의 수치는 서로 가깝지만 경계 양쪽에서 글자가 달라졌어요. 상황에 따라 비슷한 반응도 나타날 수 있어요.${boundarySuffix}`;
  }

  if (closeness === "moderate") {
    return `${delta.label}에서는 비슷한 부분과 다른 부분이 함께 보여요. ${copy.different}${boundarySuffix}`;
  }

  return `${delta.label}에서 나는 ${viewerInsight?.shortToken ?? "내 방식"}, 상대는 ${targetInsight?.shortToken ?? "상대 방식"} 쪽으로 다르게 나타나요. ${copy.different}${boundarySuffix}`;
}

function buildPossibleMisread(delta: PublicComparisonAxisDelta) {
  return getComparisonCopy(delta).possibleMisread;
}

function buildAdjustmentTip(delta: PublicComparisonAxisDelta) {
  if (delta.difference <= 16) {
    return `가까운 자리예요. ${getComparisonCopy(delta).adjustmentQuestion}`;
  }

  if (isSameCodePosition(delta)) {
    return `같은 방향이지만 나타나는 정도가 달라요. ${getComparisonCopy(delta).adjustmentQuestion}`;
  }

  return `조율이 필요한 자리예요. ${getComparisonCopy(delta).adjustmentQuestion}`;
}

function buildPatternText(
  subject: "나" | "상대",
  symbol: string | null | undefined,
  isBoundary?: boolean,
) {
  const position = getCandidateCodePositionForSymbol(symbol);
  const insight = position
    ? getCandidateDirectionCopy(position.codePosition, symbol ?? "")
    : null;
  const boundary = isBoundary ? ` ${boundaryCopy}` : "";

  if (!insight) {
    return `${subject}의 공개된 뉴앙 코드 정보를 더 확인해야 해요.`;
  }

  return `${insight.detailTitle}. ${insight.description}${boundary}`;
}

function buildConversationStarters(
  commonGround: PublicComparisonAxisDelta[],
  differences: PublicComparisonAxisDelta[],
) {
  const closest = commonGround[0];
  const strongest = differences[0];

  return [
    closest
      ? `${closest.label}에서 우리가 편하게 맞는 순간은 언제였을까요?`
      : "우리가 편하게 맞는 순간은 어떤 장면에서 가장 잘 보일까요?",
    strongest
      ? `${strongest.label}에서 서로 부담을 덜 느끼려면 어떤 신호를 먼저 주면 좋을까요?`
      : "서로 다르게 반응하는 순간에는 어떤 신호를 먼저 보면 좋을까요?",
    "상대가 공개하지 않은 부분은 추정하지 않고 직접 물어보는 방식이 좋아요.",
  ];
}

function buildAdjustmentGuide(
  differences: PublicComparisonAxisDelta[],
  viewer: PublicProfileSnapshotPayload,
  target: PublicProfileSnapshotPayload,
) {
  const strongest = differences[0];

  return [
    strongest
      ? `${strongest.label}에서 필요한 신호가 다르게 보이기 때문에, ${formatPairSubject(viewer.displayProfile.displayName, target.displayProfile.displayName)} 속도보다 확인 방식을 먼저 맞추는 편이 좋아요.`
      : "큰 차이가 뚜렷하지 않을 때는 현재 편한 대화 방식을 유지하면서 작은 불편 신호만 확인해도 충분해요.",
    "상대가 공개하지 않은 항목은 질문하거나 추정하지 않아요.",
    "갈등이 생기면 누가 맞는지보다 각자 어떤 정보를 더 필요로 했는지부터 정리해요.",
  ];
}

function formatPairSubject(viewerName: string, targetName: string) {
  const viewer = toPersonName(viewerName);
  const target = toPersonName(targetName);

  return `${viewer}${andParticle(viewer)} ${target}${topicParticle(target)}`;
}

function toPersonName(name: string) {
  if (name === "나" || name === "상대") return name;
  if (name.endsWith("님")) return name;
  return `${name}님`;
}

function andParticle(value: string) {
  return hasFinalConsonant(value) ? "과" : "와";
}

function topicParticle(value: string) {
  return hasFinalConsonant(value) ? "은" : "는";
}

function withCopula(value: string) {
  return `${value}${hasFinalConsonant(value) ? "이에요" : "예요"}`;
}

function hasFinalConsonant(value: string) {
  const last = Array.from(value.trim()).at(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);

  if (code < 0xac00 || code > 0xd7a3) return false;

  return (code - 0xac00) % 28 !== 0;
}

function buildMisunderstandingScenes(differences: PublicComparisonAxisDelta[]) {
  const strongest = differences[0];
  const second = differences[1];

  return [
    strongest
      ? `${strongest.label}에서 한쪽은 충분히 표현했다고 느끼고, 다른 한쪽은 아직 설명이 부족하다고 느낄 수 있어요.`
      : "서로의 반응이 비슷해 보여도 같은 이유로 움직인다고 단정하면 작은 오해가 생길 수 있어요.",
    second
      ? `${second.label}에서는 계획을 바꾸거나 감정이 올라오는 순간에 서로의 기준이 다르게 보일 수 있어요.`
      : "답장 속도, 결정 방식, 쉬는 방식처럼 작은 생활 리듬에서 먼저 차이가 드러날 수 있어요.",
  ];
}

function isSameCodePosition(delta: PublicComparisonAxisDelta) {
  return Boolean(
    delta.viewerSymbol &&
    delta.targetSymbol &&
    delta.viewerSymbol === delta.targetSymbol,
  );
}

function getComparisonCopy(delta: PublicComparisonAxisDelta) {
  return delta.positionId
    ? candidateComparisonCopy[delta.positionId]
    : {
        same: "서로 편하게 맞는 흐름이 보여요.",
        different: "서로 필요한 신호가 다르게 나타날 수 있어요.",
        possibleMisread:
          "한쪽은 충분하다고 느끼고, 다른 한쪽은 설명이 더 필요하다고 느낄 수 있어요.",
        adjustmentQuestion: "서로 편한 속도와 표현 방식을 먼저 확인해볼까요?",
      };
}

const boundaryCopy =
  "이 자리는 한쪽으로 아주 강하게 기울기보다 상황에 따라 두 모습이 모두 나타날 수 있어요.";

const candidateComparisonCopy: Record<
  CandidateDomainId,
  {
    adjustmentQuestion: string;
    different: string;
    possibleMisread: string;
    same: string;
  }
> = {
  SE: {
    same: "함께 있을 때의 에너지와 표현을 시작하는 방식이 비슷해요.",
    different:
      "한 사람은 함께하며 바로 표현할 때 편하고, 다른 사람은 혼자 정리하고 상황을 살핀 뒤 표현할 때 편해요.",
    possibleMisread:
      "표현이 늦으면 관심이 없다고 오해하거나, 빠른 반응을 부담으로 느낄 수 있어요.",
    adjustmentQuestion: "바로 이야기할까, 생각을 정리할 시간을 가질까?",
  },
  OE: {
    same: "정보를 살펴보고 생각을 넓히는 방식이 비슷해요.",
    different:
      "한 사람은 확인된 내용과 구체적인 정보부터 보고, 다른 사람은 새로운 가능성과 관점을 더 찾아봐요.",
    possibleMisread:
      "구체적인 확인을 답답함으로 보거나, 가능성 탐색을 현실과 동떨어진 이야기로 오해할 수 있어요.",
    adjustmentQuestion: "확인된 내용부터 볼까, 새로운 가능성부터 이야기해볼까?",
  },
  RO: {
    same: "관계 상황에서 자연스럽게 관심이 가는 곳이 비슷해요.",
    different:
      "한 사람은 원인과 해결할 부분에, 다른 사람은 상대가 어떤 마음인지에 더 자연스럽게 관심이 가요.",
    possibleMisread:
      "해결 방법을 말하는 것을 공감 부족으로, 마음을 살피는 것을 문제 회피로 오해할 수 있어요.",
    adjustmentQuestion:
      "지금은 마음을 함께 살펴볼까, 원인과 해결 방법을 정리해볼까?",
  },
  SM: {
    same: "해야 할 일을 시작하고 이어가며 정리하는 방식이 비슷해요.",
    different:
      "한 사람은 비교적 꾸준한 흐름을 편하게 느끼고, 다른 사람은 상황에 맞춰 바꾸는 여유를 더 필요로 해요.",
    possibleMisread:
      "꾸준함을 통제로 느끼거나, 상황에 맞춘 변화를 무책임으로 오해할 수 있어요.",
    adjustmentQuestion:
      "꼭 지킬 부분과 상황에 따라 바꿔도 되는 부분을 나눠볼까?",
  },
  ER: {
    same: "불편한 상황에서 걱정과 감정이 커지는 속도가 비슷해요.",
    different:
      "한 사람은 걱정과 감정이 비교적 천천히 커지고, 다른 사람은 비교적 빠르게 커질 수 있어요.",
    possibleMisread:
      "차분한 반응을 무관심으로 보거나, 빠른 감정 반응을 과하다고 오해할 수 있어요.",
    adjustmentQuestion:
      "지금 느끼는 걱정과 감정을 어느 정도로 함께 확인하면 편할까?",
  },
};

function getCandidateCodePosition(domainId: string) {
  return (
    nextNuangCodeScheme.positions.find(
      (position) => position.domainId === domainId,
    ) ?? null
  );
}

function getCandidateCodeSymbolAt(code: string, index: number) {
  if (!getCandidateProfileDefinition(code)) return null;
  return code[index] ?? null;
}

function getCandidateAxisDirection(
  delta: PublicComparisonAxisDelta,
  symbol: string | null | undefined,
) {
  const position = getCandidateCodePosition(delta.domainId);
  return position
    ? getCandidateDirectionCopy(position.codePosition, symbol ?? "")
    : null;
}

function getCandidateCodePositionForSymbol(symbol: string | null | undefined) {
  if (!symbol) return null;
  return (
    nextNuangCodeScheme.positions.find(
      (position) =>
        position.lowSymbol === symbol || position.highSymbol === symbol,
    ) ?? null
  );
}
