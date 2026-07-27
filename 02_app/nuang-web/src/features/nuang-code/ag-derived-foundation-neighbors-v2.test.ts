import { describe, expect, it } from "vitest";
import engkqNeighborPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENGKQ_NEIGHBOR_REVIEW_V2.json";
import iramcNeighborPacket from "../../../docs/research/trait-map-data-center-v2/generated/IRAMC_NEIGHBOR_REVIEW_V2.json";
import { engkqFoundationClaimsV2 } from "@/features/nuang-code/engkq-foundation-candidates-v2";
import { iramcFoundationClaimsV2 } from "@/features/nuang-code/iramc-foundation-candidates-v2";
import {
  getOneLetterNeighborCodes,
  traitMapClaimV2Schema,
} from "@/features/nuang-code/trait-map-data-center-v2";
import { traitMapEvidenceRegistryV2 } from "@/features/nuang-code/trait-map-evidence-registry-v2";

const profiles = [
  {
    code: "ENGKQ",
    changedDefinition: "ENGKQ.general.definition.G",
    foundationClaims: engkqFoundationClaimsV2,
    neighborPacket: engkqNeighborPacket,
  },
  {
    code: "IRAMC",
    changedDefinition: "IRAMC.general.definition.A",
    foundationClaims: iramcFoundationClaimsV2,
    neighborPacket: iramcNeighborPacket,
  },
] as const;

describe.each(profiles)(
  "$code A/G-derived foundation and neighbors v2",
  ({ code, changedDefinition, foundationClaims, neighborPacket }) => {
    it("defines five directions and one whole-profile hypothesis", () => {
      expect(foundationClaims).toHaveLength(6);
      expect(foundationClaims.map((claim) => claim.claimId)).toContain(
        changedDefinition,
      );
      for (const claim of foundationClaims) {
        expect(() => traitMapClaimV2Schema.parse(claim)).not.toThrow();
        expect(claim.entity).toEqual({ kind: "profile", ref: code });
        expect(claim.publicationState).toBe("research_only");
      }
    });

    it("creates four claims for each exact one-letter neighbor", () => {
      expect(neighborPacket.code).toBe(code);
      expect(neighborPacket.claimCount).toBe(20);
      expect(neighborPacket.claims).toHaveLength(20);
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

    it("keeps comparison claims unpublished, unique, and evidence-linked", () => {
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
