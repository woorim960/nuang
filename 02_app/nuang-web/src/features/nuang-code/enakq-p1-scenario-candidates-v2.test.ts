import { describe, expect, it } from "vitest";
import {
  traitMapClaimV2Schema,
  traitMapScenarioCatalogV2,
} from "@/features/nuang-code/trait-map-data-center-v2";
import {
  enakqP1ScenarioCandidatesV2,
  enakqP1ScenarioValidationQueueV2,
} from "@/features/nuang-code/enakq-p1-scenario-candidates-v2";
import { traitMapEvidenceRegistryV2 } from "@/features/nuang-code/trait-map-evidence-registry-v2";

describe("ENAKQ P1 scenario candidates v2", () => {
  it("creates four unpublished candidates for each of the 24 P1 gaps", () => {
    expect(enakqP1ScenarioCandidatesV2).toHaveLength(96);
    expect(enakqP1ScenarioValidationQueueV2).toHaveLength(24);
    expect(
      new Set(enakqP1ScenarioCandidatesV2.map((claim) => claim.claimId)).size,
    ).toBe(96);
    expect(
      enakqP1ScenarioCandidatesV2.every(
        (claim) =>
          claim.publicationState === "research_only" &&
          claim.evidenceStatus === "nuang_validation_required",
      ),
    ).toBe(true);
  });

  it("conforms every candidate to the v2 claim contract", () => {
    for (const claim of enakqP1ScenarioCandidatesV2) {
      expect(() => traitMapClaimV2Schema.parse(claim)).not.toThrow();
    }
  });

  it("references only canonical scenarios and included evidence", () => {
    const scenarioIds = new Set<string>(
      traitMapScenarioCatalogV2.map((scenario) => scenario.scenarioId),
    );
    const includedSourceIds = new Set<string>(
      traitMapEvidenceRegistryV2.sources
        .filter((source) => source.screeningStatus === "included")
        .map((source) => source.sourceId),
    );
    const findingIds = new Set<string>(
      traitMapEvidenceRegistryV2.findings.map((finding) => finding.findingId),
    );

    for (const claim of enakqP1ScenarioCandidatesV2) {
      expect(scenarioIds.has(claim.scenarioRefs[0])).toBe(true);
      expect(claim.requiredSignals).toContain("relationship_context");
      for (const sourceId of claim.independentSourceRefs) {
        expect(includedSourceIds.has(sourceId)).toBe(true);
      }
      for (const findingId of claim.evidenceFindingRefs) {
        expect(findingIds.has(findingId)).toBe(true);
      }
    }
  });

  it("keeps thoughts and behavior distinct without exact copy duplicates", () => {
    const assertions = enakqP1ScenarioCandidatesV2.map((claim) =>
      claim.assertion.trim(),
    );
    expect(new Set(assertions).size).toBe(assertions.length);

    const scenarioIds = new Set(
      enakqP1ScenarioCandidatesV2.map((claim) => claim.scenarioRefs[0]),
    );
    for (const scenarioId of scenarioIds) {
      const claims = enakqP1ScenarioCandidatesV2.filter(
        (claim) => claim.scenarioRefs[0] === scenarioId,
      );
      const thought = claims.find(
        (claim) => claim.claimKind === "first_thought",
      );
      const response = claims.find(
        (claim) => claim.claimKind === "actual_response",
      );
      expect(thought?.assertion).not.toBe(response?.assertion);
    }
  });
});
