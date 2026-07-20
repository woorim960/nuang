import type { Metadata } from "next";
import { FeedComposer } from "@/features/feed/FeedComposer";

export const metadata: Metadata = {
  title: "새 게시물 | NUANG",
};

export default function NewFeedPostPage() {
  return <FeedComposer standalone />;
}
