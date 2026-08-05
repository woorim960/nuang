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
import { createPublicPageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPublicPageMetadata({
  description:
    "내가 생각한 친구의 모습과 친구가 직접 고른 답을 비교하는 무료 친구 성향 게임이에요. 서로 얼마나 잘 알고 있는지 확인해 보세요.",
  path: "/assessments/friend-match",
  title: "친구 성향 맞히기 테스트",
});

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
    (
      resolution.document?.payload as
        { config?: FriendTraitMatchContent } | undefined
    )?.config ?? defaultFriendTraitMatchContent;

  return (
    <FriendTraitMatch
      content={content}
      inviteState={inviteState}
      releaseId={resolution.releaseId}
    />
  );
}
