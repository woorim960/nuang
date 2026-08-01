import { describe, expect, it } from "vitest";
import { coreResultFeedbackWriteSchema } from "./core-result-feedback-contract";

describe("core result feedback contract", () => {
  const valid = {
    contentKey: "guide.ENAKQ.strength_and_growth",
    contentVersion: "ENAKQ-CUSTOMER-GUIDE-2.0",
    reason: "context_differs",
    resultReportId: "11111111-1111-4111-8111-111111111111",
    sectionId: "strength_and_overuse",
    sentiment: "depends",
    surface: "my",
  } as const;

  it("accepts exact result and content version identifiers", () => {
    expect(coreResultFeedbackWriteSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects client-supplied profile codes and unknown response values", () => {
    expect(
      coreResultFeedbackWriteSchema.safeParse({
        ...valid,
        profileCode: "ENAKQ",
      }).success,
    ).toBe(false);
    expect(
      coreResultFeedbackWriteSchema.safeParse({
        ...valid,
        sentiment: "perfect",
      }).success,
    ).toBe(false);
  });
});
