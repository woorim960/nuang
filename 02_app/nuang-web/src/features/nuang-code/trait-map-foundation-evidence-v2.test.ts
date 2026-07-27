import { describe, expect, it } from "vitest";
import {
  traitMapConstructMappingSchema,
  traitMapEvidenceFindingSchema,
  traitMapEvidenceSourceSchema,
} from "@/features/nuang-code/trait-map-data-center-v2";
import {
  traitMapFoundationConstructMappingsV2,
  traitMapFoundationEvidenceFindingsV2,
  traitMapFoundationEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-foundation-evidence-v2";

describe("trait map foundation evidence v2", () => {
  it("normalizes the first foundation evidence set", () => {
    expect(traitMapFoundationEvidenceSourcesV2).toHaveLength(15);
    expect(
      new Set(
        traitMapFoundationEvidenceSourcesV2.map((source) => source.sourceId),
      ).size,
    ).toBe(traitMapFoundationEvidenceSourcesV2.length);

    for (const source of traitMapFoundationEvidenceSourcesV2) {
      expect(() => traitMapEvidenceSourceSchema.parse(source)).not.toThrow();
    }
  });

  it("stores findings separately from source citations", () => {
    expect(traitMapFoundationEvidenceFindingsV2).toHaveLength(15);
    const sourceIds = new Set(
      traitMapFoundationEvidenceSourcesV2.map((source) => source.sourceId),
    );

    for (const finding of traitMapFoundationEvidenceFindingsV2) {
      expect(() => traitMapEvidenceFindingSchema.parse(finding)).not.toThrow();
      expect(sourceIds.has(finding.sourceId)).toBe(true);
      expect(finding.limitations.length).toBeGreaterThan(0);
    }
  });

  it("uses partial, adjacent, or non-equivalent mappings instead of claiming exact equivalence", () => {
    const findingIds = new Set(
      traitMapFoundationEvidenceFindingsV2.map(
        (finding) => finding.findingId,
      ),
    );

    for (const mapping of traitMapFoundationConstructMappingsV2) {
      expect(() =>
        traitMapConstructMappingSchema.parse(mapping),
      ).not.toThrow();
      expect(["partial", "adjacent", "non_equivalent"]).toContain(
        mapping.relation,
      );
      expect(mapping.prohibitedEquivalences.length).toBeGreaterThan(0);
      for (const findingRef of mapping.evidenceFindingRefs) {
        expect(findingIds.has(findingRef)).toBe(true);
      }
    }
  });
});
