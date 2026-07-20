import { z } from "zod";
import { traitClaimRegistryEntrySchema } from "@/features/nuang-code/trait-map-knowledge-contract";

export const enakqExpertReviewProtocolVersion =
  "enakq-trait-map-expert-review.v0.1";

export const enakqExpertRoleSchema = z.enum([
  "personality_psychology",
  "psychometrics",
  "relationship_safety",
]);

export const enakqExpertDecisionSchema = z.enum([
  "accept",
  "revise",
  "reject",
  "insufficient_evidence",
]);

export const enakqExpertRiskFlagSchema = z.enum([
  "none",
  "ability_inference",
  "clinical_overreach",
  "cultural_norm",
  "deterministic_language",
  "discrimination_risk",
  "evidence_mismatch",
  "privacy_scope",
  "relationship_determinism",
  "stigma_or_value_judgment",
  "unmeasured_inference",
  "unclear_korean",
  "other",
]);

const expertRatingSchema = z.number().int().min(1).max(4);

export const enakqExpertReviewAssignmentSchema = z.object({
  claimId: traitClaimRegistryEntrySchema.shape.claimId,
  priority: z.enum(["standard", "high", "critical"]),
  requiredRoles: z.array(enakqExpertRoleSchema).min(1),
  reviewReason: z.string().min(1),
});

export const enakqExpertReviewResponseSchema = z
  .object({
    claimId: traitClaimRegistryEntrySchema.shape.claimId,
    conflictOfInterest: z.boolean(),
    constructFitRating: expertRatingSchema,
    decision: enakqExpertDecisionSchema,
    evidenceFitRating: expertRatingSchema,
    inferenceScopeRating: expertRatingSchema,
    languageSafetyRating: expertRatingSchema,
    protocolVersion: z.literal(enakqExpertReviewProtocolVersion),
    rationale: z.string().min(1),
    requiredRevision: z.string(),
    reviewerConfidence: z.enum(["low", "medium", "high"]),
    reviewerId: z.string().min(1),
    reviewerRole: enakqExpertRoleSchema,
    riskFlags: z.array(enakqExpertRiskFlagSchema).min(1),
  })
  .superRefine((response, context) => {
    const uniqueRiskFlags = new Set(response.riskFlags);
    if (uniqueRiskFlags.size !== response.riskFlags.length) {
      context.addIssue({
        code: "custom",
        message: "같은 risk flag를 두 번 기록할 수 없어요.",
        path: ["riskFlags"],
      });
    }
    if (response.riskFlags.includes("none") && response.riskFlags.length > 1) {
      context.addIssue({
        code: "custom",
        message: "none은 다른 risk flag와 함께 사용할 수 없어요.",
        path: ["riskFlags"],
      });
    }
    if (
      response.decision === "revise" &&
      response.requiredRevision.trim().length === 0
    ) {
      context.addIssue({
        code: "custom",
        message: "revise 판정에는 구체적인 수정 요구가 필요해요.",
        path: ["requiredRevision"],
      });
    }
    if (
      response.decision === "accept" &&
      !response.riskFlags.includes("none")
    ) {
      context.addIssue({
        code: "custom",
        message: "위험 플래그가 있으면 그대로 accept할 수 없어요.",
        path: ["decision"],
      });
    }
  });

export const enakqExpertReviewerRosterEntrySchema = z.object({
  conflictDisclosure: z.string(),
  highestRelevantDegree: z.string().min(1),
  identityVerifiedBy: z.string().min(1),
  independenceConfirmed: z.boolean(),
  relevantExperienceSummary: z.string().min(1),
  reviewerId: z.string().min(1),
  role: enakqExpertRoleSchema,
});

export type EnakqExpertRole = z.infer<typeof enakqExpertRoleSchema>;
export type EnakqExpertDecision = z.infer<typeof enakqExpertDecisionSchema>;
export type EnakqExpertReviewAssignment = z.infer<
  typeof enakqExpertReviewAssignmentSchema
>;
export type EnakqExpertReviewResponse = z.infer<
  typeof enakqExpertReviewResponseSchema
>;
