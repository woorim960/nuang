import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerCommunityProfilePayload } from "@/features/feed/server-read";
import { readCommunityProfileSocialState } from "@/features/feed/server-community-social";
import { CommunityProfileScreen } from "@/features/public-profile/CommunityProfileScreen";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

type CommunityProfilePageProps = {
  params: Promise<{ publicSnapshotId: string }>;
  searchParams: Promise<{ intent?: string; tab?: string; view?: string }>;
};

export const metadata: Metadata = createPrivatePageMetadata({
  title: "커뮤니티 프로필",
});

export default async function CommunityProfilePage({
  params,
  searchParams,
}: CommunityProfilePageProps) {
  const [{ publicSnapshotId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const payload = await createServerCommunityProfilePayload(publicSnapshotId);

  if (!payload) notFound();

  const socialState = await resolveSocialState(
    payload.profile.source.communityProfileId,
    payload.profile.source.publicSnapshotId,
  );

  return (
    <CommunityProfileScreen
      initialContent={query.tab === "reports" ? "reports" : "posts"}
      initialSocialState={socialState}
      intent={query.intent === "compare" ? "compare" : "browse"}
      mode={
        query.view === "public" && socialState.isOwnProfile
          ? "preview"
          : "other"
      }
      posts={payload.posts}
      profile={payload.profile}
      reports={payload.reports}
      viewerCode={payload.viewerCode}
    />
  );
}

async function resolveSocialState(
  communityProfileId: string | undefined,
  publicSnapshotId: string,
) {
  const [serverClient, serviceClient] = await Promise.all([
    createServerSupabaseClient(),
    Promise.resolve(createSupabaseServiceClient()),
  ]);

  if (!serverClient || !serviceClient) {
    return {
      actions: {
        block: "unavailable" as const,
        follow: "unavailable" as const,
        report: "unavailable" as const,
      },
      followerCount: 0,
      following: false,
      followingCount: 0,
      isOwnProfile: false,
    };
  }

  const { data } = await serverClient.auth.getUser();

  return readCommunityProfileSocialState({
    client: serviceClient,
    communityProfileId,
    publicSnapshotId,
    user: data.user ?? null,
  });
}
