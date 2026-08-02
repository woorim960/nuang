import { z } from "zod";

export const supportedIdentityProviders = ["google", "kakao"] as const;
export type SupportedIdentityProvider =
  (typeof supportedIdentityProviders)[number];

export const identityLinkIntentTtlSeconds = 10 * 60;
export const identityLinkIntentCookieName = "nuang-identity-link-intent";

export const identityLinkIntentRequestSchema = z.object({
  provider: z.enum(supportedIdentityProviders),
  returnPath: z.string().trim().max(500).default("/my/settings/account"),
});

export type LinkedIdentityMethod = {
  canUnlink: boolean;
  current: boolean;
  emailMasked: string | null;
  label: string;
  provider: SupportedIdentityProvider;
  status: "available" | "connected";
};

export type LinkedIdentitySecurityPayload = {
  currentProvider: SupportedIdentityProvider | null;
  features: {
    linking: boolean;
    phoneVerification: boolean;
    unlinking: boolean;
  };
  linkedCount: number;
  methods: LinkedIdentityMethod[];
};

export function safeIdentityReturnPath(value: string) {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return "/my/settings/account";
  }

  try {
    const url = new URL(value, "https://nuang.invalid");
    if (url.origin !== "https://nuang.invalid") {
      return "/my/settings/account";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/my/settings/account";
  }
}

export function isSupportedIdentityProvider(
  value: unknown,
): value is SupportedIdentityProvider {
  return supportedIdentityProviders.includes(
    value as SupportedIdentityProvider,
  );
}

export function providerLabel(provider: SupportedIdentityProvider) {
  return provider === "google" ? "Google" : "카카오";
}
