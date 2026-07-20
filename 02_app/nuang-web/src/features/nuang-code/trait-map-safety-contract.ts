import { z } from "zod";

export const traitMapSafetyContractVersion = "nuang-trait-map-safety.v0.2";
export const enakqGateAChangeSetVersion = "ENAKQ-GATE-A.v0.2";

export const traitSensitiveDataClassSchema = z.enum([
  "representative_code",
  "facet_scores",
  "raw_item_responses",
  "private_process_signals",
  "current_state",
  "safety_signal",
  "support_preference",
  "user_authored_content",
  "derived_comparison",
]);

export const traitDataSurfaceSchema = z.enum([
  "personal_report",
  "public_profile",
  "comparison_report",
  "community",
  "research_export",
  "safety_routing",
]);

export const traitDataPolicySchema = z
  .object({
    allowedSurfaces: z.array(traitDataSurfaceSchema).min(1),
    dataClass: traitSensitiveDataClassSchema,
    defaultAccess: z.literal("self_private"),
    explicitConsentRequiredForSharing: z.boolean(),
    researchUse: z.enum([
      "prohibited",
      "separate_consent_and_deidentification_required",
    ]),
    retention: z.enum([
      "until_revocation_or_account_deletion",
      "purpose_bound_with_documented_expiry",
      "ephemeral_safety_routing",
    ]),
    revocationAction: z.enum([
      "delete_source_and_derivatives",
      "delete_or_recompute_derivatives",
      "stop_future_access_and_record_revocation",
    ]),
    sensitivity: z.enum([
      "personal_sensitive",
      "contextual_content",
      "safety_critical",
    ]),
  })
  .superRefine((policy, context) => {
    const canShare = policy.allowedSurfaces.some((surface) =>
      ["public_profile", "comparison_report", "community"].includes(surface),
    );
    if (canShare && !policy.explicitConsentRequiredForSharing) {
      context.addIssue({
        code: "custom",
        message: "공개·비교·커뮤니티 사용에는 별도 공유 동의가 필요해요.",
        path: ["explicitConsentRequiredForSharing"],
      });
    }

    if (policy.sensitivity === "safety_critical") {
      if (
        policy.allowedSurfaces.length !== 1 ||
        policy.allowedSurfaces[0] !== "safety_routing"
      ) {
        context.addIssue({
          code: "custom",
          message: "즉시 안전 신호는 안전 연결 외의 화면에 노출할 수 없어요.",
          path: ["allowedSurfaces"],
        });
      }
      if (policy.retention !== "ephemeral_safety_routing") {
        context.addIssue({
          code: "custom",
          message: "즉시 안전 신호는 장기 성향 데이터로 보관하지 않아요.",
          path: ["retention"],
        });
      }
      if (policy.researchUse !== "prohibited") {
        context.addIssue({
          code: "custom",
          message: "즉시 안전 신호를 연구용으로 전환하지 않아요.",
          path: ["researchUse"],
        });
      }
    }
  });

export const traitDataPolicyRegistrySchema = z
  .object({
    contractVersion: z.literal(traitMapSafetyContractVersion),
    policies: z.array(traitDataPolicySchema).min(1),
  })
  .superRefine((registry, context) => {
    const seen = new Set<string>();
    registry.policies.forEach((policy, index) => {
      if (seen.has(policy.dataClass)) {
        context.addIssue({
          code: "custom",
          message: `중복 데이터 분류: ${policy.dataClass}`,
          path: ["policies", index, "dataClass"],
        });
      }
      seen.add(policy.dataClass);
    });
  });

export const enakqTraitDataPolicies = traitDataPolicyRegistrySchema.parse({
  contractVersion: traitMapSafetyContractVersion,
  policies: [
    {
      allowedSurfaces: [
        "personal_report",
        "public_profile",
        "comparison_report",
        "research_export",
      ],
      dataClass: "representative_code",
      defaultAccess: "self_private",
      explicitConsentRequiredForSharing: true,
      researchUse: "separate_consent_and_deidentification_required",
      retention: "until_revocation_or_account_deletion",
      revocationAction: "delete_or_recompute_derivatives",
      sensitivity: "personal_sensitive",
    },
    {
      allowedSurfaces: [
        "personal_report",
        "public_profile",
        "comparison_report",
        "research_export",
      ],
      dataClass: "facet_scores",
      defaultAccess: "self_private",
      explicitConsentRequiredForSharing: true,
      researchUse: "separate_consent_and_deidentification_required",
      retention: "until_revocation_or_account_deletion",
      revocationAction: "delete_or_recompute_derivatives",
      sensitivity: "personal_sensitive",
    },
    {
      allowedSurfaces: ["personal_report", "research_export"],
      dataClass: "raw_item_responses",
      defaultAccess: "self_private",
      explicitConsentRequiredForSharing: false,
      researchUse: "separate_consent_and_deidentification_required",
      retention: "purpose_bound_with_documented_expiry",
      revocationAction: "delete_source_and_derivatives",
      sensitivity: "personal_sensitive",
    },
    {
      allowedSurfaces: ["personal_report", "research_export"],
      dataClass: "private_process_signals",
      defaultAccess: "self_private",
      explicitConsentRequiredForSharing: false,
      researchUse: "separate_consent_and_deidentification_required",
      retention: "purpose_bound_with_documented_expiry",
      revocationAction: "delete_source_and_derivatives",
      sensitivity: "personal_sensitive",
    },
    {
      allowedSurfaces: ["personal_report"],
      dataClass: "current_state",
      defaultAccess: "self_private",
      explicitConsentRequiredForSharing: false,
      researchUse: "prohibited",
      retention: "purpose_bound_with_documented_expiry",
      revocationAction: "delete_source_and_derivatives",
      sensitivity: "personal_sensitive",
    },
    {
      allowedSurfaces: ["safety_routing"],
      dataClass: "safety_signal",
      defaultAccess: "self_private",
      explicitConsentRequiredForSharing: false,
      researchUse: "prohibited",
      retention: "ephemeral_safety_routing",
      revocationAction: "delete_source_and_derivatives",
      sensitivity: "safety_critical",
    },
    {
      allowedSurfaces: ["personal_report", "comparison_report"],
      dataClass: "support_preference",
      defaultAccess: "self_private",
      explicitConsentRequiredForSharing: true,
      researchUse: "separate_consent_and_deidentification_required",
      retention: "until_revocation_or_account_deletion",
      revocationAction: "delete_or_recompute_derivatives",
      sensitivity: "personal_sensitive",
    },
    {
      allowedSurfaces: ["community", "research_export"],
      dataClass: "user_authored_content",
      defaultAccess: "self_private",
      explicitConsentRequiredForSharing: true,
      researchUse: "separate_consent_and_deidentification_required",
      retention: "until_revocation_or_account_deletion",
      revocationAction: "delete_source_and_derivatives",
      sensitivity: "contextual_content",
    },
    {
      allowedSurfaces: ["personal_report", "comparison_report"],
      dataClass: "derived_comparison",
      defaultAccess: "self_private",
      explicitConsentRequiredForSharing: true,
      researchUse: "prohibited",
      retention: "until_revocation_or_account_deletion",
      revocationAction: "delete_or_recompute_derivatives",
      sensitivity: "personal_sensitive",
    },
  ],
});

export const traitAiUsePolicySchema = z.object({
  allowedPurposes: z.array(
    z.enum(["user_requested_copy_assistance", "user_requested_summary"]),
  ),
  externalModelTransmissionDefault: z.literal("denied"),
  modelTraining: z.literal("prohibited_without_separate_explicit_consent"),
  prohibitedInferenceTargets: z.array(
    z.enum([
      "personality",
      "attraction_or_romantic_interest",
      "mental_health",
      "dangerousness_or_safety_risk",
    ]),
  ),
  requiredUserControls: z.array(
    z.enum([
      "show_inputs_before_use",
      "show_external_transmission_status",
      "allow_cancel",
      "allow_correction",
      "allow_deletion",
      "show_retention_scope",
    ]),
  ),
  sourceDataClasses: z.array(traitSensitiveDataClassSchema),
});

export const enakqAiUsePolicy = traitAiUsePolicySchema.parse({
  allowedPurposes: ["user_requested_copy_assistance", "user_requested_summary"],
  externalModelTransmissionDefault: "denied",
  modelTraining: "prohibited_without_separate_explicit_consent",
  prohibitedInferenceTargets: [
    "personality",
    "attraction_or_romantic_interest",
    "mental_health",
    "dangerousness_or_safety_risk",
  ],
  requiredUserControls: [
    "show_inputs_before_use",
    "show_external_transmission_status",
    "allow_cancel",
    "allow_correction",
    "allow_deletion",
    "show_retention_scope",
  ],
  sourceDataClasses: ["user_authored_content"],
});

export const traitSafetyRouteSchema = z.object({
  contentBehavior: z.enum(["continue", "deprioritize", "pause"]),
  level: z.enum(["self_reflection", "support_search", "urgent_safety"]),
  primaryActions: z.array(
    z.enum([
      "offer_optional_self_reflection",
      "offer_professional_support_search",
      "show_location_appropriate_emergency_resources",
      "offer_trusted_person_contact",
    ]),
  ),
  prohibitedOutputs: z.array(
    z.enum([
      "diagnosis",
      "risk_probability",
      "personality_based_cause",
      "relationship_verdict",
    ]),
  ),
  triggerSource: z.literal("user_direct_report_or_explicit_help_request"),
});

export const enakqSafetyRoutes = z
  .array(traitSafetyRouteSchema)
  .length(3)
  .parse([
    {
      contentBehavior: "continue",
      level: "self_reflection",
      primaryActions: ["offer_optional_self_reflection"],
      prohibitedOutputs: [
        "diagnosis",
        "risk_probability",
        "personality_based_cause",
        "relationship_verdict",
      ],
      triggerSource: "user_direct_report_or_explicit_help_request",
    },
    {
      contentBehavior: "deprioritize",
      level: "support_search",
      primaryActions: ["offer_professional_support_search"],
      prohibitedOutputs: [
        "diagnosis",
        "risk_probability",
        "personality_based_cause",
        "relationship_verdict",
      ],
      triggerSource: "user_direct_report_or_explicit_help_request",
    },
    {
      contentBehavior: "pause",
      level: "urgent_safety",
      primaryActions: [
        "show_location_appropriate_emergency_resources",
        "offer_trusted_person_contact",
      ],
      prohibitedOutputs: [
        "diagnosis",
        "risk_probability",
        "personality_based_cause",
        "relationship_verdict",
      ],
      triggerSource: "user_direct_report_or_explicit_help_request",
    },
  ]);

export const traitResultVersionStampSchema = z.object({
  boundaryRuleVersion: z.string().min(1),
  copyVersion: z.string().min(1),
  itemSetVersion: z.string().min(1),
  mapVersion: z.string().min(1),
  questionnaireVersion: z.string().min(1),
  scoringVersion: z.string().min(1),
});

export const gateAClaimChangeProposalSchema = z.object({
  affectedBlocks: z
    .array(z.string().regex(/^ENAKQ-P[0-9]+-[A-Z0-9*-]+$/))
    .min(1),
  affectedContentKeys: z
    .array(z.string().regex(/^trait-map\.enakq\.[a-z0-9._-]+$/))
    .min(1),
  beforeExcerpt: z.string().min(1),
  changeSetVersion: z.literal(enakqGateAChangeSetVersion),
  claimId: z.string().regex(/^ENAKQ\.[A-Za-z0-9_.]+$/),
  priorRegistryVersion: z.literal("ENAKQ.map.v0.1-draft"),
  privacyImpact: z.string().min(1),
  productImplementation: z.array(z.string().min(1)).min(1),
  proposalState: z.literal("internal_proposal_not_approved"),
  proposedCopy: z.string().min(1),
  reason: z.string().min(1),
  validationNeeded: z.array(z.string().min(1)).min(1),
});

export type TraitDataPolicy = z.infer<typeof traitDataPolicySchema>;
export type TraitResultVersionStamp = z.infer<
  typeof traitResultVersionStampSchema
>;
