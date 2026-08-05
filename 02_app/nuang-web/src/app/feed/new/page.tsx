import type { Metadata } from "next";
import { FeedComposer } from "@/features/feed/FeedComposer";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "글쓰기",
});

export default async function NewFeedPostPage({
  searchParams,
}: {
  searchParams?: Promise<{ space?: string }>;
}) {
  const query = searchParams ? await searchParams : {};

  return (
    <FeedComposer
      initialSpace={query.space === "playground" ? "playground" : "daily"}
      standalone
    />
  );
}
