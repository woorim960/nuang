import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function readAccountAccessStatus({
  client,
  supabaseUserId,
}: {
  client: SupabaseClient;
  supabaseUserId: string;
}) {
  const access = await client
    .schema("identity")
    .rpc("read_auth_user_access_status", {
      p_supabase_user_id: supabaseUserId,
    });

  if (access.error || typeof access.data !== "string") {
    return { ok: false as const };
  }

  if (
    access.data !== "active" &&
    access.data !== "conflict" &&
    access.data !== "deleted" &&
    access.data !== "merged" &&
    access.data !== "new" &&
    access.data !== "suspended"
  ) {
    return { ok: false as const };
  }

  return {
    ok: true as const,
    status: access.data,
  };
}
