import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function readAccountAccessStatus({
  client,
  supabaseUserId,
}: {
  client: SupabaseClient;
  supabaseUserId: string;
}) {
  const identity = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", supabaseUserId)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (identity.error) return { ok: false as const };
  if (!identity.data?.account_id) {
    return { ok: true as const, status: "new" as const };
  }

  const account = await client
    .schema("identity")
    .from("account")
    .select("status")
    .eq("id", identity.data.account_id)
    .maybeSingle();
  if (account.error || !account.data) return { ok: false as const };

  return {
    ok: true as const,
    status: account.data.status as "active" | "deleted" | "suspended",
  };
}
