import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveCurrentCommunityProfileSnapshotId } from "@/features/feed/server-read";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "내 커뮤니티 프로필 | NUANG",
};

export default async function MyCommunityProfilePage() {
  const serverClient = await createServerSupabaseClient();
  const { data } = serverClient
    ? await serverClient.auth.getUser()
    : { data: { user: null } };

  if (!data.user) {
    redirect("/login?next=%2Ffeed%2Fme&reason=community");
  }

  const publicSnapshotId = await resolveCurrentCommunityProfileSnapshotId();

  if (!publicSnapshotId) {
    redirect("/my");
  }

  redirect(`/feed/profiles/${publicSnapshotId}`);
}
