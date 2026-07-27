import { describe, expect, it } from "vitest";
import {
  traitMapEvidenceFindingSchema,
  traitMapEvidenceSourceSchema,
} from "@/features/nuang-code/trait-map-data-center-v2";
import {
  traitMapFriendshipEvidenceFindingsV2,
  traitMapFriendshipEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-friendship-evidence-v2";

describe("trait map friendship evidence v2", () => {
  it("validates all friendship sources and findings", () => {
    for (const source of traitMapFriendshipEvidenceSourcesV2) {
      expect(() => traitMapEvidenceSourceSchema.parse(source)).not.toThrow();
    }
    for (const finding of traitMapFriendshipEvidenceFindingsV2) {
      expect(() => traitMapEvidenceFindingSchema.parse(finding)).not.toThrow();
    }
  });

  it("does not turn personality similarity into friendship compatibility", () => {
    const similarityFindings = traitMapFriendshipEvidenceFindingsV2.filter(
      (finding) => finding.findingId.includes("SIMILARITY"),
    );

    expect(similarityFindings).toHaveLength(2);
    expect(
      similarityFindings.every(
        (finding) => finding.direction === "null_finding",
      ),
    ).toBe(true);
  });
});
