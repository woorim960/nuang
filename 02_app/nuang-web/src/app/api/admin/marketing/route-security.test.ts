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
    expect(source).toContain('.from("marketing_campaign")');
    expect(source).toContain("admin_record_marketing_campaign_test");
    expect(source).toContain("marketingEmailReadiness().ready");
  });

  it("protects actual previews and runtime operations with admin and origin checks", () => {
    for (const route of ["preview", "operations"]) {
      const source = readFileSync(
        resolve(process.cwd(), `src/app/api/admin/marketing/${route}/route.ts`),
        "utf8",
      );
      expect(source).toContain("isSameOriginBrowserRequest(request)");
      expect(source).toContain("resolveAdminContext()");
      expect(source).toContain('"cache-control": "private, no-store"');
    }
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

  it("projects signed Resend events through an idempotent webhook contract", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/app/api/internal/advertising/email-webhook/route.ts",
      ),
      "utf8",
    );
    expect(source).toContain("verifyResendWebhookSignature");
    expect(source).toContain('request.headers.get("svix-id")');
    expect(source).toContain("record_marketing_email_webhook_v2");
    expect(source).toContain("record_marketing_email_webhook");
  });
});
