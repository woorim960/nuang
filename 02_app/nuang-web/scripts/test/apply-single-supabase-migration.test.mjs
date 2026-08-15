import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(
  resolve("scripts/apply-single-supabase-migration.mjs"),
  "utf8",
);

test("single migration runner is rollback-first and requires exact apply confirmation", () => {
  assert.match(source, /const apply = args\.has\("--apply"\)/);
  assert.match(
    source,
    /confirmedVersionArgument !== `--confirm-version=\$\{version\}`/,
  );
  assert.match(source, /await client\.query\("rollback"\)/);
  assert.match(
    source,
    /action: apply \? "applied" : "validated_and_rolled_back"/,
  );
});

test("single migration runner verifies the pinned database CA", () => {
  assert.match(source, /supabase-prod-ca-2021\.crt/);
  assert.match(source, /ca: readFileSync\(caPath, "utf8"\)/);
  assert.match(source, /rejectUnauthorized: true/);
  assert.doesNotMatch(source, /rejectUnauthorized:\s*false/);
});

test("single migration runner serializes one version and records history atomically", () => {
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /where version = \$1 limit 1/);
  assert.match(source, /on conflict \(version\) do nothing/);
  assert.match(source, /if \(response\.rowCount !== 1\)/);
  assert.match(source, /await client\.query\("commit"\)/);
});

test("single migration runner prints only bounded result and error codes", () => {
  assert.match(source, /JSON\.stringify\(\{ ok: true, \.\.\.result \}\)/);
  assert.match(source, /errorCode: classifyDatabaseError\(error\)/);
  assert.doesNotMatch(source, /console\.(?:error|log)/);
  assert.doesNotMatch(source, /JSON\.stringify\(connectionString\)/);
});
