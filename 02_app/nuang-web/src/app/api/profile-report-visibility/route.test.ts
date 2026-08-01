import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("profile report visibility route contract", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/app/api/profile-report-visibility/route.ts"),
    "utf8",
  );

  it("revokes active core share tokens before a result becomes private", () => {
    expect(source).toContain('key.kind === "core"');
    expect(source).toContain('parsed.data.visibility === "private"');
    expect(source).toContain('.schema("sharing")');
    expect(source).toContain('.from("share_link")');
    expect(source).toContain('.eq("result_report_id", resultReportId)');
    expect(source).toContain('.eq("status", "active")');
    expect(source).toContain('status: "revoked"');
  });

  it("fails the privacy change closed when token revocation fails", () => {
    expect(source).toContain('error: "share_link_revoke_failed"');
    expect(source.indexOf("revokeActiveCoreShareLinks")).toBeLessThan(
      source.indexOf("profile_report_visibility_write_failed"),
    );
  });
});
