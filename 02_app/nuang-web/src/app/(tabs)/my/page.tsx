import type { Metadata } from "next";
import { MyOverview } from "@/features/account/MyOverview";
import { resolveAdminIdentityForUser } from "@/features/admin/server-admin-access";
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

export default async function MyPage({
  searchParams = Promise.resolve({}),
}: {
  searchParams?: Promise<{ tab?: string }>;
} = {}) {
  const query = await searchParams;
  const [serverClient, serviceClient] = await Promise.all([
    createServerSupabaseClient(),
    Promise.resolve(createSupabaseServiceClient()),
  ]);
  const { data } = serverClient
    ? await serverClient.auth.getUser()
    : { data: { user: null } };
  const adminIdentity =
    data.user && serviceClient
      ? await resolveAdminIdentityForUser({
          client: serviceClient,
          user: data.user,
        })
      : null;
  const showAdminEntry = Boolean(adminIdentity);

  if (!data.user || !serviceClient) {
    return <MyOverview showAdminEntry={showAdminEntry} />;
  }

  const communityProfileId = await resolveCurrentCommunityProfileId();
  if (!communityProfileId) {
    return <MyOverview showAdminEntry={showAdminEntry} />;
  }

  const payload = await createServerCommunityProfilePayload(communityProfileId);
  if (!payload) return <MyOverview showAdminEntry={showAdminEntry} />;

  const socialState = await readCommunityProfileSocialState({
    client: serviceClient,
    publicSnapshotId: payload.profile.source.publicSnapshotId,
    user: data.user,
  });

  return (
    <div className={styles.fullBleedProfile}>
      <CommunityProfileScreen
        initialContent={query.tab === "reports" ? "reports" : "posts"}
        initialSocialState={{ ...socialState, isOwnProfile: true }}
        mode="self"
        posts={payload.posts}
        profile={payload.profile}
        reports={payload.reports}
        showAdminEntry={showAdminEntry}
        viewerCode={payload.viewerCode}
      />
    </div>
  );
}
