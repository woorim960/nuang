import { describe, expect, it } from "vitest";
import {
  candidateFullCoreAssessment,
  candidateFullScoringRelease,
} from "@/features/assessment/candidate-full-core-seed";
import {
  candidateQuickCoreAssessment,
  candidateQuickScoringRelease,
} from "@/features/assessment/candidate-quick-core-seed";
import {
  fullCoreAssessment,
  fullScoringRelease,
} from "@/features/assessment/full-core-seed";
import { getScoringReleaseForAttempt } from "@/features/assessment/local-attempt-score";

describe("getScoringReleaseForAttempt", () => {
  it("keeps the current full release separate from the retired release with the same assessment id", () => {
    expect(getScoringReleaseForAttempt(candidateFullCoreAssessment)).toBe(
      candidateFullScoringRelease,
    );
    expect(getScoringReleaseForAttempt(fullCoreAssessment)).toBe(
      fullScoringRelease,
    );
  });

  it("uses the current quick release for current quick attempts", () => {
    expect(getScoringReleaseForAttempt(candidateQuickCoreAssessment)).toBe(
      candidateQuickScoringRelease,
    );
  });

  it("does not guess a scoring model for an unknown release", () => {
    expect(
      getScoringReleaseForAttempt({
        ...candidateFullCoreAssessment,
        releaseId: "UNKNOWN-RELEASE",
      }),
    ).toBeNull();
  });
});
