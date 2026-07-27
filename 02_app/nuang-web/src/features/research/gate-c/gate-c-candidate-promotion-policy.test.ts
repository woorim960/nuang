import { describe, expect, it } from "vitest";
import {
  evaluateGateCCandidatePromotion,
  gateCCandidatePromotionThresholds,
} from "@/features/research/gate-c/gate-c-candidate-promotion-policy";

const cleanCandidate = {
  confusionFlagRate: 0.05,
  medianFirstAnswerMs: 2400,
  observationCount: gateCCandidatePromotionThresholds.minimumObservationCount,
  responseChangeRate: 0.08,
  sourceKind: "candidate",
  unsureRate: 0.07,
  wordingUnclearRate: 0.04,
};

describe("Gate C candidate promotion policy", () => {
  it("only opens expert review after every quantitative gate passes", () => {
    expect(evaluateGateCCandidatePromotion(cleanCandidate)).toEqual({
      blockers: [],
      state: "eligible_for_expert_review",
    });
  });

  it("keeps low-sample or risky candidates blocked", () => {
    expect(
      evaluateGateCCandidatePromotion({
        ...cleanCandidate,
        observationCount: 20,
        wordingUnclearRate: 0.2,
      }),
    ).toEqual({
      blockers: ["NEED_PROMOTION_SAMPLE", "WORDING_SIGNAL_TOO_HIGH"],
      state: "blocked",
    });
  });

  it("never treats current customer items as promotion candidates", () => {
    expect(
      evaluateGateCCandidatePromotion({
        ...cleanCandidate,
        sourceKind: "quick_current",
      }),
    ).toEqual({ blockers: [], state: "not_candidate" });
  });
});
