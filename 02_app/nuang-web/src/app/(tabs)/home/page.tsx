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

export const metadata: Metadata = {
  description:
    "나를 이해하고, 서로를 이해하는 성향 놀이터 뉴앙에서 성향 검사와 함께하기를 시작해 보세요.",
  title: "홈 | NUANG",
};

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
