import { z } from "zod";

export const requiredConsentRenewalSchema = z
  .object({
    is14OrOlder: z.literal(true),
    privacy: z.literal(true),
    terms: z.literal(true),
  })
  .strict();

const defaultRequiredConsentReturnPath = "/my/reports/history";

export function safeRequiredConsentReturnPath(
  value: string | null | undefined,
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return defaultRequiredConsentReturnPath;
  }

  try {
    const parsed = new URL(value, "https://nuang.invalid");
    if (
      parsed.origin !== "https://nuang.invalid" ||
      parsed.pathname === "/consent/required" ||
      parsed.pathname.startsWith("/consent/required/") ||
      parsed.pathname === "/login" ||
      parsed.pathname.startsWith("/login/") ||
      parsed.pathname.startsWith("/api/") ||
      parsed.pathname.startsWith("/auth/")
    ) {
      return defaultRequiredConsentReturnPath;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return defaultRequiredConsentReturnPath;
  }
}

export function buildRequiredConsentHref(nextPath: string) {
  return `/consent/required?next=${encodeURIComponent(
    safeRequiredConsentReturnPath(nextPath),
  )}`;
}
