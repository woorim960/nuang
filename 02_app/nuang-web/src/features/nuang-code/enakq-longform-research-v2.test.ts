import { describe, expect, it } from "vitest";
import manifest from "../../../docs/research/trait-map-data-center-v2/generated/ENAKQ_LONGFORM_RESEARCH_MANIFEST_V2.json";
import {
  traitMapProfilePackageV2Schema,
  traitMapV2ChapterIds,
} from "@/features/nuang-code/trait-map-data-center-v2";

describe("ENAKQ longform research draft v2", () => {
  it("conforms to the profile package contract", () => {
    expect(() => traitMapProfilePackageV2Schema.parse(manifest)).not.toThrow();
  });

  it("contains all 16 required chapters in order", () => {
    expect(manifest.chapters.map((chapter) => chapter.chapterId)).toEqual([
      ...traitMapV2ChapterIds,
    ]);
  });

  it("meets the longform target without claiming approval", () => {
    expect(manifest.totalNonWhitespaceCharacters).toBeGreaterThanOrEqual(
      50_000,
    );
    expect(manifest.status).toBe("research_draft");
    expect(manifest.researchMetrics.customerApprovedClaims).toBe(0);
  });

  it("keeps full traceability inventories", () => {
    expect(manifest.scenarioRefs).toHaveLength(72);
    expect(manifest.claimRefs.length).toBeGreaterThanOrEqual(314);
    expect(manifest.evidenceSourceRefs.length).toBeGreaterThanOrEqual(30);
    expect(manifest.neighborContrastCodes).toHaveLength(5);
  });
});
