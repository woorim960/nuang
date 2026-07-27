import { NextResponse } from "next/server";
import { ensureAccountForUser } from "@/features/account/server-writes";
import {
  readPrivateContact,
  toPrivateContactPayload,
} from "@/features/account/server-private-contact";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { readGateCRewardCampaignConfiguration } from "@/features/research/gate-c/gate-c-reward-campaign-server";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const client = createSupabaseServiceClient();
  if (!client) return createApiClosedResponse("supabase_env_missing");

  const account = await ensureAccountForUser(client, auth.user);
  if (!account.ok) {
    return NextResponse.json(
      { error: "account_unavailable" },
      { status: 503 },
    );
  }

  const campaign = readGateCRewardCampaignConfiguration();
  const [contact, entries] = await Promise.all([
    readPrivateContact({ accountId: account.accountId, client }),
    client
      .from("research_gate_c_reward_entry")
      .select("id,campaign_id,status,created_at,updated_at")
      .eq("account_id", account.accountId)
      .order("created_at", { ascending: false }),
  ]);

  if (!contact.ok || entries.error) {
    return NextResponse.json(
      { error: "account_events_read_failed" },
      { status: 503 },
    );
  }

  const now = new Date();
  const events = (entries.data ?? []).map((entry) => {
    const isCurrentCampaign = entry.campaign_id === campaign.campaignId;
    const privateStatus =
      entry.status === "winner" ||
      entry.status === "not_selected" ||
      entry.status === "contacted"
        ? entry.status
        : null;
    const status =
      isCurrentCampaign &&
      privateStatus &&
      now < campaign.announcementAt
        ? "entered"
        : entry.status;

    return {
      announcementLabel: isCurrentCampaign
        ? campaign.publicCampaign.announcementLabel
        : null,
      canWithdraw: entry.status === "entered" || entry.status === "winner",
      enteredAt: entry.created_at,
      id: entry.id,
      prize: isCurrentCampaign
        ? campaign.publicCampaign.prize
        : "뉴앙 이벤트 혜택",
      status,
      title: isCurrentCampaign
        ? "뉴앙 질문 검토 이벤트"
        : "뉴앙 참여 이벤트",
      updatedAt: entry.updated_at,
    };
  });

  return NextResponse.json(
    {
      contact: toPrivateContactPayload(contact.data),
      events,
      ok: true,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
