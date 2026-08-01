import { describe, expect, it } from "vitest";
import {
  buildAccountCoreResultHref,
  buildLocalCoreResultHref,
  sanitizeCoreResultBackHref,
} from "./core-result-route-contract";

describe("core result route contract", () => {
  it("keeps only the product-approved back destinations", () => {
    expect(sanitizeCoreResultBackHref("/my?tab=reports")).toBe(
      "/my?tab=reports",
    );
    expect(sanitizeCoreResultBackHref("/my/reports/history")).toBe(
      "/my/reports/history",
    );
    expect(sanitizeCoreResultBackHref("//example.com")).toBe(
      "/my/reports/history",
    );
    expect(sanitizeCoreResultBackHref("/admin")).toBe("/my/reports/history");
  });

  it("builds encoded local and account report routes from one contract", () => {
    expect(
      buildLocalCoreResultHref({
        backHref: "/my?tab=reports",
        localResultId: "local-1",
      }),
    ).toBe("/results/local/local-1?backTo=%2Fmy%3Ftab%3Dreports");
    expect(
      buildAccountCoreResultHref({
        backHref: "/home",
        resultReportId: "account-1",
      }),
    ).toBe("/results/account/account-1?backTo=%2Fhome");
  });
});
