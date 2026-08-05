import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TraitMapDetailTemplate } from "@/features/map/EnakqTraitMapTemplate";
import { TraitMapPreviewTemplate } from "@/features/map/TraitMapPreviewTemplate";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";
import { resolveCustomerTraitMapGuide } from "@/features/nuang-code/server-trait-map-guide-content";
import { createPublicPageMetadata } from "@/features/seo/site-config";

type TraitMapDetailPageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({
  params,
}: TraitMapDetailPageProps): Promise<Metadata> {
  const normalizedCode = (await params).code.toUpperCase();
  const profile = getCandidateProfileDefinition(normalizedCode);

  if (!profile) {
    return {
      robots: { follow: false, index: false },
      title: "성향 유형",
    };
  }

  return createPublicPageMetadata({
    description: `${profile.summary} 뉴앙 코드 ${profile.code}의 다섯 가지 성향 기준과 생활 속 모습을 확인해 보세요.`,
    path: `/map/${profile.code}`,
    title: `${profile.shortName} ${profile.code} 성향 특징`,
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
    <TraitMapDetailTemplate guide={guide} />
  ) : (
    <TraitMapPreviewTemplate profile={profile} />
  );
}
