import { describe, expect, it } from "vitest";
import {
  traitMapEvidenceFindingSchema,
  traitMapEvidenceSourceSchema,
} from "@/features/nuang-code/trait-map-data-center-v2";
import {
  traitMapChangeContextEvidenceFindingsV2,
  traitMapChangeContextEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-change-context-evidence-v2";

describe("trait map change and context evidence v2", () => {
  it("validates all sources and findings", () => {
    for (const source of traitMapChangeContextEvidenceSourcesV2) {
      expect(() => traitMapEvidenceSourceSchema.parse(source)).not.toThrow();
    }
    for (const finding of traitMapChangeContextEvidenceFindingsV2) {
      expect(() => traitMapEvidenceFindingSchema.parse(finding)).not.toThrow();
    }
  });

  it("separates temporary stress states from representative code", () => {
    const stressFindings = traitMapChangeContextEvidenceFindingsV2.filter(
      (finding) => finding.findingId.includes("STRESS"),
    );

    expect(stressFindings).toHaveLength(2);
    expect(
      stressFindings.every(
        (finding) => {
          const constructRefs: readonly string[] = finding.constructRefs;
          return (
            constructRefs.includes("personality_state") ||
            constructRefs.includes("momentary_personality_expression")
          );
        },
      ),
    ).toBe(true);
  });

  it("does not promise that Nuang microcopy changes personality", () => {
    const interventionFindings =
      traitMapChangeContextEvidenceFindingsV2.filter(
        (finding) =>
          finding.findingId.includes("DIGITAL-CHANGE") ||
          finding.findingId.includes("INTERVENTION"),
      );

    expect(
      interventionFindings.every((finding) =>
        finding.limitations.some(
          (limitation) =>
            limitation.includes("뉴앙") &&
            (limitation.includes("약속") ||
              limitation.includes("말하지 않") ||
              limitation.includes("근거가 아니")),
        ),
      ),
    ).toBe(true);
  });
});
