import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type CommunityWriteGuardCode =
  | "account_link_missing"
  | "duplicate_content"
  | "guard_unavailable"
  | "rate_limited"
  | "required_consent_missing"
  | "target_invalid";

export type CommunityWriteGuardAction =
  | "bookmark"
  | "create_comment"
  | "create_post"
  | "follow_profile"
  | "not_interested"
  | "react"
  | "report_content"
  | "report_profile"
  | "vote_poll";

export type CommunityWriteGuardTarget = {
  id: string | null;
  key: string | null;
  type:
    | "feed_comment"
    | "feed_poll"
    | "feed_post"
    | "feed_seed_card"
    | "public_profile";
};

export async function checkCommunityWriteGuard({
  accountId,
  action,
  body,
  client,
  target,
}: {
  accountId: string;
  action: CommunityWriteGuardAction;
  body?: string;
  client: SupabaseClient;
  target?: CommunityWriteGuardTarget;
}): Promise<CommunityWriteGuardCode | null> {
  const consentResponse = await client
    .schema("consent")
    .from("age_and_consent_status")
    .select(
      "is_14_or_older,required_privacy_version,required_terms_version",
    )
    .eq("account_id", accountId)
    .maybeSingle();

  if (consentResponse.error) {
    console.error("[community-write] consent guard unavailable", {
      code: consentResponse.error.code,
    });
    return "guard_unavailable";
  }

  const consent = consentResponse.data as
    | {
        is_14_or_older: boolean;
        required_privacy_version: string;
        required_terms_version: string;
      }
    | null;
  if (
    !consent?.is_14_or_older ||
    consent.required_privacy_version !== "privacy.v0.1" ||
    consent.required_terms_version !== "terms.v0.1"
  ) {
    return "required_consent_missing";
  }

  const schemaClient = client.schema("feed") as unknown as {
    rpc?: (
      name: string,
      params: Record<string, unknown>,
    ) => Promise<{
      data: string | null;
      error: { code?: string; message?: string } | null;
    }>;
  };

  if (typeof schemaClient.rpc !== "function") return "guard_unavailable";

  const response = await schemaClient.rpc("check_community_mutation_guard", {
    p_account_id: accountId,
    p_action: action,
    p_body: body ?? null,
    p_target_id: target?.id ?? null,
    p_target_key: target?.key ?? null,
    p_target_type: target?.type ?? null,
  });

  if (response.error) {
    console.error("[community-write] guard unavailable", {
      code: response.error.code,
    });
    return "guard_unavailable";
  }

  if (response.data === null) return null;
  if (response.data === "account_link_missing") return "account_link_missing";
  if (response.data === "duplicate_content") return "duplicate_content";
  if (response.data === "rate_limited") return "rate_limited";
  if (response.data === "required_consent_missing") {
    return "required_consent_missing";
  }
  if (response.data === "target_invalid") return "target_invalid";
  return "guard_unavailable";
}
