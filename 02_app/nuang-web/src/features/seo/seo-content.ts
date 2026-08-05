import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/features/seo/site-config";

type SeoContentDefinition = Readonly<{
  description: string;
  image?: string;
  imageAlt?: string;
  title: string;
}>;

const topicSeoContent: Readonly<Record<string, SeoContentDefinition>> = {
  "apology-style": {
    title: "사과 유형 테스트",
    description:
      "잘못을 인정할 때, 상대의 마음을 들을 때, 다음 행동을 정할 때의 모습을 살펴보는 무료 사과 유형 테스트예요.",
    image: "/images/share/nuang-result-share-topic-v2.png",
    imageAlt: "뉴앙 사과 유형 테스트 결과 리포트",
  },
  "comfort-style": {
    title: "위로 방식 테스트",
    description:
      "힘든 순간 내가 원하는 말과 도움을 알아보는 무료 위로 방식 테스트예요. 가까운 사람과 필요한 위로를 나눠보세요.",
    image: "/images/share/nuang-result-share-topic-v2.png",
    imageAlt: "뉴앙 위로 방식 테스트 결과 리포트",
  },
  "focus-switch": {
    title: "집중 유형 테스트",
    description:
      "집중이 끊겼을 때 다시 시작하는 나만의 방법을 알아보는 무료 집중 유형 테스트예요.",
    image: "/images/share/nuang-result-share-topic-v2.png",
    imageAlt: "뉴앙 집중 유형 테스트 결과 리포트",
  },
  "hurt-expression": {
    title: "서운함 표현 테스트",
    description:
      "서운한 마음이 생겼을 때 말하고 기다리고 풀어가는 방식을 알아보는 무료 감정 표현 테스트예요.",
    image: "/images/share/nuang-result-share-topic-v2.png",
    imageAlt: "뉴앙 서운함 표현 테스트 결과 리포트",
  },
  "organizing-style": {
    title: "정리 습관 테스트",
    description:
      "물건과 할 일을 정리하는 생활 속 모습을 통해 나에게 편한 방식을 알아보는 무료 정리 습관 테스트예요.",
    image: "/images/share/nuang-result-share-topic-v2.png",
    imageAlt: "뉴앙 정리 습관 테스트 결과 리포트",
  },
  "recharge-routine": {
    title: "휴식 유형 테스트",
    description:
      "지쳤을 때 혼자 쉬기, 감각 바꾸기, 사람과 함께하기 중 무엇이 필요한지 알아보는 무료 휴식 유형 테스트예요.",
    image: "/images/share/nuang-result-share-topic-v2.png",
    imageAlt: "뉴앙 휴식 유형 테스트 결과 리포트",
  },
};

const labSeoContent: Readonly<Record<string, SeoContentDefinition>> = {
  "conflict-repair": {
    title: "싸운 뒤 화해 방식 테스트",
    description:
      "친구나 연인과 다툰 뒤 내가 관계를 다시 풀어가는 방식을 가볍게 알아보는 무료 성향 테스트예요.",
    image: "/images/share/nuang-result-share-lab-v2.png",
    imageAlt: "뉴앙 화해 방식 테스트 결과",
  },
  "conversation-temperature": {
    title: "대화 스타일 테스트",
    description:
      "중요한 이야기가 생겼을 때 바로 말할지, 기다릴지, 정리한 뒤 말할지 알아보는 무료 대화 스타일 테스트예요.",
    image: "/images/share/nuang-result-share-lab-v2.png",
    imageAlt: "뉴앙 대화 스타일 테스트 결과",
  },
  "recharge-ritual": {
    title: "나에게 맞는 휴식 테스트",
    description:
      "쉬어도 풀리지 않을 때 혼자 있기, 감각 바꾸기, 함께하기 중 나에게 맞는 회복 방식을 찾아보세요.",
    image: "/images/share/nuang-result-share-lab-v2.png",
    imageAlt: "뉴앙 휴식 성향 테스트 결과",
  },
};

export function createTopicAssessmentMetadata(slug: string): Metadata {
  const content = topicSeoContent[slug];
  if (!content) {
    return {
      robots: { follow: false, index: false },
      title: "성향 테스트",
    };
  }

  return createPublicPageMetadata({
    ...content,
    path: `/assessments/topics/${slug}`,
  });
}

export function createLabAssessmentMetadata(slug: string): Metadata {
  const content = labSeoContent[slug];
  if (!content) {
    return {
      robots: { follow: false, index: false },
      title: "성향 놀이터",
    };
  }

  return createPublicPageMetadata({
    ...content,
    path: `/labs/${slug}`,
  });
}

export function getSeoTopicSlugs() {
  return Object.keys(topicSeoContent).sort();
}

export function getSeoLabSlugs() {
  return Object.keys(labSeoContent).sort();
}
