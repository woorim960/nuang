import type { Metadata } from "next";
import { MyOverview } from "@/features/account/MyOverview";
import {
  createServerCommunityProfilePayload,
  resolveCurrentCommunityProfileId,
} from "@/features/feed/server-read";
import { readCommunityProfileSocialState } from "@/features/feed/server-community-social";
import { CommunityProfileScreen } from "@/features/public-profile/CommunityProfileScreen";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "마이 | NUANG",
};

export default async function MyPage() {
  const [serverClient, serviceClient] = await Promise.all([
    createServerSupabaseClient(),
    Promise.resolve(createSupabaseServiceClient()),
  ]);
  const { data } = serverClient
    ? await serverClient.auth.getUser()
    : { data: { user: null } };

  if (!data.user || !serviceClient) return <MyOverview />;

  const communityProfileId = await resolveCurrentCommunityProfileId();
  if (!communityProfileId) return <MyOverview />;

  const payload = await createServerCommunityProfilePayload(communityProfileId);
  if (!payload) return <MyOverview />;

  const socialState = await readCommunityProfileSocialState({
    client: serviceClient,
    publicSnapshotId: payload.profile.source.publicSnapshotId,
    user: data.user,
  });

  return (
    <div className={styles.fullBleedProfile}>
      <CommunityProfileScreen
        initialSocialState={{ ...socialState, isOwnProfile: true }}
        mode="self"
        posts={payload.posts}
        profile={payload.profile}
      />
    </div>
  );
}
