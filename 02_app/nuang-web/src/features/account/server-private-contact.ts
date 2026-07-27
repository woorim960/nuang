import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type PrivateContactPayload,
  type PrivateContactSource,
  privateContactConsentVersion,
  privateContactMarketingConsentVersion,
  privateEmailRegistrationVersion,
} from "@/features/account/private-contact-contract";
import {
  maskPrivateEmail,
  maskKoreanMobilePhone,
  protectPrivateEmail,
  protectPrivateMobilePhone,
  revealPrivateEmail,
  revealPrivateMobilePhone,
} from "@/features/account/private-contact-security";

const contactSelect =
  "account_id,email_encrypted,email_hash,email_status,email_source,email_registration_version,email_registered_at,email_updated_at,email_verified_at,mobile_phone_ciphertext,mobile_phone_lookup_hash,mobile_phone_status,mobile_phone_source,mobile_phone_consent_version,mobile_phone_registered_at,mobile_phone_updated_at,mobile_phone_verified_at";

export type PrivateContactRecord = {
  accountId: string;
  emailEncrypted: string | null;
  emailHash: string | null;
  emailRegisteredAt: string | null;
  emailStatus: "missing" | "unverified" | "verified";
  emailUpdatedAt: string | null;
  emailVerifiedAt: string | null;
  mobilePhoneCiphertext: string | null;
  mobilePhoneLookupHash: string | null;
  mobilePhoneRegisteredAt: string | null;
  mobilePhoneStatus: "missing" | "unverified" | "verified";
  mobilePhoneUpdatedAt: string | null;
};

export async function readPrivateContact({
  accountId,
  client,
}: {
  accountId: string;
  client: SupabaseClient;
}) {
  const response = await client
    .schema("identity")
    .from("contact_profile")
    .select(contactSelect)
    .eq("account_id", accountId)
    .maybeSingle();

  if (response.error) {
    return { code: "contact_read_failed" as const, ok: false as const };
  }

  return {
    data: normalizePrivateContact(accountId, response.data),
    ok: true as const,
  };
}

export async function savePrivateEmail({
  accountId,
  client,
  email,
  source,
}: {
  accountId: string;
  client: SupabaseClient;
  email: string;
  source: PrivateContactSource;
}) {
  const protectedEmail = protectPrivateEmail({
    accountId,
    value: email,
  });
  const existing = await readPrivateContact({ accountId, client });
  if (!existing.ok) return existing;

  const now = new Date().toISOString();
  const response = await client
    .schema("identity")
    .from("contact_profile")
    .upsert(
      {
        account_id: accountId,
        email_encrypted: protectedEmail.ciphertext,
        email_hash: protectedEmail.lookupHash,
        email_registered_at: existing.data.emailRegisteredAt ?? now,
        email_registration_version: privateEmailRegistrationVersion,
        email_source: source,
        email_status: "unverified",
        email_updated_at: now,
        email_verified_at: null,
        updated_at: now,
      },
      { onConflict: "account_id" },
    )
    .select(contactSelect)
    .single();

  if (response.error?.code === "23505") {
    return { code: "email_in_use" as const, ok: false as const };
  }
  if (response.error || !response.data) {
    return { code: "contact_write_failed" as const, ok: false as const };
  }

  return {
    data: normalizePrivateContact(accountId, response.data),
    ok: true as const,
  };
}

export async function savePrivateMobilePhone({
  accountId,
  client,
  mobilePhone,
  source,
}: {
  accountId: string;
  client: SupabaseClient;
  mobilePhone: string;
  source: PrivateContactSource;
}) {
  const protectedPhone = protectPrivateMobilePhone({
    accountId,
    value: mobilePhone,
  });
  const existing = await readPrivateContact({ accountId, client });
  if (!existing.ok) return existing;

  const now = new Date().toISOString();
  const response = await client
    .schema("identity")
    .from("contact_profile")
    .upsert(
      {
        account_id: accountId,
        mobile_phone_ciphertext: protectedPhone.ciphertext,
        mobile_phone_consent_version: privateContactConsentVersion,
        mobile_phone_lookup_hash: protectedPhone.lookupHash,
        mobile_phone_registered_at:
          existing.data.mobilePhoneRegisteredAt ?? now,
        mobile_phone_source: source,
        mobile_phone_status: "unverified",
        mobile_phone_updated_at: now,
        mobile_phone_verified_at: null,
        updated_at: now,
      },
      { onConflict: "account_id" },
    )
    .select(contactSelect)
    .single();

  if (response.error?.code === "23505") {
    return { code: "mobile_phone_in_use" as const, ok: false as const };
  }
  if (response.error || !response.data) {
    return { code: "contact_write_failed" as const, ok: false as const };
  }

  return {
    data: normalizePrivateContact(accountId, response.data),
    ok: true as const,
  };
}

export async function deletePrivateMobilePhone({
  accountId,
  client,
  cancelActiveEntries,
}: {
  accountId: string;
  cancelActiveEntries: boolean;
  client: SupabaseClient;
}) {
  const activeEntries = await client
    .from("research_gate_c_reward_entry")
    .select("id")
    .eq("account_id", accountId)
    .in("status", ["entered", "winner"])
    .limit(1);

  if (activeEntries.error) {
    return { code: "contact_delete_failed" as const, ok: false as const };
  }
  if ((activeEntries.data?.length ?? 0) > 0 && !cancelActiveEntries) {
    return { code: "active_event_entry_exists" as const, ok: false as const };
  }

  if ((activeEntries.data?.length ?? 0) > 0) {
    const withdraw = await client
      .from("research_gate_c_reward_entry")
      .update({ status: "withdrawn", updated_at: new Date().toISOString() })
      .eq("account_id", accountId)
      .in("status", ["entered", "winner"]);
    if (withdraw.error) {
      return { code: "contact_delete_failed" as const, ok: false as const };
    }
  }

  const now = new Date().toISOString();
  const response = await client
    .schema("identity")
    .from("contact_profile")
    .update({
      mobile_phone_ciphertext: null,
      mobile_phone_consent_version: null,
      mobile_phone_lookup_hash: null,
      mobile_phone_registered_at: null,
      mobile_phone_source: null,
      mobile_phone_status: "missing",
      mobile_phone_updated_at: now,
      mobile_phone_verified_at: null,
      updated_at: now,
    })
    .eq("account_id", accountId)
    .select(contactSelect)
    .single();

  if (response.error || !response.data) {
    return { code: "contact_delete_failed" as const, ok: false as const };
  }

  return {
    data: normalizePrivateContact(accountId, response.data),
    ok: true as const,
  };
}

export async function deletePrivateEmail({
  accountId,
  client,
}: {
  accountId: string;
  client: SupabaseClient;
}) {
  const now = new Date().toISOString();
  const response = await client
    .schema("identity")
    .from("contact_profile")
    .update({
      email_encrypted: null,
      email_hash: null,
      email_registered_at: null,
      email_registration_version: null,
      email_source: null,
      email_status: "missing",
      email_updated_at: now,
      email_verified_at: null,
      updated_at: now,
    })
    .eq("account_id", accountId)
    .select(contactSelect)
    .single();

  if (response.error || !response.data) {
    return { code: "contact_delete_failed" as const, ok: false as const };
  }

  return {
    data: normalizePrivateContact(accountId, response.data),
    ok: true as const,
  };
}

export function toPrivateContactPayload(
  contact: PrivateContactRecord,
  marketingOptIn = false,
): PrivateContactPayload {
  let emailMasked: string | null = null;
  let mobilePhoneMasked: string | null = null;

  if (contact.emailStatus !== "missing" && contact.emailEncrypted) {
    try {
      emailMasked = maskPrivateEmail(
        revealPrivateEmail({
          accountId: contact.accountId,
          ciphertext: contact.emailEncrypted,
        }),
      );
    } catch {
      emailMasked = null;
    }
  }

  if (
    contact.mobilePhoneStatus !== "missing" &&
    contact.mobilePhoneCiphertext
  ) {
    try {
      mobilePhoneMasked = maskKoreanMobilePhone(
        revealPrivateMobilePhone({
          accountId: contact.accountId,
          ciphertext: contact.mobilePhoneCiphertext,
        }),
      );
    } catch {
      mobilePhoneMasked = null;
    }
  }

  return {
    emailMasked,
    emailStatus: emailMasked ? contact.emailStatus : "missing",
    emailVerifiedAt:
      emailMasked && contact.emailStatus === "verified"
        ? contact.emailVerifiedAt
        : null,
    hasEmail: Boolean(emailMasked),
    hasMobilePhone: Boolean(mobilePhoneMasked),
    marketingOptIn,
    mobilePhoneMasked,
    mobilePhoneStatus: mobilePhoneMasked
      ? contact.mobilePhoneStatus
      : "missing",
    updatedAt: latestTimestamp([
      contact.emailUpdatedAt,
      contact.mobilePhoneUpdatedAt,
    ]),
  };
}

export async function readPrivateContactMarketingPreference({
  accountId,
  client,
}: {
  accountId: string;
  client: SupabaseClient;
}) {
  const response = await client
    .schema("consent")
    .from("consent_record")
    .select("status")
    .eq("account_id", accountId)
    .eq("consent_type", "marketing")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (response.error) {
    return { code: "marketing_preference_read_failed" as const, ok: false as const };
  }

  return {
    data: response.data?.status === "granted",
    ok: true as const,
  };
}

export async function savePrivateContactMarketingPreference({
  accountId,
  client,
  marketingOptIn,
}: {
  accountId: string;
  client: SupabaseClient;
  marketingOptIn: boolean;
}) {
  const recordedAt = new Date().toISOString();
  const response = await client.schema("consent").from("consent_record").insert({
    account_id: accountId,
    consent_type: "marketing",
    consent_version: privateContactMarketingConsentVersion,
    metadata: { channel: "profile_contact", surface: "profile_edit" },
    recorded_at: recordedAt,
    revoked_at: marketingOptIn ? null : recordedAt,
    source: "profile_edit",
    status: marketingOptIn ? "granted" : "revoked",
  });

  if (response.error) {
    return { code: "marketing_preference_write_failed" as const, ok: false as const };
  }
  return { data: marketingOptIn, ok: true as const };
}

function normalizePrivateContact(
  accountId: string,
  value: unknown,
): PrivateContactRecord {
  if (!value || typeof value !== "object") return emptyPrivateContact(accountId);
  const row = value as Record<string, unknown>;
  const emailStatus =
    row.email_status === "verified" || row.email_status === "unverified"
      ? row.email_status
      : "missing";
  const mobilePhoneStatus =
    row.mobile_phone_status === "verified" ||
    row.mobile_phone_status === "unverified"
      ? row.mobile_phone_status
      : "missing";

  return {
    accountId,
    emailEncrypted:
      typeof row.email_encrypted === "string" ? row.email_encrypted : null,
    emailHash: typeof row.email_hash === "string" ? row.email_hash : null,
    emailRegisteredAt:
      typeof row.email_registered_at === "string"
        ? row.email_registered_at
        : null,
    emailStatus,
    emailUpdatedAt:
      typeof row.email_updated_at === "string" ? row.email_updated_at : null,
    emailVerifiedAt:
      typeof row.email_verified_at === "string"
        ? row.email_verified_at
        : null,
    mobilePhoneCiphertext:
      typeof row.mobile_phone_ciphertext === "string"
        ? row.mobile_phone_ciphertext
        : null,
    mobilePhoneLookupHash:
      typeof row.mobile_phone_lookup_hash === "string"
        ? row.mobile_phone_lookup_hash
        : null,
    mobilePhoneRegisteredAt:
      typeof row.mobile_phone_registered_at === "string"
        ? row.mobile_phone_registered_at
        : null,
    mobilePhoneStatus,
    mobilePhoneUpdatedAt:
      typeof row.mobile_phone_updated_at === "string"
        ? row.mobile_phone_updated_at
        : null,
  };
}

function emptyPrivateContact(accountId: string): PrivateContactRecord {
  return {
    accountId,
    emailEncrypted: null,
    emailHash: null,
    emailRegisteredAt: null,
    emailStatus: "missing",
    emailUpdatedAt: null,
    emailVerifiedAt: null,
    mobilePhoneCiphertext: null,
    mobilePhoneLookupHash: null,
    mobilePhoneRegisteredAt: null,
    mobilePhoneStatus: "missing",
    mobilePhoneUpdatedAt: null,
  };
}

function latestTimestamp(values: Array<string | null>) {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => right.localeCompare(left))[0] ?? null
  );
}
