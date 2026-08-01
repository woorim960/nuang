import { describe, expect, it } from "vitest";
import {
  bucketAssessmentDwell,
  bucketAssessmentRevisions,
} from "./assessment-quality-client";

describe("assessment quality client buckets", () => {
  it("discards raw dwell precision into four bounded buckets", () => {
    expect(bucketAssessmentDwell(2_999)).toBe("under_3s");
    expect(bucketAssessmentDwell(3_000)).toBe("3_to_10s");
    expect(bucketAssessmentDwell(10_000)).toBe("10_to_30s");
    expect(bucketAssessmentDwell(30_000)).toBe("over_30s");
  });

  it("keeps only a coarse revision count", () => {
    expect(bucketAssessmentRevisions(0)).toBe("none");
    expect(bucketAssessmentRevisions(1)).toBe("once");
    expect(bucketAssessmentRevisions(7)).toBe("multiple");
  });
});
