import type { Metadata } from "next";
import { OnboardingGuideCarousel } from "@/features/onboarding/OnboardingGuideCarousel";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "뉴앙 시작하기",
});

export default function OnboardingPage() {
  return <OnboardingGuideCarousel />;
}
