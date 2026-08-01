import type { Metadata } from "next";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { readFeedCoupangDelivery } from "@/features/advertising/server-advertising-delivery";
import { CommunityFeed } from "@/features/feed/CommunityFeed";
import { createServerFeedReadPayload } from "@/features/feed/server-read";
import { parseLegacyHomePollResumeIntent } from "@/features/navigation/legacy-home-feed-resume";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "커뮤니티 | NUANG",
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<{
    posted?: string;
    review?: string;
    view?: string;
    auth?: string;
    optionId?: string;
    pollId?: string;
    resumeFeed?: string;
  }>;
}) {
  const query = searchParams ? await searchParams : {};
  const pollResumeIntent = parseLegacyHomePollResumeIntent(query);
  const feedPayload = await createServerFeedReadPayload({
    requiredPollId: pollResumeIntent?.pollId,
  });
  const commerceAd = await readFeedCoupangDelivery({
    organicPostCount: feedPayload.items.length,
  });

  return (
    <div className={styles.shell}>
      <CommunityFeed
        highlightedPostId={query.posted ?? null}
        initialMode={getInitialMode(query.view)}
        pendingReviewNotice={query.review === "pending"}
        posts={feedPayload.items}
        commerceAd={commerceAd}
        viewerCode={feedPayload.viewerCode}
      />
      <BottomNavigation />
    </div>
  );
}

function getInitialMode(view: string | undefined) {
  if (view === "decal" || view === "playground") return view;
  return "recommended" as const;
}
