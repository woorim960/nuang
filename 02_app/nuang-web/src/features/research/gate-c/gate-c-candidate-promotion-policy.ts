export const gateCCandidatePromotionPolicyVersion =
  "GATE-C-CANDIDATE-PROMOTION-POLICY-1.0";

export const gateCCandidatePromotionThresholds = {
  maximumConfusionFlagRate: 0.12,
  maximumResponseChangeRate: 0.2,
  maximumUnsureRate: 0.18,
  maximumWordingUnclearRate: 0.1,
  minimumMedianFirstAnswerMs: 800,
  minimumObservationCount: 80,
} as const;

export type GateCCandidatePromotionGate =
  | {
      blockers: string[];
      state: "not_candidate";
    }
  | {
      blockers: string[];
      state: "blocked";
    }
  | {
      blockers: [];
      state: "eligible_for_expert_review";
    };

export function evaluateGateCCandidatePromotion({
  confusionFlagRate,
  medianFirstAnswerMs,
  observationCount,
  responseChangeRate,
  sourceKind,
  unsureRate,
  wordingUnclearRate,
}: {
  confusionFlagRate: number;
  medianFirstAnswerMs: number | null;
  observationCount: number;
  responseChangeRate: number;
  sourceKind: string;
  unsureRate: number;
  wordingUnclearRate: number;
}): GateCCandidatePromotionGate {
  if (sourceKind !== "candidate") {
    return { blockers: [], state: "not_candidate" };
  }

  const blockers: string[] = [];
  if (
    observationCount <
    gateCCandidatePromotionThresholds.minimumObservationCount
  ) {
    blockers.push("NEED_PROMOTION_SAMPLE");
  }
  if (
    wordingUnclearRate >
    gateCCandidatePromotionThresholds.maximumWordingUnclearRate
  ) {
    blockers.push("WORDING_SIGNAL_TOO_HIGH");
  }
  if (
    confusionFlagRate >
    gateCCandidatePromotionThresholds.maximumConfusionFlagRate
  ) {
    blockers.push("CONFUSION_SIGNAL_TOO_HIGH");
  }
  if (unsureRate > gateCCandidatePromotionThresholds.maximumUnsureRate) {
    blockers.push("UNSURE_SIGNAL_TOO_HIGH");
  }
  if (
    responseChangeRate >
    gateCCandidatePromotionThresholds.maximumResponseChangeRate
  ) {
    blockers.push("RESPONSE_CHANGE_SIGNAL_TOO_HIGH");
  }
  if (
    medianFirstAnswerMs !== null &&
    medianFirstAnswerMs <
      gateCCandidatePromotionThresholds.minimumMedianFirstAnswerMs
  ) {
    blockers.push("RESPONSE_TIME_TOO_SHORT");
  }

  return blockers.length === 0
    ? { blockers: [], state: "eligible_for_expert_review" }
    : { blockers, state: "blocked" };
}
