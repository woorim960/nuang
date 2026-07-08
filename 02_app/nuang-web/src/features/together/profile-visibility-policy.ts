export const profileVisibilityFieldIds = [
  "display_profile",
  "representative_profile",
  "core_domain_map",
  "core_facet_summary",
  "quick_core_result",
  "lab_results",
  "direct_responses",
  "raw_scores",
  "sensitive_assessments",
  "crisis_help_interactions",
  "demographics",
  "account_identity",
] as const;

export type ProfileVisibilityLevel = "public" | "limited" | "private";

export type ProfileFieldSensitivity = "basic" | "core" | "personal" | "sensitive";

export type ProfileComparisonUse = "allowed" | "hidden" | "blocked";

export type ProfileVisibilityFieldId = (typeof profileVisibilityFieldIds)[number];

export type ProfileVisibilityRule = {
  comparisonUse: ProfileComparisonUse;
  defaultVisibility: ProfileVisibilityLevel;
  fieldId: ProfileVisibilityFieldId;
  label: string;
  sensitivity: ProfileFieldSensitivity;
};

export const oneToOneComparisonPolicy = {
  canCompareWithoutCounterpartyApproval: true,
  defaultTargetAccess: "published_profile_scope",
  description:
    "1:1 비교는 상대가 미리 공개한 프로필 범위 안에서 바로 열고, 비공개 항목은 추정하지 않는다.",
  privateInferenceAllowed: false,
  requiresCounterpartyApproval: false,
  requiresTargetPublicSnapshot: true,
  requiresViewerFullCore: true,
} as const;

export const profileVisibilityPolicyVersion = "profile-visibility.v0.1";

export const profileVisibilityRules: ReadonlyArray<ProfileVisibilityRule> = [
  {
    comparisonUse: "allowed",
    defaultVisibility: "public",
    fieldId: "display_profile",
    label: "기본 프로필",
    sensitivity: "basic",
  },
  {
    comparisonUse: "allowed",
    defaultVisibility: "public",
    fieldId: "representative_profile",
    label: "대표 성향",
    sensitivity: "core",
  },
  {
    comparisonUse: "allowed",
    defaultVisibility: "public",
    fieldId: "core_domain_map",
    label: "성향지도 5영역",
    sensitivity: "core",
  },
  {
    comparisonUse: "allowed",
    defaultVisibility: "public",
    fieldId: "core_facet_summary",
    label: "10개 세부 성향 요약",
    sensitivity: "core",
  },
  {
    comparisonUse: "hidden",
    defaultVisibility: "private",
    fieldId: "quick_core_result",
    label: "빠른 코어 예비 결과",
    sensitivity: "core",
  },
  {
    comparisonUse: "hidden",
    defaultVisibility: "private",
    fieldId: "lab_results",
    label: "별난 성향 연구소 결과",
    sensitivity: "personal",
  },
  {
    comparisonUse: "blocked",
    defaultVisibility: "private",
    fieldId: "direct_responses",
    label: "직접 문항 응답",
    sensitivity: "sensitive",
  },
  {
    comparisonUse: "blocked",
    defaultVisibility: "private",
    fieldId: "raw_scores",
    label: "원점수와 전체 점수 벡터",
    sensitivity: "sensitive",
  },
  {
    comparisonUse: "blocked",
    defaultVisibility: "private",
    fieldId: "sensitive_assessments",
    label: "위기·치료·성적 지향·약물 등 민감 검사",
    sensitivity: "sensitive",
  },
  {
    comparisonUse: "blocked",
    defaultVisibility: "private",
    fieldId: "crisis_help_interactions",
    label: "도움 연결·위기 관련 이용 기록",
    sensitivity: "sensitive",
  },
  {
    comparisonUse: "hidden",
    defaultVisibility: "private",
    fieldId: "demographics",
    label: "연령대 등 인구통계",
    sensitivity: "personal",
  },
  {
    comparisonUse: "blocked",
    defaultVisibility: "private",
    fieldId: "account_identity",
    label: "계정 식별 정보",
    sensitivity: "sensitive",
  },
];

export const togetherSafetyLines = [
  "상대가 공개한 범위 안에서 바로 비교",
  "직접 응답·원점수 미공개",
  "민감 항목 기본 비공개",
  "궁합 점수 없음",
] as const;

export function getProfileVisibilityRule(fieldId: ProfileVisibilityFieldId) {
  return profileVisibilityRules.find((rule) => rule.fieldId === fieldId);
}

export function isComparableByDefault(fieldId: ProfileVisibilityFieldId) {
  const rule = getProfileVisibilityRule(fieldId);

  return rule?.defaultVisibility === "public" && rule.comparisonUse === "allowed";
}

export function listDefaultComparableFields() {
  return profileVisibilityRules.filter((rule) => isComparableByDefault(rule.fieldId));
}

export function listPrivateOrBlockedFields() {
  return profileVisibilityRules.filter(
    (rule) =>
      rule.defaultVisibility === "private" || rule.comparisonUse === "blocked",
  );
}

export function createDefaultProfileVisibilitySettings() {
  return profileVisibilityRules.map((rule) => ({
    comparisonUse: rule.comparisonUse,
    fieldId: rule.fieldId,
    visibility: rule.defaultVisibility,
  }));
}
