import { type NextRequest, NextResponse } from "next/server";
import {
  identityLinkIntentCookieName,
  isSupportedIdentityProvider,
  safeIdentityReturnPath,
} from "@/features/auth/identity-link-contract";
import { consumeIdentityLinkIntent } from "@/features/auth/server-linked-identities";
import { getAppOrigin } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const fallbackPath = safeIdentityReturnPath(
    request.nextUrl.searchParams.get("next") ?? "/my/settings/account",
  );
  const token = request.cookies.get(identityLinkIntentCookieName)?.value ?? null;
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError || !code) {
    return clearIntentCookie(
      redirectWithLinkStatus(
        fallbackPath,
        oauthError ? "cancelled" : "failed",
      ),
    );
  }
  if (!token) {
    return clearIntentCookie(redirectWithLinkStatus(fallbackPath, "expired"));
  }

  const [supabase, serviceClient] = await Promise.all([
    createServerSupabaseClient(),
    Promise.resolve(createSupabaseServiceClient()),
  ]);
  if (!supabase || !serviceClient) {
    return clearIntentCookie(redirectWithLinkStatus(fallbackPath, "failed"));
  }

  const exchanged = await supabase.auth.exchangeCodeForSession(code);
  if (exchanged.error) {
    return clearIntentCookie(redirectWithLinkStatus(fallbackPath, "failed"));
  }

  const userResult = await supabase.auth.getUser();
  if (userResult.error || !userResult.data.user) {
    return clearIntentCookie(redirectWithLinkStatus(fallbackPath, "failed"));
  }

  const consumed = await consumeIdentityLinkIntent({
    client: serviceClient,
    requestOrigin: new URL(getAppOrigin()).origin,
    token,
    user: userResult.data.user,
  });
  if (!consumed.ok) {
    const status =
      consumed.code === "link_intent_expired"
        ? "expired"
        : consumed.code === "identity_account_conflict"
          ? "conflict"
          : "failed";
    return clearIntentCookie(redirectWithLinkStatus(fallbackPath, status));
  }

  return clearIntentCookie(
    redirectWithLinkStatus(
      consumed.data.returnPath,
      "connected",
      consumed.data.provider,
    ),
  );
}

function redirectWithLinkStatus(
  returnPath: string,
  status: "cancelled" | "conflict" | "connected" | "expired" | "failed",
  provider?: string,
) {
  const redirectUrl = new URL(safeIdentityReturnPath(returnPath), getAppOrigin());
  redirectUrl.searchParams.set("link", status);
  if (isSupportedIdentityProvider(provider)) {
    redirectUrl.searchParams.set("provider", provider);
  }
  return NextResponse.redirect(redirectUrl);
}

function clearIntentCookie(response: NextResponse) {
  response.cookies.set(identityLinkIntentCookieName, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/auth/link/callback",
    sameSite: "lax",
    secure: getAppOrigin().startsWith("https://"),
  });
  return response;
}
