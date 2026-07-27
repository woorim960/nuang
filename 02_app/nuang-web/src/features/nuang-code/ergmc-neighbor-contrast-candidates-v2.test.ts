import { describe, expect, it } from "vitest";
import {
  getOneLetterNeighborCodes,
  traitMapClaimV2Schema,
} from "@/features/nuang-code/trait-map-data-center-v2";
import {
  ergmcNeighborContrastClaimsV2,
  ergmcNeighborReviewQueueV2,
} from "@/features/nuang-code/ergmc-neighbor-contrast-candidates-v2";
import { traitMapEvidenceRegistryV2 } from "@/features/nuang-code/trait-map-evidence-registry-v2";

describe("ERGMC neighbor contrast candidates v2", () => {
  it("creates four unpublished claims for each exact one-letter neighbor", () => {
    expect(ergmcNeighborContrastClaimsV2).toHaveLength(20);
    expect(ergmcNeighborReviewQueueV2).toHaveLength(5);
    expect(new Set(ergmcNeighborReviewQueueV2.map((item) => item.code))).toEqual(
      new Set(getOneLetterNeighborCodes("ERGMC")),
    );
    for (const item of ergmcNeighborReviewQueueV2) {
      expect(
        ergmcNeighborContrastClaimsV2.filter(
          (claim) => claim.entity.ref === `ERGMC<>${item.code}`,
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

    for (const claim of ergmcNeighborContrastClaimsV2) {
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

  it("has no duplicate assertion and never leaves an IRGMC-only neighbor code", () => {
    expect(
      new Set(
        ergmcNeighborContrastClaimsV2.map((claim) =>
          claim.assertion.trim(),
        ),
      ).size,
    ).toBe(ergmcNeighborContrastClaimsV2.length);
    const assertions = ergmcNeighborContrastClaimsV2
      .filter((claim) => claim.entity.ref !== "ERGMC<>IRGMC")
      .map((claim) => claim.assertion)
      .join(" ");
    expect(assertions).not.toMatch(/\b(?:INGMC|IRAMC|IRGKC|IRGMQ)\b/);
  });
});
