import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { readCommunityProfileSocialState } from "@/features/feed/server-community-social";
import { createServerCommunityProfilePayload } from "@/features/feed/server-read";
import { CommunityProfileReportScreen } from "@/features/public-profile/CommunityProfileReportScreen";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "프로필 신고 | NUANG",
};

export default async function CommunityProfileReportPage({
  params,
}: {
  params: Promise<{ publicSnapshotId: string }>;
}) {
  const { publicSnapshotId } = await params;
  const payload = await createServerCommunityProfilePayload(publicSnapshotId);

  if (!payload) notFound();

  const [serverClient, serviceClient] = await Promise.all([
    createServerSupabaseClient(),
    Promise.resolve(createSupabaseServiceClient()),
  ]);
  let reportAvailability: "ready" | "unavailable" = "unavailable";
  if (serverClient && serviceClient) {
    const { data } = await serverClient.auth.getUser();
    const socialState = await readCommunityProfileSocialState({
      client: serviceClient,
      communityProfileId: payload.profile.source.communityProfileId,
      publicSnapshotId: payload.profile.source.publicSnapshotId,
      user: data.user ?? null,
    });
    if (socialState.isOwnProfile) {
      redirect(`/feed/profiles/${publicSnapshotId}`);
    }
    reportAvailability = socialState.actions.report;
  }

  return (
    <CommunityProfileReportScreen
      availability={reportAvailability}
      communityProfileId={payload.profile.source.communityProfileId}
      displayName={payload.profile.display.displayName}
      profileId={publicSnapshotId}
      publicSnapshotId={payload.profile.source.publicSnapshotId}
    />
  );
}
