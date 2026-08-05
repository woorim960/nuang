import type { Metadata } from "next";
import { BalanceGameRoom } from "@/features/together-balance/BalanceGameRoom";

export const metadata: Metadata = {
  title: "우리의 선택 리포트 | NUANG 밸런스 게임",
};

export default async function BalanceGameResultPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <BalanceGameRoom resultView roomCode={code} />;
}
