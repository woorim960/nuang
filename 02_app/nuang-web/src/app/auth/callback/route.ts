import { type NextRequest, NextResponse } from "next/server";
import {
  isAllowedOAuthOrigin,
  safeSignInReturnPath,
  signInIntentCookieName,
  type SignInIntentPayload,
} from "@/features/auth/sign-in-intent-contract";
import { verifySignInIntent } from "@/features/auth/sign-in-intent-security";
import {
  ensureAccountForUser,
  persistAccountConsent,
} from "@/features/account/server-writes";
import { ensureCommunityProfile } from "@/features/account/server-community-profile";
import {
  consentDraftSchema,
  consentIntentCookieName,
} from "@/features/consent/consent-draft";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const callbackOrigin = request.nextUrl.origin;
  if (!isAllowedOAuthOrigin(callbackOrigin)) {
    return NextResponse.json(
      {
        code: "origin_not_allowed",
        message: "로그인 주소를 확인하지 못했어요.",
        ok: false,
      },
      { headers: privateNoStoreHeaders, status: 400 },
    );
  }

  let verifiedIntent: ReturnType<typeof verifySignInIntent>;
  try {
    verifiedIntent = verifySignInIntent({
      callbackOrigin,
      token: request.cookies.get(signInIntentCookieName)?.value,
    });
  } catch {
    return clearSignInIntentCookie(
      redirectToLogin(callbackOrigin, "/my", "env_missing"),
      callbackOrigin,
    );
  }
  if (!verifiedIntent.ok) {
    return clearSignInIntentCookie(
      redirectToLogin(callbackOrigin, "/my", verifiedIntent.code),
      callbackOrigin,
    );
  }

  const intent = verifiedIntent.intent;
  const code = request.nextUrl.searchParams.get("code");
  if (!code || request.nextUrl.searchParams.has("error")) {
    return clearSignInIntentCookie(
      redirectToLogin(
        callbackOrigin,
        intent.returnPath,
        request.nextUrl.searchParams.has("error")
          ? "oauth_cancelled"
          : "missing_code",
      ),
      callbackOrigin,
    );
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return clearSignInIntentCookie(
      redirectToLogin(callbackOrigin, intent.returnPath, "env_missing"),
      callbackOrigin,
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return clearSignInIntentCookie(
      redirectToLogin(callbackOrigin, intent.returnPath, "session_error"),
      callbackOrigin,
    );
  }

  const [{ data }, serviceClient] = await Promise.all([
    supabase.auth.getUser(),
    Promise.resolve(createSupabaseServiceClient()),
  ]);
  if (!data.user || !matchesIntentProvider(data.user, intent.provider)) {
    const status = (await discardFailedSession(supabase))
      ? "identity_unsupported"
      : "session_cleanup_error";
    return clearTemporaryCookies(
      redirectToLogin(callbackOrigin, intent.returnPath, status),
      callbackOrigin,
    );
  }
  if (!serviceClient) {
    return clearTemporaryCookies(
      redirectToReturnPath(callbackOrigin, intent.returnPath, "env_missing"),
      callbackOrigin,
    );
  }

  const consentDraft = readConsentIntent(request);
  if (!consentDraft) {
    const status = (await discardFailedSession(supabase))
      ? "consent_required"
      : "session_cleanup_error";
    return clearTemporaryCookies(
      redirectToLogin(callbackOrigin, intent.returnPath, status),
      callbackOrigin,
    );
  }

  const account = await ensureAccountForUser(serviceClient, data.user, {
    auditEvent: true,
  });
  if (!account.ok) {
    const accountStatus =
      account.code === "account_conflict"
        ? "identity_conflict"
        : account.code === "identity_deleted"
          ? "account_deleted"
          : account.code === "identity_missing" ||
              account.code === "provider_not_allowed" ||
              account.code === "duplicate_identity"
            ? "identity_unsupported"
            : "identity_error";
    const status = (await discardFailedSession(supabase))
      ? accountStatus
      : "session_cleanup_error";

    return clearTemporaryCookies(
      redirectToLogin(callbackOrigin, intent.returnPath, status),
      callbackOrigin,
    );
  }

  const consent = await persistAccountConsent(
    serviceClient,
    account.accountId,
    consentDraft,
  );
  if (!consent.ok) {
    const status = (await discardFailedSession(supabase))
      ? "consent_error"
      : "session_cleanup_error";
    return clearTemporaryCookies(
      redirectToLogin(callbackOrigin, intent.returnPath, status),
      callbackOrigin,
    );
  }

  // Profile bootstrap is retryable and must not invalidate a valid session.
  try {
    await ensureCommunityProfile({ client: serviceClient, user: data.user });
  } catch {
    // The authenticated profile APIs retry this non-security bootstrap.
  }

  return clearTemporaryCookies(
    redirectToReturnPath(callbackOrigin, intent.returnPath, "connected"),
    callbackOrigin,
  );
}

function matchesIntentProvider(
  user: {
    app_metadata?: Record<string, unknown>;
    identities?: Array<{ provider?: string }> | null;
  },
  provider: SignInIntentPayload["provider"],
) {
  return Boolean(
    user.identities?.some((identity) => identity.provider === provider),
  );
}

async function discardFailedSession(supabase: {
  auth: {
    signOut(options: { scope: "local" }): Promise<{ error: unknown }>;
  };
}) {
  try {
    const result = await supabase.auth.signOut({ scope: "local" });
    return !result.error;
  } catch {
    return false;
  }
}

function redirectToLogin(origin: string, returnPath: string, status: string) {
  const redirectUrl = new URL("/login", origin);
  redirectUrl.searchParams.set("next", safeSignInReturnPath(returnPath));
  redirectUrl.searchParams.set("auth", status);
  return NextResponse.redirect(redirectUrl, { headers: privateNoStoreHeaders });
}

function redirectToReturnPath(
  origin: string,
  returnPath: string,
  status: string,
) {
  const redirectUrl = new URL(safeSignInReturnPath(returnPath), origin);
  redirectUrl.searchParams.set("auth", status);
  return NextResponse.redirect(redirectUrl, { headers: privateNoStoreHeaders });
}

function readConsentIntent(request: NextRequest) {
  const encoded = request.cookies.get(consentIntentCookieName)?.value;
  if (!encoded) return null;

  try {
    const parsed = consentDraftSchema.safeParse(
      JSON.parse(decodeURIComponent(encoded)),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function clearTemporaryCookies(response: NextResponse, origin: string) {
  response.cookies.delete(consentIntentCookieName);
  return clearSignInIntentCookie(response, origin);
}

function clearSignInIntentCookie(response: NextResponse, origin: string) {
  response.cookies.set(signInIntentCookieName, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/auth/callback",
    sameSite: "lax",
    secure: origin.startsWith("https://"),
  });
  return response;
}

const privateNoStoreHeaders = { "cache-control": "private, no-store" };
