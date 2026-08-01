import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("core result feedback API security contract", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/app/api/core-result-feedback/route.ts"),
    "utf8",
  );

  it("requires same-origin authentication and exact report ownership", () => {
    expect(source).toContain("isSameOriginBrowserRequest(request)");
    expect(source).toContain("requireAuthenticatedUser()");
    expect(source).toContain('.eq("account_id", account.accountId)');
    expect(source).toContain('.is("deleted_at", null)');
  });

  it("accepts only exact snapshot section key and version identities", () => {
    expect(source).toContain("section.sectionId === payload.data.sectionId");
    expect(source).toContain("section.contentKey === payload.data.contentKey");
    expect(source).toContain(
      "section.contentVersion === payload.data.contentVersion",
    );
    expect(source).toContain('section.privacyScope === "owner_only"');
  });

  it("derives profile, kind and manifest from trusted server data", () => {
    expect(source).toContain("profile_code: report.profile_code");
    expect(source).toContain("report_kind: report.report_kind");
    expect(source).toContain("manifest_digest: snapshot.manifestDigest");
    expect(source).not.toContain("payload.data.profileCode");
  });
});
