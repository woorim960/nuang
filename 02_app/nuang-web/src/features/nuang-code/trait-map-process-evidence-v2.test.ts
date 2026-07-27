import { describe, expect, it } from "vitest";
import {
  traitMapEvidenceFindingSchema,
  traitMapEvidenceSourceSchema,
} from "@/features/nuang-code/trait-map-data-center-v2";
import {
  traitMapProcessEvidenceFindingsV2,
  traitMapProcessEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-process-evidence-v2";

describe("trait map process evidence v2", () => {
  it("validates every normalized process source and finding", () => {
    for (const source of traitMapProcessEvidenceSourcesV2) {
      expect(() => traitMapEvidenceSourceSchema.parse(source)).not.toThrow();
    }
    for (const finding of traitMapProcessEvidenceFindingsV2) {
      expect(() => traitMapEvidenceFindingSchema.parse(finding)).not.toThrow();
    }
  });

  it("uses unique source and finding identifiers", () => {
    expect(
      new Set(
        traitMapProcessEvidenceSourcesV2.map((source) => source.sourceId),
      ).size,
    ).toBe(traitMapProcessEvidenceSourcesV2.length);
    expect(
      new Set(
        traitMapProcessEvidenceFindingsV2.map((finding) => finding.findingId),
      ).size,
    ).toBe(traitMapProcessEvidenceFindingsV2.length);
  });

  it("keeps intention, thought, and behavior as non-equivalent layers", () => {
    const intentionFinding = traitMapProcessEvidenceFindingsV2.find(
      (finding) =>
        finding.findingId === "FND-INTENTION-BEHAVIOR-SEPARATION",
    );

    expect(intentionFinding?.direction).toBe("qualifies");
    expect(intentionFinding?.limitations.join(" ")).toContain(
      "처음 드는 생각",
    );
  });
});
