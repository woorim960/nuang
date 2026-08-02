import { NextResponse } from "next/server";
import { isSupportedIdentityProvider } from "@/features/auth/identity-link-contract";
import { unlinkIdentityProvider } from "@/features/auth/server-linked-identities";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  if (!isSameOriginBrowserRequest(request)) {
    return failure("cross_site_request", "요청을 확인하지 못했어요.", 403);
  }
  const { provider } = await context.params;
  if (!isSupportedIdentityProvider(provider)) {
    return failure("provider_invalid", "로그인 방법을 확인해 주세요.", 422);
  }
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;
  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) {
    return failure(
      "identity_service_unavailable",
      "연결을 해제하지 못했어요.",
      503,
    );
  }

  const result = await unlinkIdentityProvider({
    authClient: auth.supabase,
    provider,
    serviceClient,
    user: auth.user,
  });
  if (!result.ok) {
    const responseByCode = {
      identity_not_linked: ["연결되지 않은 로그인 방법이에요.", 404],
      last_login_method: [
        "다른 로그인 방법을 먼저 연결해 주세요.",
        409,
      ],
      reauth_required: [
        "남길 로그인 방법으로 다시 확인한 뒤 해제해 주세요.",
        428,
      ],
    } as const;
    const mapped = responseByCode[result.code as keyof typeof responseByCode];
    return failure(
      result.code,
      mapped?.[0] ??
        "연결을 해제하지 못했어요. 기존 기록은 그대로예요.",
      mapped?.[1] ?? 503,
    );
  }

  return NextResponse.json(
    {
      ok: true,
      reconciliationPending: result.data.reconciliationPending,
    },
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
