import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteOwnAccount } from "@/features/account/server-account-deletion";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const deleteAccountSchema = z.object({
  confirmation: z.literal("계정 삭제"),
});

export async function DELETE(request: Request) {
  const payload = await readValidatedJson(request, deleteAccountSchema);
  if (!payload.ok) return payload.response;

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const client = createSupabaseServiceClient();
  if (!client) return createApiClosedResponse("supabase_env_missing");

  const result = await deleteOwnAccount({ client, user: auth.user });
  if (!result.ok) {
    const message =
      result.code === "media_cleanup_failed"
        ? "업로드한 사진을 안전하게 정리하지 못했어요. 잠시 뒤 다시 시도해 주세요."
        : "계정을 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
    return NextResponse.json(
      { code: result.code, message, ok: false },
      { status: result.code === "account_link_missing" ? 403 : 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
