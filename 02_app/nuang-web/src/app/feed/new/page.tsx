import type { Metadata } from "next";
import { FeedComposer } from "@/features/feed/FeedComposer";

export const metadata: Metadata = {
  title: "글쓰기 | NUANG",
};

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
