import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const env = {
  ...process.env,
  ...readEnvFile(".env"),
  ...readEnvFile(".env.local"),
};

const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "SHARE_TOKEN_PEPPER",
  "FIELD_ENCRYPTION_KEY",
];

const missing = requiredKeys.filter((key) => !nonEmpty(env[key]));

if (missing.length > 0) {
  console.error("NUANG server readiness check failed: missing env");
  for (const key of missing) console.error(`- ${key}`);
  process.exit(1);
}

const serviceClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: createTimeoutFetch(5000),
    },
  },
);

const anonClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: createTimeoutFetch(5000),
    },
  },
);

const checks = [];

await checkServicePreflight();
await checkServiceTables([
  ["identity", "account", "id"],
  ["identity", "auth_identity", "id, account_id"],
  ["consent", "age_and_consent_status", "account_id"],
  ["assessment", "assessment_attempt", "id, account_id"],
  ["assessment", "free_topic_result", "id, local_result_id"],
  ["scoring", "score_snapshot", "id, account_id"],
  ["report", "result_report", "id, account_id"],
  ["sharing", "share_link", "id, result_report_id, status"],
  ["profile", "profile_visibility_setting", "id, account_id"],
  ["profile", "profile_public_snapshot", "id, account_id, status"],
  ["comparison", "public_comparison_report", "id, viewer_account_id"],
  ["feed", "feed_post", "id, source"],
  ["feed", "feed_comment", "id, target_type"],
  ["feed", "feed_reaction", "id, target_type"],
  ["feed", "feed_bookmark", "id, target_type"],
  ["feed", "feed_preference", "id, target_type"],
  ["feed", "feed_poll", "id, status"],
  ["feed", "feed_poll_option", "id, poll_id"],
  ["feed", "feed_poll_vote", "id, poll_id"],
  ["audit", "visibility_audit_event", "id, event_type"],
]);

await checkLegacyTableRemoved();
await checkServiceDeleteRpcNoop();
await checkAnonSensitiveReads();
await checkAnonFeedReads();
await checkAnonDeleteRpcBlocked();

const failed = checks.filter((check) => !check.ok);

console.log("NUANG server readiness check");
for (const check of checks) {
  const marker = check.ok ? "PASS" : "FAIL";
  const detail = check.detail ? ` - ${check.detail}` : "";
  console.log(`${marker} ${check.name}${detail}`);
}

if (failed.length > 0) {
  console.error(`server readiness failed: ${failed.length} check(s) failed`);
  process.exit(1);
}

console.log("server readiness passed.");

async function checkServicePreflight() {
  const { error } = await serviceClient
    .schema("identity")
    .from("account")
    .select("id", { count: "exact", head: true });

  if (!error) return;

  console.log("NUANG server readiness check");
  console.log(`FAIL service preflight - ${describeError(error)}`);
  console.error(
    "server readiness failed: service preflight could not reach identity.account",
  );
  process.exit(1);
}

async function checkServiceTables(tables) {
  for (const [schema, table, columns] of tables) {
    const { count, error } = await serviceClient
      .schema(schema)
      .from(table)
      .select(columns, { count: "exact", head: true });

    pushCheck({
      detail: error ? describeError(error) : `rows=${count ?? 0}`,
      name: `service can access ${schema}.${table}`,
      ok: !error,
    });
  }
}

async function checkLegacyTableRemoved() {
  const { error } = await serviceClient
    .schema("profile")
    .from("profile_public_code")
    .select("id")
    .limit(1);

  pushCheck({
    detail: error
      ? `removed (${error.code ?? "unknown"})`
      : "legacy table is still queryable",
    name: "legacy profile.profile_public_code is absent",
    ok: Boolean(error),
  });
}

async function checkServiceDeleteRpcNoop() {
  const { data, error } = await serviceClient
    .schema("report")
    .rpc("delete_result_for_account", {
      p_account_id: "00000000-0000-4000-8000-000000000000",
      p_local_result_id: "server_readiness_noop",
      p_result_report_id: "00000000-0000-4000-8000-000000000001",
    });

  const row = Array.isArray(data) ? data[0] : null;

  pushCheck({
    detail: error ? describeError(error) : `deleted=${Boolean(row?.deleted)}`,
    name: "service can execute report.delete_result_for_account no-op",
    ok: !error && row?.deleted === false,
  });
}

async function checkAnonSensitiveReads() {
  const sensitiveReads = [
    ["identity", "auth_identity", "id, account_id, supabase_user_id"],
    ["identity", "contact_profile", "account_id, email_hash"],
    ["consent", "age_and_consent_status", "account_id"],
    ["assessment", "assessment_response", "id, item_id, value"],
    ["assessment", "free_topic_result", "id, evidence_payload"],
    ["scoring", "score_snapshot", "id, score_payload"],
    ["report", "result_report", "id, summary, share_summary"],
    ["sharing", "share_link", "id, token_hash"],
    ["profile", "profile_public_snapshot", "id, snapshot_payload"],
    ["comparison", "public_comparison_report", "id, report_payload"],
    ["audit", "visibility_audit_event", "id, metadata"],
  ];

  for (const [schema, table, columns] of sensitiveReads) {
    const { data, error } = await anonClient
      .schema(schema)
      .from(table)
      .select(columns)
      .limit(1);

    const noRows = Array.isArray(data) && data.length === 0;
    const blocked = Boolean(error);

    pushCheck({
      detail: blocked
        ? `blocked (${error.code ?? "unknown"})`
        : "no rows visible",
      name: `anon cannot see sensitive ${schema}.${table}`,
      ok: blocked || noRows,
    });
  }
}

async function checkAnonFeedReads() {
  const feedReads = [
    ["feed", "feed_post", "id, source"],
    ["feed", "feed_poll", "id, status"],
    ["feed", "feed_poll_option", "id, poll_id"],
  ];

  for (const [schema, table, columns] of feedReads) {
    const { error } = await anonClient
      .schema(schema)
      .from(table)
      .select(columns)
      .limit(1);

    pushCheck({
      detail: error ? describeError(error) : "query ok",
      name: `anon can query public feed surface ${schema}.${table}`,
      ok: !error,
    });
  }
}

async function checkAnonDeleteRpcBlocked() {
  const { error } = await anonClient
    .schema("report")
    .rpc("delete_result_for_account", {
      p_account_id: "00000000-0000-4000-8000-000000000000",
      p_local_result_id: "server_readiness_noop",
      p_result_report_id: "00000000-0000-4000-8000-000000000001",
    });

  pushCheck({
    detail: error ? `blocked (${error.code ?? "unknown"})` : "rpc executed",
    name: "anon cannot execute report.delete_result_for_account",
    ok: Boolean(error),
  });
}

function pushCheck(check) {
  checks.push(check);
}

function describeError(error) {
  const code = error?.code || "unknown";
  const message = error?.message || "unknown error";
  return `${code}: ${message}`;
}

function readEnvFile(fileName) {
  const path = resolve(process.cwd(), fileName);

  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");

        if (separatorIndex === -1) return [line, ""];

        return [
          line.slice(0, separatorIndex).trim(),
          stripQuotes(line.slice(separatorIndex + 1).trim()),
        ];
      }),
  );
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function createTimeoutFetch(timeoutMs) {
  return async (input, init = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}
