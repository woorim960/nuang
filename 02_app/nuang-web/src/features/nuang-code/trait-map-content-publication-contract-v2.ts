export const traitMapPublicationContractVersion =
  "nuang-trait-map-content-publication.v2" as const;

export const traitMapPublicationReviewRoles = [
  "personality_psychologist",
  "psychometrician",
  "research_methodologist",
  "korean_plain_language_editor",
  "safety_privacy_reviewer",
  "product_content_designer",
  "data_quality_engineer",
] as const;

export const traitMapCustomerSurfaces = [
  "result_summary",
  "trait_map_detail",
  "comparison_report",
  "profile_preview",
  "share_card",
] as const;

export type TraitMapPublicationReviewRole =
  (typeof traitMapPublicationReviewRoles)[number];
export type TraitMapCustomerSurface = (typeof traitMapCustomerSurfaces)[number];
export type TraitMapPublicationState =
  | "research_only"
  | "research_approved"
  | "internal_preview"
  | "customer_approved"
  | "published"
  | "retired";
export type TraitMapPrivacyScope =
  | "self_only"
  | "user_selected_comparison"
  | "profile_public"
  | "share_selected";

export type TraitMapPublicationCandidateV2 = {
  canonicalVariantIds: readonly string[];
  claimKind:
    | "attention"
    | "first_thought"
    | "actual_response"
    | "communication"
    | "summary"
    | "relationship"
    | "comparison";
  codeApplicability: readonly string[];
  contentKey: string;
  evidenceFindingRefs: readonly string[];
  independentSourceRefs: readonly string[];
  plainKoreanPassed: boolean;
  privacyScope: TraitMapPrivacyScope;
  publicationState: TraitMapPublicationState;
  recompositionAuditPassed: boolean;
  reviewDecisions: Record<
    TraitMapPublicationReviewRole,
    "pending" | "approve" | "revise" | "reject"
  >;
  riskDomains: readonly string[];
  sourceVersion: string;
  surfaceDuplicateAuditPassed: boolean;
  targetSurfaces: readonly TraitMapCustomerSurface[];
  text: string;
};

export type TraitMapPublicationValidationResult = {
  canPublish: boolean;
  issues: readonly string[];
};

const validCodePattern = /^[EI][RN][GA][KM][CQ]$/;

export function validateTraitMapPublicationCandidateV2(
  candidate: TraitMapPublicationCandidateV2,
): TraitMapPublicationValidationResult {
  const issues: string[] = [];

  if (!candidate.contentKey.trim()) issues.push("CONTENT_KEY_REQUIRED");
  if (!candidate.sourceVersion.trim()) issues.push("SOURCE_VERSION_REQUIRED");
  if (!candidate.text.trim()) issues.push("CUSTOMER_TEXT_REQUIRED");
  if (candidate.canonicalVariantIds.length === 0) {
    issues.push("CANONICAL_LINEAGE_REQUIRED");
  }
  if (
    candidate.codeApplicability.length === 0 ||
    candidate.codeApplicability.some((code) => !validCodePattern.test(code))
  ) {
    issues.push("VALID_CODE_APPLICABILITY_REQUIRED");
  }
  if (candidate.evidenceFindingRefs.length === 0) {
    issues.push("EVIDENCE_FINDING_REQUIRED");
  }
  if (
    candidate.riskDomains.length > 0 &&
    candidate.independentSourceRefs.length < 2
  ) {
    issues.push("TWO_INDEPENDENT_SOURCES_REQUIRED_FOR_RISK");
  }
  for (const role of traitMapPublicationReviewRoles) {
    if (candidate.reviewDecisions[role] !== "approve") {
      issues.push(`REVIEW_NOT_APPROVED:${role}`);
    }
  }
  if (!candidate.plainKoreanPassed) issues.push("PLAIN_KOREAN_REVIEW_REQUIRED");
  if (!candidate.recompositionAuditPassed) {
    issues.push("RECOMPOSITION_AUDIT_REQUIRED");
  }
  if (!candidate.surfaceDuplicateAuditPassed) {
    issues.push("SURFACE_DUPLICATE_AUDIT_REQUIRED");
  }
  if (candidate.targetSurfaces.length === 0) {
    issues.push("TARGET_SURFACE_REQUIRED");
  }
  if (
    ["research_only", "research_approved", "internal_preview"].includes(
      candidate.publicationState,
    )
  ) {
    issues.push("CUSTOMER_APPROVAL_REQUIRED");
  }
  if (
    ["first_thought", "actual_response"].includes(candidate.claimKind) &&
    candidate.privacyScope !== "self_only"
  ) {
    issues.push("INNER_PROCESS_MUST_REMAIN_SELF_ONLY");
  }
  if (
    candidate.privacyScope === "self_only" &&
    candidate.targetSurfaces.some((surface) =>
      ["comparison_report", "profile_preview", "share_card"].includes(surface),
    )
  ) {
    issues.push("SELF_ONLY_CONTENT_ON_PUBLIC_SURFACE");
  }
  if (
    candidate.targetSurfaces.includes("share_card") &&
    candidate.riskDomains.length > 0
  ) {
    issues.push("HIGH_RISK_CONTENT_NOT_ALLOWED_ON_SHARE_CARD");
  }

  return {
    canPublish: issues.length === 0,
    issues,
  };
}

export function createPendingTraitMapReviewDecisionsV2() {
  return Object.fromEntries(
    traitMapPublicationReviewRoles.map((role) => [role, "pending"]),
  ) as Record<TraitMapPublicationReviewRole, "pending">;
}
