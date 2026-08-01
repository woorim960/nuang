import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { readGateCRewardCampaignConfiguration } from "@/features/research/gate-c/gate-c-reward-campaign-server";

export type AdminOverviewData = {
  audit: Array<{
    action: string;
    createdAt: string;
    id: string;
    targetTable: string | null;
  }>;
  counts: {
    activeMembers: number | null;
    completedResearch: number | null;
    contentReleases: number | null;
    customerFeedback: number | null;
    eventEntries: number | null;
    newMembers: number | null;
    pendingPosts: number | null;
    qualitySignals: number | null;
    queuedReports: number | null;
    reportFeedback: number | null;
    researchReviews: number | null;
  };
  event: {
    drawCompleted: boolean;
    winnerCount: number;
  };
  generatedAt: string;
  unavailableModules: string[];
};

export async function readAdminOverview(
  client: SupabaseClient,
): Promise<AdminOverviewData> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000).toISOString();
  const campaign = readGateCRewardCampaignConfiguration();
  const queries = await Promise.all([
    count(
      client
        .schema("identity")
        .from("account")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .is("deleted_at", null),
      "회원",
    ),
    count(
      client
        .schema("identity")
        .from("account")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo)
        .is("deleted_at", null),
      "신규 회원",
    ),
    count(
      client
        .schema("feed")
        .from("feed_post")
        .select("id", { count: "exact", head: true })
        .eq("moderation_status", "pending_review")
        .is("deleted_at", null),
      "게시물",
    ),
    countOpenCommunityReports(client),
    count(
      client
        .from("product_feedback")
        .select("id", { count: "exact", head: true })
        .in("status", ["received", "reviewing"]),
      "고객 의견",
    ),
    count(
      client
        .schema("assessment")
        .from("quality_observation_review_summary")
        .select("assessment_slug", { count: "exact", head: true })
        .in("priority", ["high", "medium"]),
      "검사 품질",
    ),
    count(
      client
        .schema("report")
        .from("core_result_feedback")
        .select("id", { count: "exact", head: true })
        .in("status", ["received", "reviewing"]),
      "결과 문장",
    ),
    count(
      client
        .from("research_gate_c_session")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
      "연구 참여",
    ),
    count(
      client
        .from("research_gate_c_item_review_queue")
        .select("study_item_id", { count: "exact", head: true })
        .eq("recommendation_status", "review_required"),
      "연구 검토",
    ),
    count(
      client
        .from("research_gate_c_reward_entry")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.campaignId)
        .eq("status", "entered"),
      "이벤트",
    ),
    countContentReleases(client),
  ]);

  const [auditResponse, drawResponse] = await Promise.all([
    client
      .schema("audit")
      .from("admin_audit_log")
      .select("id,action,target_table,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    client
      .from("research_gate_c_reward_draw")
      .select("id")
      .eq("campaign_id", campaign.campaignId)
      .maybeSingle(),
  ]);

  const unavailableModules = Array.from(
    new Set(queries.filter((item) => item.error).map((item) => item.label)),
  );
  if (auditResponse.error) unavailableModules.push("운영 기록");
  if (drawResponse.error) unavailableModules.push("추첨 상태");

  return {
    audit: (auditResponse.data ?? []).map((row) => ({
      action: row.action,
      createdAt: row.created_at,
      id: row.id,
      targetTable: row.target_table,
    })),
    counts: {
      activeMembers: queries[0].value,
      newMembers: queries[1].value,
      pendingPosts: queries[2].value,
      queuedReports: queries[3].value,
      customerFeedback: queries[4].value,
      qualitySignals: queries[5].value,
      reportFeedback: queries[6].value,
      completedResearch: queries[7].value,
      researchReviews: queries[8].value,
      eventEntries: queries[9].value,
      contentReleases: queries[10].value,
    },
    event: {
      drawCompleted: Boolean(drawResponse.data),
      winnerCount: campaign.publicCampaign.winnerCount,
    },
    generatedAt: new Date().toISOString(),
    unavailableModules,
  };
}

async function count(
  query: PromiseLike<{ count: number | null; error: unknown }>,
  label: string,
) {
  const response = await query;
  return {
    error: response.error,
    label,
    value: response.error ? null : (response.count ?? 0),
  };
}

async function countContentReleases(client: SupabaseClient) {
  const rpc = await client.rpc("get_admin_trait_map_content_dashboard");
  if (
    !rpc.error &&
    rpc.data &&
    typeof rpc.data === "object" &&
    !Array.isArray(rpc.data) &&
    Array.isArray((rpc.data as Record<string, unknown>).releases)
  ) {
    return {
      error: null,
      label: "콘텐츠",
      value: (rpc.data as { releases: unknown[] }).releases.length,
    };
  }

  return count(
    client
      .schema("trait_map")
      .from("content_release")
      .select("release_id", { count: "exact", head: true })
      .in("status", ["draft", "in_review", "approved", "published"]),
    "콘텐츠",
  );
}

async function countOpenCommunityReports(client: SupabaseClient) {
  const [profiles, contents] = await Promise.all([
    client
      .schema("feed")
      .from("profile_report")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "in_review", "action_required"]),
    client
      .schema("feed")
      .from("content_report")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "in_review", "action_required"]),
  ]);

  return {
    error: profiles.error ?? contents.error,
    label: "신고",
    value:
      profiles.error || contents.error
        ? null
        : (profiles.count ?? 0) + (contents.count ?? 0),
  };
}
