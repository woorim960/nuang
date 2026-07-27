import { describe, expect, it } from "vitest";
import {
  traitMapClaimV2Schema,
  traitMapScenarioCatalogV2,
} from "@/features/nuang-code/trait-map-data-center-v2";
import {
  enakqP0ScenarioCandidatesV2,
  enakqP0ScenarioValidationQueueV2,
} from "@/features/nuang-code/enakq-p0-scenario-candidates-v2";
import { traitMapEvidenceRegistryV2 } from "@/features/nuang-code/trait-map-evidence-registry-v2";

describe("ENAKQ P0 scenario candidates v2", () => {
  it("creates four unpublished candidates for each of the 18 P0 gaps", () => {
    expect(enakqP0ScenarioCandidatesV2).toHaveLength(72);
    expect(enakqP0ScenarioValidationQueueV2).toHaveLength(18);
    expect(
      new Set(enakqP0ScenarioCandidatesV2.map((claim) => claim.claimId)).size,
    ).toBe(72);
    expect(
      enakqP0ScenarioCandidatesV2.every(
        (claim) =>
          claim.publicationState === "research_only" &&
          claim.evidenceStatus === "nuang_validation_required",
      ),
    ).toBe(true);
  });

  it("conforms every candidate to the v2 claim contract", () => {
    for (const claim of enakqP0ScenarioCandidatesV2) {
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

    for (const claim of enakqP0ScenarioCandidatesV2) {
      expect(scenarioIds.has(claim.scenarioRefs[0])).toBe(true);
      for (const sourceId of claim.independentSourceRefs) {
        expect(includedSourceIds.has(sourceId)).toBe(true);
      }
      for (const findingId of claim.evidenceFindingRefs) {
        expect(findingIds.has(findingId)).toBe(true);
      }
    }
  });

  it("keeps first thoughts and actual responses separate", () => {
    const byScene = new Map<
      string,
      (typeof enakqP0ScenarioCandidatesV2)[number][]
    >();
    for (const claim of enakqP0ScenarioCandidatesV2) {
      const scenarioId = claim.scenarioRefs[0];
      const claims = byScene.get(scenarioId) ?? [];
      claims.push(claim);
      byScene.set(scenarioId, claims);
    }

    for (const claims of byScene.values()) {
      const firstThought = claims.find(
        (claim) => claim.claimKind === "first_thought",
      );
      const actualResponse = claims.find(
        (claim) => claim.claimKind === "actual_response",
      );
      expect(firstThought?.assertion).not.toBe(actualResponse?.assertion);
      expect(firstThought?.requiredSignals).toContain(
        "private_process_signals",
      );
      expect(actualResponse?.requiredSignals).toContain(
        "private_process_signals",
      );
    }
  });

  it("does not duplicate exact candidate assertions", () => {
    expect(
      new Set(
        enakqP0ScenarioCandidatesV2.map((claim) => claim.assertion.trim()),
      ).size,
    ).toBe(enakqP0ScenarioCandidatesV2.length);
  });
});
