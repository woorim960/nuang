import { openFreeTopicAssessments } from "@/features/assessment/free-topic-assessments";
import type { AssessmentAgeAccessPolicy } from "@/features/assessment/assessment-age-access-policy";
import {
  assessmentExperienceSections,
  type AssessmentExperienceSectionId,
} from "@/features/assessment/assessment-experience-sections";
import { labAssessments } from "@/features/lab/lab-assessments";

export type AssessmentHubFilter = "recommended" | AssessmentExperienceSectionId;

export type AssessmentLifecycle =
  | "draft"
  | "internal_review"
  | "research_only"
  | "pilot"
  | "validated"
  | "released"
  | "retired";

export type AssessmentPublicationStatus =
  "draft" | "ready" | "published" | "paused";

export type AssessmentIntendedUse =
  "play" | "self_reflection" | "trait_estimation" | "screening";

export type AssessmentIconKey =
  "battery" | "compare" | "conversation" | "repair";

export type AssessmentCatalogItem = {
  accent: "violet" | "teal" | "rose" | "sand" | "blue";
  ageAccessPolicy: AssessmentAgeAccessPolicy;
  caption: string;
  estimatedMinutes: number;
  href: string;
  iconKey: AssessmentIconKey;
  id: string;
  intendedUse: AssessmentIntendedUse;
  kind: "topic" | "together" | "playful";
  lifecycle: AssessmentLifecycle;
  publicationStatus: AssessmentPublicationStatus;
  privacyPolicy: "private" | "summary_shareable" | "invite_only";
  resultPolicy: "result_only" | "play_only" | "invite_only";
  sensitivity: "general" | "caution";
  themes: AssessmentHubFilter[];
  title: string;
};

export const assessmentHubFilters: Array<{
  id: AssessmentHubFilter;
  label: string;
}> = [{ id: "recommended", label: "추천" }, ...assessmentExperienceSections];

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

const publicTopicLifecycle: Readonly<
  Partial<Record<string, Extract<AssessmentLifecycle, "pilot" | "released">>>
> = {
  "apology-style": "pilot",
  "comfort-style": "released",
  "focus-switch": "pilot",
  "hurt-expression": "pilot",
  "organizing-style": "pilot",
  "recharge-routine": "pilot",
};

export const topicAssessmentCatalog: AssessmentCatalogItem[] =
  openFreeTopicAssessments.map((assessment) => {
    const publicLifecycle = publicTopicLifecycle[assessment.slug];

    return {
      accent: accentByTopicSlug[assessment.slug] ?? "violet",
      ageAccessPolicy: "all_ages",
      caption: assessment.caption,
      estimatedMinutes: assessment.estimatedMinutes,
      href: `/assessments/topics/${assessment.slug}`,
      iconKey: getTopicIconKey(assessment.slug),
      id: `topic:${assessment.slug}`,
      intendedUse: "self_reflection",
      kind: "topic",
      lifecycle: publicLifecycle ?? "research_only",
      publicationStatus: publicLifecycle ? "published" : "paused",
      privacyPolicy: "private",
      resultPolicy: "result_only",
      sensitivity:
        assessment.slug === "conflict-repair" ? "caution" : "general",
      themes: ["self"],
      title: getCustomerTitle(assessment.slug, assessment.title),
    };
  });

export const togetherAssessmentCatalog: AssessmentCatalogItem[] = [
  {
    accent: "violet",
    ageAccessPolicy: "all_ages",
    caption: "같은 질문을 고르고 둘만의 결과와 모임 전체의 취향 궁합을 확인해요.",
    estimatedMinutes: 2,
    href: "/assessments/together/balance-game",
    iconKey: "compare",
    id: "together:balance-game",
    intendedUse: "play",
    kind: "together",
    lifecycle: "released",
    publicationStatus: "published",
    privacyPolicy: "invite_only",
    resultPolicy: "invite_only",
    sensitivity: "general",
    themes: ["together"],
    title: "밸런스 게임",
  },
  {
    accent: "teal",
    ageAccessPolicy: "all_ages",
    caption: "내가 보는 친구의 모습과 친구가 직접 답한 모습을 비교해요.",
    estimatedMinutes: 3,
    href: "/assessments/friend-match",
    iconKey: "compare",
    id: "together:friend-match",
    intendedUse: "play",
    kind: "together",
    lifecycle: "released",
    publicationStatus: "published",
    privacyPolicy: "invite_only",
    resultPolicy: "invite_only",
    sensitivity: "general",
    themes: ["together"],
    title: "친구 성향 맞히기",
  },
];

export const labAssessmentCatalog: AssessmentCatalogItem[] = labAssessments.map(
  (assessment) => ({
    accent: "sand",
    ageAccessPolicy: assessment.ageAccessPolicy,
    caption: getLabHubCopy(assessment.slug).caption,
    estimatedMinutes: assessment.estimatedMinutes,
    href: `/labs/${assessment.slug}`,
    iconKey: getLabHubCopy(assessment.slug).iconKey,
    id: `lab:${assessment.slug}`,
    intendedUse: "play",
    kind: "playful",
    lifecycle: "pilot",
    publicationStatus: "published",
    privacyPolicy: "private",
    resultPolicy: "play_only",
    sensitivity: assessment.sensitivity === "S2" ? "caution" : "general",
    themes: ["lab"],
    title: getLabHubCopy(assessment.slug).title,
  }),
);

export const assessmentCatalog: AssessmentCatalogItem[] = [
  ...topicAssessmentCatalog,
  ...togetherAssessmentCatalog,
  ...labAssessmentCatalog,
];

export const publishedAssessmentCatalog = assessmentCatalog.filter(
  (assessment) => assessment.publicationStatus === "published",
);

const recommendedIds = [
  "topic:comfort-style",
  "lab:recharge-ritual",
  "together:balance-game",
] as const;

export const recommendedAssessmentCatalog = recommendedIds
  .map((id) =>
    publishedAssessmentCatalog.find((assessment) => assessment.id === id),
  )
  .filter((assessment): assessment is AssessmentCatalogItem =>
    Boolean(assessment),
  );

export function isAssessmentPublished(item: AssessmentCatalogItem) {
  return item.publicationStatus === "published";
}

export function isTopicAssessmentPublished(slug: string) {
  return (
    topicAssessmentCatalog.find(
      (assessment) => assessment.id === `topic:${slug}`,
    )?.publicationStatus === "published"
  );
}

export function canAccessTopicAssessmentRoute(slug: string) {
  if (process.env.NODE_ENV !== "production") {
    return topicAssessmentCatalog.some(
      (assessment) => assessment.id === `topic:${slug}`,
    );
  }

  return isTopicAssessmentPublished(slug);
}

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

function getTopicIconKey(slug: string): AssessmentIconKey {
  if (slug === "recharge-routine") return "battery";
  if (slug === "conflict-repair") return "repair";
  return "conversation";
}

function getLabHubCopy(slug: string): {
  caption: string;
  iconKey: AssessmentIconKey;
  title: string;
} {
  const copy: Record<
    string,
    { caption: string; iconKey: AssessmentIconKey; title: string }
  > = {
    "conflict-repair": {
      caption: "부딪힌 뒤 내가 관계를 풀어가는 방식",
      iconKey: "repair",
      title: "싸운 뒤, 나는 어떻게 풀까?",
    },
    "conversation-temperature": {
      caption: "중요한 말을 꺼내는 나만의 타이밍",
      iconKey: "conversation",
      title: "말할까, 기다릴까, 정리할까?",
    },
    "recharge-ritual": {
      caption: "지친 나를 다시 움직이게 하는 방법",
      iconKey: "battery",
      title: "나는 왜 쉬어도 안 풀릴까?",
    },
  };

  return (
    copy[slug] ?? {
      caption: "생활 속 의외의 내 모습을 가볍게 살펴봐요.",
      iconKey: "conversation",
      title: "내 안의 뜻밖의 모습",
    }
  );
}
