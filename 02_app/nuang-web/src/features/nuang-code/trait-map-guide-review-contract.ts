export const traitMapGuideReviewContractVersion =
  "nuang-trait-map-guide-sentence-review.v2" as const;

export const traitMapGuideBetaReleaseId =
  "nuang-trait-map-guide-beta-ai-2026-08-06-v4" as const;

export const traitMapGuideReviewRoles = [
  "personality_psychologist",
  "psychometrician",
  "research_methodologist",
  "korean_plain_language_editor",
  "safety_privacy_reviewer",
  "product_content_designer",
  "data_quality_engineer",
] as const;

export type TraitMapGuideReviewRole = (typeof traitMapGuideReviewRoles)[number];

export const traitMapGuideReviewRoleCopy: Readonly<
  Record<TraitMapGuideReviewRole, Readonly<{ label: string; purpose: string }>>
> = {
  data_quality_engineer: {
    label: "데이터 품질",
    purpose: "문장 위치·버전·해시·근거 연결과 전체 재고 누락을 확인해요.",
  },
  korean_plain_language_editor: {
    label: "쉬운 한국어",
    purpose: "배경지식 없이 한 번 읽고 이해할 수 있는 일상 문장인지 확인해요.",
  },
  personality_psychologist: {
    label: "성격심리",
    purpose:
      "다섯 성향 방향과 설명이 맞고 고정된 정체성처럼 단정하지 않는지 확인해요.",
  },
  product_content_designer: {
    label: "제품 콘텐츠",
    purpose:
      "현재 장과 화면에서 필요한 설명인지, 반복과 훈계가 없는지 확인해요.",
  },
  psychometrician: {
    label: "성향검사 범위",
    purpose: "검사 응답을 넘어 능력·성과·관계 결과를 예측하지 않는지 확인해요.",
  },
  research_methodologist: {
    label: "연구 방법",
    purpose:
      "주장 범위와 근거 묶음이 맞고, 실제 검증보다 강하게 말하지 않는지 확인해요.",
  },
  safety_privacy_reviewer: {
    label: "안전·개인정보",
    purpose: "진단·낙인·우열·상대 속마음·민감정보 추론이 없는지 확인해요.",
  },
};

export const traitMapGuideReviewUnitKinds = [
  "hero_summary",
  "chapter_title",
  "chapter_summary",
  "check_question",
  "section_title",
  "paragraph_sentence",
  "reference_title",
  "reference_description",
] as const;

export type TraitMapGuideReviewUnitKind =
  (typeof traitMapGuideReviewUnitKinds)[number];

export const traitMapBetaInterpretationNotice = {
  description:
    "이 지도는 검사에서 확인한 다섯 가지 응답 방향을 일상 장면에 연결한 베타 안내예요. 능력이나 관계의 결과를 예측하지 않으며, 맞지 않는 설명은 내 실제 경험을 기준으로 건너뛰어도 돼요.",
  title: "성향지도를 읽기 전에",
} as const;
