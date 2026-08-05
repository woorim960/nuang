import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GateCPublicStudy } from "@/features/research/gate-c/GateCPublicStudy";
import { readGateCReviewRewardCampaign } from "@/features/research/gate-c/gate-c-reward-campaign-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  description:
    "12개 질문을 확인하고 뉴앙 성향 검사와 성향 분석 개선에 참여해 주세요.",
  robots: { follow: false, index: false },
  title: "뉴앙 검사 질문 리뷰 | NUANG",
};

export const dynamic = "force-dynamic";

type ResearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResearchPage({
  searchParams,
}: ResearchPageProps) {
  const query = searchParams ? await searchParams : {};
  const client = await createServerSupabaseClient();
  const { data } = client
    ? await client.auth.getUser()
    : { data: { user: null } };

  if (!data.user) {
    const returnPath = createResearchReturnPath(query);
    redirect(`/login?next=${encodeURIComponent(returnPath)}&reason=research`);
  }

  return <GateCPublicStudy rewardCampaign={readGateCReviewRewardCampaign()} />;
}

function createResearchReturnPath(
  query: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();
  (["from", "reward"] as const).forEach((key) => {
    const value = Array.isArray(query[key]) ? query[key][0] : query[key];
    if (value && value.length <= 80) params.set(key, value);
  });
  const serialized = params.toString();
  return serialized ? `/research?${serialized}` : "/research";
}
