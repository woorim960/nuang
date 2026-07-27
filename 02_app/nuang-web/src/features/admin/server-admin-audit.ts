import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminAuditItem = {
  action: string;
  adminAccountId: string | null;
  adminName: string;
  createdAt: string;
  id: string;
  metadata: Record<string, unknown>;
  targetId: string | null;
  targetTable: string | null;
};

export async function readAdminAudit({
  client,
  query = "",
}: {
  client: SupabaseClient;
  query?: string;
}): Promise<AdminAuditItem[]> {
  const response = await client
    .schema("audit")
    .from("admin_audit_log")
    .select(
      "id,admin_account_id,action,target_table,target_id,metadata,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (response.error) throw response.error;

  const accountIds = Array.from(
    new Set(
      (response.data ?? [])
        .map((row) => row.admin_account_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const profiles =
    accountIds.length > 0
      ? await client
          .schema("profile")
          .from("community_profile")
          .select("account_id,display_name")
          .in("account_id", accountIds)
      : { data: [], error: null };
  if (profiles.error) throw profiles.error;
  const names = new Map(
    (profiles.data ?? []).map((row) => [row.account_id, row.display_name]),
  );
  const normalized = query.trim().toLowerCase();

  return (response.data ?? [])
    .map(
      (row): AdminAuditItem => ({
        action: row.action,
        adminAccountId: row.admin_account_id,
        adminName: row.admin_account_id
          ? (names.get(row.admin_account_id) ?? "관리자")
          : "시스템",
        createdAt: row.created_at,
        id: row.id,
        metadata: isRecord(row.metadata) ? row.metadata : {},
        targetId: row.target_id,
        targetTable: row.target_table,
      }),
    )
    .filter((row) => {
      if (!normalized) return true;
      return [
        row.action,
        row.adminName,
        row.targetId,
        row.targetTable,
        JSON.stringify(row.metadata),
      ].some((value) => value?.toLowerCase().includes(normalized));
    })
    .slice(0, 200);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
