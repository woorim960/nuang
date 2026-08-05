import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  AssessmentHub,
  AssessmentHubFallback,
} from "@/features/assessment/AssessmentHub";
import {
  getLegacyHomePollResumeHref,
  type LegacyHomeFeedResumeQuery,
} from "@/features/navigation/legacy-home-feed-resume";
import { OnboardingHomeGate } from "@/features/onboarding/EntryGate";
import { readRuntimeAssessmentCatalog } from "@/features/assessment/server-assessment-catalog";
import { createPublicPageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPublicPageMetadata({
  description:
    "무료 성향 테스트, 생활 속 주제 테스트, 밸런스 게임을 한곳에서 시작하고 친구·연인과 서로의 생각을 비교해 보세요.",
  path: "/home",
  title: "성향 테스트와 관계 놀이터",
});

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<LegacyHomeFeedResumeQuery>;
}) {
  const query = searchParams ? await searchParams : {};
  const legacyPollResumeHref = getLegacyHomePollResumeHref(query);

  if (legacyPollResumeHref) {
    redirect(legacyPollResumeHref);
  }

  return (
    <OnboardingHomeGate>
      <Suspense fallback={<AssessmentHubFallback />}>
        <HomeAssessmentHub />
      </Suspense>
    </OnboardingHomeGate>
  );
}

async function HomeAssessmentHub() {
  const catalog = await readRuntimeAssessmentCatalog();
  return <AssessmentHub catalog={catalog} />;
}
