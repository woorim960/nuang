import type { Metadata } from "next";
import { BalanceGameLanding } from "@/features/together-balance/BalanceGameLanding";

export const metadata: Metadata = {
  title: "밸런스 게임 | NUANG",
  description:
    "같은 질문에 각자 답하고 2~8명의 취향 궁합을 비교하는 뉴앙 밸런스 게임",
};

export default async function BalanceGamePage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string | string[] }>;
}) {
  const resolved = await searchParams;
  const initialPackSlug =
    typeof resolved.pack === "string" ? resolved.pack : undefined;
  return <BalanceGameLanding initialPackSlug={initialPackSlug} />;
}
