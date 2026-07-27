import { describe, expect, it } from "vitest";
import {
  getOneLetterNeighborCodes,
  traitMapClaimV2Schema,
} from "@/features/nuang-code/trait-map-data-center-v2";
import {
  irgmcNeighborContrastClaimsV2,
  irgmcNeighborReviewQueueV2,
} from "@/features/nuang-code/irgmc-neighbor-contrast-candidates-v2";
import { traitMapEvidenceRegistryV2 } from "@/features/nuang-code/trait-map-evidence-registry-v2";

describe("IRGMC neighbor contrast candidates v2", () => {
  it("creates four unpublished claims for each exact one-letter neighbor", () => {
    expect(irgmcNeighborContrastClaimsV2).toHaveLength(20);
    expect(irgmcNeighborReviewQueueV2).toHaveLength(5);
    expect(new Set(irgmcNeighborReviewQueueV2.map((item) => item.code))).toEqual(
      new Set(getOneLetterNeighborCodes("IRGMC")),
    );
    for (const item of irgmcNeighborReviewQueueV2) {
      expect(
        irgmcNeighborContrastClaimsV2.filter(
          (claim) => claim.entity.ref === `IRGMC<>${item.code}`,
        ),
      ).toHaveLength(4);
    }
  });

  it("conforms to the claim contract and included evidence inventory", () => {
    const includedSourceIds = new Set<string>(
      traitMapEvidenceRegistryV2.sources
        .filter((source) => source.screeningStatus === "included")
        .map((source) => source.sourceId),
    );
    const findingIds = new Set<string>(
      traitMapEvidenceRegistryV2.findings.map((finding) => finding.findingId),
    );

    for (const claim of irgmcNeighborContrastClaimsV2) {
      expect(() => traitMapClaimV2Schema.parse(claim)).not.toThrow();
      expect(claim.publicationState).toBe("research_only");
      for (const sourceId of claim.independentSourceRefs) {
        expect(includedSourceIds.has(sourceId)).toBe(true);
      }
      for (const findingId of claim.evidenceFindingRefs) {
        expect(findingIds.has(findingId)).toBe(true);
      }
    }
  });

  it("does not duplicate complete assertions", () => {
    expect(
      new Set(
        irgmcNeighborContrastClaimsV2.map((claim) => claim.assertion.trim()),
      ).size,
    ).toBe(irgmcNeighborContrastClaimsV2.length);
  });
});
