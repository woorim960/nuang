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
  status: string;
  subject: string;
};

type SendResult = { code?: string; messageId?: string; ok: boolean };

export async function drainMarketingEmailOutbox({
  limit = 20,
  source = "cron",
}: {
  limit?: number;
  source?: "cron" | "manual";
} = {}) {
  const config = readMarketingEmailConfig();
  const client = createSupabaseServiceClient();
  const runId = randomUUID();
  const startedAt = Date.now();
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
  await startWorkerRun({ client, runId, source });
  if (!config.ready) {
    await finishWorkerRun({
      client,
      errorCode: "runtime_gate_locked",
      runId,
      startedAt,
      status: "locked",
    });
    return {
      claimed: 0,
      confirmations: 0,
      failed: 0,
      locked: true,
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
  const campaignClaim = await client
    .schema("consent")
    .rpc("claim_marketing_email_outbox", {
      target_batch_size: Math.min(Math.max(limit, 1), 50),
      target_worker_token: workerToken,
    });
  const confirmationClaim = await client
    .schema("consent")
    .rpc("claim_marketing_consent_confirmations", {
      target_batch_size: Math.min(Math.max(Math.ceil(limit / 2), 1), 25),
      target_worker_token: workerToken,
    });

  if (campaignClaim.error && confirmationClaim.error) {
    console.error("Unable to claim marketing email outbox", {
      campaignCode: campaignClaim.error?.code ?? null,
      confirmationCode: confirmationClaim.error?.code ?? null,
    });
    await finishWorkerRun({
      client,
      errorCode: campaignClaim.error.code || confirmationClaim.error.code,
      runId,
      startedAt,
      status: "failed",
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

  const campaignRows =
    !campaignClaim.error && Array.isArray(campaignClaim.data)
      ? (campaignClaim.data as ClaimedCampaignRecipient[])
      : [];
  const confirmationRows =
    !confirmationClaim.error && Array.isArray(confirmationClaim.data)
      ? (confirmationClaim.data as ClaimedConfirmation[])
      : [];
  let sent = 0;
  let failed = 0;
  let completionFailed = 0;

  for (const row of campaignRows) {
    const result = await deliverCampaignRecipient({
      client,
      row,
      workerToken,
    }).catch(() => ({
      code: "campaign_delivery_exception",
      ok: false as const,
      outcome: "retry" as const,
    }));
    const completed = await completeCampaignRecipient({
      client,
      result,
      row,
      workerToken,
    });
    if (!completed) completionFailed += 1;
    if (result.ok) sent += 1;
    else if (result.outcome === "retry") failed += 1;
  }

  for (const row of confirmationRows) {
    const result = await deliverConsentConfirmation({
      client,
      row,
      workerToken,
    }).catch(() => ({
      code: "confirmation_delivery_exception",
      ok: false as const,
      outcome: "retry" as const,
    }));
    const completed = await completeConsentConfirmation({
      client,
      result,
      row,
      workerToken,
    });
    if (!completed) completionFailed += 1;
    if (result.ok) sent += 1;
    else if (result.outcome === "retry") failed += 1;
  }

  const degraded =
    completionFailed > 0 ||
    Boolean(campaignClaim.error || confirmationClaim.error);
  await finishWorkerRun({
    claimed: campaignRows.length,
    client,
    completionFailed,
    confirmations: confirmationRows.length,
    errorCode: degraded ? "partial_worker_failure" : null,
    failed,
    runId,
    sent,
    startedAt,
    status: degraded ? "degraded" : "succeeded",
  });

  return {
    claimed: campaignRows.length,
    completionFailed,
    confirmations: confirmationRows.length,
    failed,
    locked: false,
    ok: !degraded,
    sent,
  };
}

type DeliveryOutcome = SendResult & {
  outcome: "retry" | "sent" | "skipped" | "suppressed" | "unsubscribed";
};

async function deliverCampaignRecipient({
  client,
  row,
  workerToken,
}: {
  client: SupabaseClient;
  row: ClaimedCampaignRecipient;
  workerToken: string;
}): Promise<DeliveryOutcome> {
  const authorization = await client
    .schema("consent")
    .rpc("authorize_marketing_email_delivery", {
      target_outbox_id: row.id,
      target_worker_token: workerToken,
    });
  const decision = authorization.data as {
    code?: unknown;
    ok?: unknown;
    outcome?: unknown;
  } | null;
  if (authorization.error || decision?.ok !== true) {
    const outcome = ["retry", "skipped", "suppressed", "unsubscribed"].includes(
      String(decision?.outcome),
    )
      ? (decision?.outcome as DeliveryOutcome["outcome"])
      : "retry";
    return {
      code:
        typeof decision?.code === "string"
          ? decision.code
          : "delivery_authorization_failed",
      ok: false,
      outcome,
    };
  }
  const [audience, campaign] = await Promise.all([
    readEligibleRecipient(client, row.account_id),
    client
      .schema("consent")
      .from("marketing_campaign")
      .select("id,subject,eyebrow,heading,body,cta_label,cta_url,status")
      .eq("id", row.campaign_id)
      .maybeSingle(),
  ]);
  if (!audience.eligible) {
    return { code: audience.code, ok: false, outcome: audience.outcome };
  }
  if (campaign.error || !campaign.data) {
    return { code: "campaign_not_found", ok: false, outcome: "retry" };
  }
  if (campaign.data.status === "paused") {
    return { code: "campaign_paused", ok: false, outcome: "retry" };
  }
  if (!["queued", "sending"].includes(campaign.data.status)) {
    return { code: "campaign_not_sendable", ok: false, outcome: "skipped" };
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
  workerToken,
}: {
  client: SupabaseClient;
  row: ClaimedConfirmation;
  workerToken: string;
}): Promise<DeliveryOutcome> {
  const authorization = await client
    .schema("consent")
    .rpc("authorize_marketing_confirmation_delivery", {
      target_outbox_id: row.id,
      target_worker_token: workerToken,
    });
  const decision = authorization.data as {
    code?: unknown;
    ok?: unknown;
    outcome?: unknown;
  } | null;
  if (authorization.error || decision?.ok !== true) {
    const outcome = ["retry", "skipped", "suppressed", "unsubscribed"].includes(
      String(decision?.outcome),
    )
      ? (decision?.outcome as DeliveryOutcome["outcome"])
      : "retry";
    return {
      code:
        typeof decision?.code === "string"
          ? decision.code
          : "confirmation_authorization_failed",
      ok: false,
      outcome,
    };
  }
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
    return false;
  }
  return true;
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
    return false;
  }
  return true;
}

export async function sendMarketingTestEmail({
  content,
  recipient,
}: {
  content: MarketingEmailContent;
  recipient: string;
}) {
  const config = readMarketingEmailConfig();
  if (!config.apiKey || !config.fromReady || !config.encryptionReady) {
    return { code: "mail_not_configured", ok: false as const };
  }
  try {
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
  } catch {
    return { code: "marketing_test_render_failed", ok: false as const };
  }
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
    signal: AbortSignal.timeout(10_000),
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

async function startWorkerRun({
  client,
  runId,
  source,
}: {
  client: SupabaseClient;
  runId: string;
  source: "cron" | "manual";
}) {
  const result = await client
    .schema("consent")
    .from("marketing_worker_run")
    .insert({ id: runId, source, status: "running" });
  if (result.error && !isMissingOperationsTable(result.error.code)) {
    console.error("Unable to start marketing worker health record", {
      code: result.error.code,
    });
  }
}

async function finishWorkerRun({
  claimed = 0,
  client,
  completionFailed = 0,
  confirmations = 0,
  errorCode = null,
  failed = 0,
  runId,
  sent = 0,
  startedAt,
  status,
}: {
  claimed?: number;
  client: SupabaseClient;
  completionFailed?: number;
  confirmations?: number;
  errorCode?: string | null;
  failed?: number;
  runId: string;
  sent?: number;
  startedAt: number;
  status: "degraded" | "failed" | "locked" | "succeeded";
}) {
  const finishedAt = new Date().toISOString();
  const result = await client
    .schema("consent")
    .from("marketing_worker_run")
    .update({
      claimed_count: claimed,
      completion_failed_count: completionFailed,
      confirmation_count: confirmations,
      error_code: errorCode,
      failed_count: failed,
      finished_at: finishedAt,
      sent_count: sent,
      status,
      updated_at: finishedAt,
    })
    .eq("id", runId);
  if (result.error && !isMissingOperationsTable(result.error.code)) {
    console.error("Unable to complete marketing worker health record", {
      code: result.error.code,
      durationMs: Date.now() - startedAt,
    });
  }
}

function isMissingOperationsTable(code: string | undefined) {
  return ["42P01", "PGRST204", "PGRST205"].includes(code ?? "");
}
