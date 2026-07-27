import { NextResponse } from "next/server";
import { ensureAccountForUser } from "@/features/account/server-writes";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: Request,
  context: { params: Promise<{ entryId: string }> },
) {
  if (!isAllowedGateCRequest(request)) {
    return NextResponse.json({ error: "cross_site_request" }, { status: 403 });
  }

  const { entryId } = await context.params;
  if (!uuidPattern.test(entryId)) {
    return NextResponse.json({ error: "invalid_event_entry" }, { status: 422 });
  }

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const client = createSupabaseServiceClient();
  if (!client) return createApiClosedResponse("supabase_env_missing");

  const account = await ensureAccountForUser(client, auth.user);
  if (!account.ok) {
    return NextResponse.json(
      { error: "account_unavailable" },
      { status: 503 },
    );
  }

  const response = await client
    .from("research_gate_c_reward_entry")
    .update({ status: "withdrawn", updated_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("account_id", account.accountId)
    .in("status", ["entered", "winner"])
    .select("id")
    .maybeSingle();

  if (response.error) {
    return NextResponse.json(
      { error: "event_entry_withdrawal_failed" },
      { status: 503 },
    );
  }
  if (!response.data) {
    return NextResponse.json(
      { error: "event_entry_not_withdrawable" },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "cache-control": "private, no-store" } },
  );
}
