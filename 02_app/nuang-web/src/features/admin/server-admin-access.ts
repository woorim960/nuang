import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  revealPrivateEmail,
} from "@/features/account/private-contact-security";
import { readPrivateContact } from "@/features/account/server-private-contact";
import { ensureAccountForUser } from "@/features/account/server-writes";
import { syncOperatorAccount } from "@/features/admin/server-operator-identity";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function resolveAdminContext() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth;

  const client = createSupabaseServiceClient();
  if (!client) {
    return {
      ok: false as const,
      reason: "configuration" as const,
      response: createApiClosedResponse("supabase_env_missing"),
    };
  }

  const identity = await resolveAdminIdentityForUser({
    client,
    user: auth.user,
  });
  if (!identity) {
    return { ok: false as const, reason: "forbidden" as const };
  }

  if (!identity.accountId) {
    return { ok: false as const, reason: "account" as const };
  }

  return {
    accountId: identity.accountId,
    client,
    email: identity.email,
    ok: true as const,
    user: auth.user,
  };
}

export async function resolveAdminIdentityForUser({
  client,
  user,
}: {
  client: SupabaseClient;
  user: User;
}) {
  const account = await ensureAccountForUser(client, user);
  if (!account.ok) return null;

  const authEmail = normalizeEmail(user.email);
  if (isAdminEmail(authEmail)) {
    await syncOperatorAccount({
      accountId: account.accountId,
      client,
      enabled: true,
    });
    return {
      accountId: account.accountId,
      email: authEmail as string,
      source: "auth" as const,
    };
  }

  const contact = await readPrivateContact({
    accountId: account.accountId,
    client,
  });
  if (
    !contact.ok ||
    contact.data.emailStatus !== "verified" ||
    !contact.data.emailEncrypted
  ) {
    await syncOperatorAccount({
      accountId: account.accountId,
      client,
      enabled: false,
    });
    return null;
  }

  try {
    const verifiedEmail = normalizeEmail(
      revealPrivateEmail({
        accountId: account.accountId,
        ciphertext: contact.data.emailEncrypted,
      }),
    );
    if (!isAdminEmail(verifiedEmail)) {
      await syncOperatorAccount({
        accountId: account.accountId,
        client,
        enabled: false,
      });
      return null;
    }

    await syncOperatorAccount({
      accountId: account.accountId,
      client,
      enabled: true,
    });

    return {
      accountId: account.accountId,
      email: verifiedEmail as string,
      source: "verified_profile" as const,
    };
  } catch {
    return null;
  }
}

export function isAdminEmail(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  return readAdminEmails().has(normalizedEmail);
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || null;
}

function readAdminEmails() {
  return new Set(
    (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}
