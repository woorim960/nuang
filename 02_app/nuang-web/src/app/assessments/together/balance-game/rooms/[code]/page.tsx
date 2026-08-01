import type { Metadata } from "next";
import { BalanceGameRoom } from "@/features/together-balance/BalanceGameRoom";

export const metadata: Metadata = {
  title: "함께 고르기 | NUANG 밸런스 게임",
};

export default async function BalanceGameRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <BalanceGameRoom roomCode={code} />;
}
