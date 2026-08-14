import { describe, expect, it } from "vitest";
import {
  forbiddenProviderFields,
  getSupabaseOAuthProvider,
  isSocialAuthProviderEnabled,
  socialAuthProviders,
} from "@/features/auth/auth-policy";

describe("auth policy", () => {
  it("keeps Korean MVP provider order", () => {
    expect(socialAuthProviders.map((provider) => provider.id)).toEqual([
      "kakao",
      "apple",
      "naver",
      "google",
    ]);
  });

  it("keeps raw birthday and token storage out of provider snapshots", () => {
    expect(forbiddenProviderFields).toContain("raw_birthdate");
    expect(forbiddenProviderFields).toContain("access_token");
    expect(forbiddenProviderFields).toContain("refresh_token");
  });

  it("maps only Supabase native OAuth providers directly", () => {
    expect(getSupabaseOAuthProvider("kakao")).toBe("kakao");
    expect(getSupabaseOAuthProvider("google")).toBe("google");
    expect(getSupabaseOAuthProvider("apple")).toBe("apple");
    expect(getSupabaseOAuthProvider("naver")).toBeNull();
  });

  it("keeps Apple hidden until its reviewed production credentials are enabled", () => {
    expect(isSocialAuthProviderEnabled("apple")).toBe(false);
    expect(isSocialAuthProviderEnabled("google")).toBe(true);
    expect(isSocialAuthProviderEnabled("kakao")).toBe(true);
  });
});
