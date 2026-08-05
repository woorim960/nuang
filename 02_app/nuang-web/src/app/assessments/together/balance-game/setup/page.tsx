import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolvePublicBalancePack } from "@/features/assessment/server-assessment-content-runtime";
import { createPrivatePageMetadata } from "@/features/seo/site-config";
import { BalanceGameSetup } from "@/features/together-balance/BalanceGameSetup";

export const metadata: Metadata = createPrivatePageMetadata({
  description: "함께할 사람과 문항 수를 정하고 밸런스 게임 방을 만들어요.",
  title: "밸런스 게임 방 설정",
});

export default async function BalanceGameSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string | string[] }>;
}) {
  const resolved = await searchParams;
  if (typeof resolved.pack !== "string") notFound();
  const packResolution = await resolvePublicBalancePack(resolved.pack);
  if (!packResolution) notFound();

  return <BalanceGameSetup pack={packResolution.pack} />;
}
