import { describe, expect, it } from "vitest";
import engkcNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/ENGKC_NEIGHBOR_REVIEW_V2.json";
import erakcNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/ERAKC_NEIGHBOR_REVIEW_V2.json";
import eramqNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/ERAMQ_NEIGHBOR_REVIEW_V2.json";
import inamqNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/INAMQ_NEIGHBOR_REVIEW_V2.json";
import ingkqNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/INGKQ_NEIGHBOR_REVIEW_V2.json";
import {
  engkcFoundationClaimsV2,
  erakcFoundationClaimsV2,
  eramqFoundationClaimsV2,
  inamqFoundationClaimsV2,
  ingkqFoundationClaimsV2,
} from "@/features/nuang-code/remaining-batch2-foundation-candidates-v2";
import {
  getOneLetterNeighborCodes,
  traitMapClaimV2Schema,
} from "@/features/nuang-code/trait-map-data-center-v2";
import { traitMapEvidenceRegistryV2 } from "@/features/nuang-code/trait-map-evidence-registry-v2";

const cases = [
  {
    code: "INGKQ",
    foundation: ingkqFoundationClaimsV2,
    neighbors: ingkqNeighbors,
  },
  {
    code: "INAMQ",
    foundation: inamqFoundationClaimsV2,
    neighbors: inamqNeighbors,
  },
  {
    code: "ERAMQ",
    foundation: eramqFoundationClaimsV2,
    neighbors: eramqNeighbors,
  },
  {
    code: "ERAKC",
    foundation: erakcFoundationClaimsV2,
    neighbors: erakcNeighbors,
  },
  {
    code: "ENGKC",
    foundation: engkcFoundationClaimsV2,
    neighbors: engkcNeighbors,
  },
] as const;

describe.each(cases)(
  "$code remaining batch 2 foundation and neighbors v2",
  ({ code, foundation, neighbors }) => {
    it("defines all five directions and one whole-profile hypothesis", () => {
      expect(foundation).toHaveLength(6);
      expect(
        foundation.filter((claim) => claim.scope === "single_direction"),
      ).toHaveLength(5);
      expect(
        foundation.filter((claim) => claim.scope === "whole_profile"),
      ).toHaveLength(1);
      for (const claim of foundation) {
        expect(() => traitMapClaimV2Schema.parse(claim)).not.toThrow();
        expect(claim.entity).toEqual({ kind: "profile", ref: code });
        expect(claim.publicationState).toBe("research_only");
      }
    });

    it("creates four evidence-linked claims for every one-letter neighbor", () => {
      const sourceIds = new Set<string>(
        traitMapEvidenceRegistryV2.sources
          .filter((source) => source.screeningStatus === "included")
          .map((source) => source.sourceId),
      );
      const findingIds = new Set<string>(
        traitMapEvidenceRegistryV2.findings.map((finding) => finding.findingId),
      );
      expect(neighbors.claimCount).toBe(20);
      expect(new Set(neighbors.neighborCodes)).toEqual(
        new Set(getOneLetterNeighborCodes(code)),
      );
      for (const neighborCode of neighbors.neighborCodes) {
        expect(
          neighbors.claims.filter(
            (claim) => claim.entity.ref === `${code}<>${neighborCode}`,
          ),
        ).toHaveLength(4);
      }
      for (const claim of neighbors.claims) {
        expect(() => traitMapClaimV2Schema.parse(claim)).not.toThrow();
        expect(claim.publicationState).toBe("research_only");
        expect(
          claim.independentSourceRefs.every((sourceId) =>
            sourceIds.has(sourceId),
          ),
        ).toBe(true);
        expect(
          claim.evidenceFindingRefs.every((findingId) =>
            findingIds.has(findingId),
          ),
        ).toBe(true);
      }
      expect(
        new Set(neighbors.claims.map((claim) => claim.assertion)).size,
      ).toBe(20);
    });
  },
);
