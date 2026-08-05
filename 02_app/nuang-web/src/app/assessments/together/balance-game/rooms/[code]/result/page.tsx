import type { Metadata } from "next";
import { BalanceGameRoom } from "@/features/together-balance/BalanceGameRoom";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "밸런스 게임 선택 리포트",
});

export default async function BalanceGameResultPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <BalanceGameRoom resultView roomCode={code} />;
}
