import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const runbook = fs.readFileSync(
  path.join(process.cwd(), "docs/NUANG_OAUTH_EXACT_CALLBACK_RUNBOOK.md"),
  "utf8",
);

describe("OAuth exact callback operations contract", () => {
  it("documents both exact sign-in callbacks without query parameters", () => {
    expect(runbook).toContain("`https://nuang.app/auth/callback`");
    expect(runbook).toContain("`http://localhost:3000/auth/callback`");
    expect(runbook).not.toContain("/auth/callback?next=");
  });

  it("keeps unsupported aliases and wildcard previews closed", () => {
    expect(runbook).toContain("127.0.0.1");
    expect(runbook).toContain("다른 포트");
    expect(runbook).toContain("wildcard");
  });
});
