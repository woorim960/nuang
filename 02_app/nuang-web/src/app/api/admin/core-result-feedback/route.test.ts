import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin core result feedback route", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/app/api/admin/core-result-feedback/route.ts"),
    "utf8",
  );

  it("uses the audited atomic operation after origin and admin checks", () => {
    expect(source).toContain("isSameOriginBrowserRequest(request)");
    expect(source).toContain("resolveAdminContext()");
    expect(source).toContain('"admin_manage_core_result_feedback"');
    expect(source).not.toContain('.from("admin_audit_log")');
  });
});
