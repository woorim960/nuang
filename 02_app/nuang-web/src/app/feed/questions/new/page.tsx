import type { Metadata } from "next";
import { CommunityQuestionComposer } from "@/features/feed/CommunityQuestionComposer";

export const metadata: Metadata = {
  title: "뉴앙에게 물어봐 | NUANG",
};

export default async function NewCommunityQuestionPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const query = searchParams ? await searchParams : {};

  return (
    <CommunityQuestionComposer returnTo={normalizeReturnTo(query.returnTo)} />
  );
}

function normalizeReturnTo(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/feed";
}
