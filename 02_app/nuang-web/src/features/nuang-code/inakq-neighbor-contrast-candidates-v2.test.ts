import { describe, expect, it } from "vitest";
import {
  getOneLetterNeighborCodes,
  traitMapClaimV2Schema,
} from "@/features/nuang-code/trait-map-data-center-v2";
import {
  inakqNeighborContrastClaimsV2,
  inakqNeighborReviewQueueV2,
} from "@/features/nuang-code/inakq-neighbor-contrast-candidates-v2";
import { traitMapEvidenceRegistryV2 } from "@/features/nuang-code/trait-map-evidence-registry-v2";

describe("INAKQ neighbor contrast candidates v2", () => {
  it("creates four unpublished claims for each exact one-letter neighbor", () => {
    expect(inakqNeighborContrastClaimsV2).toHaveLength(20);
    expect(inakqNeighborReviewQueueV2).toHaveLength(5);
    expect(new Set(inakqNeighborReviewQueueV2.map((item) => item.code))).toEqual(
      new Set(getOneLetterNeighborCodes("INAKQ")),
    );
    for (const item of inakqNeighborReviewQueueV2) {
      expect(
        inakqNeighborContrastClaimsV2.filter(
          (claim) => claim.entity.ref === `INAKQ<>${item.code}`,
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

    for (const claim of inakqNeighborContrastClaimsV2) {
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

  it("uses four distinct comparison jobs without duplicate assertions", () => {
    for (const item of inakqNeighborReviewQueueV2) {
      const claims = inakqNeighborContrastClaimsV2.filter(
        (claim) => claim.entity.ref === `INAKQ<>${item.code}`,
      );
      const kinds = new Set(claims.map((claim) => claim.claimKind));
      expect(kinds.has("evidence_statement")).toBe(true);
      expect(kinds.has("actual_response")).toBe(true);
      expect(kinds.has("conversation_guide")).toBe(true);
      expect(
        kinds.has("attention") || kinds.has("emotional_activation"),
      ).toBe(true);
    }
    expect(
      new Set(
        inakqNeighborContrastClaimsV2.map((claim) =>
          claim.assertion.trim(),
        ),
      ).size,
    ).toBe(inakqNeighborContrastClaimsV2.length);
  });
});
