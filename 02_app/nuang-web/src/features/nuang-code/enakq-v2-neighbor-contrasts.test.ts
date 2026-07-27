import { describe, expect, it } from "vitest";
import neighborPacket from "@/features/nuang-code/fixtures/enakq-v2-neighbor-claims.generated.json";
import {
  getOneLetterNeighborCodes,
  traitMapClaimV2Schema,
  traitMapScenarioCatalogV2,
} from "@/features/nuang-code/trait-map-data-center-v2";
import {
  traitMapFoundationEvidenceFindingsV2,
  traitMapFoundationEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-foundation-evidence-v2";

describe("ENAKQ v2 neighbor contrast packet", () => {
  it("contains exactly four research claims for each one-letter neighbor", () => {
    const expectedNeighbors = getOneLetterNeighborCodes("ENAKQ");

    expect(neighborPacket.neighborCodes).toEqual(expectedNeighbors);
    expect(neighborPacket.claims).toHaveLength(20);
    expect(
      new Set(neighborPacket.claims.map((item) => item.claim.claimId)).size,
    ).toBe(20);

    for (const neighbor of expectedNeighbors) {
      expect(
        neighborPacket.claims.filter(
          (item) => item.claim.entity.ref === `ENAKQ<>${neighbor}`,
        ),
      ).toHaveLength(4);
    }
  });

  it("keeps every contrast unpublished and valid under the v2 contract", () => {
    for (const item of neighborPacket.claims) {
      expect(item.claim.publicationState).toBe("research_only");
      expect(item.migration.symmetryReviewStatus).toBe("not_started");
      expect(() => traitMapClaimV2Schema.parse(item.claim)).not.toThrow();
    }
  });

  it("only links canonical scenarios and normalized foundation evidence", () => {
    const scenarioIds = new Set<string>(
      traitMapScenarioCatalogV2.map((scenario) => scenario.scenarioId),
    );
    const findingIds = new Set<string>(
      traitMapFoundationEvidenceFindingsV2.map(
        (finding) => finding.findingId,
      ),
    );
    const sourceIds = new Set<string>(
      traitMapFoundationEvidenceSourcesV2.map((source) => source.sourceId),
    );

    for (const item of neighborPacket.claims) {
      for (const scenarioRef of item.claim.scenarioRefs) {
        expect(scenarioIds.has(scenarioRef)).toBe(true);
      }
      for (const findingRef of item.claim.evidenceFindingRefs) {
        expect(findingIds.has(findingRef)).toBe(true);
      }
      for (const sourceRef of item.claim.independentSourceRefs) {
        expect(sourceIds.has(sourceRef)).toBe(true);
      }
    }
  });
});
