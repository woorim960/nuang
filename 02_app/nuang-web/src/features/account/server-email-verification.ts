import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emailVerificationExpiresInSeconds,
  emailVerificationHourlyLimit,
  emailVerificationMaxAttempts,
  emailVerificationResendSeconds,
} from "@/features/account/email-verification-contract";
import {
  createEmailVerificationSecret,
  hashEmailVerificationCode,
  verifyEmailVerificationCode,
} from "@/features/account/email-verification-security";
import {
  maskPrivateEmail,
  revealPrivateEmail,
} from "@/features/account/private-contact-security";
import { sendEmailVerificationCode } from "@/features/account/server-email-delivery";
import { readPrivateContact } from "@/features/account/server-private-contact";

type VerificationChallengeRow = {
  account_id: string;
  attempt_count: number;
  code_hash: string;
  email_hash: string;
  expires_at: string;
  id: string;
  max_attempts: number;
  requested_at: string;
  status: string;
};

export async function requestPrivateEmailVerification({
  accountId,
  client,
}: {
  accountId: string;
  client: SupabaseClient;
}) {
  const contact = await readPrivateContact({ accountId, client });
  if (!contact.ok) return contact;
  if (
    contact.data.emailStatus === "missing" ||
    !contact.data.emailEncrypted ||
    !contact.data.emailHash
  ) {
    return { code: "email_missing" as const, ok: false as const };
  }
  if (contact.data.emailStatus === "verified") {
    return { code: "email_already_verified" as const, ok: false as const };
  }

  const email = revealPrivateEmail({
    accountId,
    ciphertext: contact.data.emailEncrypted,
  });
  const now = new Date();
  const recent = await client
    .schema("identity")
    .from("email_verification_challenge")
    .select("id,requested_at,status")
    .eq("account_id", accountId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent.error) {
    return { code: "verification_read_failed" as const, ok: false as const };
  }

  const recentRequestedAt =
    typeof recent.data?.requested_at === "string"
      ? Date.parse(recent.data.requested_at)
      : Number.NaN;
  const retryAfterSeconds = Number.isFinite(recentRequestedAt)
    ? Math.max(
        0,
        emailVerificationResendSeconds -
          Math.floor((now.getTime() - recentRequestedAt) / 1_000),
      )
    : 0;
  if (retryAfterSeconds > 0) {
    return {
      code: "verification_resend_limited" as const,
      ok: false as const,
      retryAfterSeconds,
    };
  }

  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1_000).toISOString();
  const hourly = await client
    .schema("identity")
    .from("email_verification_challenge")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .gte("requested_at", oneHourAgo);
  if (hourly.error) {
    return { code: "verification_read_failed" as const, ok: false as const };
  }
  if ((hourly.count ?? 0) >= emailVerificationHourlyLimit) {
    return { code: "verification_hourly_limited" as const, ok: false as const };
  }

  await client
    .schema("identity")
    .from("email_verification_challenge")
    .update({
      status: "expired",
      updated_at: now.toISOString(),
    })
    .eq("account_id", accountId)
    .in("status", ["requested", "sent"]);

  const secret = createEmailVerificationSecret();
  const expiresAt = new Date(
    now.getTime() + emailVerificationExpiresInSeconds * 1_000,
  ).toISOString();
  const codeHash = hashEmailVerificationCode({
    accountId,
    challengeId: secret.challengeId,
    code: secret.code,
    emailHash: contact.data.emailHash,
  });
  const inserted = await client
    .schema("identity")
    .from("email_verification_challenge")
    .insert({
      account_id: accountId,
      attempt_count: 0,
      code_hash: codeHash,
      email_hash: contact.data.emailHash,
      expires_at: expiresAt,
      id: secret.challengeId,
      max_attempts: emailVerificationMaxAttempts,
      requested_at: now.toISOString(),
      status: "requested",
      updated_at: now.toISOString(),
    });
  if (inserted.error) {
    return { code: "verification_write_failed" as const, ok: false as const };
  }

  const delivered = await sendEmailVerificationCode({
    challengeId: secret.challengeId,
    code: secret.code,
    email,
  });
  if (!delivered.ok) {
    await client
      .schema("identity")
      .from("email_verification_challenge")
      .update({
        failure_code: delivered.code,
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", secret.challengeId)
      .eq("account_id", accountId);
    return delivered;
  }

  const sentAt = new Date().toISOString();
  const markedSent = await client
    .schema("identity")
    .from("email_verification_challenge")
    .update({
      provider_message_id: delivered.messageId,
      sent_at: sentAt,
      status: "sent",
      updated_at: sentAt,
    })
    .eq("id", secret.challengeId)
    .eq("account_id", accountId);
  if (markedSent.error) {
    return { code: "verification_write_failed" as const, ok: false as const };
  }

  return {
    data: {
      challengeId: secret.challengeId,
      emailMasked: maskPrivateEmail(email),
      expiresAt,
      resendAfterSeconds: emailVerificationResendSeconds,
    },
    ok: true as const,
  };
}

export async function confirmPrivateEmailVerification({
  accountId,
  challengeId,
  client,
  code,
}: {
  accountId: string;
  challengeId: string;
  client: SupabaseClient;
  code: string;
}) {
  const [contact, challenge] = await Promise.all([
    readPrivateContact({ accountId, client }),
    client
      .schema("identity")
      .from("email_verification_challenge")
      .select(
        "id,account_id,email_hash,code_hash,status,attempt_count,max_attempts,requested_at,expires_at",
      )
      .eq("id", challengeId)
      .eq("account_id", accountId)
      .maybeSingle(),
  ]);
  if (!contact.ok || challenge.error) {
    return { code: "verification_read_failed" as const, ok: false as const };
  }
  if (!challenge.data) {
    return { code: "verification_not_found" as const, ok: false as const };
  }

  const row = challenge.data as VerificationChallengeRow;
  if (
    contact.data.emailStatus === "missing" ||
    !contact.data.emailHash ||
    row.email_hash !== contact.data.emailHash
  ) {
    return { code: "verification_email_changed" as const, ok: false as const };
  }
  if (contact.data.emailStatus === "verified") {
    return {
      data: {
        emailStatus: "verified" as const,
        verifiedAt: contact.data.emailVerifiedAt ?? new Date().toISOString(),
      },
      ok: true as const,
    };
  }
  if (row.status === "locked" || row.attempt_count >= row.max_attempts) {
    return { code: "verification_locked" as const, ok: false as const };
  }
  if (row.status !== "sent") {
    return { code: "verification_unavailable" as const, ok: false as const };
  }
  if (Date.parse(row.expires_at) <= Date.now()) {
    await client
      .schema("identity")
      .from("email_verification_challenge")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", challengeId)
      .eq("account_id", accountId);
    return { code: "verification_expired" as const, ok: false as const };
  }

  const matches = verifyEmailVerificationCode({
    accountId,
    challengeId,
    code,
    emailHash: row.email_hash,
    expectedHash: row.code_hash,
  });
  if (!matches) {
    const attemptCount = row.attempt_count + 1;
    const locked = attemptCount >= row.max_attempts;
    await client
      .schema("identity")
      .from("email_verification_challenge")
      .update({
        attempt_count: attemptCount,
        status: locked ? "locked" : "sent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", challengeId)
      .eq("account_id", accountId)
      .eq("attempt_count", row.attempt_count);
    return {
      attemptsRemaining: Math.max(0, row.max_attempts - attemptCount),
      code: locked
        ? ("verification_locked" as const)
        : ("verification_code_invalid" as const),
      ok: false as const,
    };
  }

  const verifiedAt = new Date().toISOString();
  const verifiedContact = await client
    .schema("identity")
    .from("contact_profile")
    .update({
      email_status: "verified",
      email_updated_at: verifiedAt,
      email_verified_at: verifiedAt,
      updated_at: verifiedAt,
    })
    .eq("account_id", accountId)
    .eq("email_hash", row.email_hash)
    .select("account_id")
    .single();
  if (verifiedContact.error) {
    return { code: "verification_write_failed" as const, ok: false as const };
  }

  await client
    .schema("identity")
    .from("email_verification_challenge")
    .update({
      consumed_at: verifiedAt,
      status: "verified",
      updated_at: verifiedAt,
    })
    .eq("id", challengeId)
    .eq("account_id", accountId);

  return {
    data: {
      emailStatus: "verified" as const,
      verifiedAt,
    },
    ok: true as const,
  };
}
