import { describe, expect, it } from "vitest";
import manifest from "../../../docs/research/trait-map-data-center-v2/generated/IRGMC_LONGFORM_RESEARCH_MANIFEST_V2.json";
import {
  traitMapProfilePackageV2Schema,
  traitMapV2ChapterIds,
} from "@/features/nuang-code/trait-map-data-center-v2";

describe("IRGMC longform research draft v2", () => {
  it("conforms to the profile package contract", () => {
    expect(() => traitMapProfilePackageV2Schema.parse(manifest)).not.toThrow();
  });

  it("contains every required chapter in the fixed order", () => {
    expect(manifest.chapters.map((chapter) => chapter.chapterId)).toEqual([
      ...traitMapV2ChapterIds,
    ]);
  });

  it("meets the longform research target without claiming approval", () => {
    expect(manifest.totalNonWhitespaceCharacters).toBeGreaterThanOrEqual(
      50_000,
    );
    expect(manifest.status).toBe("research_draft");
    expect(manifest.researchMetrics.customerApprovedClaims).toBe(0);
  });

  it("keeps the full traceability inventories", () => {
    expect(manifest.scenarioRefs).toHaveLength(72);
    expect(manifest.claimRefs).toHaveLength(314);
    expect(manifest.researchMetrics.structuredNeighborContrasts).toBe("20/20");
    expect(manifest.evidenceSourceRefs.length).toBeGreaterThanOrEqual(30);
    expect(manifest.neighborContrastCodes).toHaveLength(5);
  });
});
