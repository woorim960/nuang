import { describe, expect, it } from "vitest";
import {
  enakqGateBMeasurementModel,
  gateBMeasurementModelSchema,
  getGateBDomain,
} from "@/features/nuang-code/gate-b-measurement-model";
import {
  canActivateCodeScheme,
  nextNuangCodeScheme,
} from "@/features/nuang-code/next-code-scheme";

describe("ENAKQ Gate B measurement model", () => {
  it("locks the owner-approved customer order and symbols", () => {
    expect(enakqGateBMeasurementModel.codeOrder).toBe(
      "E/I · R/N · G/A · K/M · C/Q",
    );
    expect(
      enakqGateBMeasurementModel.domains.map((domain) => ({
        domainId: domain.domainId,
        symbols: `${domain.lowSymbol}/${domain.highSymbol}`,
      })),
    ).toEqual([
      { domainId: "SE", symbols: "I/E" },
      { domainId: "OE", symbols: "R/N" },
      { domainId: "RO", symbols: "G/A" },
      { domainId: "SM", symbols: "M/K" },
      { domainId: "ER", symbols: "C/Q" },
    ]);
  });

  it("uses exactly ten representative facets and separates two research signals", () => {
    const representativeFacetIds = enakqGateBMeasurementModel.domains.flatMap(
      (domain) =>
        domain.facets
          .filter((facet) => facet.role === "representative_core")
          .map((facet) => facet.facetId),
    );
    const researchFacetIds = enakqGateBMeasurementModel.domains.flatMap(
      (domain) =>
        domain.facets
          .filter((facet) => facet.role === "self_private_research")
          .map((facet) => facet.facetId),
    );

    expect(representativeFacetIds).toEqual([
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
    ]);
    expect(researchFacetIds).toEqual(["RO-RN", "SM-RL"]);
  });

  it("keeps public and research facets consistent with the code scheme", () => {
    for (const position of nextNuangCodeScheme.positions) {
      const gateBDomain = getGateBDomain(position.domainId);
      const representativeFacetIds = gateBDomain?.facets
        .filter((facet) => facet.role === "representative_core")
        .map((facet) => facet.facetId);
      const researchFacetIds = gateBDomain?.facets
        .filter((facet) => facet.role === "self_private_research")
        .map((facet) => facet.facetId);

      expect(position.publicFacetIds).toEqual(representativeFacetIds);
      expect(position.researchDetailFacetIds).toEqual(researchFacetIds);
    }
  });

  it("treats G/A as a direct single-facet axis rather than a broad RO domain", () => {
    const relationship = getGateBDomain("RO");
    expect(relationship?.interpretationUnit).toBe(
      "single_representative_facet",
    );
    expect(
      relationship?.facets.filter(
        (facet) => facet.role === "representative_core",
      ),
    ).toHaveLength(1);
    expect(relationship?.facets[0]?.facetId).toBe("RO-EC");
    expect(relationship?.facets[1]).toMatchObject({
      facetId: "RO-RN",
      role: "self_private_research",
    });
  });

  it("keeps responsibility-like SM-RL outside representative K/M", () => {
    const selfManagement = getGateBDomain("SM");
    expect(
      selfManagement?.facets
        .filter((facet) => facet.role === "representative_core")
        .map((facet) => facet.facetId),
    ).toEqual(["SM-EP", "SM-OS"]);
    expect(
      selfManagement?.facets.find((facet) => facet.facetId === "SM-RL"),
    ).toMatchObject({
      role: "self_private_research",
      status: "research_only_requires_independence_and_safety_validation",
    });
  });

  it("does not treat the development midpoint as a validated release threshold", () => {
    expect(enakqGateBMeasurementModel.releaseDecisionPolicy).toMatchObject({
      boundaryThresholdSource:
        "pre_registered_quantitative_pilot_not_fixed_in_advance",
      currentMidpointRuleStatus:
        "development_only_not_a_validated_release_threshold",
      quickAssessmentPolicy:
        "provisional_direction_only_no_confirmed_facet_claims",
      unresolvedPolicy: "do_not_issue_a_final_five_letter_code",
    });
  });

  it("requires every empirical gate before activation", () => {
    expect(Object.values(enakqGateBMeasurementModel.validationGates)).toEqual([
      "not_started",
      "not_started",
      "not_started",
      "not_started",
    ]);
    expect(canActivateCodeScheme(nextNuangCodeScheme)).toBe(false);
  });

  it("rejects duplicate facets across domains", () => {
    const duplicate = structuredClone(enakqGateBMeasurementModel);
    duplicate.domains[1].facets[0].facetId = "SE-RE";

    expect(gateBMeasurementModelSchema.safeParse(duplicate).success).toBe(
      false,
    );
  });
});
