import { describe, expect, it } from "vitest";
import {
  getIncludedTraitMapEvidenceSourceIdsV2,
  traitMapEvidenceFindingsV2,
  traitMapEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-evidence-registry-v2";

describe("trait map evidence registry v2", () => {
  it("keeps all source and finding identifiers unique", () => {
    expect(
      new Set(traitMapEvidenceSourcesV2.map((source) => source.sourceId)).size,
    ).toBe(traitMapEvidenceSourcesV2.length);
    expect(
      new Set(traitMapEvidenceFindingsV2.map((finding) => finding.findingId))
        .size,
    ).toBe(traitMapEvidenceFindingsV2.length);
  });

  it("allows findings to reference only included sources", () => {
    const includedSourceIds = getIncludedTraitMapEvidenceSourceIdsV2();

    for (const finding of traitMapEvidenceFindingsV2) {
      expect(includedSourceIds.has(finding.sourceId)).toBe(true);
    }
  });

  it("keeps excluded sources visible without letting them support findings", () => {
    const excludedSourceIds = new Set<string>(
      traitMapEvidenceSourcesV2
        .filter((source) => source.screeningStatus === "excluded")
        .map((source) => source.sourceId),
    );

    expect(excludedSourceIds.size).toBeGreaterThan(0);
    expect(
      traitMapEvidenceFindingsV2.every(
        (finding) => !excludedSourceIds.has(finding.sourceId),
      ),
    ).toBe(true);
  });
});
