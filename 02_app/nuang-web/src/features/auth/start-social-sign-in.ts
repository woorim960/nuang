"use client";

import {
  getSupabaseOAuthProvider,
  type SocialAuthProviderId,
} from "@/features/auth/auth-policy";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type StartSocialSignInResult =
  | {
      closedState?: ReturnType<typeof createApiClosedPayload>;
      message: string;
      status: "error" | "missing_env" | "provider_unavailable";
    }
  | {
      status: "redirecting";
    };

export async function startSocialSignIn(
  providerId: SocialAuthProviderId,
): Promise<StartSocialSignInResult> {
  const supabase = createBrowserSupabaseClient();

  if (!supabase) {
    const closedState = createApiClosedPayload("supabase_env_missing");

    return {
      closedState,
      message: closedState.display.message,
      status: "missing_env",
    };
  }

  const supabaseProvider = getSupabaseOAuthProvider(providerId);

  if (!supabaseProvider) {
    return {
      message: "네이버 연결은 custom OAuth 검증 후 활성화할게요.",
      status: "provider_unavailable",
    };
  }

  const callbackUrl = new URL("/auth/callback", window.location.origin);
  callbackUrl.searchParams.set("next", getSafeNextPath());

  const { error } = await supabase.auth.signInWithOAuth({
    options: {
      redirectTo: callbackUrl.toString(),
    },
    provider: supabaseProvider,
  });

  if (error) {
    return {
      message: "소셜 로그인 연결을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.",
      status: "error",
    };
  }

  return { status: "redirecting" };
}

function getSafeNextPath() {
  const next = new URLSearchParams(window.location.search).get("next");

  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/my";
  }

  return next;
}
