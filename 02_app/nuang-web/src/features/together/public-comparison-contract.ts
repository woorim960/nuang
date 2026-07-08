import type { CoreScoreResult, DomainScore, FacetScore } from "@/lib/scoring/types";
import {
  listDefaultComparableFields,
  oneToOneComparisonPolicy,
  profileVisibilityPolicyVersion,
  type ProfileVisibilityFieldId,
} from "@/features/together/profile-visibility-policy";

export const publicProfileSnapshotContractVersion =
  "public-profile-snapshot.v0.1";

export const publicComparisonReportContractVersion =
  "public-comparison-report.v0.1";

export type PublicProfileDisplay = {
  displayName: string;
  motif: "flame" | "forest" | "purple" | "sun" | "water";
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
  displayProfile: PublicProfileDisplay;
  result: CoreScoreResult;
  snapshotId: string;
};

export type PublicComparisonFailureCode =
  | "viewer_full_core_missing"
  | "target_public_snapshot_missing"
  | "snapshot_policy_version_mismatch"
  | "target_public_snapshot_not_active"
  | "comparison_scope_empty"
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
  comparison_scope_empty: {
    httpStatus: 400,
    message: "비교에 사용할 공개 항목이 부족해요.",
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
      commonGround: PublicComparisonAxisDelta[];
      conversationStarters: string[];
      differences: PublicComparisonAxisDelta[];
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
};

export type PublicComparisonAxisDelta = {
  difference: number;
  domainId: string;
  label: string;
  targetScore: number;
  viewerScore: number;
};

export function createPublicProfileSnapshotPayload({
  createdAt,
  displayProfile,
  result,
  snapshotId,
}: CreatePublicProfileSnapshotInput): PublicProfileSnapshotPayload {
  return {
    contractVersion: publicProfileSnapshotContractVersion,
    createdAt,
    displayProfile,
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

  return listDefaultComparableFields().every((rule) =>
    includedFields.has(rule.fieldId),
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

  return {
    ok: true,
    comparison: {
      basis: oneToOneComparisonPolicy.defaultTargetAccess,
      contractVersion: publicComparisonReportContractVersion,
      createdAt,
      id: comparisonId,
      policyVersion: profileVisibilityPolicyVersion,
      requiresCounterpartyApproval: false,
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
        adjustmentGuide: [
          "차이가 큰 축은 맞고 틀림보다 서로 기대하는 속도를 확인해요.",
          "상대가 공개하지 않은 항목은 질문하거나 추정하지 않아요.",
        ],
        commonGround: [...deltas]
          .sort((a, b) => a.difference - b.difference)
          .slice(0, 2),
        conversationStarters: [
          "우리가 비슷하게 쓰는 에너지는 어디일까요?",
          "서로 다르게 반응하는 순간에는 어떤 신호를 먼저 볼까요?",
        ],
        differences: [...deltas]
          .sort((a, b) => b.difference - a.difference)
          .slice(0, 3),
      },
      sharedFields: listDefaultComparableFields().map((rule) => rule.fieldId),
      target: toComparisonProfileCard(target),
      targetPublicSnapshotId: target.snapshotId,
      viewer: toComparisonProfileCard(viewer),
      viewerPublicSnapshotId: viewer.snapshotId,
    },
  };
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
  };
}

function getComparableDomainDeltas(
  viewer: PublicProfileSnapshotPayload,
  target: PublicProfileSnapshotPayload,
) {
  const targetDomains = new Map(
    target.publicData.coreDomainMap
      .filter((domain) => domain.score !== null)
      .map((domain) => [domain.id, domain]),
  );

  return viewer.publicData.coreDomainMap.flatMap((viewerDomain) => {
    if (viewerDomain.score === null) return [];
    const targetDomain = targetDomains.get(viewerDomain.id);
    if (!targetDomain || targetDomain.score === null) return [];

    return [
      {
        difference: Math.abs(viewerDomain.score - targetDomain.score),
        domainId: viewerDomain.id,
        label: viewerDomain.label,
        targetScore: targetDomain.score,
        viewerScore: viewerDomain.score,
      },
    ];
  });
}
