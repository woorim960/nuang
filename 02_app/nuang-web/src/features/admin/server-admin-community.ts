import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { seedTrustedLinkDomains } from "@/features/feed/server-link-safety";

export type AdminCommunityReport = {
  contentPreview: string | null;
  createdAt: string;
  details: string | null;
  id: string;
  kind: "content" | "profile";
  reason: string;
  reporterName: string;
  severity: "high" | "low" | "medium";
  status: string;
  targetAccountId: string;
  targetContentId: string | null;
  targetType: "comment" | "post" | "profile";
  targetName: string;
};

export type AdminCommunityPost = {
  authorAccountId: string;
  authorName: string;
  body: string;
  createdAt: string;
  id: string;
  moderationStatus: string;
  source: string;
  visibility: string;
};

export type AdminExternalLink = {
  authorName: string;
  contentPreview: string;
  contentType: "comment" | "post";
  createdAt: string;
  hostname: string;
  id: string;
  normalizedUrl: string;
  originalUrl: string;
  reviewStatus: string;
};

export async function readAdminCommunity(client: SupabaseClient) {
  await seedTrustedLinkDomains(client);

  const [
    profileReportsResponse,
    contentReportsResponse,
    postsResponse,
    linksResponse,
  ] = await Promise.all([
    client
      .schema("feed")
      .from("profile_report")
      .select(
        "id,reporter_account_id,target_account_id,reason,details,severity,status,created_at",
      )
      .in("status", ["queued", "in_review", "action_required"])
      .order("created_at", { ascending: true })
      .limit(200),
    client
      .schema("feed")
      .from("content_report")
      .select(
        "id,reporter_account_id,target_author_account_id,post_id,comment_id,reason,details,severity,status,created_at",
      )
      .in("status", ["queued", "in_review", "action_required"])
      .order("created_at", { ascending: true })
      .limit(200),
    client
      .schema("feed")
      .from("feed_post")
      .select(
        "id,author_account_id,source,body,visibility,moderation_status,created_at",
      )
      .in("moderation_status", ["pending_review", "limited"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
    client
      .schema("feed")
      .from("feed_external_link")
      .select(
        "id,post_id,comment_id,original_url,normalized_url,hostname,review_status,created_at",
      )
      .eq("review_status", "pending")
      .order("created_at", { ascending: true })
      .limit(200),
  ]);
  if (profileReportsResponse.error) throw profileReportsResponse.error;
  const contentReportAvailable = !isMissingContentReportTable(
    contentReportsResponse.error,
  );
  if (contentReportsResponse.error && contentReportAvailable) {
    throw contentReportsResponse.error;
  }
  if (postsResponse.error) throw postsResponse.error;
  const linkReviewAvailable = !isMissingLinkSafetyTable(linksResponse.error);
  if (linksResponse.error && linkReviewAvailable) throw linksResponse.error;

  const linkRows = linksResponse.data ?? [];
  const linkedPostIds = linkRows.flatMap((row) =>
    row.post_id ? [row.post_id] : [],
  );
  const linkedCommentIds = linkRows.flatMap((row) =>
    row.comment_id ? [row.comment_id] : [],
  );
  const reportedPostIds = (contentReportsResponse.data ?? []).flatMap((row) =>
    row.post_id ? [row.post_id] : [],
  );
  const reportedCommentIds = (contentReportsResponse.data ?? []).flatMap(
    (row) => (row.comment_id ? [row.comment_id] : []),
  );
  const allPostIds = Array.from(new Set([...linkedPostIds, ...reportedPostIds]));
  const allCommentIds = Array.from(
    new Set([...linkedCommentIds, ...reportedCommentIds]),
  );
  const [linkedPostsResponse, linkedCommentsResponse] = await Promise.all([
    allPostIds.length > 0
      ? client
          .schema("feed")
          .from("feed_post")
          .select("id,author_account_id,body")
          .in("id", allPostIds)
      : Promise.resolve({ data: [], error: null }),
    allCommentIds.length > 0
      ? client
          .schema("feed")
          .from("feed_comment")
          .select("id,author_account_id,body")
          .in("id", allCommentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (linkedPostsResponse.error) throw linkedPostsResponse.error;
  if (linkedCommentsResponse.error) throw linkedCommentsResponse.error;
  const linkedPosts = new Map(
    (linkedPostsResponse.data ?? []).map((row) => [row.id, row]),
  );
  const linkedComments = new Map(
    (linkedCommentsResponse.data ?? []).map((row) => [row.id, row]),
  );

  const accountIds = Array.from(
    new Set([
      ...(profileReportsResponse.data ?? []).flatMap((row) => [
        row.reporter_account_id,
        row.target_account_id,
      ]),
      ...(contentReportsResponse.data ?? []).flatMap((row) => [
        row.reporter_account_id,
        row.target_author_account_id,
      ]),
      ...(postsResponse.data ?? []).map((row) => row.author_account_id),
      ...(linkedPostsResponse.data ?? []).map((row) => row.author_account_id),
      ...(linkedCommentsResponse.data ?? []).map(
        (row) => row.author_account_id,
      ),
    ]),
  );
  const profiles =
    accountIds.length > 0
      ? await client
          .schema("profile")
          .from("community_profile")
          .select("account_id,display_name")
          .in("account_id", accountIds)
      : { data: [], error: null };
  if (profiles.error) throw profiles.error;
  const names = new Map(
    (profiles.data ?? []).map((profile) => [
      profile.account_id,
      profile.display_name,
    ]),
  );

  return {
    contentReportAvailable,
    linkReviewAvailable,
    links: linkRows.map((row): AdminExternalLink => {
      const content = row.post_id
        ? linkedPosts.get(row.post_id)
        : row.comment_id
          ? linkedComments.get(row.comment_id)
          : undefined;

      return {
        authorName: content
          ? (names.get(content.author_account_id) ?? "알 수 없는 회원")
          : "알 수 없는 회원",
        contentPreview: content?.body ?? "",
        contentType: row.comment_id ? "comment" : "post",
        createdAt: row.created_at,
        hostname: row.hostname,
        id: row.id,
        normalizedUrl: row.normalized_url,
        originalUrl: row.original_url,
        reviewStatus: row.review_status,
      };
    }),
    posts: (postsResponse.data ?? []).map(
      (row): AdminCommunityPost => ({
        authorAccountId: row.author_account_id,
        authorName: names.get(row.author_account_id) ?? "알 수 없는 회원",
        body: row.body,
        createdAt: row.created_at,
        id: row.id,
        moderationStatus: row.moderation_status,
        source: row.source,
        visibility: row.visibility,
      }),
    ),
    reports: [
      ...(profileReportsResponse.data ?? []).map(
        (row): AdminCommunityReport => ({
          contentPreview: null,
          createdAt: row.created_at,
          details: row.details,
          id: row.id,
          kind: "profile",
          reason: row.reason,
          reporterName: names.get(row.reporter_account_id) ?? "회원",
          severity: row.severity,
          status: row.status,
          targetAccountId: row.target_account_id,
          targetContentId: null,
          targetName: names.get(row.target_account_id) ?? "알 수 없는 회원",
          targetType: "profile",
        }),
      ),
      ...(contentReportsResponse.data ?? []).map(
        (row): AdminCommunityReport => {
          const content = row.post_id
            ? linkedPosts.get(row.post_id)
            : row.comment_id
              ? linkedComments.get(row.comment_id)
              : undefined;

          return {
            contentPreview: content?.body ?? "",
            createdAt: row.created_at,
            details: row.details,
            id: row.id,
            kind: "content",
            reason: row.reason,
            reporterName: names.get(row.reporter_account_id) ?? "회원",
            severity: row.severity,
            status: row.status,
            targetAccountId: row.target_author_account_id,
            targetContentId: row.post_id ?? row.comment_id ?? null,
            targetName:
              names.get(row.target_author_account_id) ?? "알 수 없는 회원",
            targetType: row.comment_id ? "comment" : "post",
          };
        },
      ),
    ].sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime(),
    ),
  };
}

function isMissingLinkSafetyTable(
  error: { code?: string; message?: string } | null,
) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("feed_external_link") ||
    false
  );
}

function isMissingContentReportTable(
  error: { code?: string; message?: string } | null,
) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("content_report") ||
    false
  );
}
