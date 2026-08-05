import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "내 커뮤니티 프로필",
});

export default async function MyCommunityProfilePage() {
  const serverClient = await createServerSupabaseClient();
  const { data } = serverClient
    ? await serverClient.auth.getUser()
    : { data: { user: null } };

  if (!data.user) {
    redirect("/login?next=%2Ffeed%2Fme&reason=community");
  }

  redirect("/my");
}
