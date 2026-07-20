import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityTagScreen } from "@/features/feed/CommunityTagScreen";
import {
  normalizeFeedTag,
  normalizeFeedTagParam,
} from "@/features/feed/feed-topic";
import { createServerFeedReadPayload } from "@/features/feed/server-read";

type CommunityTagPageProps = {
  params: Promise<{ tag: string }>;
};

export async function generateMetadata({
  params,
}: CommunityTagPageProps): Promise<Metadata> {
  const { tag } = await params;
  const normalizedTag = normalizeFeedTagParam(tag);
  return { title: normalizedTag ? `#${normalizedTag} | NUANG` : "태그 | NUANG" };
}

export default async function CommunityTagPage({
  params,
}: CommunityTagPageProps) {
  const { tag } = await params;
  const normalizedTag = normalizeFeedTagParam(tag);
  if (!normalizedTag) notFound();

  const payload = await createServerFeedReadPayload();
  const normalizedKey = normalizedTag.toLocaleLowerCase("ko-KR");
  const posts = payload.items.filter((post) =>
    post.topic?.tags.some(
      (postTag) =>
        normalizeFeedTag(postTag).toLocaleLowerCase("ko-KR") === normalizedKey,
    ),
  );

  return <CommunityTagScreen posts={posts} tag={normalizedTag} />;
}
