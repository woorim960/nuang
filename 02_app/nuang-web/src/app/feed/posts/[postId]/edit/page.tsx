import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedPostEditForm } from "@/features/feed/FeedPostEditForm";
import { createServerFeedPostDetailPayload } from "@/features/feed/server-read";

type FeedPostEditPageProps = {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "게시물 수정 | NUANG",
};

export default async function FeedPostEditPage({
  params,
  searchParams,
}: FeedPostEditPageProps) {
  const [{ postId }, query] = await Promise.all([params, searchParams]);
  const payload = await createServerFeedPostDetailPayload(postId);

  if (!payload?.post.viewerCanManage) {
    notFound();
  }

  return (
    <FeedPostEditForm
      post={payload.post}
      returnTo={sanitizeReturnTo(query.returnTo, postId)}
    />
  );
}

function sanitizeReturnTo(
  value: string | string[] | undefined,
  postId: string,
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    candidate &&
    candidate.startsWith("/") &&
    !candidate.startsWith("//")
  ) {
    return candidate;
  }

  return `/feed/posts/${postId}`;
}
