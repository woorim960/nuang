export const legacyCoreAssessmentReleaseIds = [
  "NUANG-CORE-QUICK-CANDIDATE-1.0",
  "NUANG-CORE-FULL-CANDIDATE-1.0",
] as const;

export const legacyCoreCodeSchemeVersions = [
  "NUANG-CODE-5AXIS-CANDIDATE-1.0",
] as const;

export const legacyCoreItemBankReleaseIds = [
  "NUANG-CORE-CANDIDATE-BANK-M03-150",
  "NUANG-CORE-BETA-1.0",
] as const;

export const legacyCoreScoringReleaseIds = [
  "NUANG-CORE-QUICK-CANDIDATE-SCORING-1.0",
  "NUANG-CORE-FULL-CANDIDATE-SCORING-1.0",
  "NUANG-CORE-BETA-SCORING-1.0",
] as const;

export const legacyCoreContainmentPolicyReleaseId =
  "NUANG-V2-G00-D06-LEGACY-CONTAINMENT-1.0";

export const legacyCorePublicDenyReason =
  "legacy_core_public_propagation_blocked";

export type CorePublicReleaseTrace = {
  codeSchemeVersion: string;
  measurementReleaseId: string;
  scoringReleaseId: string;
};

export const corePublicReleaseTraces: readonly CorePublicReleaseTrace[] = [];

export const legacyCoreContainmentPolicy = {
  assessmentReleaseIds: legacyCoreAssessmentReleaseIds,
  codeSchemeVersions: legacyCoreCodeSchemeVersions,
  itemBankReleaseIds: legacyCoreItemBankReleaseIds,
  ownerOnlyLabel: "탐색적 비검증 베타",
  policyReleaseId: legacyCoreContainmentPolicyReleaseId,
  publicDenyReason: legacyCorePublicDenyReason,
  publicReleaseTraces: corePublicReleaseTraces,
  representativeReleaseIds: [] as readonly string[],
  scoringReleaseIds: legacyCoreScoringReleaseIds,
} as const;

export const legacyCorePublicSharingMessage =
  "현재 코어 결과는 탐색적 비검증 베타로 본인 화면에서만 확인할 수 있어요. 검증된 새 릴리스가 준비될 때까지 외부에 공유할 수 없어요.";

export type LegacyCorePublicDenyReason = typeof legacyCorePublicDenyReason;

export function isLegacyCoreAssessmentReleaseId(
  value: unknown,
): value is (typeof legacyCoreContainmentPolicy.assessmentReleaseIds)[number] {
  return includesExact(legacyCoreContainmentPolicy.assessmentReleaseIds, value);
}

export function isLegacyCoreCodeSchemeVersion(
  value: unknown,
): value is (typeof legacyCoreContainmentPolicy.codeSchemeVersions)[number] {
  return includesExact(legacyCoreContainmentPolicy.codeSchemeVersions, value);
}

export function isLegacyCoreItemBankReleaseId(
  value: unknown,
): value is (typeof legacyCoreContainmentPolicy.itemBankReleaseIds)[number] {
  return includesExact(legacyCoreContainmentPolicy.itemBankReleaseIds, value);
}

export function isLegacyCoreScoringReleaseId(
  value: unknown,
): value is (typeof legacyCoreContainmentPolicy.scoringReleaseIds)[number] {
  return includesExact(legacyCoreContainmentPolicy.scoringReleaseIds, value);
}

export function isLegacyCoreReleaseTrace({
  assessmentReleaseId,
  codeSchemeVersion,
  measurementReleaseId,
  scoringReleaseId,
}: {
  assessmentReleaseId?: unknown;
  codeSchemeVersion?: unknown;
  measurementReleaseId?: unknown;
  scoringReleaseId?: unknown;
}) {
  return (
    isLegacyCoreAssessmentReleaseId(assessmentReleaseId) ||
    isLegacyCoreCodeSchemeVersion(codeSchemeVersion) ||
    isLegacyCoreAssessmentReleaseId(measurementReleaseId) ||
    isLegacyCoreItemBankReleaseId(measurementReleaseId) ||
    isLegacyCoreScoringReleaseId(scoringReleaseId)
  );
}

/**
 * G00-D06 keeps every core release out of the representative-code resolver.
 * G14 may replace this empty allowlist only with an exact active bundle
 * resolver; a merely non-legacy or unknown release must never pass.
 */
export function canPromoteCoreResultToRepresentative({
  assessmentReleaseId,
}: {
  assessmentReleaseId?: unknown;
}) {
  return (
    typeof assessmentReleaseId === "string" &&
    legacyCoreContainmentPolicy.representativeReleaseIds.includes(
      assessmentReleaseId,
    )
  );
}

/**
 * G00 exposes no core release publicly. A future G14 change must add a complete
 * exact trace here; catalog status such as active/validated is never sufficient
 * on its own.
 */
export function canPublishCoreResult({
  assessmentReleaseId,
  codeSchemeVersion,
  measurementReleaseId,
  scoringReleaseId,
}: {
  assessmentReleaseId?: unknown;
  codeSchemeVersion?: unknown;
  measurementReleaseId?: unknown;
  scoringReleaseId?: unknown;
}) {
  if (
    typeof codeSchemeVersion !== "string" ||
    typeof scoringReleaseId !== "string"
  ) {
    return false;
  }

  const resolvedMeasurementReleaseId =
    typeof measurementReleaseId === "string"
      ? measurementReleaseId
      : typeof assessmentReleaseId === "string"
        ? assessmentReleaseId
        : null;
  if (!resolvedMeasurementReleaseId) return false;
  if (
    typeof assessmentReleaseId === "string" &&
    typeof measurementReleaseId === "string" &&
    assessmentReleaseId !== measurementReleaseId
  ) {
    return false;
  }

  return legacyCoreContainmentPolicy.publicReleaseTraces.some(
    (approved) =>
      approved.codeSchemeVersion === codeSchemeVersion &&
      approved.measurementReleaseId === resolvedMeasurementReleaseId &&
      approved.scoringReleaseId === scoringReleaseId,
  );
}

/**
 * result_report.measurement_release_id currently contains both assessment and
 * item-bank release namespaces. Containment therefore checks both exact lists
 * as well as the independently persisted code-scheme version.
 */
export function isContainedLegacyCoreReleaseTrace({
  codeSchemeVersion,
  measurementReleaseId,
  scoringReleaseId,
}: {
  codeSchemeVersion: unknown;
  measurementReleaseId: unknown;
  scoringReleaseId?: unknown;
}) {
  return isLegacyCoreReleaseTrace({
    codeSchemeVersion,
    measurementReleaseId,
    scoringReleaseId,
  });
}

/**
 * report-share-v1/v2 content carries no trusted release provenance. Until a
 * server-trusted bundle trace is added, every core summary is fail-closed.
 */
export function isLegacyCoreShareContent(
  content: { reportType?: unknown } | null | undefined,
) {
  return content?.reportType === "core";
}

/** Removes candidate code identity from topic guest payloads on both write and read. */
export function sanitizeLegacyCodeFromTopicShareContent<
  Content extends { reportType?: unknown; source?: unknown },
>(content: Content): Content {
  if (content.reportType !== "topic") return content;

  const sanitized: Record<string, unknown> = { ...content };
  delete sanitized.code;

  if (isRecord(sanitized.source) && sanitized.source.kind === "topic") {
    const sanitizedSource = { ...sanitized.source };
    delete sanitizedSource.code;
    sanitized.source = sanitizedSource;
  }

  return sanitized as Content;
}

function includesExact<const Values extends readonly string[]>(
  values: Values,
  value: unknown,
): value is Values[number] {
  return (
    typeof value === "string" && (values as readonly string[]).includes(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
