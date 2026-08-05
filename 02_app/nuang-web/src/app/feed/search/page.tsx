import type { Metadata } from "next";
import { CommunitySearchScreen } from "@/features/feed/CommunitySearchScreen";
import { createServerFeedReadPayload } from "@/features/feed/server-read";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "커뮤니티 검색",
});

export default async function CommunitySearchPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const [payload, query] = await Promise.all([
    createServerFeedReadPayload(),
    searchParams,
  ]);

  return (
    <CommunitySearchScreen
      intent={query.intent === "compare" ? "compare" : "browse"}
      posts={payload.items}
    />
  );
}
