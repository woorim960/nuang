import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin marketing routes", () => {
  it("protects campaign writes with same-origin, administrator and schema checks", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/api/admin/marketing/campaigns/route.ts"),
      "utf8",
    );
    expect(source).toContain("isSameOriginBrowserRequest(request)");
    expect(source).toContain("resolveAdminContext()");
    expect(source).toContain("marketingCampaignWriteSchema");
    expect(source).toContain("marketingCampaignActionSchema");
    expect(source).toContain(
      "payload.data.testRecipient.toLowerCase() !== context.email.toLowerCase()",
    );
  });

  it("keeps raw addresses out of the admin dashboard reader", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/features/admin/server-admin-marketing.ts"),
      "utf8",
    );
    expect(source).not.toContain("email_encrypted");
    expect(source).not.toContain("email_hash");
    expect(source).not.toContain("mobile_phone");
  });
});
