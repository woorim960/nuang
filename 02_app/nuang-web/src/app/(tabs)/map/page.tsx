import type { Metadata } from "next";
import { TraitMapExplorer } from "@/features/map/TraitMapExplorer";
import { candidateProfileDefinitions } from "@/features/nuang-code/candidate-profile-names";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPrivatePageMetadata({
  description:
    "검증 전 후보 코드의 설명을 참고용으로 보존한 이전 베타 성향지도입니다.",
  title: "이전 베타 성향지도",
});

type MapPageProps = {
  searchParams?: Promise<{
    code?: string | string[];
  }>;
};

export default async function MapPage({ searchParams }: MapPageProps) {
  const params: { code?: string | string[] } = searchParams
    ? await searchParams
    : {};
  const requestedCode = Array.isArray(params.code)
    ? params.code[0]
    : params.code;
  const normalizedCode = requestedCode?.toUpperCase();
  const initialCode =
    normalizedCode && candidateProfileDefinitions[normalizedCode]
      ? normalizedCode
      : null;

  return <TraitMapExplorer initialCode={initialCode} />;
}
