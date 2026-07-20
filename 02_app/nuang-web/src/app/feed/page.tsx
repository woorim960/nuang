import type { Metadata } from "next";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { CommunityFeed } from "@/features/feed/CommunityFeed";
import { createServerFeedReadPayload } from "@/features/feed/server-read";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "커뮤니티 | NUANG",
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<{ posted?: string }>;
} = {}) {
  const feedPayload = await createServerFeedReadPayload();
  const query = searchParams ? await searchParams : {};

  return (
    <div className={styles.shell}>
      <CommunityFeed
        highlightedPostId={query.posted ?? null}
        posts={feedPayload.items}
        viewerCode={feedPayload.viewerCode}
      />
      <BottomNavigation />
    </div>
  );
}
