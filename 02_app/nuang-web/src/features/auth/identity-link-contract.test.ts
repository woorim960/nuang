import { describe, expect, it } from "vitest";
import {
  identityLinkIntentRequestSchema,
  safeIdentityReturnPath,
} from "@/features/auth/identity-link-contract";

describe("identity link contract", () => {
  it("accepts only providers supported by the production OAuth adapter", () => {
    expect(
      identityLinkIntentRequestSchema.safeParse({
        provider: "google",
        returnPath: "/my/settings/account?from=security",
      }).success,
    ).toBe(true);
    expect(
      identityLinkIntentRequestSchema.safeParse({ provider: "naver" }).success,
    ).toBe(false);
  });

  it("keeps callbacks on an internal path", () => {
    expect(safeIdentityReturnPath("/my/settings/account?tab=login")).toBe(
      "/my/settings/account?tab=login",
    );
    for (const unsafe of [
      "https://attacker.example/path",
      "//attacker.example/path",
      "/\\attacker.example/path",
      "/my\nLocation:https://attacker.example",
    ]) {
      expect(safeIdentityReturnPath(unsafe)).toBe("/my/settings/account");
    }
  });
});
