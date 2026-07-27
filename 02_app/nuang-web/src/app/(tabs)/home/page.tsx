import { HomeDashboard } from "@/features/home/HomeDashboard";
import { createServerHomeFeedPreviewItems } from "@/features/feed/server-read";
import { OnboardingHomeGate } from "@/features/onboarding/EntryGate";

export default async function HomePage() {
  const feedPreviewItems = await createServerHomeFeedPreviewItems();

  return (
    <OnboardingHomeGate>
      <HomeDashboard feedPreviewItems={feedPreviewItems} />
    </OnboardingHomeGate>
  );
}
