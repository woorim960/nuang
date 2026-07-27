import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type CommunityWriteGuardCode =
  | "account_link_missing"
  | "duplicate_content"
  | "rate_limited";

export async function checkCommunityWriteGuard({
  accountId,
  action,
  body,
  client,
}: {
  accountId: string;
  action: "create_comment" | "create_post" | "report_content";
  body?: string;
  client: SupabaseClient;
}): Promise<CommunityWriteGuardCode | null> {
  const schemaClient = client.schema("feed") as unknown as {
    rpc?: (
      name: string,
      params: Record<string, unknown>,
    ) => Promise<{
      data: string | null;
      error: { code?: string; message?: string } | null;
    }>;
  };

  // Test doubles and a partially rolled-out database may not expose this RPC.
  // The operations health check treats that state as a release blocker.
  if (typeof schemaClient.rpc !== "function") return null;

  const response = await schemaClient.rpc("check_community_write_guard", {
    p_account_id: accountId,
    p_action: action,
    p_body: body ?? null,
  });

  if (response.error) {
    console.error("[community-write] guard unavailable", {
      code: response.error.code,
    });
    return null;
  }

  if (response.data === "account_link_missing") return "account_link_missing";
  if (response.data === "duplicate_content") return "duplicate_content";
  if (response.data === "rate_limited") return "rate_limited";
  return null;
}
