import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityBalanceGameComposer } from "@/features/feed/CommunityBalanceGameComposer";
import { createServerFeedPostDetailPayload } from "@/features/feed/server-read";
import { normalizeFeedPostTopicCategory } from "@/features/feed/feed-topic";

type CommunityPollEditPageProps = {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "투표 수정 | NUANG",
};

export default async function CommunityPollEditPage({
  params,
  searchParams,
}: CommunityPollEditPageProps) {
  const [{ postId }, query] = await Promise.all([params, searchParams]);
  const payload = await createServerFeedPostDetailPayload(postId);

  if (!payload?.post.viewerCanManage || !payload.post.poll) {
    notFound();
  }

  const [optionA, optionB] = payload.post.poll.options;
  if (!optionA || !optionB) {
    notFound();
  }

  return (
    <CommunityBalanceGameComposer
      initialValue={{
        body: payload.post.body,
        category: normalizeFeedPostTopicCategory(payload.post.topic?.category),
        options: [optionA.label, optionB.label],
        pollStatus: payload.post.poll.status ?? "active",
        postId,
        question: payload.post.poll.question,
        ratios: [optionA.ratio, optionB.ratio],
        tags: payload.post.topic?.tags ?? [],
        totalVotes: payload.post.poll.totalVotes,
      }}
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
