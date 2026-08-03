import { z } from "zod";
import {
  getSupabaseOAuthProvider,
  type SocialAuthProviderId,
  type SupabaseOAuthProvider,
} from "@/features/auth/auth-policy";

export const signInIntentCookieName = "nuang-sign-in-intent";
export const signInIntentTtlSeconds = 10 * 60;
export const exactOAuthCallbackPath = "/auth/callback";

export const allowedOAuthOrigins = [
  "https://nuang.app",
  "http://localhost:3000",
] as const;

export const signInIntentRequestSchema = z.object({
  provider: z.enum(["google", "kakao"]),
  returnPath: z.string().trim().max(500).default("/my"),
});

export type SignInIntentProvider = z.infer<
  typeof signInIntentRequestSchema
>["provider"];

export type SignInIntentPayload = {
  createdAt: number;
  expiresAt: number;
  initiatingOrigin: (typeof allowedOAuthOrigins)[number];
  nonce: string;
  provider: SignInIntentProvider;
  returnPath: string;
  version: 1;
};

export function isAllowedOAuthOrigin(
  value: string,
): value is (typeof allowedOAuthOrigins)[number] {
  return allowedOAuthOrigins.includes(
    value as (typeof allowedOAuthOrigins)[number],
  );
}

export function safeSignInReturnPath(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return "/my";
  }

  try {
    const parsed = new URL(value, "https://nuang.invalid");
    if (parsed.origin !== "https://nuang.invalid") return "/my";
    if (
      parsed.pathname === exactOAuthCallbackPath ||
      parsed.pathname === "/auth/link/callback" ||
      parsed.pathname.startsWith("/api/")
    ) {
      return "/my";
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/my";
  }
}

export function exactOAuthCallbackUrl(origin: string) {
  if (!isAllowedOAuthOrigin(origin)) return null;
  return new URL(exactOAuthCallbackPath, origin).toString();
}

export function normalizeSignInProvider(
  value: SocialAuthProviderId,
): SupabaseOAuthProvider | null {
  return getSupabaseOAuthProvider(value);
}

export function validateOAuthAuthorizationUrl({
  authorizationUrl,
  callbackUrl,
  initiatingOrigin,
  supabaseUrl,
}: {
  authorizationUrl: string | null | undefined;
  callbackUrl: string;
  initiatingOrigin: string;
  supabaseUrl: string;
}) {
  try {
    if (!authorizationUrl || !isAllowedOAuthOrigin(initiatingOrigin)) {
      return { code: "authorization_url_missing" as const, ok: false as const };
    }
    const authorization = new URL(authorizationUrl);
    const supabaseOrigin = new URL(supabaseUrl).origin;
    const callback = new URL(callbackUrl);
    const redirectTo = authorization.searchParams.get("redirect_to");
    if (authorization.origin !== supabaseOrigin) {
      return { code: "auth_origin_mismatch" as const, ok: false as const };
    }
    if (
      callback.origin !== initiatingOrigin ||
      callback.pathname !== exactOAuthCallbackPath ||
      callback.search ||
      callback.hash
    ) {
      return { code: "callback_mismatch" as const, ok: false as const };
    }
    if (!redirectTo || redirectTo !== callback.toString()) {
      return { code: "redirect_to_mismatch" as const, ok: false as const };
    }
    return { authorizationUrl: authorization.toString(), ok: true as const };
  } catch {
    return { code: "authorization_url_invalid" as const, ok: false as const };
  }
}
