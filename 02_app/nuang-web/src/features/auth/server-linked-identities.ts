import "server-only";

import type {
  SupabaseClient,
  User,
  UserIdentity,
} from "@supabase/supabase-js";
import {
  identityLinkIntentTtlSeconds,
  isSupportedIdentityProvider,
  type LinkedIdentitySecurityPayload,
  providerLabel,
  safeIdentityReturnPath,
  supportedIdentityProviders,
  type SupportedIdentityProvider,
} from "@/features/auth/identity-link-contract";
import {
  createIdentityLinkIntentSecret,
  identityLinkNonceMatches,
  parseIdentityLinkIntentToken,
} from "@/features/auth/identity-link-security";
import { buildTrustedOAuthIdentities } from "@/features/auth/oauth-identity-policy";
import { maskPrivateEmail } from "@/features/account/private-contact-security";
import { getAppOrigin } from "@/lib/supabase/env";

type ProviderRegistryRow = {
  enabled: boolean;
  link_enabled: boolean;
  provider: string;
};

type LinkIntentRow = {
  account_id: string;
  action: string;
  consumed_at: string | null;
  expires_at: string;
  id: string;
  initiating_supabase_user_id: string;
  nonce_hash: string;
  provider: string;
  request_origin: string;
  return_path: string;
  status: string;
};

export async function readLinkedIdentitySecurity({
  authClient,
  serviceClient,
  user,
}: {
  authClient: SupabaseClient;
  serviceClient: SupabaseClient;
  user: User;
}) {
  const [account, authIdentities, providers, manualLinking] = await Promise.all([
    resolveSingleAccountForAuthUser({
      client: serviceClient,
      supabaseUserId: user.id,
    }),
    authClient.auth.getUserIdentities(),
    serviceClient
      .schema("identity")
      .from("provider_registry")
      .select("provider,enabled,link_enabled")
      .in("provider", [...supportedIdentityProviders]),
    serviceClient
      .schema("identity")
      .from("identity_feature_flag")
      .select("enabled")
      .eq("feature_key", "manual_provider_link")
      .maybeSingle(),
  ]);

  if (!account.ok) return account;
  if (
    authIdentities.error ||
    providers.error ||
    manualLinking.error ||
    !authIdentities.data
  ) {
    return { code: "identity_read_failed" as const, ok: false as const };
  }

  const registry = new Map(
    ((providers.data ?? []) as ProviderRegistryRow[]).map((row) => [
      row.provider,
      row,
    ]),
  );
  const supported = authIdentities.data.identities.filter(
    (identity): identity is UserIdentity & {
      provider: SupportedIdentityProvider;
    } => isSupportedIdentityProvider(identity.provider),
  );
  const currentProvider = isSupportedIdentityProvider(user.app_metadata.provider)
    ? user.app_metadata.provider
    : null;
  const linkedCount = supported.length;
  const methods = supportedIdentityProviders.map((provider) => {
    const identity = supported.find((row) => row.provider === provider);
    const current = provider === currentProvider;
    return {
      canUnlink:
        Boolean(identity) &&
        linkedCount > 1 &&
        !current &&
        hasRecentRemainingAuthentication(supported, provider),
      current,
      emailMasked: identity ? readMaskedVerifiedEmail(identity) : null,
      label: providerLabel(provider),
      provider,
      status: identity ? ("connected" as const) : ("available" as const),
    };
  });
  const linking = manualLinking.data?.enabled === true && methods.some(
    (method) =>
      method.status === "available" &&
      registry.get(method.provider)?.enabled === true &&
      registry.get(method.provider)?.link_enabled === true,
  );

  return {
    data: {
      currentProvider,
      features: {
        linking,
        phoneVerification: false,
        unlinking: methods.some((method) => method.canUnlink),
      },
      linkedCount,
      methods,
    } satisfies LinkedIdentitySecurityPayload,
    ok: true as const,
  };
}

export async function createIdentityLinkIntent({
  accountId,
  client,
  provider,
  returnPath,
  supabaseUserId,
}: {
  accountId: string;
  client: SupabaseClient;
  provider: SupportedIdentityProvider;
  returnPath: string;
  supabaseUserId: string;
}) {
  const registry = await client
    .schema("identity")
    .from("provider_registry")
    .select("enabled,link_enabled")
    .eq("provider", provider)
    .maybeSingle();
  if (
    registry.error ||
    registry.data?.enabled !== true ||
    registry.data.link_enabled !== true
  ) {
    return { code: "provider_linking_disabled" as const, ok: false as const };
  }
  const feature = await client
    .schema("identity")
    .from("identity_feature_flag")
    .select("enabled")
    .eq("feature_key", "manual_provider_link")
    .maybeSingle();
  if (feature.error || feature.data?.enabled !== true) {
    return { code: "provider_linking_disabled" as const, ok: false as const };
  }

  const linked = await client
    .schema("identity")
    .from("auth_identity")
    .select("id")
    .eq("account_id", accountId)
    .eq("provider", provider)
    .eq("status", "active")
    .is("revoked_at", null)
    .limit(1);
  if (linked.error) {
    return { code: "identity_read_failed" as const, ok: false as const };
  }
  if ((linked.data?.length ?? 0) > 0) {
    return { code: "provider_already_linked" as const, ok: false as const };
  }

  const secret = createIdentityLinkIntentSecret();
  const createdAt = new Date();
  const expiresAt = new Date(
    createdAt.getTime() + identityLinkIntentTtlSeconds * 1_000,
  ).toISOString();
  const requestOrigin = new URL(getAppOrigin()).origin;
  const safeReturnPath = safeIdentityReturnPath(returnPath);
  const inserted = await client
    .schema("identity")
    .from("identity_link_intent")
    .insert({
      account_id: accountId,
      action: "link",
      expires_at: expiresAt,
      id: secret.id,
      initiating_supabase_user_id: supabaseUserId,
      nonce_hash: secret.nonceHash,
      provider,
      request_origin: requestOrigin,
      return_path: safeReturnPath,
      status: "pending",
    });
  if (inserted.error) {
    return { code: "link_intent_write_failed" as const, ok: false as const };
  }

  const redirectUrl = new URL("/auth/link/callback", requestOrigin);
  redirectUrl.searchParams.set("next", safeReturnPath);

  return {
    data: {
      expiresAt,
      cookieToken: secret.token,
      provider,
      redirectTo: redirectUrl.toString(),
    },
    ok: true as const,
  };
}

export async function consumeIdentityLinkIntent({
  client,
  requestOrigin,
  token,
  user,
}: {
  client: SupabaseClient;
  requestOrigin: string;
  token: string | null;
  user: User;
}) {
  const parsed = parseIdentityLinkIntentToken(token);
  if (!parsed) return { code: "link_intent_invalid" as const, ok: false as const };

  const response = await client
    .schema("identity")
    .from("identity_link_intent")
    .select(
      "id,account_id,initiating_supabase_user_id,provider,action,nonce_hash,return_path,request_origin,status,expires_at,consumed_at",
    )
    .eq("id", parsed.id)
    .maybeSingle();
  if (response.error || !response.data) {
    return { code: "link_intent_invalid" as const, ok: false as const };
  }

  const intent = response.data as LinkIntentRow;
  const origin = new URL(requestOrigin).origin;
  if (
    intent.action !== "link" ||
    intent.status !== "pending" ||
    intent.consumed_at ||
    Date.parse(intent.expires_at) <= Date.now() ||
    intent.initiating_supabase_user_id !== user.id ||
    intent.request_origin !== origin ||
    !isSupportedIdentityProvider(intent.provider) ||
    !identityLinkNonceMatches({
      expectedHash: intent.nonce_hash,
      suppliedHash: parsed.nonceHash,
    })
  ) {
    return {
      code:
        Date.parse(intent.expires_at) <= Date.now()
          ? ("link_intent_expired" as const)
          : ("link_intent_invalid" as const),
      ok: false as const,
    };
  }

  const providerIdentity = user.identities?.find(
    (identity) => identity.provider === intent.provider,
  );
  if (!providerIdentity) {
    return { code: "linked_identity_missing" as const, ok: false as const };
  }

  const trusted = buildTrustedOAuthIdentities(user);
  if (!trusted.ok) {
    return { code: trusted.code, ok: false as const };
  }

  const resolved = await client.schema("identity").rpc(
    "resolve_account_for_auth_user",
    {
      p_correlation_id: intent.id,
      p_identities: trusted.identities,
      p_linked_via: "manual_oauth",
      p_supabase_user_id: user.id,
    },
  );
  const resolvedRow = Array.isArray(resolved.data)
    ? (resolved.data[0] as { account_id?: unknown } | undefined)
    : undefined;
  if (resolved.error || resolvedRow?.account_id !== intent.account_id) {
    await client
      .schema("identity")
      .from("identity_link_intent")
      .update({ status: "conflict", updated_at: new Date().toISOString() })
      .eq("id", intent.id)
      .eq("status", "pending");
    return { code: "identity_account_conflict" as const, ok: false as const };
  }

  const consumedAt = new Date().toISOString();
  const consumed = await client
    .schema("identity")
    .from("identity_link_intent")
    .update({
      consumed_at: consumedAt,
      status: "consumed",
      updated_at: consumedAt,
    })
    .eq("id", intent.id)
    .eq("status", "pending")
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (consumed.error || !consumed.data) {
    return { code: "link_intent_replayed" as const, ok: false as const };
  }

  return {
    data: {
      accountId: intent.account_id,
      provider: intent.provider,
      returnPath: safeIdentityReturnPath(intent.return_path),
    },
    ok: true as const,
  };
}

export async function unlinkIdentityProvider({
  authClient,
  provider,
  serviceClient,
  user,
}: {
  authClient: SupabaseClient;
  provider: SupportedIdentityProvider;
  serviceClient: SupabaseClient;
  user: User;
}) {
  const identities = await authClient.auth.getUserIdentities();
  if (identities.error || !identities.data) {
    return { code: "identity_read_failed" as const, ok: false as const };
  }
  const supported = identities.data.identities.filter((identity) =>
    isSupportedIdentityProvider(identity.provider),
  );
  const target = supported.find((identity) => identity.provider === provider);
  if (!target) {
    return { code: "identity_not_linked" as const, ok: false as const };
  }
  if (supported.length < 2) {
    return { code: "last_login_method" as const, ok: false as const };
  }
  if (
    user.app_metadata.provider === provider ||
    !hasRecentRemainingAuthentication(supported, provider)
  ) {
    return { code: "reauth_required" as const, ok: false as const };
  }

  const unlinked = await authClient.auth.unlinkIdentity(target);
  if (unlinked.error) {
    return { code: "identity_unlink_failed" as const, ok: false as const };
  }

  const revokedAt = new Date().toISOString();
  const shadow = await serviceClient
    .schema("identity")
    .from("auth_identity")
    .update({
      revoked_at: revokedAt,
      status: "revoked",
    })
    .eq("supabase_user_id", user.id)
    .eq("supabase_identity_id", target.identity_id)
    .eq("status", "active");
  return {
    data: { reconciliationPending: Boolean(shadow.error) },
    ok: true as const,
  };
}

export async function resolveSingleAccountForAuthUser({
  client,
  supabaseUserId,
}: {
  client: SupabaseClient;
  supabaseUserId: string;
}) {
  const response = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", supabaseUserId)
    .eq("status", "active")
    .is("revoked_at", null);
  if (response.error) {
    return { code: "identity_read_failed" as const, ok: false as const };
  }
  const accountIds = [
    ...new Set(
      (response.data ?? []).flatMap((row) =>
        typeof row.account_id === "string" ? [row.account_id] : [],
      ),
    ),
  ];
  if (accountIds.length !== 1) {
    return {
      code:
        accountIds.length === 0
          ? ("account_not_found" as const)
          : ("account_identity_ambiguous" as const),
      ok: false as const,
    };
  }
  return { accountId: accountIds[0], ok: true as const };
}

function hasRecentRemainingAuthentication(
  identities: UserIdentity[],
  excludingProvider: string,
) {
  const threshold = Date.now() - 10 * 60 * 1_000;
  return identities.some(
    (identity) =>
      identity.provider !== excludingProvider &&
      typeof identity.last_sign_in_at === "string" &&
      Date.parse(identity.last_sign_in_at) >= threshold,
  );
}

function readMaskedVerifiedEmail(identity: UserIdentity) {
  const data = identity.identity_data;
  if (
    data?.email_verified !== true ||
    typeof data.email !== "string" ||
    !data.email
  ) {
    return null;
  }
  try {
    return maskPrivateEmail(data.email);
  } catch {
    return null;
  }
}
