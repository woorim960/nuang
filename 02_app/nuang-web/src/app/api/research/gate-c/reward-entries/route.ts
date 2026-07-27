import { NextResponse } from "next/server";
import { ensureAccountForUser } from "@/features/account/server-writes";
import {
  readPrivateContact,
  toPrivateContactPayload,
} from "@/features/account/server-private-contact";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { readGateCRewardCampaignConfiguration } from "@/features/research/gate-c/gate-c-reward-campaign-server";
import { createGateCRewardReceiptLookupHash } from "@/features/research/gate-c/gate-c-reward-contact-security";
import { gateCRewardEntryRequestSchema } from "@/features/research/gate-c/gate-c-reward-entry-contract";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET() {
  const context = await getRewardAccountContext();
  if (!context.ok) return context.response;

  const campaign = readGateCRewardCampaignConfiguration();
  const [contact, entry] = await Promise.all([
    readPrivateContact({
      accountId: context.accountId,
      client: context.client,
    }),
    context.client
      .from("research_gate_c_reward_entry")
      .select("id,status,created_at,updated_at")
      .eq("campaign_id", campaign.campaignId)
      .eq("account_id", context.accountId)
      .maybeSingle(),
  ]);

  if (!contact.ok || entry.error) {
    return NextResponse.json(
      { error: "reward_entry_read_failed" },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      campaign: campaign.publicCampaign,
      contact: toPrivateContactPayload(contact.data),
      entry: entry.data
        ? {
            createdAt: entry.data.created_at,
            id: entry.data.id,
            status: entry.data.status,
            updatedAt: entry.data.updated_at,
          }
        : null,
      ok: true,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return NextResponse.json({ error: "cross_site_request" }, { status: 403 });
  }

  const parsedBody = gateCRewardEntryRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedBody.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  const campaign = readGateCRewardCampaignConfiguration();
  if (
    !campaign.publicCampaign.entryEnabled ||
    campaign.publicCampaign.status !== "active"
  ) {
    return NextResponse.json(
      { error: "reward_campaign_closed" },
      { status: 409 },
    );
  }

  const context = await getRewardAccountContext();
  if (!context.ok) return context.response;
  const serviceClient = context.client;

  const sessionResponse = await serviceClient
    .from("research_gate_c_session")
    .select("id,status")
    .eq("public_receipt_id", parsedBody.data.publicReceiptId)
    .eq("participant_code", parsedBody.data.participantCode)
    .maybeSingle();

  if (sessionResponse.error) {
    return NextResponse.json(
      { error: "research_session_read_failed" },
      { status: 503 },
    );
  }
  if (!sessionResponse.data || sessionResponse.data.status !== "completed") {
    return NextResponse.json(
      { error: "completed_participation_required" },
      { status: 422 },
    );
  }

  const contact = await readPrivateContact({
    accountId: context.accountId,
    client: serviceClient,
  });
  if (!contact.ok) {
    return NextResponse.json(
      { error: "reward_contact_read_failed" },
      { status: 503 },
    );
  }
  if (
    contact.data.mobilePhoneStatus === "missing" ||
    !contact.data.mobilePhoneLookupHash
  ) {
    return NextResponse.json(
      { error: "profile_mobile_phone_required" },
      { status: 422 },
    );
  }

  const existing = await serviceClient
    .from("research_gate_c_reward_entry")
    .select("id,status")
    .eq("campaign_id", campaign.campaignId)
    .eq("account_id", context.accountId)
    .maybeSingle();
  if (existing.error) {
    return NextResponse.json(
      { error: "reward_entry_read_failed" },
      { status: 503 },
    );
  }

  const row = {
    account_id: context.accountId,
    campaign_id: campaign.campaignId,
    consent_version: parsedBody.data.consentVersion,
    contact_ciphertext: null,
    contact_lookup_hash: contact.data.mobilePhoneLookupHash,
    contact_method: campaign.contactMethod,
    receipt_lookup_hash: createGateCRewardReceiptLookupHash(
      campaign.campaignId,
      parsedBody.data.publicReceiptId,
    ),
    retention_until: campaign.entryRetentionUntil.toISOString(),
    status: "entered",
    updated_at: new Date().toISOString(),
    withdrawal_secret_hash: null,
  };
  const writeResponse =
    existing.data?.status === "withdrawn"
      ? await serviceClient
          .from("research_gate_c_reward_entry")
          .update(row)
          .eq("id", existing.data.id)
          .select("id")
          .single()
      : existing.data
        ? { data: { id: existing.data.id }, error: null }
        : await serviceClient
            .from("research_gate_c_reward_entry")
            .insert(row)
            .select("id")
            .single();

  if (writeResponse.error?.code === "23505") {
    return NextResponse.json(
      { error: "reward_entry_duplicate" },
      { status: 409 },
    );
  }
  if (writeResponse.error || !writeResponse.data) {
    return NextResponse.json(
      { error: "reward_entry_create_failed" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    announcementLabel: campaign.publicCampaign.announcementLabel,
    contact: toPrivateContactPayload(contact.data),
    entryId: writeResponse.data.id,
    ok: true,
  });
}

export async function DELETE(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return NextResponse.json({ error: "cross_site_request" }, { status: 403 });
  }

  const context = await getRewardAccountContext();
  if (!context.ok) return context.response;
  const campaign = readGateCRewardCampaignConfiguration();
  const updateResponse = await context.client
    .from("research_gate_c_reward_entry")
    .update({
      status: "withdrawn",
      updated_at: new Date().toISOString(),
    })
    .eq("campaign_id", campaign.campaignId)
    .eq("account_id", context.accountId)
    .in("status", ["entered", "winner"])
    .select("id");

  if (updateResponse.error) {
    return NextResponse.json(
      { error: "reward_entry_withdrawal_failed" },
      { status: 503 },
    );
  }
  if (updateResponse.data.length !== 1) {
    return NextResponse.json(
      { error: "reward_entry_not_found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}

async function getRewardAccountContext() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth;

  const client = createSupabaseServiceClient();
  if (!client) {
    return {
      ok: false as const,
      response: createApiClosedResponse("supabase_env_missing"),
    };
  }

  const account = await ensureAccountForUser(client, auth.user);
  if (!account.ok) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "account_unavailable" },
        { status: 503 },
      ),
    };
  }

  return {
    accountId: account.accountId,
    client,
    ok: true as const,
  };
}
