import type { User } from "@supabase/supabase-js";

export type TrustedOAuthIdentity = {
  issuer: string;
  provider: "email" | "google" | "kakao";
  provider_subject: string;
  supabase_identity_id: string;
};

export type TrustedOAuthIdentityResult =
  | { identities: TrustedOAuthIdentity[]; ok: true }
  | {
      code:
        | "duplicate_identity"
        | "identity_missing"
        | "provider_not_allowed";
      ok: false;
    };

const trustedProviderIssuers = {
  email: "supabase:email",
  google: "https://accounts.google.com",
  kakao: "https://kauth.kakao.com",
} as const;

/**
 * Builds the resolver payload exclusively from the identities returned by a
 * server-side Supabase `auth.getUser()` call. Display metadata, email strings
 * and `app_metadata.provider` are deliberately not identity evidence.
 */
export function buildTrustedOAuthIdentities(
  user: Pick<User, "id" | "identities">,
): TrustedOAuthIdentityResult {
  if (!Array.isArray(user.identities) || user.identities.length === 0) {
    return { code: "identity_missing", ok: false };
  }

  const identities: TrustedOAuthIdentity[] = [];
  const providerSubjects = new Set<string>();
  const supabaseIdentityIds = new Set<string>();

  for (const identity of user.identities) {
    const provider = normalizeProvider(identity.provider);

    if (!provider) {
      return { code: "provider_not_allowed", ok: false };
    }

    const providerSubject = nonEmptyString(identity.id);
    const supabaseIdentityId = nonEmptyString(identity.identity_id);

    if (!providerSubject || !supabaseIdentityId) {
      return { code: "identity_missing", ok: false };
    }

    const providerSubjectKey = `${provider}:${providerSubject}`;

    if (
      providerSubjects.has(providerSubjectKey) ||
      supabaseIdentityIds.has(supabaseIdentityId)
    ) {
      return { code: "duplicate_identity", ok: false };
    }

    providerSubjects.add(providerSubjectKey);
    supabaseIdentityIds.add(supabaseIdentityId);
    identities.push({
      issuer: trustedProviderIssuers[provider],
      provider,
      provider_subject: providerSubject,
      supabase_identity_id: supabaseIdentityId,
    });
  }

  identities.sort((left, right) => {
    const leftKey = `${left.provider}:${left.provider_subject}`;
    const rightKey = `${right.provider}:${right.provider_subject}`;
    return leftKey.localeCompare(rightKey);
  });

  return { identities, ok: true };
}

function normalizeProvider(value: unknown) {
  if (
    value === "email" ||
    value === "google" ||
    value === "kakao"
  ) {
    return value;
  }

  return null;
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
