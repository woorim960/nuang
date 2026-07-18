import { describe, expect, it } from "vitest";
import {
  candidateFullCoreAssessment,
  candidateFullScoringRelease,
} from "@/features/assessment/candidate-full-core-seed";
import { calculateCoreScore } from "@/lib/scoring/core";

describe("candidate full core product binding", () => {
  it("stores the candidate 60-item release as the real full assessment flow", () => {
    expect(candidateFullCoreAssessment.assessmentId).toBe("nu-core-full");
    expect(candidateFullCoreAssessment.items).toHaveLength(60);
    expect(candidateFullScoringRelease.assessmentReleaseId).toBe(
      candidateFullCoreAssessment.releaseId,
    );

    const result = calculateCoreScore(
      candidateFullScoringRelease,
      candidateFullCoreAssessment.items.map((item) => ({
        itemId: item.itemId,
        value: item.isReverse ? 1 : 5,
      })),
    );

    expect(result.code).toBe("ENAKQ");
    expect(result.profileName).toBe("관계를 여는 지휘자");
  });
});
