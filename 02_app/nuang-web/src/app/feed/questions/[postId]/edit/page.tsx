import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityQuestionComposer } from "@/features/feed/CommunityQuestionComposer";
import { createServerFeedPostDetailPayload } from "@/features/feed/server-read";
import { normalizeFeedPostTopicCategory } from "@/features/feed/feed-topic";

type CommunityQuestionEditPageProps = {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "질문 수정 | NUANG",
};

export default async function CommunityQuestionEditPage({
  params,
  searchParams,
}: CommunityQuestionEditPageProps) {
  const [{ postId }, query] = await Promise.all([params, searchParams]);
  const payload = await createServerFeedPostDetailPayload(postId);

  if (
    !payload?.post.viewerCanManage ||
    !payload.post.questionAudience
  ) {
    notFound();
  }

  return (
    <CommunityQuestionComposer
      initialValue={{
        audience: payload.post.questionAudience,
        body: payload.post.body,
        category: normalizeFeedPostTopicCategory(payload.post.topic?.category),
        postId: payload.post.id,
        replyCount: payload.post.replyCount ?? 0,
        tags: payload.post.topic?.tags ?? [],
      }}
      returnTo={sanitizeReturnTo(query.returnTo)}
    />
  );
}

function sanitizeReturnTo(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate &&
    candidate.startsWith("/") &&
    !candidate.startsWith("//")
    ? candidate
    : "/feed";
}
