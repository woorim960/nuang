import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdvertisingInquiryWriteInput } from "@/features/advertising/advertising-inquiry-contract";
import {
  createAdvertisingDuplicateHash,
  createAdvertisingEmailBlindIndex,
  createAdvertisingIdempotencyHash,
  createAdvertisingPublicReference,
  createAdvertisingRequestFingerprint,
  maskAdvertisingEmail,
  normalizeAdvertisingEmail,
  protectAdvertisingInquiryValue,
  revealAdvertisingInquiryValue,
} from "@/features/advertising/server-advertising-inquiry-security";

type SubmitRpcData = {
  code?: unknown;
  created?: unknown;
  createdAt?: unknown;
  duplicate?: unknown;
  inquiryId?: unknown;
  ok?: unknown;
  publicReference?: unknown;
};

export type SubmitAdvertisingInquiryResult =
  | {
      created: boolean;
      createdAt: string;
      duplicate: boolean;
      inquiryId: string;
      ok: true;
      publicReference: string;
    }
  | {
      code: "database_error" | "rate_limited" | "server_configuration_error";
      ok: false;
    };

export async function submitAdvertisingInquiry({
  client,
  input,
  request,
}: {
  client: SupabaseClient;
  input: AdvertisingInquiryWriteInput;
  request: Request;
}): Promise<SubmitAdvertisingInquiryResult> {
  const inquiryId = randomUUID();
  const normalizedEmail = normalizeAdvertisingEmail(input.workEmail);
  const riskFlags = createRiskFlags(input.formStartedAt);
  const initialStatus = riskFlags.length > 0 ? "spam_review" : "received";
  const protectedInput = {
    contactEmail: protectAdvertisingInquiryValue({
      field: "contact_email",
      inquiryId,
      value: normalizedEmail,
    }),
    contactName: protectAdvertisingInquiryValue({
      field: "contact_name",
      inquiryId,
      value: input.contactName,
    }),
    contactPhone: input.phone
      ? protectAdvertisingInquiryValue({
          field: "contact_phone",
          inquiryId,
          value: input.phone,
        })
      : null,
    details: protectAdvertisingInquiryValue({
      field: "details",
      inquiryId,
      value: input.details,
    }),
    outboxRecipient: protectAdvertisingInquiryValue({
      field: "outbox_recipient",
      inquiryId,
      value: normalizedEmail,
    }),
  };

  const requestFingerprint = createAdvertisingRequestFingerprint(request);
  const emailBlindIndex = createAdvertisingEmailBlindIndex(normalizedEmail);
  const duplicateHash = createAdvertisingDuplicateHash({
    companyName: input.companyName,
    details: input.details,
    promotedOffering: input.promotedOffering,
    workEmail: normalizedEmail,
  });
  const idempotencyHash = createAdvertisingIdempotencyHash(
    input.idempotencyKey,
  );

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const publicReference = createAdvertisingPublicReference();
    const { data, error } = await client.rpc(
      "submit_advertising_inquiry_atomic",
      {
        target_budget_band: input.budgetBand,
        target_campaign_objective: input.campaignObjective,
        target_company_name: input.companyName,
        target_contact_email_blind_index: emailBlindIndex,
        target_contact_email_ciphertext: protectedInput.contactEmail,
        target_contact_email_masked: maskAdvertisingEmail(normalizedEmail),
        target_contact_name_ciphertext: protectedInput.contactName,
        target_contact_phone_ciphertext: protectedInput.contactPhone,
        target_creative_readiness: input.creativeReadiness,
        target_desired_end_date: input.desiredEndDate ?? null,
        target_desired_start_date: input.desiredStartDate ?? null,
        target_details_ciphertext: protectedInput.details,
        target_duplicate_hash: duplicateHash,
        target_id: inquiryId,
        target_idempotency_hash: idempotencyHash,
        target_initial_status: initialStatus,
        target_inquirer_recipient_ciphertext: protectedInput.outboxRecipient,
        target_inquiry_type: input.inquiryType,
        target_marketing_consent: input.marketingConsent,
        target_preferred_placement: input.preferredPlacement,
        target_privacy_consent_version: input.consentDocumentVersion,
        target_privacy_consented_at: new Date().toISOString(),
        target_promoted_offering: input.promotedOffering,
        target_public_reference: publicReference,
        target_request_fingerprint: requestFingerprint,
        target_risk_flags: riskFlags,
        target_schedule_mode: input.scheduleMode,
        target_source_path: input.sourcePath ?? "/advertise/inquiry",
        target_target_audience: input.targetAudience,
        target_website_url: input.websiteUrl ?? null,
      },
    );

    if (error) {
      const isReferenceCollision =
        error.code === "23505" &&
        String(error.message).includes("public_reference");
      if (isReferenceCollision && attempt === 0) continue;
      return { code: "database_error", ok: false };
    }

    const result = data as SubmitRpcData | null;
    if (result?.ok === false && result.code === "rate_limited") {
      return { code: "rate_limited", ok: false };
    }
    if (
      result?.ok !== true ||
      typeof result.inquiryId !== "string" ||
      typeof result.publicReference !== "string" ||
      typeof result.createdAt !== "string"
    ) {
      return { code: "database_error", ok: false };
    }

    return {
      created: result.created === true,
      createdAt: result.createdAt,
      duplicate: result.duplicate === true,
      inquiryId: result.inquiryId,
      ok: true,
      publicReference: result.publicReference,
    };
  }

  return { code: "database_error", ok: false };
}

export async function listAdvertisingInquiryQueue({
  client,
  limit = 100,
  status,
}: {
  client: SupabaseClient;
  limit?: number;
  status?: string;
}) {
  let query = client
    .from("advertising_inquiry")
    .select(
      "id,public_reference,company_name,contact_email_masked,inquiry_type,budget_band,desired_start_date,desired_end_date,schedule_mode,status,priority,assigned_admin_account_id,first_response_due_at,first_response_at,next_action_at,risk_flags,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200));

  if (status) query = query.eq("status", status);
  return query;
}

export async function getAdvertisingInquiryDetail({
  adminAccountId,
  client,
  inquiryId,
}: {
  adminAccountId: string;
  client: SupabaseClient;
  inquiryId: string;
}) {
  const accessRecord = await client.rpc(
    "admin_record_advertising_inquiry_sensitive_access",
    {
      target_admin_account_id: adminAccountId,
      target_inquiry_id: inquiryId,
    },
  );
  if (accessRecord.error) {
    return { data: null, error: accessRecord.error };
  }

  const result = await client
    .from("advertising_inquiry")
    .select("*")
    .eq("id", inquiryId)
    .maybeSingle();

  if (result.error || !result.data) return result;
  const row = result.data as Record<string, unknown>;
  const contactNameCiphertext = readString(row.contact_name_ciphertext);
  const contactEmailCiphertext = readString(row.contact_email_ciphertext);
  const contactPhoneCiphertext = readNullableString(
    row.contact_phone_ciphertext,
  );
  const detailsCiphertext = readString(row.details_ciphertext);

  return {
    data: {
      ...row,
      contact_email: revealAdvertisingInquiryValue({
        ciphertext: contactEmailCiphertext,
        field: "contact_email",
        inquiryId,
      }),
      contact_name: revealAdvertisingInquiryValue({
        ciphertext: contactNameCiphertext,
        field: "contact_name",
        inquiryId,
      }),
      contact_phone: contactPhoneCiphertext
        ? revealAdvertisingInquiryValue({
            ciphertext: contactPhoneCiphertext,
            field: "contact_phone",
            inquiryId,
          })
        : null,
      details: revealAdvertisingInquiryValue({
        ciphertext: detailsCiphertext,
        field: "details",
        inquiryId,
      }),
      contact_email_ciphertext: undefined,
      contact_name_ciphertext: undefined,
      contact_phone_ciphertext: undefined,
      details_ciphertext: undefined,
    },
    error: null,
  };
}

function createRiskFlags(formStartedAt: string | undefined) {
  if (!formStartedAt) return [];
  const elapsed = Date.now() - Date.parse(formStartedAt);
  if (elapsed < -5 * 60 * 1_000) return ["client_time_in_future"];
  if (elapsed >= 0 && elapsed < 2_000) return ["submitted_too_fast"];
  return [];
}

function readString(value: unknown) {
  if (typeof value !== "string") throw new Error("Invalid encrypted field");
  return value;
}

function readNullableString(value: unknown) {
  return value === null ? null : readString(value);
}
