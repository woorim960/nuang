import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const migrationFiles = [
  "202608050002_profile_report_visibility_private_default.sql",
  "202608050003_disable_revoked_public_comparisons.sql",
  "202608050004_admin_profile_public_surface_cleanup.sql",
  "202608050005_atomic_public_comparison_creation.sql",
  "202608050006_atomic_profile_block_cleanup.sql",
];
const apply = process.argv.includes("--apply");
const env = { ...readEnvFile(".env.local"), ...process.env };
const connectionString = env.NUANG_DATABASE_URL ?? env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL or NUANG_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && env.NUANG_ALLOW_REMOTE_MIGRATION !== "true") {
  console.error(
    "NUANG_ALLOW_REMOTE_MIGRATION=true is required for --apply. Without --apply, the script always rolls back.",
  );
  process.exit(1);
}

const migrations = migrationFiles.map((fileName) => {
  const [version, ...nameParts] = fileName.replace(/\.sql$/, "").split("_");
  const source = readFileSync(
    resolve("supabase", "migrations", fileName),
    "utf8",
  );

  return {
    fileName,
    name: nameParts.join("_"),
    source: stripTransactionEnvelope(source),
    version,
  };
});

const client = new pg.Client({
  connectionString,
  connectionTimeoutMillis: 10_000,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query("begin");
  await client.query(
    "select pg_advisory_xact_lock(hashtext('nuang-mvp-security-migrations'))",
  );
  const historyColumns = await readMigrationHistoryColumns(client);
  const existingVersions = await readExistingVersions(client);

  for (const migration of migrations) {
    if (existingVersions.has(migration.version)) {
      console.log(`SKIP ${migration.fileName} (already recorded)`);
      continue;
    }

    await client.query(migration.source);
    console.log(`${apply ? "APPLY" : "CHECK"} ${migration.fileName}`);

    if (apply) {
      await recordMigration(client, historyColumns, migration);
    }
  }

  await client.query(apply ? "commit" : "rollback");
  console.log(
    apply
      ? "MVP security migrations applied and recorded."
      : "MVP security migrations validated and rolled back.",
  );
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error(
    `MVP security migration ${apply ? "apply" : "check"} failed: ${error instanceof Error ? error.message : "unknown error"}`,
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
    throw new Error("supabase_migrations.schema_migrations is unavailable");
  }
  return columns;
}

async function readExistingVersions(databaseClient) {
  const response = await databaseClient.query(
    "select version from supabase_migrations.schema_migrations where version = any($1::text[])",
    [migrations.map((migration) => migration.version)],
  );
  return new Set(response.rows.map((row) => String(row.version)));
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

  await databaseClient.query(
    `insert into supabase_migrations.schema_migrations (${insertColumns.join(", ")})
     values (${placeholders})
     on conflict (version) do nothing`,
    values,
  );
}

function stripTransactionEnvelope(source) {
  return source
    .replace(/^\s*begin\s*;\s*/i, "")
    .replace(/\s*commit\s*;\s*$/i, "")
    .trim();
}

function readEnvFile(fileName) {
  const path = resolve(fileName);
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator).trim();
        const rawValue = line.slice(separator + 1).trim();
        const value =
          (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
          (rawValue.startsWith("'") && rawValue.endsWith("'"))
            ? rawValue.slice(1, -1)
            : rawValue;
        return [key, value];
      }),
  );
}
