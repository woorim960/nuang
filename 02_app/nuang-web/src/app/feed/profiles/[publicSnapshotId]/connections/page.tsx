import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readCommunityProfileConnections } from "@/features/feed/server-community-social";
import {
  type CommunityConnectionTab,
  CommunityProfileConnectionsScreen,
} from "@/features/public-profile/CommunityProfileConnectionsScreen";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "팔로우 목록 | NUANG",
};

export default async function CommunityProfileConnectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicSnapshotId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ publicSnapshotId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const client = createSupabaseServiceClient();
  const activeTab: CommunityConnectionTab =
    query.tab === "following" ? "following" : "followers";

  if (!client) {
    return (
      <CommunityProfileConnectionsScreen
        activeTab={activeTab}
        result={{
          followers: [],
          following: [],
          ownerDisplayName: "프로필",
          ownerPublicSnapshotId: publicSnapshotId,
          state: "unavailable",
        }}
      />
    );
  }

  const result = await readCommunityProfileConnections({
    client,
    publicSnapshotId,
  });

  if (result.state === "profile_not_found") notFound();

  return (
    <CommunityProfileConnectionsScreen activeTab={activeTab} result={result} />
  );
}
