import { type NextRequest, NextResponse } from "next/server";
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

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/my";
  }

  return value;
}

function redirectWithAuthStatus(request: NextRequest, status: string) {
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
  const redirectUrl = new URL(nextPath, request.nextUrl.origin);
  redirectUrl.searchParams.set("auth", status);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return redirectWithAuthStatus(request, "missing_code");
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return redirectWithAuthStatus(request, "env_missing");
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectWithAuthStatus(request, "error");
  }

  const [{ data }, serviceClient] = await Promise.all([
    supabase.auth.getUser(),
    Promise.resolve(createSupabaseServiceClient()),
  ]);

  if (!data.user) {
    return clearConsentCookie(redirectWithAuthStatus(request, "error"));
  }

  if (!serviceClient) {
    return clearConsentCookie(redirectWithAuthStatus(request, "env_missing"));
  }

  if (data.user) {
    const consentDraft = readConsentIntent(request);

    if (!consentDraft) {
      return clearConsentCookie(
        redirectWithAuthStatus(request, "consent_required"),
      );
    }

    const account = await ensureAccountForUser(serviceClient, data.user);
    const consent =
      account.ok &&
      (await persistAccountConsent(
        serviceClient,
        account.accountId,
        consentDraft,
      ));

    if (!consent || !consent.ok) {
      return clearConsentCookie(
        redirectWithAuthStatus(request, "consent_error"),
      );
    }

    // A signed-in user must be able to follow, block and edit their profile
    // before completing an assessment. Bootstrap failures do not invalidate
    // the successful OAuth session; the profile API retries this operation.
    await ensureCommunityProfile({ client: serviceClient, user: data.user });
  }

  return clearConsentCookie(redirectWithAuthStatus(request, "connected"));
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

function clearConsentCookie(response: NextResponse) {
  response.cookies.delete(consentIntentCookieName);
  return response;
}
