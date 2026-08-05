import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const operationalScripts = [
  "scripts/apply-mvp-security-migrations.mjs",
  "scripts/check-env.mjs",
  "scripts/check-global-theme.mjs",
  "scripts/check-mvp-go-live.mjs",
  "scripts/check-product-harness.mjs",
  "scripts/check-server-readiness.mjs",
  "scripts/generate-mvp-release-inventory.mjs",
  "scripts/smoke-authenticated-community.mjs",
];

describe("release operational scripts", () => {
  it.each(operationalScripts)("keeps %s syntactically executable", (script) => {
    const result = spawnSync(
      process.execPath,
      ["--check", path.join(projectRoot, script)],
      { encoding: "utf8" },
    );

    expect(result.stderr, script).toBe("");
    expect(result.status, script).toBe(0);
  });

  it("keeps the authenticated remote smoke self-contained and explicitly recoverable", () => {
    const source = readFileSync(
      path.join(projectRoot, "scripts/smoke-authenticated-community.mjs"),
      "utf8",
    );

    expect(source).toContain('action: "create_post"');
    expect(source).toContain('action: "vote_poll"');
    expect(source).toContain('action: "create_comment"');
    expect(source).toMatch(/\.from\("feed_poll"\)\.delete\(\)/);
    expect(source).toMatch(/\.from\("feed_post"\)\.delete\(\)/);
    expect(source).toContain('smokeResult.cleanup = "ok"');
    expect(source).not.toContain("officialPollId");
  });

  it("keeps every recorded beta release gate satisfied", () => {
    const result = spawnSync(
      process.execPath,
      [path.join(projectRoot, "scripts/check-mvp-go-live.mjs")],
      { cwd: projectRoot, encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("BLOCKED");
    expect(result.stdout).toContain(
      "go-live gates passed with recorded evidence.",
    );
  });
});
