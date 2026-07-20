import { describe, expect, it } from "vitest";
import {
  enakqExpertReviewProtocolVersion,
  enakqExpertReviewResponseSchema,
} from "@/features/nuang-code/enakq-expert-review-contract";

function createResponse() {
  return {
    claimId: "ENAKQ.general.definition.E",
    conflictOfInterest: false,
    constructFitRating: 4,
    decision: "accept",
    evidenceFitRating: 4,
    inferenceScopeRating: 4,
    languageSafetyRating: 4,
    protocolVersion: enakqExpertReviewProtocolVersion,
    rationale: "현재 정의와 근거 범위가 일치합니다.",
    requiredRevision: "",
    reviewerConfidence: "high",
    reviewerId: "PP01",
    reviewerRole: "personality_psychology",
    riskFlags: ["none"],
  } as const;
}

describe("ENAKQ expert review response contract", () => {
  it("accepts a complete expert response", () => {
    expect(
      enakqExpertReviewResponseSchema.safeParse(createResponse()).success,
    ).toBe(true);
  });

  it("requires a concrete revision when the decision is revise", () => {
    const result = enakqExpertReviewResponseSchema.safeParse({
      ...createResponse(),
      decision: "revise",
      rationale: "표현 범위를 줄여야 합니다.",
    });

    expect(result.success).toBe(false);
  });

  it("does not allow accept when a risk is recorded", () => {
    const result = enakqExpertReviewResponseSchema.safeParse({
      ...createResponse(),
      riskFlags: ["unmeasured_inference"],
    });

    expect(result.success).toBe(false);
  });

  it("does not mix none with another risk flag", () => {
    const result = enakqExpertReviewResponseSchema.safeParse({
      ...createResponse(),
      decision: "revise",
      requiredRevision: "측정되지 않은 추론을 제거합니다.",
      riskFlags: ["none", "unmeasured_inference"],
    });

    expect(result.success).toBe(false);
  });
});
