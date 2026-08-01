import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createServerFeedReportSharePayload } from "@/features/feed/server-read";

type FeedReportSharePageProps = {
  params: Promise<{
    postId: string;
  }>;
};

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "검사 결과 | NUANG",
};

export default async function FeedReportSharePage({
  params,
}: FeedReportSharePageProps) {
  const { postId } = await params;
  const payload = await createServerFeedReportSharePayload(postId);
  const href = payload?.reportShare.href;

  if (!href?.startsWith("/feed/profiles/")) {
    notFound();
    return;
  }

  redirect(href);
}
