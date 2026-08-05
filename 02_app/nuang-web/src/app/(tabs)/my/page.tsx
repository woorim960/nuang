import type { Metadata } from "next";
import { MyOverview } from "@/features/account/MyOverview";
import {
  SelfProfileScreen,
  SelfProfileUnavailable,
} from "@/features/account/SelfProfileScreen";
import { readSelfProfilePayload } from "@/features/account/server-self-profile";
import { resolveAdminIdentityForUser } from "@/features/admin/server-admin-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createPrivatePageMetadata } from "@/features/seo/site-config";
import styles from "./page.module.css";

export const metadata: Metadata = createPrivatePageMetadata({ title: "마이" });

export default async function MyPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const query = (await searchParams) ?? {};
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

  if (!data.user) {
    return (
      <div className={styles.fullBleedProfile}>
        <MyOverview
          initialContent={query.tab === "reports" ? "reports" : "posts"}
          showAdminEntry={showAdminEntry}
        />
      </div>
    );
  }

  if (!serviceClient) {
    return (
      <div className={styles.fullBleedProfile}>
        <SelfProfileUnavailable />
      </div>
    );
  }

  const result = await readSelfProfilePayload({
    client: serviceClient,
    showAdminEntry,
    user: data.user,
  });

  if (result.state === "profile_unavailable") {
    return (
      <div className={styles.fullBleedProfile}>
        <SelfProfileUnavailable />
      </div>
    );
  }

  return (
    <div className={styles.fullBleedProfile}>
      <SelfProfileScreen
        initialContent={query.tab === "reports" ? "reports" : "posts"}
        payload={result.payload}
      />
    </div>
  );
}
