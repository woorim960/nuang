import { describe, expect, it } from "vitest";
import erakqNeighborPacket from "../../../docs/research/trait-map-data-center-v2/generated/ERAKQ_NEIGHBOR_REVIEW_V2.json";
import ingmcNeighborPacket from "../../../docs/research/trait-map-data-center-v2/generated/INGMC_NEIGHBOR_REVIEW_V2.json";
import { erakqFoundationClaimsV2 } from "@/features/nuang-code/erakq-foundation-candidates-v2";
import { ingmcFoundationClaimsV2 } from "@/features/nuang-code/ingmc-foundation-candidates-v2";
import {
  getOneLetterNeighborCodes,
  traitMapClaimV2Schema,
} from "@/features/nuang-code/trait-map-data-center-v2";
import { traitMapEvidenceRegistryV2 } from "@/features/nuang-code/trait-map-evidence-registry-v2";

const profiles = [
  {
    code: "ERAKQ",
    changedDefinition: "ERAKQ.general.definition.R",
    foundationClaims: erakqFoundationClaimsV2,
    neighborPacket: erakqNeighborPacket,
  },
  {
    code: "INGMC",
    changedDefinition: "INGMC.general.definition.N",
    foundationClaims: ingmcFoundationClaimsV2,
    neighborPacket: ingmcNeighborPacket,
  },
] as const;

describe.each(profiles)(
  "$code N/R-derived foundation and neighbors v2",
  ({ code, changedDefinition, foundationClaims, neighborPacket }) => {
    it("defines five directions and one whole-profile hypothesis", () => {
      expect(foundationClaims).toHaveLength(6);
      expect(foundationClaims.map((claim) => claim.claimId)).toContain(
        changedDefinition,
      );
      expect(foundationClaims.at(-1)?.claimId).toBe(
        `${code}.general.profile.hypothesis`,
      );
      for (const claim of foundationClaims) {
        expect(() => traitMapClaimV2Schema.parse(claim)).not.toThrow();
        expect(claim.entity).toEqual({ kind: "profile", ref: code });
        expect(claim.publicationState).toBe("research_only");
      }
    });

    it("creates four unpublished claims for each exact one-letter neighbor", () => {
      expect(neighborPacket.code).toBe(code);
      expect(neighborPacket.claimCount).toBe(20);
      expect(neighborPacket.claims).toHaveLength(20);
      expect(neighborPacket.reviewQueue).toHaveLength(5);
      expect(new Set(neighborPacket.neighborCodes)).toEqual(
        new Set(getOneLetterNeighborCodes(code)),
      );
      for (const neighborCode of neighborPacket.neighborCodes) {
        expect(
          neighborPacket.claims.filter(
            (claim) => claim.entity.ref === `${code}<>${neighborCode}`,
          ),
        ).toHaveLength(4);
      }
    });

    it("keeps every comparison claim contract-valid and evidence-linked", () => {
      const includedSourceIds = new Set<string>(
        traitMapEvidenceRegistryV2.sources
          .filter((source) => source.screeningStatus === "included")
          .map((source) => source.sourceId),
      );
      const findingIds = new Set<string>(
        traitMapEvidenceRegistryV2.findings.map(
          (finding) => finding.findingId,
        ),
      );

      for (const claim of neighborPacket.claims) {
        expect(() => traitMapClaimV2Schema.parse(claim)).not.toThrow();
        expect(claim.publicationState).toBe("research_only");
        expect(
          claim.independentSourceRefs.every((sourceId) =>
            includedSourceIds.has(sourceId),
          ),
        ).toBe(true);
        expect(
          claim.evidenceFindingRefs.every((findingId) =>
            findingIds.has(findingId),
          ),
        ).toBe(true);
      }
      expect(
        new Set(neighborPacket.claims.map((claim) => claim.assertion)).size,
      ).toBe(20);
    });
  },
);
