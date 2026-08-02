import { NextResponse } from "next/server";
import { readLinkedIdentitySecurity } from "@/features/auth/server-linked-identities";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;
  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) {
    return failure(
      "identity_service_unavailable",
      "로그인 방법을 불러오지 못했어요.",
      503,
    );
  }

  const result = await readLinkedIdentitySecurity({
    authClient: auth.supabase,
    serviceClient,
    user: auth.user,
  });
  if (!result.ok) {
    return failure(
      result.code,
      "로그인 방법을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      result.code === "account_identity_ambiguous" ? 409 : 503,
    );
  }

  return NextResponse.json(
    { ok: true, security: result.data },
    { headers: privateNoStoreHeaders },
  );
}

function failure(code: string, message: string, status: number) {
  return NextResponse.json(
    { code, message, ok: false },
    { headers: privateNoStoreHeaders, status },
  );
}

const privateNoStoreHeaders = { "cache-control": "private, no-store" };
