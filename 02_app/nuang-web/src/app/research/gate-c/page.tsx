import type { Metadata } from "next";
import { GateCPublicStudy } from "@/features/research/gate-c/GateCPublicStudy";
import { readGateCReviewRewardCampaign } from "@/features/research/gate-c/gate-c-reward-campaign-server";

export const metadata: Metadata = {
  title: "뉴앙 질문 확인 참여 | NUANG",
  description:
    "12개 질문을 확인하고 뉴앙 성향 검사 개선에 참여해 주세요.",
  robots: { follow: false, index: false },
};

export const dynamic = "force-dynamic";

export default function GateCResearchHomePage() {
  return <GateCPublicStudy rewardCampaign={readGateCReviewRewardCampaign()} />;
}
