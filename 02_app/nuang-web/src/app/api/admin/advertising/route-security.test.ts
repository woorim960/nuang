import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routeFiles = [
  "inquiries",
  "campaigns",
  "inventory",
  "creatives",
  "kill-switch",
];

describe("admin advertising routes", () => {
  it.each(routeFiles)(
    "protects %s with origin, admin, and schema checks",
    (route) => {
      const source = readFileSync(
        resolve(
          process.cwd(),
          `src/app/api/admin/advertising/${route}/route.ts`,
        ),
        "utf8",
      );
      expect(source).toContain("isSameOriginBrowserRequest(request)");
      expect(source).toContain("resolveAdminContext()");
      expect(source).toContain("readValidatedJson");
      expect(source).not.toContain('.from("admin_audit_log")');
    },
  );

  it("delegates advertising writes to audited atomic RPC helpers", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/features/admin/server-admin-advertising-actions.ts",
      ),
      "utf8",
    );
    expect(source).toContain('rpc("admin_manage_advertising_inquiry"');
    expect(source).toContain('rpc("admin_manage_advertising_campaign"');
    expect(source).toContain('rpc("admin_manage_advertising_creative"');
    expect(source).toContain('rpc("admin_toggle_advertising_kill_switch"');
    expect(source).toContain('rpc("admin_upsert_advertising_campaign"');
    expect(source).toContain('rpc("admin_upsert_advertising_creative"');
    expect(source).toContain('rpc("admin_manage_advertising_inventory"');
    expect(source).not.toContain('.from("admin_audit_log")');
  });

  it("records sensitive inquiry access before returning only approved fields", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/app/api/admin/advertising/inquiries/[inquiryId]/detail/route.ts",
      ),
      "utf8",
    );
    expect(source).toContain("isSameOriginBrowserRequest(request)");
    expect(source).toContain("resolveAdminContext()");
    expect(source).toContain("getAdvertisingInquiryDetail");
    expect(source).toContain("contactEmail: text(row.contact_email)");
    expect(source).not.toContain("contact_email_ciphertext");
    expect(source).not.toContain("contact_email_blind_index");
  });
});
