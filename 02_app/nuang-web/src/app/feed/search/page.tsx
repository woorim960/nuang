import type { Metadata } from "next";
import { CommunitySearchScreen } from "@/features/feed/CommunitySearchScreen";
import { createServerFeedReadPayload } from "@/features/feed/server-read";

export const metadata: Metadata = {
  title: "커뮤니티 검색 | NUANG",
};

export default async function CommunitySearchPage() {
  const payload = await createServerFeedReadPayload();

  return <CommunitySearchScreen posts={payload.items} />;
}
