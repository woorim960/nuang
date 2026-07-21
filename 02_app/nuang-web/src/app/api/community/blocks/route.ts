import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import {
  readBlockedProfiles,
  unblockProfileByAccountId,
} from "@/features/account/server-blocked-profiles";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const unblockRequestSchema = z.object({
  blockedAccountId: z.string().uuid(),
});

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const client = createSupabaseServiceClient();
  if (!client) return createApiClosedResponse("supabase_env_missing");

  const result = await readBlockedProfiles({ client, user: auth.user });

  if (!result.ok) {
    return NextResponse.json(
      {
        message: "차단한 프로필을 불러오지 못했어요.",
        ok: false,
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      blockedProfiles: result.blockedProfiles,
      ok: true,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function DELETE(request: Request) {
  const payload = await readValidatedJson(request, unblockRequestSchema);
  if (!payload.ok) return payload.response;

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const client = createSupabaseServiceClient();
  if (!client) return createApiClosedResponse("supabase_env_missing");

  const result = await unblockProfileByAccountId({
    blockedAccountId: payload.data.blockedAccountId,
    client,
    user: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json(
      { message: "차단을 해제하지 못했어요.", ok: false },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
