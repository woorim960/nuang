import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const migrationFiles = readdirSync("supabase/migrations")
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();
const fixtureDirectories: string[] = [];
const checkerPath = path.resolve("scripts/check-supabase-migrations.mjs");

afterEach(() => {
  for (const directory of fixtureDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("Supabase migration versions", () => {
  it("uses one unique numeric version per migration file", () => {
    const invalidNames = migrationFiles.filter(
      (fileName) => !/^\d{12,14}_[a-z0-9_]+\.sql$/.test(fileName),
    );
    const versions = migrationFiles.map(
      (fileName) => fileName.split("_", 1)[0],
    );
    const duplicateVersions = versions.filter(
      (version, index) => versions.indexOf(version) !== index,
    );

    expect(invalidNames).toEqual([]);
    expect([...new Set(duplicateVersions)]).toEqual([]);
  });
});

describe("Supabase migration safety checker", () => {
  it("keeps the repository migration policy valid", () => {
    const result = runChecker(process.cwd());

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Supabase migration safety check passed");
  });

  it("accepts immutable active migrations and isolated deferred migrations", () => {
    const root = createMigrationFixture();

    const result = runChecker(root);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      "1 applied checksums, 0 pending active, 1 deferred",
    );
  });

  it("rejects duplicate active migration versions", () => {
    const root = createMigrationFixture();
    writeFileSync(
      path.join(root, "supabase/migrations/202601010001_duplicate_version.sql"),
      "select 2;\n",
    );

    const result = runChecker(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "active migration version 202601010001 is duplicated",
    );
  });

  it("rejects ambiguous version prefixes", () => {
    const root = createMigrationFixture();
    writeFileSync(
      path.join(
        root,
        "supabase/migrations/20260101000101_prefix_collision.sql",
      ),
      "select 2;\n",
    );

    const result = runChecker(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "active migration versions use an ambiguous prefix",
    );
    expect(result.stderr).toContain("20260101000101_prefix_collision.sql");
  });

  it("rejects a deferred version copied into the active directory", () => {
    const root = createMigrationFixture();
    writeFileSync(
      path.join(root, "supabase/migrations/202601020001_provider.sql"),
      "select 2;\n",
    );

    const result = runChecker(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "deferred originalVersion 202601020001 must not be active",
    );
  });

  it("rejects deferred SQL that is not declared in the manifest", () => {
    const root = createMigrationFixture();
    writeFileSync(
      path.join(root, "supabase/deferred-migrations/provider/unlisted.sql"),
      "select 4;\n",
    );

    const result = runChecker(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "deferred SQL template is not declared in manifest.json: provider/unlisted.sql",
    );
  });

  it("rejects active SQL that reuses deferred template content", () => {
    const root = createMigrationFixture();
    writeFileSync(
      path.join(root, "supabase/migrations/202601030001_provider.sql"),
      "select 2;\n",
    );

    const result = runChecker(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "active migration reuses deferred template content",
    );
    expect(result.stderr).toContain("provider/deferred_provider.sql");
  });

  it("rejects duplicate deferred manifest ids", () => {
    const root = createMigrationFixture();
    const deferredDirectory = path.join(root, "supabase/deferred-migrations");
    const manifestPath = path.join(deferredDirectory, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const secondSource = "select 5;\n";
    writeFileSync(
      path.join(deferredDirectory, "provider/second_provider.sql"),
      secondSource,
    );
    manifest.migrations.push({
      id: "deferred-provider",
      originalVersion: "202601020002",
      file: "provider/second_provider.sql",
      sha256: sha256(secondSource),
      status: "deferred",
      reason: "A second provider is not ready for activation.",
    });
    writeFileSync(manifestPath, JSON.stringify(manifest));

    const result = runChecker(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "deferred manifest repeats id deferred-provider",
    );
  });

  it("rejects an unlocked migration older than the latest applied version", () => {
    const root = createMigrationFixture();
    writeFileSync(
      path.join(root, "supabase/migrations/202512310001_backfill.sql"),
      "select 2;\n",
    );

    const result = runChecker(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "pending active migration must be newer than locked version 202601010001",
    );
    expect(result.stderr).toContain("202512310001_backfill.sql");
  });

  it("allows an unlocked migration newer than the latest applied version", () => {
    const root = createMigrationFixture();
    writeFileSync(
      path.join(root, "supabase/migrations/202601030001_forward.sql"),
      "select 3;\n",
    );

    const result = runChecker(root);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      "1 applied checksums, 1 pending active, 1 deferred",
    );
  });

  it("rejects newer pending migrations when require-no-pending is enabled", () => {
    const root = createMigrationFixture();
    writeFileSync(
      path.join(root, "supabase/migrations/202601030001_forward.sql"),
      "select 3;\n",
    );

    const result = runChecker(root, { requireNoPending: true });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "pending active migrations are forbidden in this check: 1 found",
    );
  });

  it("rejects edits to an applied migration", () => {
    const root = createMigrationFixture();
    writeFileSync(
      path.join(root, "supabase/migrations/202601010001_foundation.sql"),
      "select 'changed';\n",
    );

    const result = runChecker(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("applied migration checksum changed");
  });

  it("rejects removing an entry present in the baseline lock", () => {
    const root = createMigrationFixture();
    initializeBaselineRepository(root);
    writeAppliedLock(root, []);

    const result = runChecker(root, { baselineRef: "HEAD" });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "baseline applied migration was removed: 202601010001",
    );
  });

  it("rejects changing a checksum present in the baseline lock", () => {
    const root = createMigrationFixture();
    initializeBaselineRepository(root);
    const changedSource = "select 'changed with lock';\n";
    writeFileSync(
      path.join(root, "supabase/migrations/202601010001_foundation.sql"),
      changedSource,
    );
    writeAppliedLock(root, [
      {
        version: "202601010001",
        file: "202601010001_foundation.sql",
        sha256: sha256(changedSource),
      },
    ]);

    const result = runChecker(root, { baselineRef: "HEAD" });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "baseline applied migration checksum changed: 202601010001_foundation.sql",
    );
  });

  it("allows the first lock introduction when the baseline has no lock", () => {
    const root = createMigrationFixture();
    initializeBaselineRepository(root, { includeLock: false });

    const result = runChecker(root, { baselineRef: "HEAD" });

    expect(result.status, result.stderr).toBe(0);
  });

  it("rejects an invalid baseline ref", () => {
    const root = createMigrationFixture();
    initializeBaselineRepository(root);

    const result = runChecker(root, { baselineRef: "missing-baseline" });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "baseline ref is not a valid Git commit: missing-baseline",
    );
  });

  it("rejects blanket database push commands in automation", () => {
    const root = createMigrationFixture();
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        scripts: {
          deploy: "npx supabase db push --include-all",
        },
      }),
    );

    const result = runChecker(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "direct Supabase database push is forbidden in automation",
    );
    expect(result.stderr).toContain("--include-all is forbidden in automation");
  });

  it("rejects shell-continuation database push commands", () => {
    const root = createMigrationFixture();
    mkdirSync(path.join(root, "scripts"));
    writeFileSync(
      path.join(root, "scripts/deploy.sh"),
      String.raw`#!/bin/sh
supabase \
  db \
  push
`,
    );

    const result = runChecker(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "direct Supabase database push is forbidden in automation: scripts/deploy.sh",
    );
  });

  it("rejects execFile database push commands in repository tools", () => {
    const root = createMigrationFixture();
    mkdirSync(path.join(root, "tools"));
    writeFileSync(
      path.join(root, "tools/deploy.mjs"),
      `execFile("supabase", ["db", "push"]);\n`,
    );

    const result = runChecker(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "execFile Supabase database push is forbidden in automation: tools/deploy.mjs",
    );
  });
});

function createMigrationFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "nuang-migration-policy-"));
  fixtureDirectories.push(root);
  const activeDirectory = path.join(root, "supabase/migrations");
  const deferredDirectory = path.join(root, "supabase/deferred-migrations");
  mkdirSync(activeDirectory, { recursive: true });
  mkdirSync(deferredDirectory, { recursive: true });

  const activeFile = "202601010001_foundation.sql";
  const activeSource = "select 1;\n";
  const deferredFile = "provider/deferred_provider.sql";
  const deferredSource = "select 2;\n";
  writeFileSync(path.join(activeDirectory, activeFile), activeSource);
  mkdirSync(path.join(deferredDirectory, "provider"), { recursive: true });
  writeFileSync(path.join(deferredDirectory, deferredFile), deferredSource);
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ scripts: {} }),
  );
  writeAppliedLock(root, [
    {
      version: "202601010001",
      file: activeFile,
      sha256: sha256(activeSource),
    },
  ]);
  writeFileSync(
    path.join(deferredDirectory, "manifest.json"),
    JSON.stringify({
      schemaVersion: 1,
      migrations: [
        {
          id: "deferred-provider",
          originalVersion: "202601020001",
          file: deferredFile,
          sha256: sha256(deferredSource),
          status: "deferred",
          reason: "Provider credentials are not ready for activation.",
        },
      ],
    }),
  );

  return root;
}

function writeAppliedLock(
  root: string,
  migrations: Array<{ version: string; file: string; sha256: string }>,
) {
  writeFileSync(
    path.join(root, "supabase/applied-migrations.lock.json"),
    JSON.stringify({
      schemaVersion: 1,
      databaseHistoryCount: migrations.length,
      migrations,
    }),
  );
}

function initializeBaselineRepository(
  root: string,
  options: { includeLock?: boolean } = {},
) {
  const lockPath = path.join(root, "supabase/applied-migrations.lock.json");
  const lockSource = readFileSync(lockPath, "utf8");
  if (options.includeLock === false) rmSync(lockPath);

  runFixtureGit(root, ["init", "--quiet"]);
  runFixtureGit(root, ["add", "--all"]);
  runFixtureGit(root, [
    "-c",
    "user.name=NUANG Test",
    "-c",
    "user.email=nuang-test@example.com",
    "commit",
    "--quiet",
    "--no-gpg-sign",
    "-m",
    "baseline",
  ]);

  if (options.includeLock === false) writeFileSync(lockPath, lockSource);
}

function runFixtureGit(root: string, argumentsList: string[]) {
  const result = spawnSync("git", argumentsList, {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `fixture git ${argumentsList.join(" ")} failed: ${result.stderr}`,
    );
  }
}

function runChecker(
  root: string,
  options: { baselineRef?: string; requireNoPending?: boolean } = {},
) {
  const argumentsList = [checkerPath, "--root", root];
  if (options.baselineRef) {
    argumentsList.push("--baseline-ref", options.baselineRef);
  }
  if (options.requireNoPending) argumentsList.push("--require-no-pending");

  return spawnSync(process.execPath, argumentsList, {
    encoding: "utf8",
  });
}

function sha256(source: string) {
  return createHash("sha256").update(source).digest("hex");
}
