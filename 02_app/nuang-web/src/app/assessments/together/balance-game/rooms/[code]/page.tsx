import type { Metadata } from "next";
import { BalanceGameRoom } from "@/features/together-balance/BalanceGameRoom";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "밸런스 게임 함께 고르기",
});

export default async function BalanceGameRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <BalanceGameRoom roomCode={code} />;
}
