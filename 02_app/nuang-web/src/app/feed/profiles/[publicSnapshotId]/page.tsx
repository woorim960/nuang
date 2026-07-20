import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerCommunityProfilePayload } from "@/features/feed/server-read";
import { readCommunityProfileSocialState } from "@/features/feed/server-community-social";
import { CommunityProfileScreen } from "@/features/public-profile/CommunityProfileScreen";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type CommunityProfilePageProps = {
  params: Promise<{ publicSnapshotId: string }>;
};

export const metadata: Metadata = {
  title: "커뮤니티 프로필 | NUANG",
};

export default async function CommunityProfilePage({
  params,
}: CommunityProfilePageProps) {
  const { publicSnapshotId } = await params;
  const payload = await createServerCommunityProfilePayload(publicSnapshotId);

  if (!payload) notFound();

  const socialState = await resolveSocialState(publicSnapshotId);

  return (
    <CommunityProfileScreen
      initialSocialState={socialState}
      posts={payload.posts}
      profile={payload.profile}
    />
  );
}

async function resolveSocialState(publicSnapshotId: string) {
  const [serverClient, serviceClient] = await Promise.all([
    createServerSupabaseClient(),
    Promise.resolve(createSupabaseServiceClient()),
  ]);

  if (!serverClient || !serviceClient) {
    return { followerCount: 0, following: false, isOwnProfile: false };
  }

  const { data } = await serverClient.auth.getUser();

  return readCommunityProfileSocialState({
    client: serviceClient,
    publicSnapshotId,
    user: data.user ?? null,
  });
}
