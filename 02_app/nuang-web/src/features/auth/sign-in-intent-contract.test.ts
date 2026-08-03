import { describe, expect, it } from "vitest";
import {
  exactOAuthCallbackUrl,
  safeSignInReturnPath,
  validateOAuthAuthorizationUrl,
} from "@/features/auth/sign-in-intent-contract";

describe("OAuth sign-in intent contract", () => {
  it.each(["https://nuang.app", "http://localhost:3000"] as const)(
    "builds a query-free exact callback for %s",
    (origin) => {
      expect(exactOAuthCallbackUrl(origin)).toBe(`${origin}/auth/callback`);
      expect(exactOAuthCallbackUrl(origin)).not.toContain("?");
    },
  );

  it("rejects unsafe and recursive return paths", () => {
    for (const unsafe of [
      "https://evil.example/path",
      "//evil.example/path",
      "/\\evil.example/path",
      "/auth/callback",
      "/auth/link/callback",
      "/api/me",
      "/my\nLocation:https://evil.example",
    ]) {
      expect(safeSignInReturnPath(unsafe)).toBe("/my");
    }
    expect(safeSignInReturnPath("/my/profile/edit?from=login#ignored")).toBe(
      "/my/profile/edit?from=login",
    );
  });

  it.each([
    ["google", "https://nuang.app"],
    ["kakao", "https://nuang.app"],
    ["google", "http://localhost:3000"],
    ["kakao", "http://localhost:3000"],
  ] as const)(
    "accepts an exact %s authorization redirect for %s",
    (_provider, origin) => {
      const callbackUrl = `${origin}/auth/callback`;
      const authorizationUrl = new URL(
        "https://project.supabase.co/auth/v1/authorize",
      );
      authorizationUrl.searchParams.set("redirect_to", callbackUrl);

      expect(
        validateOAuthAuthorizationUrl({
          authorizationUrl: authorizationUrl.toString(),
          callbackUrl,
          initiatingOrigin: origin,
          supabaseUrl: "https://project.supabase.co",
        }),
      ).toMatchObject({ ok: true });
    },
  );

  it("blocks a foreign auth origin and fallback redirect destination", () => {
    const expected = "http://localhost:3000/auth/callback";
    const foreignAuth = new URL("https://evil.example/auth/v1/authorize");
    foreignAuth.searchParams.set("redirect_to", expected);
    expect(
      validateOAuthAuthorizationUrl({
        authorizationUrl: foreignAuth.toString(),
        callbackUrl: expected,
        initiatingOrigin: "http://localhost:3000",
        supabaseUrl: "https://project.supabase.co",
      }),
    ).toMatchObject({ code: "auth_origin_mismatch", ok: false });

    const fallback = new URL("https://project.supabase.co/auth/v1/authorize");
    fallback.searchParams.set("redirect_to", "https://nuang.app/auth/callback");
    expect(
      validateOAuthAuthorizationUrl({
        authorizationUrl: fallback.toString(),
        callbackUrl: expected,
        initiatingOrigin: "http://localhost:3000",
        supabaseUrl: "https://project.supabase.co",
      }),
    ).toMatchObject({ code: "redirect_to_mismatch", ok: false });
  });
});
