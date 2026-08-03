import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  ensureCommunityProfile,
  resolveCommunityProfileImage,
} from "@/features/account/server-community-profile";
import { readAccountResults } from "@/features/account/server-reads";
import {
  buildSelfAssessmentJourney,
  type SelfProfilePayload,
} from "@/features/account/self-profile-contract";
import { readAccountAssessmentProgress } from "@/features/assessment/server-account-assessment-progress";
import { createServerFeedReadPayload } from "@/features/feed/server-read";
import { createCharacterProfileImage } from "@/features/public-profile/profile-image";
import { readOriginalProfileReportSummaries } from "@/features/public-profile/server-profile-reports";

export type SelfProfileReadResult =
  | { payload: SelfProfilePayload; state: "ready" }
  | { state: "profile_unavailable" };

export async function readSelfProfilePayload({
  client,
  showAdminEntry,
  user,
}: {
  client: SupabaseClient;
  showAdminEntry: boolean;
  user: User;
}): Promise<SelfProfileReadResult> {
  const profile = await ensureCommunityProfile({ client, user }).catch(
    () => null,
  );
  if (!profile) return { state: "profile_unavailable" };

  const fallbackImage = createCharacterProfileImage({
    alt: `${profile.displayName} 프로필 이미지`,
    motif: profile.avatarCharacterKey,
  });
  const image = await resolveCommunityProfileImage({
    client,
    fallback: fallbackImage,
    profile,
  }).catch(() => fallbackImage);

  const [
    resultsRead,
    progressRead,
    feedRead,
    reportsRead,
    statsRead,
    snapshotRead,
  ] = await Promise.allSettled([
    readAccountResults({ client, user }),
    readAccountAssessmentProgress({ client, user }),
    createServerFeedReadPayload(),
    readOriginalProfileReportSummaries({
      client,
      ownerAccountId: profile.accountId,
      viewerAccountId: profile.accountId,
    }),
    readSelfProfileStats({ accountId: profile.accountId, client }),
    readActivePublicSnapshotId({ accountId: profile.accountId, client }),
  ]);

  const accountResults =
    resultsRead.status === "fulfilled" && resultsRead.value.ok
      ? resultsRead.value.data
      : [];
  const attempts =
    progressRead.status === "fulfilled" && progressRead.value.ok
      ? progressRead.value.attempts
      : [];
  const ownPosts =
    feedRead.status === "fulfilled"
      ? feedRead.value.items
          .filter((post) => post.viewerIsAuthor)
          .map((post) => ({
            ...post,
            authorHandle: profile.handle,
            authorName: profile.displayName,
            avatarLabel: profile.displayName.slice(0, 1) || "나",
          }))
      : [];
  const reports = reportsRead.status === "fulfilled" ? reportsRead.value : [];
  const stats =
    statsRead.status === "fulfilled"
      ? statsRead.value
      : { followers: null, following: null, posts: null, reports: null };
  const publicSnapshotId =
    snapshotRead.status === "fulfilled" ? snapshotRead.value : null;
  const representativeResult =
    accountResults.find((result) => result.kind === "full") ??
    accountResults[0] ??
    null;
  const trait = representativeResult
    ? {
        code: representativeResult.profileCode,
        completedAt: representativeResult.completedAt,
        profileName: representativeResult.profileName,
        source: representativeResult.kind,
      }
    : null;

  const resultsAvailable =
    resultsRead.status === "fulfilled" && resultsRead.value.ok;
  const progressAvailable =
    progressRead.status === "fulfilled" && progressRead.value.ok;
  const journey =
    !progressAvailable && !trait
      ? ({ state: "unavailable" } as const)
      : buildSelfAssessmentJourney({
          attempts,
          results: accountResults,
          resultsAvailable,
        });
  const postsAvailable =
    feedRead.status === "fulfilled" &&
    stats.posts !== null &&
    (stats.posts === 0 || ownPosts.length > 0);
  const reportsAvailable =
    reportsRead.status === "fulfilled" &&
    stats.reports !== null &&
    (stats.reports === 0 || reports.length > 0);

  return {
    payload: {
      assessmentJourney: journey,
      capabilities: {
        canEdit: true,
        canShare: Boolean(trait && publicSnapshotId),
        showAdminEntry,
      },
      contentState: {
        posts: postsAvailable ? "ready" : "unavailable",
        reports: reportsAvailable ? "ready" : "unavailable",
        trait: resultsAvailable ? "ready" : "unavailable",
      },
      posts: ownPosts,
      profile: {
        bio: profile.bio,
        displayName: profile.displayName,
        handle: profile.handle,
        image,
        publicId: profile.id,
        publicSnapshotId,
      },
      reports,
      stats,
      trait,
      viewerCode: trait?.code ?? null,
    },
    state: "ready",
  };
}

async function readSelfProfileStats({
  accountId,
  client,
}: {
  accountId: string;
  client: SupabaseClient;
}) {
  const [posts, followers, following, core, topic, lab] = await Promise.all([
    client
      .schema("feed")
      .from("feed_post")
      .select("id", { count: "exact", head: true })
      .eq("author_account_id", accountId)
      .is("deleted_at", null),
    client
      .schema("feed")
      .from("profile_follow")
      .select("id", { count: "exact", head: true })
      .eq("target_account_id", accountId)
      .is("deleted_at", null),
    client
      .schema("feed")
      .from("profile_follow")
      .select("id", { count: "exact", head: true })
      .eq("follower_account_id", accountId)
      .is("deleted_at", null),
    client
      .schema("report")
      .from("result_report")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .is("deleted_at", null),
    client
      .schema("assessment")
      .from("free_topic_result")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .is("deleted_at", null),
    client
      .schema("assessment")
      .from("lab_result")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .is("deleted_at", null),
  ]);

  const reportCounts = [readCount(core), readCount(topic), readCount(lab)];

  return {
    followers: readCount(followers),
    following: readCount(following),
    posts: readCount(posts),
    reports: reportCounts.every((count) => count !== null)
      ? reportCounts.reduce<number>((sum, count) => sum + (count ?? 0), 0)
      : null,
  };
}

function readCount(result: { count: number | null; error: unknown }) {
  return result.error || result.count === null ? null : result.count;
}

async function readActivePublicSnapshotId({
  accountId,
  client,
}: {
  accountId: string;
  client: SupabaseClient;
}) {
  const response = await client
    .schema("profile")
    .from("profile_public_snapshot")
    .select("id")
    .eq("account_id", accountId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return response.error || !response.data?.id ? null : String(response.data.id);
}
