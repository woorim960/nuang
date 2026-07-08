import { describe, expect, it } from "vitest";
import {
  forbiddenProviderFields,
  getSupabaseOAuthProvider,
  socialAuthProviders,
} from "@/features/auth/auth-policy";

describe("auth policy", () => {
  it("keeps Korean MVP provider order", () => {
    expect(socialAuthProviders.map((provider) => provider.id)).toEqual([
      "kakao",
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
    expect(getSupabaseOAuthProvider("naver")).toBeNull();
  });
});
