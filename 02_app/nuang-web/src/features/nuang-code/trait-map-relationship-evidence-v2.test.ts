import { describe, expect, it } from "vitest";
import {
  traitMapEvidenceFindingSchema,
  traitMapEvidenceSourceSchema,
} from "@/features/nuang-code/trait-map-data-center-v2";
import {
  traitMapRelationshipEvidenceFindingsV2,
  traitMapRelationshipEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-relationship-evidence-v2";

describe("trait map relationship evidence v2", () => {
  it("validates every normalized source and finding", () => {
    for (const source of traitMapRelationshipEvidenceSourcesV2) {
      expect(() => traitMapEvidenceSourceSchema.parse(source)).not.toThrow();
    }
    for (const finding of traitMapRelationshipEvidenceFindingsV2) {
      expect(() => traitMapEvidenceFindingSchema.parse(finding)).not.toThrow();
    }
  });

  it("links findings only to included, non-retracted sources", () => {
    const includedSourceIds = new Set<string>(
      traitMapRelationshipEvidenceSourcesV2
        .filter((source) => source.screeningStatus === "included")
        .map((source) => source.sourceId),
    );

    for (const finding of traitMapRelationshipEvidenceFindingsV2) {
      expect(includedSourceIds.has(finding.sourceId)).toBe(true);
    }
  });

  it("excludes the retracted responsiveness-stress paper", () => {
    const retracted = traitMapRelationshipEvidenceSourcesV2.find(
      (source) => source.sourceId === "SRC-RESPONSIVENESS-STRESS-2021",
    );

    expect(retracted?.screeningStatus).toBe("excluded");
    expect(retracted?.exclusionReason).toContain("철회");
    const retractedSourceId: string = "SRC-RESPONSIVENESS-STRESS-2021";
    expect(
      traitMapRelationshipEvidenceFindingsV2.some(
        (finding) => String(finding.sourceId) === retractedSourceId,
      ),
    ).toBe(false);
  });

  it("keeps the corrected responsiveness bibliography", () => {
    const source = traitMapRelationshipEvidenceSourcesV2.find(
      (item) => item.sourceId === "SRC-RESPONSIVENESS-2017",
    );

    expect(source?.year).toBe(2016);
    expect(source?.doi).toBe("10.1111/jomf.12272");
  });
});
