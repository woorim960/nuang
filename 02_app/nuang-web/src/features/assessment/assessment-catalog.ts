import { openFreeTopicAssessments } from "@/features/assessment/free-topic-assessments";
import { labAssessments } from "@/features/lab/lab-assessments";

export type AssessmentHubFilter =
  "recommended" | "self" | "relationship" | "emotion" | "together" | "lab";

export type AssessmentCatalogItem = {
  accent: "violet" | "teal" | "rose" | "sand" | "blue";
  caption: string;
  estimatedMinutes: number;
  href: string;
  id: string;
  kind: "topic" | "together" | "playful";
  privacyPolicy: "private" | "summary_shareable" | "invite_only";
  resultPolicy: "result_only" | "play_only" | "invite_only";
  sensitivity: "general" | "caution";
  themes: AssessmentHubFilter[];
  title: string;
  validationState: "pilot" | "reviewed" | "released";
};

export const assessmentHubFilters: Array<{
  id: AssessmentHubFilter;
  label: string;
}> = [
  { id: "recommended", label: "추천" },
  { id: "self", label: "나 자신" },
  { id: "relationship", label: "관계" },
  { id: "emotion", label: "감정·회복" },
  { id: "together", label: "친구와" },
  { id: "lab", label: "별난 연구소" },
];

const accentByTopicSlug: Record<string, AssessmentCatalogItem["accent"]> = {
  "apology-style": "teal",
  "comfort-style": "rose",
  "conflict-repair": "teal",
  "conversation-temperature": "violet",
  "distance-rhythm": "blue",
  "focus-switch": "blue",
  "hurt-expression": "rose",
  "mood-shift": "rose",
  "organizing-style": "sand",
  "recharge-routine": "sand",
};

function getTopicThemes(categoryId: string): AssessmentHubFilter[] {
  if (categoryId === "relationship") return ["relationship"];
  if (categoryId === "emotion") return ["self", "emotion"];
  return ["self"];
}

export const topicAssessmentCatalog: AssessmentCatalogItem[] =
  openFreeTopicAssessments.map((assessment) => ({
    accent: accentByTopicSlug[assessment.slug] ?? "violet",
    caption: assessment.caption,
    estimatedMinutes: assessment.estimatedMinutes,
    href: `/assessments/topics/${assessment.slug}`,
    id: `topic:${assessment.slug}`,
    kind: "topic",
    privacyPolicy: "private",
    resultPolicy: "result_only",
    sensitivity: assessment.slug === "conflict-repair" ? "caution" : "general",
    themes: getTopicThemes(assessment.categoryId),
    title: getCustomerTitle(assessment.slug, assessment.title),
    validationState: "pilot",
  }));

export const togetherAssessmentCatalog: AssessmentCatalogItem[] = [
  {
    accent: "teal",
    caption: "내가 보는 친구의 모습과 친구가 직접 답한 모습을 비교해요.",
    estimatedMinutes: 3,
    href: "/assessments/friend-match",
    id: "together:friend-match",
    kind: "together",
    privacyPolicy: "invite_only",
    resultPolicy: "invite_only",
    sensitivity: "general",
    themes: ["together", "relationship"],
    title: "친구 성향 맞히기",
    validationState: "released",
  },
];

export const labAssessmentCatalog: AssessmentCatalogItem[] = labAssessments.map(
  (assessment) => ({
    accent: "sand",
    caption: assessment.caption,
    estimatedMinutes: assessment.estimatedMinutes,
    href: `/labs/${assessment.slug}`,
    id: `lab:${assessment.slug}`,
    kind: "playful",
    privacyPolicy: "private",
    resultPolicy: "play_only",
    sensitivity: assessment.sensitivity === "S2" ? "caution" : "general",
    themes: ["lab"],
    title: assessment.cardTitle,
    validationState: "reviewed",
  }),
);

export const assessmentCatalog: AssessmentCatalogItem[] = [
  ...topicAssessmentCatalog,
  ...togetherAssessmentCatalog,
  ...labAssessmentCatalog,
];

const recommendedIds = [
  "topic:apology-style",
  "topic:comfort-style",
  "topic:recharge-routine",
] as const;

export const recommendedAssessmentCatalog = recommendedIds
  .map((id) => assessmentCatalog.find((assessment) => assessment.id === id))
  .filter((assessment): assessment is AssessmentCatalogItem =>
    Boolean(assessment),
  );

function getCustomerTitle(slug: string, fallback: string) {
  const titles: Record<string, string> = {
    "conversation-temperature": "말을 꺼내는 방식",
    "distance-rhythm": "가까움과 혼자 있는 시간",
    "conflict-repair": "갈등 뒤 다시 대화하는 방식",
    "recharge-routine": "지친 뒤 쉬는 방식",
    "mood-shift": "마음이 복잡할 때 바꾸는 방식",
  };

  return titles[slug] ?? fallback;
}
