#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATION_FILE_PATTERN = /^(\d{12,14})_[a-z0-9_]+\.sql$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const EXECUTABLE_EXTENSIONS = new Set([
  "",
  ".bash",
  ".cjs",
  ".js",
  ".json",
  ".mjs",
  ".sh",
  ".ts",
  ".yaml",
  ".yml",
  ".zsh",
]);

export function inspectSupabaseMigrations(rootDirectory, options = {}) {
  const root = resolve(rootDirectory);
  const activeDirectory = join(root, "supabase", "migrations");
  const deferredDirectory = join(root, "supabase", "deferred-migrations");
  const manifestPath = join(deferredDirectory, "manifest.json");
  const lockPath = join(root, "supabase", "applied-migrations.lock.json");
  const errors = [];

  const activeFiles = readSqlFiles(activeDirectory, "active", errors);
  const activeMigrations = parseMigrationFiles(activeFiles, "active", errors);
  assertUniqueVersions(activeMigrations, "active", errors);
  assertNoVersionPrefixCollisions(activeMigrations, "active", errors);

  const deferredFiles = readSqlFilesRecursively(
    deferredDirectory,
    "deferred",
    errors,
  );

  const manifest = readJsonFile(manifestPath, "deferred manifest", errors);
  const manifestMigrations = validateDeferredManifest(manifest, errors);
  validateDeferredFiles({
    deferredDirectory,
    deferredFiles,
    manifestMigrations,
    errors,
  });
  validateActiveDeferredSeparation({
    activeDirectory,
    activeMigrations,
    manifestMigrations,
    errors,
  });

  const lock = readJsonFile(lockPath, "applied migration lock", errors);
  const lockedMigrations = validateAppliedLock(lock, errors);
  validateLockedMigrations({
    activeDirectory,
    activeMigrations,
    lockedMigrations,
    errors,
  });
  validatePendingActiveMigrations({
    activeMigrations,
    lockedMigrations,
    errors,
  });
  if (options.baselineRef) {
    validateBaselineLock({
      baselineRef: options.baselineRef,
      currentMigrations: lockedMigrations,
      lockPath,
      root,
      errors,
    });
  }

  validateAutomationCommands(root, errors);

  const lockedVersions = new Set(
    lockedMigrations.map((migration) => migration.version),
  );
  const pendingActiveCount = activeMigrations.filter(
    (migration) => !lockedVersions.has(migration.version),
  ).length;
  if (options.requireNoPending && pendingActiveCount > 0) {
    errors.push(
      `pending active migrations are forbidden in this check: ${pendingActiveCount} found`,
    );
  }

  return {
    activeCount: activeMigrations.length,
    deferredCount: manifestMigrations.length,
    errors,
    lockedCount: lockedMigrations.length,
    pendingActiveCount,
  };
}

function readSqlFiles(directory, label, errors) {
  if (!existsSync(directory)) {
    errors.push(`${label} migration directory is missing: ${directory}`);
    return [];
  }

  return readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
}

function readSqlFilesRecursively(directory, label, errors) {
  if (!existsSync(directory)) {
    errors.push(`${label} migration directory is missing: ${directory}`);
    return [];
  }

  const files = [];
  walk(directory, "");
  return files.sort();

  function walk(currentDirectory, prefix) {
    for (const entry of readdirSync(currentDirectory, {
      withFileTypes: true,
    })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath, relativePath);
      } else if (entry.isFile() && entry.name.endsWith(".sql")) {
        files.push(relativePath);
      }
    }
  }
}

function parseMigrationFiles(files, label, errors) {
  return files.flatMap((file) => {
    const match = MIGRATION_FILE_PATTERN.exec(file);
    if (!match) {
      errors.push(
        `${label} migration has an invalid filename (expected 12-14 digit version): ${file}`,
      );
      return [];
    }
    return [{ file, version: match[1] }];
  });
}

function assertUniqueVersions(migrations, label, errors) {
  const filesByVersion = new Map();
  for (const migration of migrations) {
    const files = filesByVersion.get(migration.version) ?? [];
    files.push(migration.file);
    filesByVersion.set(migration.version, files);
  }

  for (const [version, files] of filesByVersion) {
    if (files.length > 1) {
      errors.push(
        `${label} migration version ${version} is duplicated: ${files.join(", ")}`,
      );
    }
  }
}

function assertNoVersionPrefixCollisions(migrations, label, errors) {
  for (let leftIndex = 0; leftIndex < migrations.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < migrations.length;
      rightIndex += 1
    ) {
      const left = migrations[leftIndex];
      const right = migrations[rightIndex];
      const [shorter, longer] =
        left.version.length <= right.version.length
          ? [left, right]
          : [right, left];
      if (
        shorter.version !== longer.version &&
        longer.version.startsWith(shorter.version)
      ) {
        errors.push(
          `${label} migration versions use an ambiguous prefix: ${shorter.version} (${shorter.file}) and ${longer.version} (${longer.file})`,
        );
      }
    }
  }
}

function readJsonFile(path, label, errors) {
  if (!existsSync(path)) {
    errors.push(`${label} is missing: ${path}`);
    return null;
  }

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(
      `${label} is not valid JSON: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    return null;
  }
}

function validateDeferredManifest(manifest, errors) {
  if (!manifest || typeof manifest !== "object") return [];
  if (manifest.schemaVersion !== 1) {
    errors.push("deferred manifest schemaVersion must be 1");
  }
  if (!Array.isArray(manifest.migrations)) {
    errors.push("deferred manifest migrations must be an array");
    return [];
  }

  const migrations = [];
  for (const [index, entry] of manifest.migrations.entries()) {
    const label = `deferred manifest migrations[${index}]`;
    if (!entry || typeof entry !== "object") {
      errors.push(`${label} must be an object`);
      continue;
    }

    const { file, id, originalVersion, reason, sha256, status } = entry;
    if (!isSafeDeferredPath(file)) {
      errors.push(`${label}.file must be a safe relative SQL template path`);
      continue;
    }
    if (typeof id !== "string" || !/^[a-z0-9-]+$/.test(id)) {
      errors.push(
        `${label}.id must use lowercase letters, numbers, and dashes`,
      );
    }
    if (
      typeof originalVersion !== "string" ||
      !/^\d{12,14}$/.test(originalVersion)
    ) {
      errors.push(`${label}.originalVersion must be a 12-14 digit version`);
    }
    if (status !== "deferred") {
      errors.push(`${label}.status must be \"deferred\"`);
    }
    if (typeof reason !== "string" || reason.trim().length < 10) {
      errors.push(`${label}.reason must explain why activation is deferred`);
    }
    if (typeof sha256 !== "string" || !SHA256_PATTERN.test(sha256)) {
      errors.push(`${label}.sha256 must be a lowercase SHA-256 digest`);
    }
    migrations.push({ file, id, originalVersion, sha256 });
  }

  assertUniqueOriginalVersions(migrations, "deferred manifest", errors);
  assertUniqueIds(migrations, "deferred manifest", errors);
  assertUniqueFiles(migrations, "deferred manifest", errors);
  return migrations;
}

function validateDeferredFiles({
  deferredDirectory,
  deferredFiles,
  manifestMigrations,
  errors,
}) {
  const manifestByFile = new Map(
    manifestMigrations.map((migration) => [migration.file, migration]),
  );
  const deferredFileNames = new Set(deferredFiles);

  for (const migration of manifestMigrations) {
    const path = join(deferredDirectory, migration.file);
    if (!deferredFileNames.has(migration.file) || !existsSync(path)) {
      errors.push(`deferred manifest file is missing: ${migration.file}`);
      continue;
    }
    if (SHA256_PATTERN.test(migration.sha256)) {
      const actualSha256 = sha256File(path);
      if (actualSha256 !== migration.sha256) {
        errors.push(
          `deferred migration checksum changed: ${migration.file} (expected ${migration.sha256}, received ${actualSha256})`,
        );
      }
    }
  }

  for (const file of deferredFiles) {
    if (!manifestByFile.has(file)) {
      errors.push(
        `deferred SQL template is not declared in manifest.json: ${file}`,
      );
    }
  }
}

function validateActiveDeferredSeparation({
  activeDirectory,
  activeMigrations,
  manifestMigrations,
  errors,
}) {
  const activeByVersion = new Map(
    activeMigrations.map((migration) => [migration.version, migration.file]),
  );

  for (const migration of manifestMigrations) {
    const activeFile = activeByVersion.get(migration.originalVersion);
    if (activeFile) {
      errors.push(
        `deferred originalVersion ${migration.originalVersion} must not be active: ${activeFile}`,
      );
    }
  }

  const deferredByHash = new Map(
    manifestMigrations
      .filter((migration) => SHA256_PATTERN.test(migration.sha256))
      .map((migration) => [migration.sha256, migration.file]),
  );
  for (const migration of activeMigrations) {
    const activeHash = sha256File(join(activeDirectory, migration.file));
    const deferredFile = deferredByHash.get(activeHash);
    if (deferredFile) {
      errors.push(
        `active migration reuses deferred template content: ${migration.file} matches ${deferredFile}`,
      );
    }
  }
}

function isSafeDeferredPath(file) {
  if (typeof file !== "string" || !file.endsWith(".sql")) return false;
  if (file.startsWith("/") || file.includes("\\")) return false;
  const segments = file.split("/");
  return segments.every(
    (segment) => segment.length > 0 && segment !== "." && segment !== "..",
  );
}

function assertUniqueOriginalVersions(migrations, label, errors) {
  const seen = new Map();
  for (const migration of migrations) {
    if (!migration.originalVersion) continue;
    const previous = seen.get(migration.originalVersion);
    if (previous) {
      errors.push(
        `${label} repeats originalVersion ${migration.originalVersion}: ${previous}, ${migration.file}`,
      );
    }
    seen.set(migration.originalVersion, migration.file);
  }
}

function assertUniqueIds(migrations, label, errors) {
  const seen = new Map();
  for (const migration of migrations) {
    if (!migration.id) continue;
    const previous = seen.get(migration.id);
    if (previous) {
      errors.push(
        `${label} repeats id ${migration.id}: ${previous}, ${migration.file}`,
      );
    }
    seen.set(migration.id, migration.file);
  }
}

function validateAppliedLock(lock, errors) {
  if (!lock || typeof lock !== "object") return [];
  if (lock.schemaVersion !== 1) {
    errors.push("applied migration lock schemaVersion must be 1");
  }
  if (!Array.isArray(lock.migrations)) {
    errors.push("applied migration lock migrations must be an array");
    return [];
  }
  if (
    !Number.isInteger(lock.databaseHistoryCount) ||
    lock.databaseHistoryCount !== lock.migrations.length
  ) {
    errors.push(
      "applied migration lock databaseHistoryCount must match migrations.length",
    );
  }

  const migrations = [];
  for (const [index, entry] of lock.migrations.entries()) {
    const label = `applied migration lock migrations[${index}]`;
    if (!entry || typeof entry !== "object") {
      errors.push(`${label} must be an object`);
      continue;
    }
    const { file, sha256, version } = entry;
    const fileMatch =
      typeof file === "string" ? MIGRATION_FILE_PATTERN.exec(file) : null;
    if (!fileMatch || basename(file) !== file) {
      errors.push(`${label}.file must be a migration filename without a path`);
      continue;
    }
    if (version !== fileMatch[1]) {
      errors.push(`${label}.version must match the filename version`);
    }
    if (typeof sha256 !== "string" || !SHA256_PATTERN.test(sha256)) {
      errors.push(`${label}.sha256 must be a lowercase SHA-256 digest`);
    }
    migrations.push({ file, sha256, version: fileMatch[1] });
  }

  assertUniqueVersions(migrations, "applied migration lock", errors);
  assertUniqueFiles(migrations, "applied migration lock", errors);
  return migrations;
}

function validateLockedMigrations({
  activeDirectory,
  activeMigrations,
  lockedMigrations,
  errors,
}) {
  const activeByVersion = new Map(
    activeMigrations.map((migration) => [migration.version, migration.file]),
  );

  for (const migration of lockedMigrations) {
    const activeFile = activeByVersion.get(migration.version);
    if (!activeFile) {
      errors.push(
        `applied migration is missing from supabase/migrations: ${migration.file}`,
      );
      continue;
    }
    if (activeFile !== migration.file) {
      errors.push(
        `applied migration ${migration.version} was renamed: expected ${migration.file}, received ${activeFile}`,
      );
      continue;
    }

    const path = join(activeDirectory, migration.file);
    if (SHA256_PATTERN.test(migration.sha256)) {
      const actualSha256 = sha256File(path);
      if (actualSha256 !== migration.sha256) {
        errors.push(
          `applied migration checksum changed: ${migration.file} (expected ${migration.sha256}, received ${actualSha256})`,
        );
      }
    }
  }
}

function validatePendingActiveMigrations({
  activeMigrations,
  lockedMigrations,
  errors,
}) {
  if (lockedMigrations.length === 0) return;

  const lockedVersions = new Set(
    lockedMigrations.map((migration) => migration.version),
  );
  const maximumLockedVersion = lockedMigrations
    .map((migration) => migration.version)
    .sort()
    .at(-1);

  for (const migration of activeMigrations) {
    if (lockedVersions.has(migration.version)) continue;
    if (migration.version <= maximumLockedVersion) {
      errors.push(
        `pending active migration must be newer than locked version ${maximumLockedVersion}: ${migration.file}`,
      );
    }
  }
}

function validateBaselineLock({
  baselineRef,
  currentMigrations,
  lockPath,
  root,
  errors,
}) {
  const repositoryRoot = findRepositoryRoot(root);
  if (!existsSync(join(repositoryRoot, ".git"))) {
    errors.push(
      `baseline ref ${baselineRef} cannot be verified outside a Git repository`,
    );
    return;
  }

  const revision = runGit(repositoryRoot, [
    "rev-parse",
    "--verify",
    "--quiet",
    "--end-of-options",
    `${baselineRef}^{commit}`,
  ]);
  const commit = (revision.stdout ?? "").trim();
  if (revision.status !== 0 || !/^[a-f0-9]{40,64}$/.test(commit)) {
    errors.push(`baseline ref is not a valid Git commit: ${baselineRef}`);
    return;
  }

  const repositoryLockPath = relative(repositoryRoot, lockPath).replaceAll(
    "\\",
    "/",
  );
  if (repositoryLockPath === ".." || repositoryLockPath.startsWith("../")) {
    errors.push("applied migration lock is outside the Git repository");
    return;
  }

  const tree = runGit(repositoryRoot, [
    "ls-tree",
    "-r",
    "--name-only",
    commit,
    "--",
    repositoryLockPath,
  ]);
  if (tree.status !== 0) {
    errors.push(
      `unable to inspect applied migration lock at baseline ref ${baselineRef}`,
    );
    return;
  }

  const baselinePaths = (tree.stdout ?? "").split(/\r?\n/).filter(Boolean);
  if (!baselinePaths.includes(repositoryLockPath)) {
    return;
  }

  const baselineSource = runGit(repositoryRoot, [
    "show",
    `${commit}:${repositoryLockPath}`,
  ]);
  if (baselineSource.status !== 0) {
    errors.push(
      `unable to read applied migration lock at baseline ref ${baselineRef}`,
    );
    return;
  }

  let baselineLock;
  try {
    baselineLock = JSON.parse(baselineSource.stdout ?? "");
  } catch (error) {
    errors.push(
      `baseline applied migration lock is not valid JSON: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    return;
  }

  const baselineErrors = [];
  const baselineMigrations = validateAppliedLock(baselineLock, baselineErrors);
  if (baselineErrors.length > 0) {
    for (const error of baselineErrors) {
      errors.push(`baseline ${error}`);
    }
    return;
  }

  const currentByVersion = new Map(
    currentMigrations.map((migration) => [migration.version, migration]),
  );
  for (const baselineMigration of baselineMigrations) {
    const currentMigration = currentByVersion.get(baselineMigration.version);
    if (!currentMigration) {
      errors.push(
        `baseline applied migration was removed: ${baselineMigration.version} (${baselineMigration.file})`,
      );
      continue;
    }
    if (currentMigration.file !== baselineMigration.file) {
      errors.push(
        `baseline applied migration was renamed: ${baselineMigration.file} -> ${currentMigration.file}`,
      );
    }
    if (currentMigration.sha256 !== baselineMigration.sha256) {
      errors.push(
        `baseline applied migration checksum changed: ${baselineMigration.file}`,
      );
    }
  }
}

function runGit(repositoryRoot, argumentsList) {
  return spawnSync("git", argumentsList, {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

function assertUniqueFiles(migrations, label, errors) {
  const seen = new Set();
  for (const migration of migrations) {
    if (seen.has(migration.file)) {
      errors.push(`${label} repeats file ${migration.file}`);
    }
    seen.add(migration.file);
  }
}

function validateAutomationCommands(root, errors) {
  const repositoryRoot = findRepositoryRoot(root);
  const candidates = new Set([
    join(root, "package.json"),
    join(root, "vercel.json"),
    join(repositoryRoot, "package.json"),
    join(repositoryRoot, "Makefile"),
    join(repositoryRoot, "Taskfile.yml"),
  ]);

  collectExecutableFiles(join(root, "scripts"), candidates);
  collectExecutableFiles(join(root, ".husky"), candidates);
  collectExecutableFiles(join(repositoryRoot, "scripts"), candidates);
  collectExecutableFiles(join(repositoryRoot, "tools"), candidates);
  collectExecutableFiles(
    join(repositoryRoot, ".github", "workflows"),
    candidates,
  );
  collectExecutableFiles(
    join(repositoryRoot, ".github", "actions"),
    candidates,
  );

  const ownPath = fileURLToPath(import.meta.url);
  for (const path of [...candidates].sort()) {
    if (!existsSync(path) || statSync(path).isDirectory() || path === ownPath) {
      continue;
    }
    const source = readFileSync(path, "utf8").replace(/\\\r?\n[ \t]*/g, " ");
    if (/\bsupabase(?:@[^\s"']+)?\s+db\s+push\b/i.test(source)) {
      errors.push(
        `direct Supabase database push is forbidden in automation: ${relativeLabel(repositoryRoot, path)}`,
      );
    }
    if (/(?:^|[^a-z0-9_-])--include-all(?![a-z0-9_-])/im.test(source)) {
      errors.push(
        `--include-all is forbidden in automation: ${relativeLabel(repositoryRoot, path)}`,
      );
    }
    if (
      /["'`]supabase(?:@[^"'`]*)?["'`]\s*,\s*["'`]db["'`]\s*,\s*["'`]push["'`]/i.test(
        source,
      )
    ) {
      errors.push(
        `programmatic Supabase database push is forbidden in automation: ${relativeLabel(repositoryRoot, path)}`,
      );
    }
    if (
      /\bexecFile(?:Sync)?\s*\(\s*["'`]supabase(?:@[^"'`]*)?["'`]\s*,\s*\[\s*["'`]db["'`]\s*,\s*["'`]push["'`]/i.test(
        source,
      )
    ) {
      errors.push(
        `execFile Supabase database push is forbidden in automation: ${relativeLabel(repositoryRoot, path)}`,
      );
    }
  }
}

function collectExecutableFiles(directory, candidates) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectExecutableFiles(path, candidates);
    } else if (
      entry.isFile() &&
      EXECUTABLE_EXTENSIONS.has(extname(entry.name))
    ) {
      candidates.add(path);
    }
  }
}

function findRepositoryRoot(start) {
  let current = start;
  while (true) {
    if (existsSync(join(current, ".git"))) return current;
    const parent = dirname(current);
    if (parent === current) return start;
    current = parent;
  }
}

function relativeLabel(root, path) {
  return path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readCliArguments(argumentsList) {
  let root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  let baselineRef;
  let requireNoPending = false;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--root") {
      const value = argumentsList[index + 1];
      if (!value) throw new Error("--root requires a directory");
      root = resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--baseline-ref") {
      const value = argumentsList[index + 1];
      if (!value) throw new Error("--baseline-ref requires a Git ref");
      baselineRef = value;
      index += 1;
      continue;
    }
    if (argument === "--require-no-pending") {
      requireNoPending = true;
      continue;
    }
    throw new Error(`unknown argument: ${argument}`);
  }

  return { baselineRef, requireNoPending, root };
}

function runCli() {
  const { baselineRef, requireNoPending, root } = readCliArguments(
    process.argv.slice(2),
  );
  const result = inspectSupabaseMigrations(root, {
    baselineRef,
    requireNoPending,
  });
  if (result.errors.length > 0) {
    console.error("Supabase migration safety check failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Supabase migration safety check passed: ${result.lockedCount} applied checksums, ${result.pendingActiveCount} pending active, ${result.deferredCount} deferred.`,
  );
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    runCli();
  } catch (error) {
    console.error(
      `Supabase migration safety check failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exitCode = 1;
  }
}
