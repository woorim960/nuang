import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolvePublicBalancePackCatalog } from "@/features/assessment/server-assessment-content-runtime";
import { createPublicPageMetadata } from "@/features/seo/site-config";
import { BalanceGameLanding } from "@/features/together-balance/BalanceGameLanding";

export const metadata: Metadata = createPublicPageMetadata({
  description:
    "친구·연인·가족과 함께할 밸런스 게임 질문을 골라보세요. 2~8명이 각자 답하고 취향 궁합과 서로 다른 선택을 바로 비교할 수 있어요.",
  path: "/assessments/together/balance-game",
  title: "밸런스 게임 질문과 취향 궁합",
});

export default async function BalanceGamePage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string | string[] }>;
}) {
  const resolved = await searchParams;
  const initialPackSlug =
    typeof resolved.pack === "string" ? resolved.pack : undefined;
  if (initialPackSlug) {
    redirect(
      `/assessments/together/balance-game/setup?pack=${encodeURIComponent(
        initialPackSlug,
      )}`,
    );
  }
  const packs = await resolvePublicBalancePackCatalog();
  return <BalanceGameLanding packs={packs} />;
}
