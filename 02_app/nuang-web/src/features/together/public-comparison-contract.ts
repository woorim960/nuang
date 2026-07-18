import type { CoreScoreResult, DomainScore, FacetScore } from "@/lib/scoring/types";
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
  getBoundaryCopy,
  getNuangCodeLetterAt,
  getNuangCodeLetterInsight,
  getNuangCodePositionByDomainId,
  nuangCodeComparisonCopy,
  type NuangCodePositionId,
} from "@/features/nuang-code/nuang-code-dictionary";

export const publicProfileSnapshotContractVersion =
  "public-profile-snapshot.v0.1";

export const publicComparisonReportContractVersion =
  "public-comparison-report.v0.3";

export type PublicProfileDisplay = {
  displayName: string;
  motif: "flame" | "forest" | "purple" | "sun" | "water";
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
      axisComparisons: PublicComparisonAxisInsight[];
      commonGround: PublicComparisonAxisDelta[];
      conversationStarters: string[];
      differences: PublicComparisonAxisDelta[];
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
  positionId?: NuangCodePositionId;
  targetIsBoundary?: boolean;
  targetScore: number;
  targetSymbol?: string | null;
  viewerIsBoundary?: boolean;
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
  closeness: "close" | "different" | "moderate" | "very_close" | "very_different";
  interpretation: string;
  possibleMisread: string;
  targetPattern: string;
  viewerPattern: string;
};

export function createPublicProfileSnapshotPayload({
  createdAt,
  displayProfile,
  result,
  snapshotId,
}: CreatePublicProfileSnapshotInput): PublicProfileSnapshotPayload {
  const normalizedDisplayProfile = normalizePublicProfileDisplay(displayProfile);

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
  const axisComparisons = deltas.map(toAxisInsight);
  const commonGround = [...deltas]
    .filter((delta) => isSameCodePosition(delta) || delta.difference <= 16)
    .sort((a, b) => a.difference - b.difference)
    .slice(0, 2);
  const differences = [...deltas]
    .filter((delta) => !isSameCodePosition(delta) || delta.difference > 16)
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
        conversationStarters: buildConversationStarters(commonGround, differences),
        differences,
        misunderstandingScenes: buildMisunderstandingScenes(differences),
        summary: buildComparisonSummary(commonGround, differences, viewer, target),
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
  const targetDomainsByLabel = new Map(
    target.publicData.coreDomainMap
      .filter((domain) => domain.score !== null)
      .map((domain) => [domain.label, domain]),
  );

  return viewer.publicData.coreDomainMap.flatMap((viewerDomain, index) => {
    if (viewerDomain.score === null) return [];
    const axisId = getAxisId(viewerDomain, index);
    const position = getNuangCodePositionByDomainId(axisId);
    const targetDomain =
      targetDomainsById.get(axisId) ??
      targetDomainsByLabel.get(viewerDomain.label) ??
      target.publicData.coreDomainMap[index];

    if (!targetDomain || targetDomain.score === null) return [];

    const viewerSymbol =
      viewerDomain.symbol ?? getNuangCodeLetterAt(viewer.profile.code, position?.index ?? -1);
    const targetSymbol =
      targetDomain.symbol ?? getNuangCodeLetterAt(target.profile.code, position?.index ?? -1);

    return [
      {
        difference: Math.abs(viewerDomain.score - targetDomain.score),
        domainId: axisId,
        hasBoundarySignal: Boolean(viewerDomain.isBoundary || targetDomain.isBoundary),
        label: position?.name ?? viewerDomain.label,
        positionId: position?.id,
        targetIsBoundary: Boolean(targetDomain.isBoundary),
        targetScore: targetDomain.score,
        targetSymbol,
        viewerIsBoundary: Boolean(viewerDomain.isBoundary),
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
          : `${pairSubject} 공개된 뉴앙 코드를 기준으로 관계 리듬을 정리했어요.`,
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
    return `${closestAxis.label}에서 비슷한 리듬이 보여요.`;
  }

  return "공개된 성향 정보를 기준으로 서로의 리듬을 확인했어요.";
}

function toAxisInsight(delta: PublicComparisonAxisDelta): PublicComparisonAxisInsight {
  const closeness = getCloseness(delta.difference);

  return {
    ...delta,
    adjustmentTip: buildAdjustmentTip(delta),
    closeness,
    interpretation: buildAxisInterpretation(delta, closeness),
    possibleMisread: buildPossibleMisread(delta),
    targetPattern: buildPatternText("상대", delta.targetSymbol, delta.targetIsBoundary),
    viewerPattern: buildPatternText("나", delta.viewerSymbol, delta.viewerIsBoundary),
  };
}

function getCloseness(difference: number): PublicComparisonAxisInsight["closeness"] {
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
  const viewerInsight = getNuangCodeLetterInsight(delta.viewerSymbol);
  const targetInsight = getNuangCodeLetterInsight(delta.targetSymbol);
  const boundarySuffix = delta.hasBoundarySignal ? ` ${getBoundaryCopy()}` : "";

  if (isSameCodePosition(delta)) {
    const sharedName = viewerInsight?.name ?? "비슷한 흐름";

    return `${delta.label}에서는 둘 다 ${sharedName} 쪽으로 가까워요. ${copy.same}${boundarySuffix}`;
  }

  if (closeness === "moderate") {
    return `${delta.label}에서는 비슷한 부분과 다른 부분이 함께 보여요. ${copy.different}${boundarySuffix}`;
  }

  return `${delta.label}에서는 ${viewerInsight?.name ?? "내 흐름"}와 ${targetInsight?.name ?? "상대 흐름"}가 다르게 나타나요. ${copy.different}${boundarySuffix}`;
}

function buildPossibleMisread(delta: PublicComparisonAxisDelta) {
  return getComparisonCopy(delta).possibleMisread;
}

function buildAdjustmentTip(delta: PublicComparisonAxisDelta) {
  if (isSameCodePosition(delta) || delta.difference <= 16) {
    return `가까운 자리예요. ${getComparisonCopy(delta).adjustmentQuestion}`;
  }

  return `조율이 필요한 자리예요. ${getComparisonCopy(delta).adjustmentQuestion}`;
}

function buildPatternText(
  subject: "나" | "상대",
  symbol: string | null | undefined,
  isBoundary?: boolean,
) {
  const insight = getNuangCodeLetterInsight(symbol);
  const boundary = isBoundary ? ` ${getBoundaryCopy()}` : "";

  if (!insight) {
    return `${subject}의 공개된 뉴앙 코드 정보를 더 확인해야 해요.`;
  }

  return `${insight.name}. ${insight.summary}${boundary}`;
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
  return Boolean(delta.viewerSymbol && delta.targetSymbol && delta.viewerSymbol === delta.targetSymbol);
}

function getComparisonCopy(delta: PublicComparisonAxisDelta) {
  return delta.positionId
    ? nuangCodeComparisonCopy[delta.positionId]
    : {
        same: "서로 편하게 맞는 흐름이 보여요.",
        different: "서로 필요한 신호가 다르게 나타날 수 있어요.",
        possibleMisread: "한쪽은 충분하다고 느끼고, 다른 한쪽은 설명이 더 필요하다고 느낄 수 있어요.",
        adjustmentQuestion: "서로 편한 속도와 표현 방식을 먼저 확인해볼까요?",
      };
}
