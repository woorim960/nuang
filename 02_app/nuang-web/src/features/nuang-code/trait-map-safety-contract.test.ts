import { describe, expect, it } from "vitest";
import changeProposalDocument from "@/features/nuang-code/fixtures/enakq-gate-a-change-proposals.v0.2.json";
import { getClaimById } from "@/features/nuang-code/enakq-claim-registry";
import {
  enakqAiUsePolicy,
  enakqGateAChangeSetVersion,
  enakqSafetyRoutes,
  enakqTraitDataPolicies,
  gateAClaimChangeProposalSchema,
  traitDataPolicySchema,
  traitResultVersionStampSchema,
} from "@/features/nuang-code/trait-map-safety-contract";

const expectedGateAClaimIds = [
  "ENAKQ.crush.boundary",
  "ENAKQ.evidence.ai_boundary",
  "ENAKQ.evidence.privacy",
  "ENAKQ.evidence.versioning",
  "ENAKQ.stress.safety",
];

describe("ENAKQ trait map safety contract v0.2", () => {
  it("classifies every protected data class once and keeps private as default", () => {
    expect(enakqTraitDataPolicies.policies).toHaveLength(9);
    expect(
      new Set(enakqTraitDataPolicies.policies.map((policy) => policy.dataClass))
        .size,
    ).toBe(9);
    expect(
      enakqTraitDataPolicies.policies.every(
        (policy) => policy.defaultAccess === "self_private",
      ),
    ).toBe(true);
  });

  it("requires explicit consent whenever data can be shared", () => {
    const shareSurfaces = new Set([
      "public_profile",
      "comparison_report",
      "community",
    ]);
    const shareablePolicies = enakqTraitDataPolicies.policies.filter((policy) =>
      policy.allowedSurfaces.some((surface) => shareSurfaces.has(surface)),
    );

    expect(shareablePolicies.length).toBeGreaterThan(0);
    expect(
      shareablePolicies.every(
        (policy) => policy.explicitConsentRequiredForSharing,
      ),
    ).toBe(true);
  });

  it("never exposes raw responses, process signals, current state, or safety signals", () => {
    const selfPrivateClasses = new Set([
      "raw_item_responses",
      "private_process_signals",
      "current_state",
      "safety_signal",
    ]);
    const publicSurfaces = new Set([
      "public_profile",
      "comparison_report",
      "community",
    ]);

    for (const policy of enakqTraitDataPolicies.policies.filter((candidate) =>
      selfPrivateClasses.has(candidate.dataClass),
    )) {
      expect(
        policy.allowedSurfaces.some((surface) => publicSurfaces.has(surface)),
        policy.dataClass,
      ).toBe(false);
    }
  });

  it("limits direct safety signals to ephemeral safety routing", () => {
    const safetyPolicy = enakqTraitDataPolicies.policies.find(
      (policy) => policy.dataClass === "safety_signal",
    );

    expect(safetyPolicy).toMatchObject({
      allowedSurfaces: ["safety_routing"],
      researchUse: "prohibited",
      retention: "ephemeral_safety_routing",
      sensitivity: "safety_critical",
    });

    const invalid = traitDataPolicySchema.safeParse({
      ...safetyPolicy,
      allowedSurfaces: ["safety_routing", "comparison_report"],
      explicitConsentRequiredForSharing: true,
    });
    expect(invalid.success).toBe(false);
  });

  it("pauses trait content for urgent safety without diagnosing or scoring risk", () => {
    const urgentRoute = enakqSafetyRoutes.find(
      (route) => route.level === "urgent_safety",
    );

    expect(urgentRoute).toMatchObject({
      contentBehavior: "pause",
      primaryActions: [
        "show_location_appropriate_emergency_resources",
        "offer_trusted_person_contact",
      ],
      triggerSource: "user_direct_report_or_explicit_help_request",
    });
    expect(urgentRoute?.prohibitedOutputs).toEqual(
      expect.arrayContaining(["diagnosis", "risk_probability"]),
    );
  });

  it("blocks sensitive AI inference and external transmission by default", () => {
    expect(enakqAiUsePolicy.externalModelTransmissionDefault).toBe("denied");
    expect(enakqAiUsePolicy.prohibitedInferenceTargets).toEqual([
      "personality",
      "attraction_or_romantic_interest",
      "mental_health",
      "dangerousness_or_safety_risk",
    ]);
    expect(enakqAiUsePolicy.requiredUserControls).toEqual(
      expect.arrayContaining([
        "show_inputs_before_use",
        "show_external_transmission_status",
        "allow_cancel",
        "allow_correction",
        "allow_deletion",
      ]),
    );
  });

  it("requires every result-producing version field", () => {
    const complete = traitResultVersionStampSchema.safeParse({
      boundaryRuleVersion: "boundary.v1",
      copyVersion: "copy.v1",
      itemSetVersion: "items.v1",
      mapVersion: "map.v1",
      questionnaireVersion: "questionnaire.v1",
      scoringVersion: "scoring.v1",
    });
    const missingScoring = traitResultVersionStampSchema.safeParse({
      boundaryRuleVersion: "boundary.v1",
      copyVersion: "copy.v1",
      itemSetVersion: "items.v1",
      mapVersion: "map.v1",
      questionnaireVersion: "questionnaire.v1",
    });

    expect(complete.success).toBe(true);
    expect(missingScoring.success).toBe(false);
  });
});

describe("ENAKQ Gate A v0.2 change proposals", () => {
  it("covers the five critical claims without mutating the v0.1 registry", () => {
    const proposals = changeProposalDocument.map((proposal) =>
      gateAClaimChangeProposalSchema.parse(proposal),
    );

    expect(proposals.map((proposal) => proposal.claimId).sort()).toEqual(
      [...expectedGateAClaimIds].sort(),
    );
    expect(new Set(proposals.map((proposal) => proposal.claimId)).size).toBe(5);
    expect(
      proposals.every(
        (proposal) =>
          proposal.changeSetVersion === enakqGateAChangeSetVersion &&
          proposal.proposalState === "internal_proposal_not_approved",
      ),
    ).toBe(true);

    for (const proposal of proposals) {
      const registered = getClaimById(proposal.claimId);
      expect(registered, proposal.claimId).not.toBeNull();
      expect(proposal.affectedBlocks).toEqual(registered?.sourceBlockRefs);
      expect(proposal.affectedContentKeys).toEqual([registered?.contentKey]);
      expect(registered?.publicationState).not.toBe("approved");
    }
  });
});
