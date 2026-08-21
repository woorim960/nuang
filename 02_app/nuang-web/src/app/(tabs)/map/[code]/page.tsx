import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TraitMapDetailTemplate } from "@/features/map/EnakqTraitMapTemplate";
import { TraitMapPreviewTemplate } from "@/features/map/TraitMapPreviewTemplate";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";
import { resolveCustomerTraitMapGuide } from "@/features/nuang-code/server-trait-map-guide-content";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

type TraitMapDetailPageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({
  params,
}: TraitMapDetailPageProps): Promise<Metadata> {
  const normalizedCode = (await params).code.toUpperCase();
  const profile = getCandidateProfileDefinition(normalizedCode);

  if (!profile) {
    return createPrivatePageMetadata({ title: "이전 베타 성향 유형" });
  }

  return createPrivatePageMetadata({
    description: `${profile.code} 후보 코드의 설명을 참고용으로 보존한 이전 베타 성향지도입니다.`,
    title: `${profile.shortName} ${profile.code} 이전 베타 성향지도`,
  });
}

export default async function TraitMapDetailPage({
  params,
}: TraitMapDetailPageProps) {
  const { code } = await params;
  const normalizedCode = code.toUpperCase();

  const profile = getCandidateProfileDefinition(normalizedCode);
  if (!profile) notFound();

  const guide = await resolveCustomerTraitMapGuide(normalizedCode);
  return guide ? (
    <TraitMapDetailTemplate guide={guide} showLegacyBetaNotice />
  ) : (
    <TraitMapPreviewTemplate profile={profile} showLegacyBetaNotice />
  );
}
