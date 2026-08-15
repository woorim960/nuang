import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import pg from "pg";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const migrationArgument = process.argv
  .slice(2)
  .find((argument) => argument.startsWith("--migration="));
const confirmedVersionArgument = process.argv
  .slice(2)
  .find((argument) => argument.startsWith("--confirm-version="));

if (!migrationArgument) {
  fail("migration_argument_required");
}

const migrationFileName = migrationArgument.slice("--migration=".length);
if (!/^\d{12}_[a-z0-9_]+\.sql$/.test(migrationFileName)) {
  fail("migration_file_name_invalid");
}

const version = migrationFileName.slice(0, 12);
if (apply && confirmedVersionArgument !== `--confirm-version=${version}`) {
  fail("apply_confirmation_mismatch");
}

const migrationPath = resolve(
  process.cwd(),
  "supabase",
  "migrations",
  basename(migrationFileName),
);
if (!existsSync(migrationPath)) {
  fail("migration_file_missing");
}

const env = {
  ...readEnvFile(resolve(process.cwd(), ".env")),
  ...readEnvFile(resolve(process.cwd(), ".env.local")),
  ...process.env,
};
const connectionString = env.NUANG_DATABASE_URL ?? env.DATABASE_URL;
if (!connectionString) {
  fail("database_url_missing");
}

const caPath = resolve(
  process.cwd(),
  env.NUANG_DATABASE_CA_FILE ?? "config/certificates/supabase-prod-ca-2021.crt",
);
if (!existsSync(caPath)) {
  fail("database_ca_missing");
}

const originalSource = readFileSync(migrationPath, "utf8");
const source = stripTransactionEnvelope(originalSource);
const sourceSha256 = createHash("sha256").update(originalSource).digest("hex");
const name = migrationFileName.replace(/^\d{12}_/, "").replace(/\.sql$/, "");

const client = new pg.Client({
  application_name: "nuang_single_migration_runner",
  connectionString,
  connectionTimeoutMillis: 10_000,
  ssl: {
    ca: readFileSync(caPath, "utf8"),
    rejectUnauthorized: true,
  },
});

try {
  await client.connect();
  await client.query("begin");
  await client.query("set local statement_timeout = '60s'");
  await client.query(
    "select pg_advisory_xact_lock(hashtext('nuang-single-migration'), hashtext($1))",
    [version],
  );

  const historyColumns = await readMigrationHistoryColumns(client);
  const existing = await client.query(
    "select 1 from supabase_migrations.schema_migrations where version = $1 limit 1",
    [version],
  );
  if (existing.rowCount > 0) {
    await client.query("rollback");
    writeResult({
      action: "already_applied",
      sourceSha256,
      version,
    });
  } else {
    await client.query(source);

    if (apply) {
      await recordMigration(client, historyColumns, {
        name,
        source,
        version,
      });
      await client.query("commit");
    } else {
      await client.query("rollback");
    }

    writeResult({
      action: apply ? "applied" : "validated_and_rolled_back",
      sourceSha256,
      version,
    });
  }
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  process.stderr.write(
    `${JSON.stringify({
      errorCode: classifyDatabaseError(error),
      ok: false,
    })}\n`,
  );
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}

async function readMigrationHistoryColumns(databaseClient) {
  const response = await databaseClient.query(
    `select column_name
       from information_schema.columns
      where table_schema = $1
        and table_name = $2`,
    ["supabase_migrations", "schema_migrations"],
  );
  const columns = new Set(response.rows.map((row) => String(row.column_name)));
  if (!columns.has("version")) {
    throw new Error("migration_history_unavailable");
  }
  return columns;
}

async function recordMigration(databaseClient, columns, migration) {
  const insertColumns = ["version"];
  const values = [migration.version];
  if (columns.has("name")) {
    insertColumns.push("name");
    values.push(migration.name);
  }
  if (columns.has("statements")) {
    insertColumns.push("statements");
    values.push([migration.source]);
  }
  const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
  const response = await databaseClient.query(
    `insert into supabase_migrations.schema_migrations (${insertColumns.join(", ")})
     values (${placeholders})
     on conflict (version) do nothing`,
    values,
  );
  if (response.rowCount !== 1) {
    throw new Error("migration_history_insert_conflict");
  }
}

function stripTransactionEnvelope(sourceText) {
  return sourceText
    .replace(/^\s*begin\s*;\s*/i, "")
    .replace(/\s*commit\s*;\s*$/i, "")
    .trim();
}

function readEnvFile(path) {
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .flatMap((line) => {
        const separator = line.indexOf("=");
        if (separator < 1) return [];
        const key = line.slice(0, separator).trim();
        const rawValue = line.slice(separator + 1).trim();
        const value =
          (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
          (rawValue.startsWith("'") && rawValue.endsWith("'"))
            ? rawValue.slice(1, -1)
            : rawValue;
        return [[key, value]];
      }),
  );
}

function classifyDatabaseError(error) {
  if (!(error instanceof Error)) return "migration_unknown_error";
  if (/certificate|self signed|unable to verify/i.test(error.message)) {
    return "database_tls_verification_failed";
  }
  if (/timeout/i.test(error.message)) return "database_timeout";
  if (/password authentication/i.test(error.message)) {
    return "database_authentication_failed";
  }
  if (/migration_history_/i.test(error.message)) return error.message;
  return "migration_execution_failed";
}

function writeResult(result) {
  process.stdout.write(`${JSON.stringify({ ok: true, ...result })}\n`);
}

function fail(code) {
  process.stderr.write(`${JSON.stringify({ ok: false, errorCode: code })}\n`);
  process.exit(1);
}
