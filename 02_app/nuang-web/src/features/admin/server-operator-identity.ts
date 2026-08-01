import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function readOperatorAccountIds({
  accountIds,
  client,
}: {
  accountIds: string[];
  client: SupabaseClient;
}) {
  const uniqueAccountIds = [...new Set(accountIds)].filter(Boolean);
  const operatorAccountIds = new Set<string>();
  if (uniqueAccountIds.length === 0) return operatorAccountIds;

  let response: {
    data: Array<{ account_id?: unknown }> | null;
    error: unknown;
  } | null = null;
  try {
    response = await client
      .schema("identity")
      .from("operator_account")
      .select("account_id")
      .in("account_id", uniqueAccountIds);
  } catch {
    return operatorAccountIds;
  }

  if (!response || response.error) return operatorAccountIds;

  for (const row of response.data ?? []) {
    if (typeof row.account_id === "string") {
      operatorAccountIds.add(row.account_id);
    }
  }

  return operatorAccountIds;
}

export async function syncOperatorAccount({
  accountId,
  client,
  enabled,
}: {
  accountId: string;
  client: SupabaseClient;
  enabled: boolean;
}) {
  try {
    if (enabled) {
      const response = await client
        .schema("identity")
        .from("operator_account")
        .upsert(
          {
            account_id: accountId,
            role_label: "뉴앙 운영자",
            source: "admin_allowlist",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "account_id" },
        );

      return !response.error;
    }

    const response = await client
      .schema("identity")
      .from("operator_account")
      .delete()
      .eq("account_id", accountId);

    return !response.error;
  } catch {
    return false;
  }
}
