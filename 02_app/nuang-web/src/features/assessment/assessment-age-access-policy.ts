export const assessmentAgeAccessPolicies = [
  "all_ages",
  "adult_verification_required",
] as const;

export type AssessmentAgeAccessPolicy =
  (typeof assessmentAgeAccessPolicies)[number];

export function requiresAdultVerification(
  policy: AssessmentAgeAccessPolicy,
) {
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
