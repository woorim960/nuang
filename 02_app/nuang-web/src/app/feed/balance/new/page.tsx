import type { Metadata } from "next";
import { CommunityBalanceGameComposer } from "@/features/feed/CommunityBalanceGameComposer";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "투표 만들기 | NUANG",
};

export default async function NewCommunityPollPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const query = searchParams ? await searchParams : {};

  return (
    <CommunityBalanceGameComposer returnTo={normalizeReturnTo(query.returnTo)} />
  );
}

function normalizeReturnTo(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/feed";
}
