import { describe, expect, it } from "vitest";
import {
  createPendingTraitMapReviewDecisionsV2,
  traitMapPublicationReviewRoles,
  type TraitMapPublicationCandidateV2,
  validateTraitMapPublicationCandidateV2,
} from "@/features/nuang-code/trait-map-content-publication-contract-v2";

const approvedReviews = Object.fromEntries(
  traitMapPublicationReviewRoles.map((role) => [role, "approve"]),
) as TraitMapPublicationCandidateV2["reviewDecisions"];

const validCandidate: TraitMapPublicationCandidateV2 = {
  canonicalVariantIds: ["CAN-SCN-FAMILY-AFTERMATH-ATTENTION-RO-G"],
  claimKind: "summary",
  codeApplicability: ["ENAKQ"],
  contentKey: "trait_map.ENAKQ.family.aftermath.summary.v2",
  evidenceFindingRefs: ["FND-DYAD-001"],
  independentSourceRefs: ["SRC-A", "SRC-B"],
  plainKoreanPassed: true,
  privacyScope: "profile_public",
  publicationState: "customer_approved",
  recompositionAuditPassed: true,
  reviewDecisions: approvedReviews,
  riskDomains: ["relationship"],
  sourceVersion: "2.1.0",
  surfaceDuplicateAuditPassed: true,
  targetSurfaces: ["trait_map_detail"],
  text: "가족과 갈등이 지나간 뒤에는 남은 문제와 다음 약속을 함께 살피는 편이에요.",
};

describe("trait-map content publication contract v2", () => {
  it("allows only a fully traceable and approved customer candidate", () => {
    expect(validateTraitMapPublicationCandidateV2(validCandidate)).toEqual({
      canPublish: true,
      issues: [],
    });
  });

  it("blocks research drafts and incomplete expert review", () => {
    const result = validateTraitMapPublicationCandidateV2({
      ...validCandidate,
      publicationState: "research_only",
      reviewDecisions: createPendingTraitMapReviewDecisionsV2(),
    });

    expect(result.canPublish).toBe(false);
    expect(result.issues).toContain("CUSTOMER_APPROVAL_REQUIRED");
    expect(
      result.issues.filter((issue) => issue.startsWith("REVIEW_NOT_APPROVED:")),
    ).toHaveLength(7);
  });

  it("keeps first thoughts and actual responses self-only", () => {
    const result = validateTraitMapPublicationCandidateV2({
      ...validCandidate,
      claimKind: "first_thought",
      privacyScope: "profile_public",
      targetSurfaces: ["profile_preview"],
    });

    expect(result.canPublish).toBe(false);
    expect(result.issues).toContain("INNER_PROCESS_MUST_REMAIN_SELF_ONLY");
  });

  it("blocks self-only or high-risk material from share cards", () => {
    const result = validateTraitMapPublicationCandidateV2({
      ...validCandidate,
      privacyScope: "self_only",
      targetSurfaces: ["share_card"],
    });

    expect(result.canPublish).toBe(false);
    expect(result.issues).toContain("SELF_ONLY_CONTENT_ON_PUBLIC_SURFACE");
    expect(result.issues).toContain(
      "HIGH_RISK_CONTENT_NOT_ALLOWED_ON_SHARE_CARD",
    );
  });
});
