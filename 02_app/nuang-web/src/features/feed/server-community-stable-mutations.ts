import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const communityStableProfileMutationCapability =
  "community-stable-profile-mutation.v1" as const;

const communityStableProfileMutationFlag =
  "COMMUNITY_STABLE_PROFILE_MUTATIONS_ENABLED";

export type CommunityStableProfileMutationReadiness =
  | {
      capability: typeof communityStableProfileMutationCapability;
      state: "ready";
    }
  | {
      state: "disabled" | "unavailable";
    };

export type CommunityStableProfileMutationFailureCode =
  | "account_link_missing"
  | "blocked_relationship"
  | "rate_limited"
  | "required_consent_missing"
  | "target_invalid";

type CommunityStableProfileMutationRpcResult =
  | {
      changed: boolean;
      code: CommunityStableProfileMutationFailureCode;
      ok: false;
    }
  | {
      changed: boolean;
      code:
        | "already_reported"
        | "blocked"
        | "following"
        | "reported"
        | "unblocked"
        | "unfollowed";
      ok: true;
      blocked?: boolean;
      createdAt?: string;
      following?: boolean;
      reportId?: string;
      reported?: boolean;
    };

export type CommunityStableProfileMutationRpcResponse =
  | {
      result: CommunityStableProfileMutationRpcResult;
      state: "ready";
    }
  | {
      state: "unavailable";
    };

type RpcClient = {
  rpc?: (
    name: string,
    params?: Record<string, unknown>,
  ) => Promise<{
    data: unknown;
    error: { code?: string; message?: string } | null;
  }>;
};

export function isCommunityStableProfileMutationFlagEnabled(
  environment: NodeJS.ProcessEnv = process.env,
) {
  return environment[communityStableProfileMutationFlag]?.trim() === "true";
}

export async function readCommunityStableProfileMutationReadiness({
  client,
  environment = process.env,
}: {
  client: SupabaseClient;
  environment?: NodeJS.ProcessEnv;
}): Promise<CommunityStableProfileMutationReadiness> {
  if (!isCommunityStableProfileMutationFlagEnabled(environment)) {
    return { state: "disabled" };
  }

  const rpcClient = client.schema("feed") as unknown as RpcClient;
  if (typeof rpcClient.rpc !== "function") {
    return { state: "unavailable" };
  }

  const response = await rpcClient.rpc(
    "get_community_stable_profile_mutation_capability",
    {},
  );

  if (response.error) {
    console.error("[community-stable-profile] capability unavailable", {
      code: response.error.code ?? null,
    });
    return { state: "unavailable" };
  }

  return response.data === communityStableProfileMutationCapability
    ? {
        capability: communityStableProfileMutationCapability,
        state: "ready",
      }
    : { state: "unavailable" };
}

export async function callCommunityStableProfileMutationRpc({
  client,
  name,
  params,
}: {
  client: SupabaseClient;
  name:
    | "create_profile_report_v2"
    | "set_profile_block_v2"
    | "set_profile_follow_v2";
  params: Record<string, unknown>;
}): Promise<CommunityStableProfileMutationRpcResponse> {
  const rpcClient = client.schema("feed") as unknown as RpcClient;
  if (typeof rpcClient.rpc !== "function") {
    return { state: "unavailable" };
  }

  const response = await rpcClient.rpc(name, params);
  if (response.error) {
    // Never retry a v2 mutation through a v1 RPC. A missing or stale schema is
    // an unavailable state, including PostgREST's PGRST202 response.
    console.error("[community-stable-profile] mutation unavailable", {
      code: response.error.code ?? null,
      rpc: name,
    });
    return { state: "unavailable" };
  }

  const result = parseCommunityStableProfileMutationResult(response.data);
  return result ? { result, state: "ready" } : { state: "unavailable" };
}

function parseCommunityStableProfileMutationResult(
  value: unknown,
): CommunityStableProfileMutationRpcResult | null {
  if (!value || typeof value !== "object") return null;

  const result = value as Record<string, unknown>;
  if (typeof result.ok !== "boolean" || typeof result.code !== "string") {
    return null;
  }

  if (!result.ok) {
    if (
      !isStableProfileMutationFailureCode(result.code) ||
      (result.changed !== undefined && result.changed !== false)
    ) {
      return null;
    }
    return {
      changed: false,
      code: result.code,
      ok: false,
    };
  }

  if (
    !isStableProfileMutationSuccessCode(result.code) ||
    typeof result.changed !== "boolean"
  ) {
    return null;
  }

  return {
    ...(typeof result.blocked === "boolean" ? { blocked: result.blocked } : {}),
    changed: result.changed,
    code: result.code,
    ...(typeof result.createdAt === "string" &&
    result.createdAt.length <= 64 &&
    !Number.isNaN(Date.parse(result.createdAt))
      ? { createdAt: result.createdAt }
      : {}),
    ...(typeof result.following === "boolean"
      ? { following: result.following }
      : {}),
    ok: true,
    ...(typeof result.reportId === "string" && isUuid(result.reportId)
      ? { reportId: result.reportId }
      : {}),
    ...(typeof result.reported === "boolean"
      ? { reported: result.reported }
      : {}),
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isStableProfileMutationFailureCode(
  code: string,
): code is CommunityStableProfileMutationFailureCode {
  return (
    code === "account_link_missing" ||
    code === "blocked_relationship" ||
    code === "rate_limited" ||
    code === "required_consent_missing" ||
    code === "target_invalid"
  );
}

function isStableProfileMutationSuccessCode(
  code: string,
): code is Extract<
  CommunityStableProfileMutationRpcResult,
  { ok: true }
>["code"] {
  return (
    code === "already_reported" ||
    code === "blocked" ||
    code === "following" ||
    code === "reported" ||
    code === "unblocked" ||
    code === "unfollowed"
  );
}
