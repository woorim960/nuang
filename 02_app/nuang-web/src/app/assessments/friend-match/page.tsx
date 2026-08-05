import type { Metadata } from "next";
import { FriendTraitMatch } from "@/features/assessment/FriendTraitMatch";
import { parseFriendTraitMatchInvite } from "@/features/assessment/friend-trait-match-invite";
import {
  defaultFriendTraitMatchContent,
  type FriendTraitMatchContent,
} from "@/features/assessment/friend-trait-match-content";
import {
  resolveAssessmentReleaseById,
  resolveAssessmentRuntimeContent,
} from "@/features/assessment/server-assessment-content-runtime";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "친구 성향 맞히기 | NUANG",
};

export default async function FriendTraitMatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const inviteState = parseFriendTraitMatchInvite(await searchParams);
  const resolution =
    inviteState.status === "ready" && inviteState.releaseId
      ? await resolveAssessmentReleaseById({
          category: "together",
          releaseId: inviteState.releaseId,
          slug: "friend-match",
          subtype: "friend_match",
        })
      : await resolveAssessmentRuntimeContent({
          category: "together",
          slug: "friend-match",
          subtype: "friend_match",
        });
  if (resolution.state === "unavailable") notFound();
  const content =
    (resolution.document?.payload as { config?: FriendTraitMatchContent } | undefined)
      ?.config ?? defaultFriendTraitMatchContent;

  return (
    <FriendTraitMatch
      content={content}
      inviteState={inviteState}
      releaseId={resolution.releaseId}
    />
  );
}
