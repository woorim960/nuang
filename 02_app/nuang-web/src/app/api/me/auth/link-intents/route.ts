import { NextResponse } from "next/server";
import {
  identityLinkIntentCookieName,
  identityLinkIntentRequestSchema,
} from "@/features/auth/identity-link-contract";
import {
  createIdentityLinkIntent,
  resolveSingleAccountForAuthUser,
} from "@/features/auth/server-linked-identities";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return failure("cross_site_request", "요청을 확인하지 못했어요.", 403);
  }
  const parsed = identityLinkIntentRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return failure("link_request_invalid", "연결할 방법을 확인해 주세요.", 422);
  }

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;
  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) {
    return failure(
      "identity_service_unavailable",
      "로그인 연결을 시작하지 못했어요.",
      503,
    );
  }
  const account = await resolveSingleAccountForAuthUser({
    client: serviceClient,
    supabaseUserId: auth.user.id,
  });
  if (!account.ok) {
    return failure(
      account.code,
      "현재 계정을 안전하게 확인하지 못했어요.",
      account.code === "account_identity_ambiguous" ? 409 : 503,
    );
  }

  const result = await createIdentityLinkIntent({
    accountId: account.accountId,
    client: serviceClient,
    provider: parsed.data.provider,
    returnPath: parsed.data.returnPath,
    supabaseUserId: auth.user.id,
  });
  if (!result.ok) {
    const conflict = result.code === "provider_already_linked";
    return failure(
      result.code,
      conflict
        ? "이미 연결된 로그인 방법이에요."
        : "이 로그인 방법은 지금 연결할 수 없어요.",
      conflict ? 409 : result.code === "provider_linking_disabled" ? 423 : 503,
    );
  }

  const response = NextResponse.json(
    {
      link: {
        expiresAt: result.data.expiresAt,
        provider: result.data.provider,
        redirectTo: result.data.redirectTo,
      },
      ok: true,
    },
    { headers: privateNoStoreHeaders },
  );
  response.cookies.set(identityLinkIntentCookieName, result.data.cookieToken, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/auth/link/callback",
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
  });
  return response;
}

function failure(code: string, message: string, status: number) {
  return NextResponse.json(
    { code, message, ok: false },
    { headers: privateNoStoreHeaders, status },
  );
}

const privateNoStoreHeaders = { "cache-control": "private, no-store" };
