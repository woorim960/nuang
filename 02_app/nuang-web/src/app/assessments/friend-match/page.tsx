import type { Metadata } from "next";
import { FriendTraitMatch } from "@/features/assessment/FriendTraitMatch";
import { parseFriendTraitMatchInvite } from "@/features/assessment/friend-trait-match-invite";

export const metadata: Metadata = {
  title: "친구 성향 맞히기 | NUANG",
};

export default async function FriendTraitMatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const inviteState = parseFriendTraitMatchInvite(await searchParams);

  return <FriendTraitMatch inviteState={inviteState} />;
}
