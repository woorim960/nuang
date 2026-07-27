import { NextResponse } from "next/server";
import { z } from "zod";
import { revealPrivateMobilePhone } from "@/features/account/private-contact-security";
import {
  readPrivateContact,
  toPrivateContactPayload,
} from "@/features/account/server-private-contact";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { readGateCRewardCampaignConfiguration } from "@/features/research/gate-c/gate-c-reward-campaign-server";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";

export const runtime = "nodejs";

const adminActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("draw") }),
  z.object({ action: z.literal("reveal"), entryId: z.uuid() }),
  z.object({ action: z.literal("mark_contacted"), entryId: z.uuid() }),
]);

export async function GET() {
  const context = await resolveAdminContext();
  if (!context.ok) return adminFailure(context);

  const campaign = readGateCRewardCampaignConfiguration();
  const [entries, draw] = await Promise.all([
    context.client
      .from("research_gate_c_reward_entry")
      .select("id,account_id,status,created_at,updated_at")
      .eq("campaign_id", campaign.campaignId)
      .order("created_at", { ascending: true }),
    context.client
      .from("research_gate_c_reward_draw")
      .select(
        "id,campaign_id,entrant_count,winner_count,selection_method,executed_at",
      )
      .eq("campaign_id", campaign.campaignId)
      .maybeSingle(),
  ]);

  if (entries.error || draw.error) {
    return NextResponse.json(
      { error: "reward_admin_read_failed" },
      { status: 503 },
    );
  }

  const counts = Object.fromEntries(
    ["entered", "winner", "not_selected", "contacted", "invalid", "withdrawn"].map(
      (status) => [
        status,
        (entries.data ?? []).filter((entry) => entry.status === status).length,
      ],
    ),
  );
  const winnerRows = draw.data
    ? (entries.data ?? []).filter(
        (entry) => entry.status === "winner" || entry.status === "contacted",
      )
    : [];
  const winners = await Promise.all(
    winnerRows.map(async (entry) => {
      if (!entry.account_id) return null;
      const contact = await readPrivateContact({
        accountId: entry.account_id,
        client: context.client,
      });
      if (!contact.ok) return null;
      return {
        contact: toPrivateContactPayload(contact.data),
        enteredAt: entry.created_at,
        id: entry.id,
        status: entry.status,
      };
    }),
  );

  return NextResponse.json(
    {
      campaign: campaign.publicCampaign,
      counts,
      draw: draw.data
        ? {
            entrantCount: draw.data.entrant_count,
            executedAt: draw.data.executed_at,
            id: draw.data.id,
            selectionMethod: draw.data.selection_method,
            winnerCount: draw.data.winner_count,
          }
        : null,
      ok: true,
      winners: winners.filter(Boolean),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return NextResponse.json({ error: "cross_site_request" }, { status: 403 });
  }

  const parsed = adminActionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_admin_action" }, { status: 422 });
  }

  const context = await resolveAdminContext();
  if (!context.ok) return adminFailure(context);

  const campaign = readGateCRewardCampaignConfiguration();

  if (parsed.data.action === "draw") {
    const previewEnabled =
      process.env.GATE_C_REWARD_DRAW_PREVIEW_ENABLED?.trim().toLowerCase() ===
      "true";
    if (!previewEnabled && new Date() < campaign.drawAt) {
      return NextResponse.json(
        {
          availableAt: campaign.drawAt.toISOString(),
          error: "reward_draw_not_open",
        },
        { status: 409 },
      );
    }

    const response = await context.client.rpc("draw_gate_c_reward_winners", {
      p_admin_account_id: context.accountId,
      p_campaign_id: campaign.campaignId,
      p_winner_count: campaign.publicCampaign.winnerCount,
    });
    if (response.error) {
      return NextResponse.json(
        { error: "reward_draw_failed", message: response.error.message },
        { status: 503 },
      );
    }

    return NextResponse.json({ draw: response.data?.[0] ?? null, ok: true });
  }

  const entry = await context.client
    .from("research_gate_c_reward_entry")
    .select("id,account_id,status")
    .eq("id", parsed.data.entryId)
    .eq("campaign_id", campaign.campaignId)
    .in("status", ["winner", "contacted"])
    .maybeSingle();

  if (entry.error || !entry.data?.account_id) {
    return NextResponse.json(
      { error: "reward_winner_not_found" },
      { status: 404 },
    );
  }

  if (parsed.data.action === "mark_contacted") {
    const updated = await context.client.rpc("admin_mark_reward_contacted", {
      target_admin_account_id: context.accountId,
      target_campaign_id: campaign.campaignId,
      target_entry_id: entry.data.id,
    });
    if (updated.error) {
      return NextResponse.json(
        {
          error: "reward_contact_status_failed",
          message: ["42883", "PGRST202"].includes(updated.error.code ?? "")
            ? "최신 DB 마이그레이션을 확인해 주세요."
            : undefined,
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  const contact = await readPrivateContact({
    accountId: entry.data.account_id,
    client: context.client,
  });
  if (
    !contact.ok ||
    contact.data.mobilePhoneStatus === "missing" ||
    !contact.data.mobilePhoneCiphertext
  ) {
    return NextResponse.json(
      { error: "winner_contact_unavailable" },
      { status: 409 },
    );
  }

  let mobilePhone: string;
  try {
    mobilePhone = revealPrivateMobilePhone({
      accountId: entry.data.account_id,
      ciphertext: contact.data.mobilePhoneCiphertext,
    });
  } catch {
    return NextResponse.json(
      { error: "winner_contact_unavailable" },
      { status: 503 },
    );
  }

  const audit = await writeAdminAudit(
    context,
    "reward_winner_contact_revealed",
    entry.data.id,
  );
  if (audit.error) {
    return NextResponse.json(
      { error: "winner_contact_audit_failed" },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { mobilePhone, ok: true },
    { headers: { "cache-control": "private, no-store" } },
  );
}

function adminFailure(context: Awaited<ReturnType<typeof resolveAdminContext>>) {
  if ("response" in context && context.response) return context.response;
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

async function writeAdminAudit(
  context: Extract<
    Awaited<ReturnType<typeof resolveAdminContext>>,
    { ok: true }
  >,
  action: string,
  entryId: string,
) {
  return context.client.schema("audit").from("admin_audit_log").insert({
    action,
    admin_account_id: context.accountId,
    metadata: { campaign_id: "gate-c-review-2026-10-01" },
    target_id: entryId,
    target_table: "public.research_gate_c_reward_entry",
  });
}
