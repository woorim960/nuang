export const assessmentAgeAccessPolicies = [
  "all_ages",
  "adult_verification_required",
] as const;

export type AssessmentAgeAccessPolicy =
  (typeof assessmentAgeAccessPolicies)[number];

/**
 * Adult-only assessments stay authorable in the operations center, but the
 * beta public runtime does not expose them until a verified adult access flow
 * is implemented and reviewed.
 */
export const betaAdultAssessmentsEnabled = false;

export function canExposeAssessmentInBeta(policy: AssessmentAgeAccessPolicy) {
  return policy === "all_ages" || betaAdultAssessmentsEnabled;
}

export function requiresAdultVerification(policy: AssessmentAgeAccessPolicy) {
  return policy === "adult_verification_required";
}

export const assessmentAgeAccessCopy: Record<
  AssessmentAgeAccessPolicy,
  {
    label: string;
    lockedMessage: string | null;
  }
> = {
  all_ages: {
    label: "전 연령",
    lockedMessage: null,
  },
  adult_verification_required: {
    label: "19세 이상",
    lockedMessage: "이 검사는 성인 인증 후 이용할 수 있어요.",
  },
};
