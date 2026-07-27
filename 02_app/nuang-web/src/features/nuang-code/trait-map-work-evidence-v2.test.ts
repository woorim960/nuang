import { describe, expect, it } from "vitest";
import {
  traitMapEvidenceFindingSchema,
  traitMapEvidenceSourceSchema,
} from "@/features/nuang-code/trait-map-data-center-v2";
import {
  traitMapWorkEvidenceFindingsV2,
  traitMapWorkEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-work-evidence-v2";

describe("trait map work evidence v2", () => {
  it("validates all work sources and findings", () => {
    for (const source of traitMapWorkEvidenceSourcesV2) {
      expect(() => traitMapEvidenceSourceSchema.parse(source)).not.toThrow();
    }
    for (const finding of traitMapWorkEvidenceFindingsV2) {
      expect(() => traitMapEvidenceFindingSchema.parse(finding)).not.toThrow();
    }
  });

  it("never treats adjacent Big Five research as direct Nuang job validity", () => {
    expect(
      traitMapWorkEvidenceSourcesV2.map((source) =>
        String(source.quality.directness),
      ),
    ).not.toContain("direct");
    expect(
      traitMapWorkEvidenceFindingsV2.every(
        (finding) =>
          finding.direction === "qualifies" ||
          finding.direction === "method_only",
      ),
    ).toBe(true);
  });

  it("keeps K distinct from Big Five conscientiousness", () => {
    const boundary = traitMapWorkEvidenceFindingsV2.find(
      (finding) =>
        finding.findingId === "FND-WORK-PERFORMANCE-CONSTRUCT-BOUNDARY",
    );

    expect(boundary?.limitations.join(" ")).toContain(
      "뉴앙 K는 Big Five 성실성 전체와 같지 않",
    );
  });
});
