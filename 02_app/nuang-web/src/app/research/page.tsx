import type { Metadata } from "next";
import { GateCPublicStudy } from "@/features/research/gate-c/GateCPublicStudy";
import { readGateCReviewRewardCampaign } from "@/features/research/gate-c/gate-c-reward-campaign-server";

export const metadata: Metadata = {
  description:
    "12개 질문을 확인하고 뉴앙 성향 검사와 성향 분석 개선에 참여해 주세요.",
  robots: { follow: false, index: false },
  title: "뉴앙 검사 질문 리뷰 | NUANG",
};

export const dynamic = "force-dynamic";

export default function ResearchPage() {
  return <GateCPublicStudy rewardCampaign={readGateCReviewRewardCampaign()} />;
}
