import { createHmac, randomBytes } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";
import {
  claimResultRequestSchema,
  createShareLinkRequestSchema,
  revokeShareLinkRequestSchema,
} from "@/features/account/api-schemas";
import type {
  DeleteAccountResultFailureCode,
  DeleteAccountResultResult,
} from "@/features/account/account-result-contract";
import type {
  ClaimResultWriteFailureCode,
  ClaimResultWriteSuccessInput,
} from "@/features/account/claim-write-contract";
import type {
  RevokeShareLinkSuccessInput,
  ShareLinkFailureCode,
  ShareLinkSuccessInput,
} from "@/features/account/share-link-contract";
import {
  deriveTrustedClaimResult,
  type TrustedClaimResult,
} from "@/features/account/server-result-claim";
import { buildReportContentSnapshot } from "@/features/result/unified-core-report/report-content-snapshot";
import {
  isRequiredConsentComplete,
  type ConsentDraft,
} from "@/features/consent/consent-draft";
import { getAppOrigin } from "@/lib/supabase/env";
import { getSupabaseServiceEnv } from "@/lib/supabase/service";

type ServiceClient = SupabaseClient;
type ClaimResultPayload = z.infer<typeof claimResultRequestSchema>;
type CreateShareLinkPayload = z.infer<typeof createShareLinkRequestSchema>;
type RevokeShareLinkPayload = z.infer<typeof revokeShareLinkRequestSchema>;
type DeleteAccountResultPayload = {
  localResultId?: string;
  resultReportId?: string;
};

const consentPolicyVersion = "nuang-consent.v0.1";
const termsVersion = "terms.v0.1";
const privacyVersion = "privacy.v0.1";

export type ServerWriteResult<TSuccess, TFailureCode extends string> =
  { data: TSuccess; ok: true } | { code: TFailureCode; ok: false };

export async function claimResultToAccount({
  client,
  payload,
  user,
}: {
  client: ServiceClient;
  payload: ClaimResultPayload;
  user: User;
}): Promise<
  ServerWriteResult<ClaimResultWriteSuccessInput, ClaimResultWriteFailureCode>
> {
  if (!isRequiredConsentComplete(payload.consentDraft)) {
    return { code: "age_or_required_consent_missing", ok: false };
  }

  const trustedResult = deriveTrustedClaimResult(payload);

  if (!trustedResult) {
    return { code: "assessment_response_invalid", ok: false };
  }

  const account = await ensureAccountForUser(client, user);

  if (!account.ok) {
    return { code: "account_link_missing", ok: false };
  }

  const consent = await persistAccountConsent(
    client,
    account.accountId,
    payload.consentDraft,
  );

  if (!consent.ok) {
    return { code: "age_or_required_consent_missing", ok: false };
  }

  const assessmentSlug =
    payload.assessmentKind === "full" ? "nu-core-full" : "nu-core-quick";
  const claimResponse = await client.rpc("claim_assessment_result_atomic", {
    p_account_id: account.accountId,
    p_assessment_kind: payload.assessmentKind,
    p_assessment_slug: assessmentSlug,
    p_code_scheme_version: trustedResult.trustedRelease.codeSchemeVersion,
    p_completed_at: trustedResult.completedAt,
    p_item_release_version: trustedResult.trustedRelease.assessmentReleaseId,
    p_local_result_id: payload.localResultId,
    p_measurement_release_id: trustedResult.trustedRelease.assessmentReleaseId,
    p_profile_code: trustedResult.profileCode,
    p_profile_name: trustedResult.profileName,
    p_responses: trustedResult.responseRows,
    p_score_payload: buildScorePayload(payload, trustedResult),
    p_scoring_release_id: trustedResult.trustedRelease.scoringReleaseId,
    p_scoring_version: trustedResult.trustedRelease.scoringModelVersion,
    p_share_summary: buildShareSummary(payload, trustedResult),
    p_summary: buildTrustedResultSummary(payload, trustedResult),
  });

  if (claimResponse.error || !Array.isArray(claimResponse.data)) {
    return { code: "result_report_write_failed", ok: false };
  }

  const claimed = claimResponse.data[0] as
    | {
        assessment_attempt_id: string;
        claimed_at: string;
        profile_code: string;
        profile_name: string;
        result_report_id: string;
      }
    | undefined;

  if (!claimed) {
    return { code: "result_report_write_failed", ok: false };
  }

  return {
    data: {
      assessmentAttemptId: claimed.assessment_attempt_id,
      claimedAt: claimed.claimed_at,
      profileCode: claimed.profile_code,
      profileName: claimed.profile_name,
      resultReportId: claimed.result_report_id,
    },
    ok: true,
  };
}

export async function createShareLinkForResult({
  client,
  payload,
  user,
}: {
  client: ServiceClient;
  payload: CreateShareLinkPayload;
  user: User;
}): Promise<ServerWriteResult<ShareLinkSuccessInput, ShareLinkFailureCode>> {
  if (payload.visibility !== "summary") {
    return { code: "share_scope_not_allowed", ok: false };
  }

  const account = await ensureAccountForUser(client, user);

  if (!account.ok) {
    return { code: "result_report_not_found", ok: false };
  }

  const reportResponse = await client
    .schema("report")
    .from("result_report")
    .select("id, share_summary")
    .eq("id", payload.resultReportId)
    .eq("account_id", account.accountId)
    .is("deleted_at", null)
    .maybeSingle();

  if (reportResponse.error) {
    return { code: "share_summary_build_failed", ok: false };
  }

  if (!reportResponse.data) {
    return { code: "result_report_not_found", ok: false };
  }

  const env = getSupabaseServiceEnv();

  if (!env) {
    return { code: "share_token_hash_failed", ok: false };
  }

  const token = createShareToken();
  const tokenHash = hashShareToken(token, env.shareTokenPepper);
  const expiresAt = addDays(new Date(), payload.ttlDays).toISOString();
  const insertResponse = await client
    .schema("sharing")
    .from("share_link")
    .insert({
      account_id: account.accountId,
      expires_at: expiresAt,
      result_report_id: payload.resultReportId,
      scope: "summary",
      status: "active",
      token_hash: tokenHash,
    })
    .select("id")
    .single();

  if (insertResponse.error || !insertResponse.data) {
    return { code: "share_link_insert_failed", ok: false };
  }

  const shareLink = insertResponse.data as { id: string };
  const shareUrl = new URL(`/share/${token}`, getAppOrigin()).toString();

  return {
    data: {
      expiresAt,
      shareLinkId: shareLink.id,
      shareUrl,
    },
    ok: true,
  };
}

export async function revokeShareLinkForAccount({
  client,
  payload,
  user,
}: {
  client: ServiceClient;
  payload: RevokeShareLinkPayload;
  user: User;
}): Promise<
  ServerWriteResult<RevokeShareLinkSuccessInput, ShareLinkFailureCode>
> {
  const account = await ensureAccountForUser(client, user);

  if (!account.ok) {
    return { code: "share_link_not_found", ok: false };
  }

  const existingResponse = await client
    .schema("sharing")
    .from("share_link")
    .select("id, status")
    .eq("id", payload.shareLinkId)
    .eq("account_id", account.accountId)
    .maybeSingle();

  if (existingResponse.error) {
    return { code: "share_link_revoke_failed", ok: false };
  }

  if (!existingResponse.data) {
    return { code: "share_link_not_found", ok: false };
  }

  const existing = existingResponse.data as { id: string; status: string };

  if (existing.status === "revoked") {
    return { code: "share_link_already_revoked", ok: false };
  }

  const revokedAt = new Date().toISOString();
  const updateResponse = await client
    .schema("sharing")
    .from("share_link")
    .update({
      revoked_at: revokedAt,
      status: "revoked",
    })
    .eq("id", payload.shareLinkId)
    .eq("account_id", account.accountId)
    .select("id")
    .single();

  if (updateResponse.error) {
    return { code: "share_link_revoke_failed", ok: false };
  }

  return {
    data: {
      revokedAt,
      shareLinkId: payload.shareLinkId,
    },
    ok: true,
  };
}

export async function deleteResultForAccount({
  client,
  payload,
  user,
}: {
  client: ServiceClient;
  payload: DeleteAccountResultPayload;
  user: User;
}): Promise<
  ServerWriteResult<DeleteAccountResultResult, DeleteAccountResultFailureCode>
> {
  const accountResponse = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", user.id)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (accountResponse.error) {
    return { code: "account_result_delete_failed", ok: false };
  }

  if (!accountResponse.data) {
    return {
      data: {
        deleted: false,
        localResultId: payload.localResultId ?? null,
        resultReportId: payload.resultReportId ?? null,
      },
      ok: true,
    };
  }

  const accountId = (accountResponse.data as { account_id: string }).account_id;
  const deleteResponse = await client
    .schema("report")
    .rpc("delete_result_for_account", {
      p_account_id: accountId,
      p_local_result_id: payload.localResultId ?? null,
      p_result_report_id: payload.resultReportId ?? null,
    });

  if (deleteResponse.error || !Array.isArray(deleteResponse.data)) {
    return { code: "account_result_delete_failed", ok: false };
  }

  const row = deleteResponse.data[0] as
    | {
        deleted: boolean;
        deleted_local_result_id: string | null;
        deleted_result_report_id: string | null;
      }
    | undefined;

  return {
    data: {
      deleted: row?.deleted ?? false,
      localResultId:
        row?.deleted_local_result_id ?? payload.localResultId ?? null,
      resultReportId:
        row?.deleted_result_report_id ?? payload.resultReportId ?? null,
    },
    ok: true,
  };
}

export function createShareToken() {
  return randomBytes(32).toString("base64url");
}

export function hashShareToken(token: string, pepper: string) {
  return createHmac("sha256", pepper).update(token).digest("hex");
}

export async function ensureAccountForUser(client: ServiceClient, user: User) {
  const existing = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", user.id)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    return { ok: false as const };
  }

  if (existing.data) {
    return {
      accountId: (existing.data as { account_id: string }).account_id,
      ok: true as const,
    };
  }

  const accountResponse = await client
    .schema("identity")
    .from("account")
    .insert({})
    .select("id")
    .single();

  if (accountResponse.error || !accountResponse.data) {
    return { ok: false as const };
  }

  const accountId = (accountResponse.data as { id: string }).id;
  const provider = getProvider(user);
  const identityResponse = await client
    .schema("identity")
    .from("auth_identity")
    .insert({
      account_id: accountId,
      last_login_at: new Date().toISOString(),
      provider,
      provider_subject: getProviderSubject(user, provider),
      supabase_user_id: user.id,
    })
    .select("account_id")
    .single();

  if (identityResponse.error) {
    return { ok: false as const };
  }

  await writeContactProfile(client, accountId, user);

  return {
    accountId,
    ok: true as const,
  };
}

export async function persistAccountConsent(
  client: ServiceClient,
  accountId: string,
  consentDraft: ConsentDraft,
) {
  const declaredAt = new Date().toISOString();

  const statusResponse = await client
    .schema("consent")
    .from("age_and_consent_status")
    .upsert(
      {
        account_id: accountId,
        age_band: null,
        age_source: "self_declared",
        analytics_opt_in: consentDraft.analytics,
        declared_at: declaredAt,
        is_14_or_older: true,
        marketing_opt_in: consentDraft.marketing,
        policy_version: consentPolicyVersion,
        required_privacy_version: privacyVersion,
        required_terms_version: termsVersion,
        updated_at: declaredAt,
      },
      { onConflict: "account_id" },
    )
    .select("account_id")
    .single();

  if (statusResponse.error) {
    return { ok: false as const };
  }

  const consentRows = [
    {
      account_id: accountId,
      consent_type: "terms",
      consent_version: termsVersion,
      metadata: {},
      recorded_at: declaredAt,
      source: "account_gate",
      status: "granted",
    },
    {
      account_id: accountId,
      consent_type: "privacy",
      consent_version: privacyVersion,
      metadata: {},
      recorded_at: declaredAt,
      source: "account_gate",
      status: "granted",
    },
  ];

  const recordResponse = await client
    .schema("consent")
    .from("consent_record")
    .insert(consentRows)
    .select("id");

  if (recordResponse.error) {
    return { ok: false as const };
  }

  return { ok: true as const };
}

async function writeContactProfile(
  client: ServiceClient,
  accountId: string,
  user: User,
) {
  const displayName = stringValue(
    user.user_metadata?.name ?? user.user_metadata?.full_name,
  );
  const avatarUrl = stringValue(user.user_metadata?.avatar_url);

  if (!displayName && !avatarUrl) {
    return;
  }

  await client.schema("identity").from("contact_profile").upsert(
    {
      account_id: accountId,
      avatar_url: avatarUrl,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" },
  );
}

function getProvider(user: User) {
  const provider =
    stringValue(user.app_metadata?.provider) ??
    stringValue(user.identities?.[0]?.provider) ??
    "email";

  if (provider === "google" || provider === "kakao" || provider === "naver") {
    return provider;
  }

  return "email";
}

function getProviderSubject(user: User, provider: string) {
  const identity =
    user.identities?.find((item) => item.provider === provider) ??
    user.identities?.[0];

  return (
    stringValue(identity?.id) ?? stringValue(identity?.identity_id) ?? user.id
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function buildTrustedResultSummary(
  payload: Pick<ClaimResultPayload, "assessmentKind" | "localResultId">,
  trustedResult: TrustedClaimResult,
) {
  return {
    alternativeCodes: trustedResult.alternativeCodes,
    assessmentKind: payload.assessmentKind,
    completedAt: trustedResult.completedAt,
    domains: trustedResult.domains,
    facets: trustedResult.facets,
    originResultId: payload.localResultId,
    profileCode: trustedResult.profileCode,
    profileName: trustedResult.profileName,
    reportContentSnapshot: buildReportContentSnapshot({
      code: trustedResult.profileCode,
      kind: payload.assessmentKind,
      measurementVersion: trustedResult.resultCopyVersion,
    }),
    responseSnapshotHash: trustedResult.responseSnapshotHash,
    resultCopyVersion: trustedResult.resultCopyVersion,
    resultEvidenceStatus: trustedResult.evidenceStatus,
    resultLabel: trustedResult.resultLabel,
    resultStatus: trustedResult.resultStatus,
    versionBundle: trustedResult.trustedRelease,
  };
}

function buildShareSummary(
  payload: ClaimResultPayload,
  trustedResult: TrustedClaimResult,
) {
  return {
    assessmentKind: payload.assessmentKind,
    completedAt: trustedResult.completedAt,
    domains: trustedResult.domains,
    profileCode: trustedResult.profileCode,
    profileName: trustedResult.profileName,
    resultLabel: trustedResult.resultLabel,
    versionBundle: trustedResult.trustedRelease,
  };
}

function buildScorePayload(
  payload: ClaimResultPayload,
  trustedResult: TrustedClaimResult,
) {
  return {
    alternativeCodes: trustedResult.alternativeCodes,
    assessmentKind: payload.assessmentKind,
    completedAt: trustedResult.completedAt,
    domains: trustedResult.domains,
    facets: trustedResult.facets,
    includesDirectResponses: false,
    profileCode: trustedResult.profileCode,
    profileName: trustedResult.profileName,
    responseSnapshotHash: trustedResult.responseSnapshotHash,
    resultCopyVersion: trustedResult.resultCopyVersion,
    resultEvidenceStatus: trustedResult.evidenceStatus,
    resultStatus: trustedResult.resultStatus,
    versionBundle: trustedResult.trustedRelease,
  };
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
