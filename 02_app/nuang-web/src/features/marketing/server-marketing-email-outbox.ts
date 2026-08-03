import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revealPrivateEmail } from "@/features/account/private-contact-security";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { readMarketingEmailConfig } from "./server-marketing-email-config";
import {
  renderMarketingConsentConfirmationEmail,
  renderMarketingEmail,
  type MarketingEmailContent,
} from "./server-marketing-email-renderer";
import { createMarketingUnsubscribeToken } from "./server-marketing-unsubscribe-token";

type ClaimedCampaignRecipient = {
  account_id: string;
  campaign_id: string;
  id: string;
};

type ClaimedConfirmation = {
  account_id: string;
  id: string;
  original_consented_at: string;
};

type CampaignRow = {
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  eyebrow: string;
  heading: string;
  id: string;
  subject: string;
};

type SendResult = { code?: string; messageId?: string; ok: boolean };

export async function drainMarketingEmailOutbox({ limit = 20 } = {}) {
  const config = readMarketingEmailConfig();
  if (!config.ready) {
    return {
      claimed: 0,
      confirmations: 0,
      failed: 0,
      locked: true,
      ok: false as const,
      sent: 0,
    };
  }
  const client = createSupabaseServiceClient();
  if (!client) {
    return {
      claimed: 0,
      confirmations: 0,
      failed: 0,
      locked: false,
      ok: false as const,
      sent: 0,
    };
  }

  await client
    .schema("consent")
    .rpc("prepare_marketing_consent_confirmations", {
      target_now: new Date().toISOString(),
    });

  const workerToken = randomUUID();
  const [campaignClaim, confirmationClaim] = await Promise.all([
    client.schema("consent").rpc("claim_marketing_email_outbox", {
      target_batch_size: Math.min(Math.max(limit, 1), 50),
      target_worker_token: workerToken,
    }),
    client.schema("consent").rpc("claim_marketing_consent_confirmations", {
      target_batch_size: Math.min(Math.max(Math.ceil(limit / 2), 1), 25),
      target_worker_token: workerToken,
    }),
  ]);

  if (campaignClaim.error || confirmationClaim.error) {
    console.error("Unable to claim marketing email outbox", {
      campaignCode: campaignClaim.error?.code ?? null,
      confirmationCode: confirmationClaim.error?.code ?? null,
    });
    return {
      claimed: 0,
      confirmations: 0,
      failed: 0,
      locked: false,
      ok: false as const,
      sent: 0,
    };
  }

  const campaignRows = Array.isArray(campaignClaim.data)
    ? (campaignClaim.data as ClaimedCampaignRecipient[])
    : [];
  const confirmationRows = Array.isArray(confirmationClaim.data)
    ? (confirmationClaim.data as ClaimedConfirmation[])
    : [];
  let sent = 0;
  let failed = 0;

  for (const row of campaignRows) {
    const result = await deliverCampaignRecipient({ client, row });
    await completeCampaignRecipient({ client, result, row, workerToken });
    if (result.ok) sent += 1;
    else if (result.outcome === "retry") failed += 1;
  }

  for (const row of confirmationRows) {
    const result = await deliverConsentConfirmation({ client, row });
    await completeConsentConfirmation({ client, result, row, workerToken });
    if (result.ok) sent += 1;
    else if (result.outcome === "retry") failed += 1;
  }

  return {
    claimed: campaignRows.length,
    confirmations: confirmationRows.length,
    failed,
    locked: false,
    ok: true as const,
    sent,
  };
}

type DeliveryOutcome = SendResult & {
  outcome: "retry" | "sent" | "skipped" | "suppressed" | "unsubscribed";
};

async function deliverCampaignRecipient({
  client,
  row,
}: {
  client: SupabaseClient;
  row: ClaimedCampaignRecipient;
}): Promise<DeliveryOutcome> {
  const [audience, campaign] = await Promise.all([
    readEligibleRecipient(client, row.account_id),
    client
      .schema("consent")
      .from("marketing_campaign")
      .select("id,subject,eyebrow,heading,body,cta_label,cta_url")
      .eq("id", row.campaign_id)
      .maybeSingle(),
  ]);
  if (!audience.eligible) {
    return { code: audience.code, ok: false, outcome: audience.outcome };
  }
  if (campaign.error || !campaign.data) {
    return { code: "campaign_not_found", ok: false, outcome: "retry" };
  }

  const campaignRow = campaign.data as CampaignRow;
  const unsubscribeUrls = createUnsubscribeUrls(row.account_id);
  const mail = renderMarketingEmail({
    content: normalizeCampaignContent(campaignRow),
    ...unsubscribeUrls,
  });
  const result = await sendResendEmail({
    idempotencyKey: `nuang-marketing-${row.campaign_id}-${row.account_id}`,
    mail,
    to: audience.email,
  });
  return result.ok
    ? { ...result, outcome: "sent" }
    : { ...result, outcome: "retry" };
}

async function deliverConsentConfirmation({
  client,
  row,
}: {
  client: SupabaseClient;
  row: ClaimedConfirmation;
}): Promise<DeliveryOutcome> {
  const audience = await readEligibleRecipient(client, row.account_id);
  if (!audience.eligible) {
    return { code: audience.code, ok: false, outcome: audience.outcome };
  }
  const unsubscribeUrls = createUnsubscribeUrls(row.account_id);
  const mail = renderMarketingConsentConfirmationEmail({
    consentedAt: row.original_consented_at,
    ...unsubscribeUrls,
  });
  const result = await sendResendEmail({
    idempotencyKey: `nuang-marketing-confirmation-${row.id}`,
    mail,
    to: audience.email,
  });
  return result.ok
    ? { ...result, outcome: "sent" }
    : { ...result, outcome: "retry" };
}

async function readEligibleRecipient(
  client: SupabaseClient,
  accountId: string,
) {
  const [audience, contact] = await Promise.all([
    client
      .schema("consent")
      .rpc("resolve_marketing_audience", { p_channel: "email" })
      .eq("account_id", accountId)
      .limit(1),
    client
      .schema("identity")
      .from("contact_profile")
      .select("email_encrypted,email_status,email_verified_at")
      .eq("account_id", accountId)
      .maybeSingle(),
  ]);
  if (audience.error || contact.error) {
    return {
      code: "recipient_check_failed",
      eligible: false as const,
      outcome: "retry" as const,
    };
  }
  if (!audience.data?.length) {
    return {
      code: "recipient_not_eligible",
      eligible: false as const,
      outcome: "skipped" as const,
    };
  }
  if (
    !contact.data?.email_encrypted ||
    contact.data.email_status !== "verified" ||
    !contact.data.email_verified_at
  ) {
    return {
      code: "verified_email_missing",
      eligible: false as const,
      outcome: "skipped" as const,
    };
  }
  try {
    return {
      eligible: true as const,
      email: revealPrivateEmail({
        accountId,
        ciphertext: contact.data.email_encrypted,
      }),
    };
  } catch {
    return {
      code: "recipient_decryption_failed",
      eligible: false as const,
      outcome: "retry" as const,
    };
  }
}

async function completeCampaignRecipient({
  client,
  result,
  row,
  workerToken,
}: {
  client: SupabaseClient;
  result: DeliveryOutcome;
  row: ClaimedCampaignRecipient;
  workerToken: string;
}) {
  const completion = await client
    .schema("consent")
    .rpc("complete_marketing_email_outbox", {
      target_error_code: result.code ?? null,
      target_outbox_id: row.id,
      target_outcome: result.outcome,
      target_provider_message_id: result.messageId ?? null,
      target_worker_token: workerToken,
    });
  if (completion.error) {
    console.error("Unable to complete marketing email claim", {
      code: completion.error.code ?? "database_error",
      outboxId: row.id,
    });
  }
}

async function completeConsentConfirmation({
  client,
  result,
  row,
  workerToken,
}: {
  client: SupabaseClient;
  result: DeliveryOutcome;
  row: ClaimedConfirmation;
  workerToken: string;
}) {
  const completion = await client
    .schema("consent")
    .rpc("complete_marketing_consent_confirmation", {
      target_error_code: result.code ?? null,
      target_outbox_id: row.id,
      target_outcome: result.outcome,
      target_provider_message_id: result.messageId ?? null,
      target_worker_token: workerToken,
    });
  if (completion.error) {
    console.error("Unable to complete marketing confirmation claim", {
      code: completion.error.code ?? "database_error",
      outboxId: row.id,
    });
  }
}

export async function sendMarketingTestEmail({
  content,
  recipient,
}: {
  content: MarketingEmailContent;
  recipient: string;
}) {
  const config = readMarketingEmailConfig();
  if (!config.apiKey || !config.from.includes("@nuang.app")) {
    return { code: "mail_not_configured", ok: false as const };
  }
  const previewToken = createMarketingUnsubscribeToken(
    "00000000-0000-4000-8000-000000000000",
  );
  const mail = renderMarketingEmail({
    content,
    oneClickUnsubscribeUrl: `${config.origin}/api/marketing/unsubscribe?token=${encodeURIComponent(previewToken)}&preview=1`,
    unsubscribeUrl: `${config.origin}/email/unsubscribe?token=${encodeURIComponent(previewToken)}&preview=1`,
  });
  return sendResendEmail({
    idempotencyKey: `nuang-marketing-test-${randomUUID()}`,
    mail,
    to: recipient,
  });
}

async function sendResendEmail({
  idempotencyKey,
  mail,
  to,
}: {
  idempotencyKey: string;
  mail: ReturnType<typeof renderMarketingEmail>;
  to: string;
}): Promise<SendResult> {
  const config = readMarketingEmailConfig();
  if (!config.apiKey) return { code: "mail_not_configured", ok: false };
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: config.from,
      headers: mail.headers,
      html: mail.html,
      reply_to: config.replyTo,
      subject: mail.subject,
      tags: [{ name: "channel", value: "marketing_email" }],
      text: mail.text,
      to: [to],
    }),
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
      "idempotency-key": idempotencyKey.slice(0, 240),
    },
    method: "POST",
  }).catch(() => null);
  if (!response?.ok) {
    return {
      code: response ? `resend_http_${response.status}` : "resend_unreachable",
      ok: false,
    };
  }
  const payload = (await response.json().catch(() => null)) as {
    id?: unknown;
  } | null;
  return typeof payload?.id === "string"
    ? { messageId: payload.id, ok: true }
    : { code: "resend_message_id_missing", ok: false };
}

function createUnsubscribeUrls(accountId: string) {
  const config = readMarketingEmailConfig();
  const token = createMarketingUnsubscribeToken(accountId);
  const encodedToken = encodeURIComponent(token);
  return {
    oneClickUnsubscribeUrl: `${config.origin}/api/marketing/unsubscribe?token=${encodedToken}`,
    unsubscribeUrl: `${config.origin}/email/unsubscribe?token=${encodedToken}`,
  };
}

function normalizeCampaignContent(row: CampaignRow): MarketingEmailContent {
  return {
    body: row.body,
    ctaLabel: row.cta_label,
    ctaUrl: row.cta_url,
    eyebrow: row.eyebrow,
    heading: row.heading,
    subject: row.subject,
  };
}
