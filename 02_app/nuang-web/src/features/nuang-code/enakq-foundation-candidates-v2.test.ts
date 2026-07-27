import { describe, expect, it } from "vitest";
import { enakqFoundationClaimsV2 } from "@/features/nuang-code/enakq-foundation-candidates-v2";
import { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";
import { traitMapEvidenceRegistryV2 } from "@/features/nuang-code/trait-map-evidence-registry-v2";

describe("ENAKQ foundation candidates v2", () => {
  it("defines five directions and a whole-profile hypothesis", () => {
    expect(enakqFoundationClaimsV2).toHaveLength(6);
    expect(
      enakqFoundationClaimsV2.filter((claim) =>
        claim.claimId.includes(".definition."),
      ),
    ).toHaveLength(5);
    expect(
      enakqFoundationClaimsV2.every(
        (claim) =>
          claim.publicationState === "research_only" &&
          claim.evidenceStatus === "nuang_validation_required",
      ),
    ).toBe(true);
  });

  it("conforms to the claim contract and included evidence", () => {
    const sourceIds = new Set<string>(
      traitMapEvidenceRegistryV2.sources
        .filter((source) => source.screeningStatus === "included")
        .map((source) => source.sourceId),
    );
    const findingIds = new Set<string>(
      traitMapEvidenceRegistryV2.findings.map((finding) => finding.findingId),
    );

    for (const claim of enakqFoundationClaimsV2) {
      expect(() => traitMapClaimV2Schema.parse(claim)).not.toThrow();
      for (const sourceId of claim.independentSourceRefs) {
        expect(sourceIds.has(sourceId)).toBe(true);
      }
      for (const findingId of claim.evidenceFindingRefs) {
        expect(findingIds.has(findingId)).toBe(true);
      }
    }
  });
});
