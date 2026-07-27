import { describe, expect, it } from "vitest";
import enamcNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/ENAMC_NEIGHBOR_REVIEW_V2.json";
import engmqNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/ENGMQ_NEIGHBOR_REVIEW_V2.json";
import ergkqNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/ERGKQ_NEIGHBOR_REVIEW_V2.json";
import inakcNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/INAKC_NEIGHBOR_REVIEW_V2.json";
import irakqNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/IRAKQ_NEIGHBOR_REVIEW_V2.json";
import {
  enamcFoundationClaimsV2,
  engmqFoundationClaimsV2,
  ergkqFoundationClaimsV2,
  inakcFoundationClaimsV2,
  irakqFoundationClaimsV2,
} from "@/features/nuang-code/remaining-batch1-foundation-candidates-v2";
import {
  getOneLetterNeighborCodes,
  traitMapClaimV2Schema,
} from "@/features/nuang-code/trait-map-data-center-v2";
import { traitMapEvidenceRegistryV2 } from "@/features/nuang-code/trait-map-evidence-registry-v2";

const cases = [
  {
    code: "IRAKQ",
    foundation: irakqFoundationClaimsV2,
    neighbors: irakqNeighbors,
  },
  {
    code: "ERGKQ",
    foundation: ergkqFoundationClaimsV2,
    neighbors: ergkqNeighbors,
  },
  {
    code: "ENGMQ",
    foundation: engmqFoundationClaimsV2,
    neighbors: engmqNeighbors,
  },
  {
    code: "ENAMC",
    foundation: enamcFoundationClaimsV2,
    neighbors: enamcNeighbors,
  },
  {
    code: "INAKC",
    foundation: inakcFoundationClaimsV2,
    neighbors: inakcNeighbors,
  },
] as const;

describe.each(cases)(
  "$code remaining batch 1 foundation and neighbors v2",
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
