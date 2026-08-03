"use client";

import { type SocialAuthProviderId } from "@/features/auth/auth-policy";
import {
  normalizeSignInProvider,
  safeSignInReturnPath,
  validateOAuthAuthorizationUrl,
} from "@/features/auth/sign-in-intent-contract";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";
import { navigateToOAuthAuthorization } from "@/features/auth/oauth-browser-navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

type StartSocialSignInResult =
  | {
      closedState?: ReturnType<typeof createApiClosedPayload>;
      message: string;
      status:
        | "configuration_mismatch"
        | "error"
        | "missing_env"
        | "provider_unavailable";
    }
  | {
      status: "redirecting";
    };

export async function startSocialSignIn(
  providerId: SocialAuthProviderId,
): Promise<StartSocialSignInResult> {
  const supabase = createBrowserSupabaseClient();
  const env = getSupabasePublicEnv();

  if (!supabase || !env) {
    const closedState = createApiClosedPayload("supabase_env_missing");

    return {
      closedState,
      message: closedState.display.message,
      status: "missing_env",
    };
  }

  const supabaseProvider = normalizeSignInProvider(providerId);

  if (!supabaseProvider) {
    return {
      message: "네이버 연결은 custom OAuth 검증 후 활성화할게요.",
      status: "provider_unavailable",
    };
  }

  const intentResponse = await fetch("/api/auth/sign-in-intents", {
    body: JSON.stringify({
      provider: supabaseProvider,
      returnPath: getSafeNextPath(),
    }),
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    method: "POST",
  }).catch(() => null);
  const intentPayload = intentResponse
    ? await intentResponse.json().catch(() => null)
    : null;
  if (
    !intentResponse?.ok ||
    !intentPayload ||
    intentPayload.ok !== true ||
    typeof intentPayload.intent?.callbackUrl !== "string" ||
    intentPayload.intent.provider !== supabaseProvider
  ) {
    return {
      message: "로그인 연결을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
      status: "error",
    };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    options: {
      redirectTo: intentPayload.intent.callbackUrl,
      skipBrowserRedirect: true,
    },
    provider: supabaseProvider,
  });

  if (error) {
    return {
      message:
        "소셜 로그인 연결을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.",
      status: "error",
    };
  }

  const verified = validateOAuthAuthorizationUrl({
    authorizationUrl: data.url,
    callbackUrl: intentPayload.intent.callbackUrl,
    initiatingOrigin: window.location.origin,
    supabaseUrl: env.url,
  });
  if (!verified.ok) {
    return {
      message:
        "현재 접속한 주소로 돌아오도록 설정을 확인한 뒤 다시 시도해 주세요.",
      status: "configuration_mismatch",
    };
  }

  navigateToOAuthAuthorization(verified.authorizationUrl);

  return { status: "redirecting" };
}

function getSafeNextPath() {
  const next = new URLSearchParams(window.location.search).get("next");

  return safeSignInReturnPath(next);
}
