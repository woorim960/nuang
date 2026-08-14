import { describe, expect, it } from "vitest";
import {
  buildRequiredConsentHref,
  requiredConsentRenewalSchema,
  safeRequiredConsentReturnPath,
} from "@/features/consent/required-consent-contract";

describe("required consent renewal contract", () => {
  it("requires every mandatory declaration to be literal true", () => {
    expect(
      requiredConsentRenewalSchema.safeParse({
        is14OrOlder: true,
        privacy: true,
        terms: true,
      }).success,
    ).toBe(true);
    expect(
      requiredConsentRenewalSchema.safeParse({
        is14OrOlder: true,
        privacy: false,
        terms: true,
      }).success,
    ).toBe(false);
  });

  it("keeps an exact internal result path and rejects redirect loops", () => {
    const resultPath = "/results/local/local_result_1?backTo=%2Fmap";

    expect(safeRequiredConsentReturnPath(resultPath)).toBe(resultPath);
    expect(buildRequiredConsentHref(resultPath)).toBe(
      `/consent/required?next=${encodeURIComponent(resultPath)}`,
    );
    expect(
      safeRequiredConsentReturnPath(
        "/consent/required?next=%2Fconsent%2Frequired",
      ),
    ).toBe("/my/reports/history");
    expect(safeRequiredConsentReturnPath("/consent/required/")).toBe(
      "/my/reports/history",
    );
    expect(safeRequiredConsentReturnPath("/login/callback")).toBe(
      "/my/reports/history",
    );
    expect(safeRequiredConsentReturnPath("https://evil.example/result")).toBe(
      "/my/reports/history",
    );
  });
});
