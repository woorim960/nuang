import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("assessment studio admin route security", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/app/api/admin/experiences/route.ts"),
    "utf8",
  );

  it("protects every mutation with same-origin and admin checks", () => {
    expect(source.match(/isSameOriginBrowserRequest\(request\)/g)).toHaveLength(3);
    expect(source.match(/resolveAdminContext\(\)/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("runs publication validation before the publish RPC", () => {
    expect(source).toContain("hasAssessmentStudioBlockers");
    expect(source).toContain("admin_manage_assessment_content");
    expect(source).toContain("admin_rollback_assessment_content");
  });
});
