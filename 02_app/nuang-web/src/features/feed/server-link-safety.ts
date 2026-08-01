import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendAdminReviewNotification } from "@/features/admin/server-admin-review-notification";
import {
  extractExternalLinks,
  hostnameMatchesDomain,
  type ExternalLinkStatus,
  type FeedExternalLink,
} from "./link-safety";
import { trustedLinkDomainSeeds } from "./trusted-link-domains";

type LinkDomainPolicyRow = {
  allow_subdomains: boolean;
  domain: string;
  id: string;
  status: "blocked" | "suspended" | "verified";
};

type PreparedExternalLink = FeedExternalLink & {
  domainPolicyId: string | null;
  originalUrl: string;
};

export async function prepareExternalLinks({
  client,
  text,
}: {
  client: SupabaseClient;
  text: string;
}): Promise<PreparedExternalLink[]> {
  const extracted = uniqueByNormalizedUrl(extractExternalLinks(text));
  if (extracted.length === 0) return [];

  const policies = await readAndSeedDomainPolicies(client);

  return extracted.map((link) => {
    const policy = findMatchingPolicy(link.hostname, policies);
    const status: ExternalLinkStatus = policy
      ? policy.status === "verified"
        ? "trusted"
        : "blocked"
      : link.status;

    return {
      displayUrl: link.originalUrl,
      domainPolicyId: policy?.id ?? null,
      hostname: link.hostname,
      normalizedUrl: link.normalizedUrl,
      originalUrl: link.originalUrl,
      status,
    };
  });
}

export async function persistExternalLinks({
  client,
  commentId,
  links,
  postId,
}: {
  client: SupabaseClient;
  commentId?: string;
  links: PreparedExternalLink[];
  postId?: string;
}) {
  if (links.length === 0 || (!postId && !commentId)) return;

  const rows = links.map((link) => ({
    comment_id: commentId ?? null,
    domain_policy_id: link.domainPolicyId,
    hostname: link.hostname,
    normalized_url: link.normalizedUrl,
    original_url: link.originalUrl,
    post_id: postId ?? null,
    review_status: link.status,
  }));
  const response = await client
    .schema("feed")
    .from("feed_external_link")
    .insert(rows)
    .select("id,created_at,review_status");

  // The app remains usable while the migration is being rolled out. Without a
  // stored review record, the renderer fails closed and leaves unknown URLs as
  // non-clickable text.
  if (response.error && !isMissingLinkSafetyTable(response.error)) {
    console.error("Unable to persist external link review records", {
      code: response.error.code,
    });
  }

  if (!response.error) {
    const pendingRows = (response.data ?? []).filter(
      (row) => row.review_status === "pending",
    );
    if (pendingRows.length > 0) {
      await sendAdminReviewNotification({
        id: `${postId ?? commentId ?? "link"}-${pendingRows
          .map((row) => String(row.id))
          .join("-")}`,
        kind: "external_link",
        occurredAt: String(
          pendingRows[0]?.created_at ?? new Date().toISOString(),
        ),
      });
    }
  }
}

export async function replaceExternalLinksForPost({
  client,
  links,
  postId,
}: {
  client: SupabaseClient;
  links: PreparedExternalLink[];
  postId: string;
}) {
  const response = await client
    .schema("feed")
    .from("feed_external_link")
    .delete()
    .eq("post_id", postId);

  if (response.error && !isMissingLinkSafetyTable(response.error)) {
    console.error("Unable to replace external link review records", {
      code: response.error.code,
    });
    return;
  }

  await persistExternalLinks({ client, links, postId });
}

export async function readExternalLinksForPosts({
  client,
  postIds,
}: {
  client: SupabaseClient;
  postIds: string[];
}) {
  const linksByPostId = new Map<string, FeedExternalLink[]>();
  if (postIds.length === 0) return linksByPostId;

  const response = await client
    .schema("feed")
    .from("feed_external_link")
    .select(
      "post_id,original_url,normalized_url,hostname,review_status,created_at",
    )
    .in("post_id", postIds)
    .order("created_at", { ascending: true });

  if (response.error || !response.data) return linksByPostId;

  for (const row of response.data) {
    if (!row.post_id) continue;
    const links = linksByPostId.get(row.post_id) ?? [];
    links.push(mapExternalLinkRow(row));
    linksByPostId.set(row.post_id, links);
  }

  return linksByPostId;
}

export async function readExternalLinksForComments({
  client,
  commentIds,
}: {
  client: SupabaseClient;
  commentIds: string[];
}) {
  const linksByCommentId = new Map<string, FeedExternalLink[]>();
  if (commentIds.length === 0) return linksByCommentId;

  const response = await client
    .schema("feed")
    .from("feed_external_link")
    .select(
      "comment_id,original_url,normalized_url,hostname,review_status,created_at",
    )
    .in("comment_id", commentIds)
    .order("created_at", { ascending: true });

  if (response.error || !response.data) return linksByCommentId;

  for (const row of response.data) {
    if (!row.comment_id) continue;
    const links = linksByCommentId.get(row.comment_id) ?? [];
    links.push(mapExternalLinkRow(row));
    linksByCommentId.set(row.comment_id, links);
  }

  return linksByCommentId;
}

export async function seedTrustedLinkDomains(client: SupabaseClient) {
  return readAndSeedDomainPolicies(client);
}

function mapExternalLinkRow(row: {
  hostname: string;
  normalized_url: string;
  original_url: string;
  review_status: string;
}): FeedExternalLink {
  return {
    displayUrl: row.original_url,
    hostname: row.hostname,
    normalizedUrl: row.normalized_url,
    status: isExternalLinkStatus(row.review_status)
      ? row.review_status
      : "pending",
  };
}

async function readAndSeedDomainPolicies(client: SupabaseClient) {
  const response = await client
    .schema("feed")
    .from("link_domain_policy")
    .select("id,domain,status,allow_subdomains");

  if (response.error || !response.data) return [] as LinkDomainPolicyRow[];

  const existing = response.data as LinkDomainPolicyRow[];
  const existingDomains = new Set(existing.map((item) => item.domain));
  const missing = trustedLinkDomainSeeds.filter(
    (item) => !existingDomains.has(item.domain),
  );

  if (missing.length > 0) {
    const inserted = await client
      .schema("feed")
      .from("link_domain_policy")
      .insert(
        missing.map((item) => ({
          allow_preview: false,
          allow_subdomains: item.allowSubdomains,
          category: item.category,
          display_name: item.displayName,
          domain: item.domain,
          review_due_at: new Date(
            Date.now() + 180 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          source: "bundled_seed",
          status: "verified",
          verified_at: new Date().toISOString(),
        })),
      )
      .select("id,domain,status,allow_subdomains");

    if (!inserted.error && inserted.data) {
      existing.push(...(inserted.data as LinkDomainPolicyRow[]));
    }
  }

  return existing;
}

function findMatchingPolicy(
  hostname: string,
  policies: LinkDomainPolicyRow[],
) {
  return policies
    .filter((policy) =>
      hostnameMatchesDomain(
        hostname,
        policy.domain,
        policy.allow_subdomains,
      ),
    )
    .sort((left, right) => right.domain.length - left.domain.length)[0];
}

function uniqueByNormalizedUrl(
  links: ReturnType<typeof extractExternalLinks>,
) {
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.normalizedUrl)) return false;
    seen.add(link.normalizedUrl);
    return true;
  });
}

function isExternalLinkStatus(value: string): value is ExternalLinkStatus {
  return ["approved", "blocked", "pending", "trusted"].includes(value);
}

function isMissingLinkSafetyTable(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("feed_external_link") ||
    false
  );
}
