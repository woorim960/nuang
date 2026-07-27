import "server-only";

import { ensureAccountForUser } from "@/features/account/server-writes";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function requirePrivateContactContext() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth;

  const client = createSupabaseServiceClient();
  if (!client) {
    return {
      ok: false as const,
      response: createApiClosedResponse("supabase_env_missing"),
    };
  }

  const account = await ensureAccountForUser(client, auth.user);
  if (!account.ok) {
    return {
      ok: false as const,
      response: new Response(
        JSON.stringify({
          code: "account_unavailable",
          message: "계정 정보를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
          ok: false,
        }),
        {
          headers: {
            "cache-control": "private, no-store",
            "content-type": "application/json",
          },
          status: 503,
        },
      ),
    };
  }

  return {
    accountId: account.accountId,
    client,
    ok: true as const,
    user: auth.user,
  };
}
