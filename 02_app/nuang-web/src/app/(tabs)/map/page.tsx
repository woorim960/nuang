import type { Metadata } from "next";
import { TraitMapExplorer } from "@/features/map/TraitMapExplorer";
import { candidateProfileDefinitions } from "@/features/nuang-code/candidate-profile-names";
import { createPublicPageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPublicPageMetadata({
  description:
    "뉴앙의 다섯 가지 성향 기준으로 나뉜 32가지 유형을 살펴보세요. 내 코드와 가까운 성향의 공통점과 차이를 쉽게 확인할 수 있어요.",
  path: "/map",
  title: "32가지 성향 유형 지도",
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
