import { describe, expect, it } from "vitest";
import {
  assessmentQualityObservationSchema,
  classifyAssessmentQualityPriority,
} from "./assessment-quality-observation";

describe("assessment quality observation", () => {
  it("accepts only bucketed, privacy-minimized item telemetry", () => {
    const parsed = assessmentQualityObservationSchema.parse({
      assessmentSlug: "comfort-style",
      clientSessionId: "2d889f49-efb8-4ee3-8ab3-8a0cc12e45c4",
      instrumentVersion: "comfort-style-v3",
      observations: [
        {
          dwellBucket: "10_to_30s",
          kind: "item_experience",
          questionId: "cs-01",
          response: "wording_unclear",
          revisionBucket: "once",
        },
      ],
      submissionId: "96287373-660c-4039-a0e8-494f76b52d7f",
    });
    expect(parsed.observations).toHaveLength(1);
    expect(JSON.stringify(parsed)).not.toContain("milliseconds");
  });

  it("prioritizes unclear wording and poor result fit", () => {
    expect(
      classifyAssessmentQualityPriority({
        dwellBucket: "3_to_10s",
        kind: "item_experience",
        questionId: "q1",
        response: "wording_unclear",
        revisionBucket: "none",
      }),
    ).toBe("high");
    expect(
      classifyAssessmentQualityPriority({
        fit: "low",
        kind: "result_fit",
      }),
    ).toBe("high");
  });
});
