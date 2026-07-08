import { describe, expect, it } from "vitest";
import {
  quickCoreAssessment,
  quickScoringRelease,
  responseOptions,
} from "@/features/assessment/quick-core-seed";

describe("quick core seed", () => {
  it("contains 20 interleaved quick items and 5 response choices", () => {
    expect(quickCoreAssessment.items).toHaveLength(20);
    expect(responseOptions).toHaveLength(5);
    expect(quickCoreAssessment.items[0].itemId).toBe("NU-C17-SERE-01");
    expect(quickCoreAssessment.items[1].domainId).toBe("ER");
  });

  it("contains 10 facets, 5 domains, and 32 profile names", () => {
    expect(quickScoringRelease.facets).toHaveLength(10);
    expect(quickScoringRelease.domains).toHaveLength(5);
    expect(Object.keys(quickScoringRelease.profileNames)).toHaveLength(32);
  });
});
