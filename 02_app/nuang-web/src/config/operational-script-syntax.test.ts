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

  it("keeps beta blocked only by the unresolved release candidate gate", () => {
    const result = spawnSync(
      process.execPath,
      [path.join(projectRoot, "scripts/check-mvp-go-live.mjs")],
      { cwd: projectRoot, encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain("BLOCKED minimum_legal_privacy");
    expect(result.stdout).not.toContain("BLOCKED production_oauth");
    expect(result.stdout).not.toContain("BLOCKED security_privacy");
    expect(result.stdout).not.toContain("BLOCKED product_value_observability");
    expect(result.stdout).toContain("BLOCKED release_candidate");
    expect(result.stdout).not.toContain(
      "measurement scheme is still candidate",
    );
  });
});
