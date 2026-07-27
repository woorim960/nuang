import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  adminCommunityContentStatuses,
  adminCommunityContentTypes,
} from "@/features/admin/admin-community-content-contract";

export type AdminCommunityContentType =
  (typeof adminCommunityContentTypes)[number];
export type AdminCommunityContentStatus =
  (typeof adminCommunityContentStatuses)[number];

export type AdminCommunityContentItem = {
  body: string;
  closedAt: string | null;
  contentType: AdminCommunityContentType;
  createdAt: string;
  id: string;
  isFeatured: boolean;
  options: Array<{ key: string; label: string }>;
  pollId: string | null;
  postId: string | null;
  prompt: string;
  promptKey: string;
  publishedAt: string | null;
  replyCount: number;
  revision: number;
  responseClosesAt: string | null;
  scheduledFor: string | null;
  status: AdminCommunityContentStatus;
  title: string;
  updatedAt: string;
  voteCount: number;
};

export type AdminCommunityContentDashboard = {
  counts: Record<AdminCommunityContentStatus, number>;
  items: AdminCommunityContentItem[];
};

export async function readAdminCommunityContent(
  client: SupabaseClient,
): Promise<AdminCommunityContentDashboard> {
  const response = await client.rpc("get_admin_community_content_dashboard");
  if (response.error) throw response.error;
  if (!isCommunityContentDashboard(response.data)) {
    throw new Error("invalid_admin_community_content_dashboard");
  }
  const dashboard = response.data;
  const ids = dashboard.items.map((item) => item.id);
  if (ids.length === 0) return dashboard;

  const lifecycleResponse = await client
    .schema("feed")
    .from("official_community_content")
    .select("id,is_featured,response_closes_at")
    .in("id", ids);

  if (lifecycleResponse.error || !lifecycleResponse.data) {
    return {
      ...dashboard,
      items: dashboard.items.map((item) => ({
        ...item,
        isFeatured: false,
        responseClosesAt: null,
      })),
    };
  }

  const lifecycleById = new Map(
    lifecycleResponse.data.map((row) => [row.id, row]),
  );

  return {
    ...dashboard,
    items: dashboard.items.map((item) => {
      const lifecycle = lifecycleById.get(item.id);
      return {
        ...item,
        isFeatured: lifecycle?.is_featured === true,
        responseClosesAt:
          typeof lifecycle?.response_closes_at === "string"
            ? lifecycle.response_closes_at
            : null,
      };
    }),
  };
}

export function isCommunityContentDashboard(
  value: unknown,
): value is AdminCommunityContentDashboard {
  if (
    !isRecord(value) ||
    !isRecord(value.counts) ||
    !Array.isArray(value.items)
  ) {
    return false;
  }
  const counts = value.counts;
  if (
    !adminCommunityContentStatuses.every(
      (status) =>
        typeof counts[status] === "number" && Number.isFinite(counts[status]),
    )
  ) {
    return false;
  }
  return value.items.every(isCommunityContentItem);
}

function isCommunityContentItem(
  value: unknown,
): value is AdminCommunityContentItem {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.prompt !== "string" ||
    typeof value.body !== "string" ||
    typeof value.promptKey !== "string" ||
    typeof value.revision !== "number" ||
    typeof value.voteCount !== "number" ||
    typeof value.replyCount !== "number" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string" ||
    !adminCommunityContentTypes.includes(
      value.contentType as AdminCommunityContentType,
    ) ||
    !adminCommunityContentStatuses.includes(
      value.status as AdminCommunityContentStatus,
    ) ||
    !Array.isArray(value.options)
  ) {
    return false;
  }
  return value.options.every(
    (option) =>
      isRecord(option) &&
      typeof option.key === "string" &&
      typeof option.label === "string",
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
