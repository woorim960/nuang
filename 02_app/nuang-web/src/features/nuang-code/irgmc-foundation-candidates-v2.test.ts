import { describe, expect, it } from "vitest";
import {
  getOneLetterNeighborCodes,
  traitMapClaimV2Schema,
  traitMapV2ChapterIds,
} from "@/features/nuang-code/trait-map-data-center-v2";
import { traitMapEvidenceRegistryV2 } from "@/features/nuang-code/trait-map-evidence-registry-v2";
import {
  irgmcFoundationClaimsV2,
  irgmcNeighborCodesV2,
  irgmcResearchQuestionsByChapterV2,
} from "@/features/nuang-code/irgmc-foundation-candidates-v2";

describe("IRGMC foundation candidates v2", () => {
  it("defines five directions and one whole-profile hypothesis without publishing", () => {
    expect(irgmcFoundationClaimsV2).toHaveLength(6);
    expect(
      irgmcFoundationClaimsV2.filter((claim) =>
        claim.claimId.includes(".definition."),
      ),
    ).toHaveLength(5);
    expect(
      irgmcFoundationClaimsV2.every(
        (claim) =>
          claim.publicationState === "research_only" &&
          claim.evidenceStatus === "nuang_validation_required",
      ),
    ).toBe(true);
  });

  it("conforms to the claim contract and references registered evidence", () => {
    const sourceIds = new Set<string>(
      traitMapEvidenceRegistryV2.sources
        .filter((source) => source.screeningStatus === "included")
        .map((source) => source.sourceId),
    );
    const findingIds = new Set<string>(
      traitMapEvidenceRegistryV2.findings.map((finding) => finding.findingId),
    );

    for (const claim of irgmcFoundationClaimsV2) {
      expect(() => traitMapClaimV2Schema.parse(claim)).not.toThrow();
      for (const sourceId of claim.independentSourceRefs) {
        expect(sourceIds.has(sourceId)).toBe(true);
      }
      for (const findingId of claim.evidenceFindingRefs) {
        expect(findingIds.has(findingId)).toBe(true);
      }
    }
  });

  it("locks all 16 chapters and the exact five one-letter neighbors", () => {
    expect(irgmcResearchQuestionsByChapterV2.map(([id]) => id)).toEqual([
      ...traitMapV2ChapterIds,
    ]);
    expect(new Set(irgmcNeighborCodesV2)).toEqual(
      new Set(getOneLetterNeighborCodes("IRGMC")),
    );
  });

  it("does not copy ENAKQ identity into the opposite anchor", () => {
    const assertions = irgmcFoundationClaimsV2
      .map((claim) => claim.assertion)
      .join(" ");

    expect(assertions).not.toContain("관계를 여는 지휘자");
    expect(assertions).not.toContain("ENAKQ");
  });
});
