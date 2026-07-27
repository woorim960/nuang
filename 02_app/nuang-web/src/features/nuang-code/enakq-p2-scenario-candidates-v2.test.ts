import { describe, expect, it } from "vitest";
import {
  traitMapClaimV2Schema,
  traitMapScenarioCatalogV2,
} from "@/features/nuang-code/trait-map-data-center-v2";
import {
  enakqP2ScenarioCandidatesV2,
  enakqP2ScenarioValidationQueueV2,
} from "@/features/nuang-code/enakq-p2-scenario-candidates-v2";
import { traitMapEvidenceRegistryV2 } from "@/features/nuang-code/trait-map-evidence-registry-v2";

describe("ENAKQ P2 scenario candidates v2", () => {
  it("standardizes the 30 legacy-covered scenes into four research channels", () => {
    expect(enakqP2ScenarioCandidatesV2).toHaveLength(120);
    expect(enakqP2ScenarioValidationQueueV2).toHaveLength(30);
    expect(
      new Set(enakqP2ScenarioCandidatesV2.map((claim) => claim.claimId)).size,
    ).toBe(120);
    expect(
      enakqP2ScenarioCandidatesV2.every(
        (claim) =>
          claim.publicationState === "research_only" &&
          claim.evidenceStatus === "nuang_validation_required",
      ),
    ).toBe(true);
  });

  it("conforms every candidate to the v2 claim contract", () => {
    for (const claim of enakqP2ScenarioCandidatesV2) {
      expect(() => traitMapClaimV2Schema.parse(claim)).not.toThrow();
    }
  });

  it("references only canonical scenarios and included evidence", () => {
    const scenarioIds = new Set(
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

    for (const claim of enakqP2ScenarioCandidatesV2) {
      expect(scenarioIds.has(claim.scenarioRefs[0])).toBe(true);
      for (const sourceId of claim.independentSourceRefs) {
        expect(includedSourceIds.has(sourceId)).toBe(true);
      }
      for (const findingId of claim.evidenceFindingRefs) {
        expect(findingIds.has(findingId)).toBe(true);
      }
    }
  });

  it("keeps the 30 scene IDs and 120 assertions unique", () => {
    expect(
      new Set(
        enakqP2ScenarioValidationQueueV2.map((item) => item.scenarioId),
      ).size,
    ).toBe(30);
    expect(
      new Set(
        enakqP2ScenarioCandidatesV2.map((claim) => claim.assertion.trim()),
      ).size,
    ).toBe(enakqP2ScenarioCandidatesV2.length);
  });
});
