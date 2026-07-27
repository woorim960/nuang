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
  "LEGAL_OPERATOR_NAME",
  "PRIVACY_CONTACT_EMAIL",
  "SUPABASE_DATA_REGION",
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
  ["identity", "contact_profile", "account_id, email_status"],
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
  ["feed", "official_community_content", "id, content_type, lifecycle_status"],
  ["feed", "profile_report", "id, reporter_account_id, status"],
  ["feed", "content_report", "id, reporter_account_id, status"],
  ["feed", "link_domain_policy", "id, domain, status"],
  ["feed", "feed_external_link", "id, review_status"],
  ["feed", "community_write_bucket", "account_id, action, bucket_start"],
  ["audit", "visibility_audit_event", "id, event_type"],
  ["audit", "admin_audit_log", "id, admin_account_id, action"],
  ["public", "research_gate_c_session", "id, status, quality_status"],
  [
    "public",
    "research_gate_c_request_bucket",
    "subject_hash, action, bucket_kind, bucket_start, request_count",
  ],
  [
    "public",
    "research_gate_c_item_decision",
    "id, decision_state, updated_at",
  ],
  [
    "public",
    "research_trait_map_section_feedback",
    "id, profile_code, fit_rating",
  ],
  [
    "public",
    "research_trait_map_section_decision",
    "id, decision_state, updated_at",
  ],
  ["public", "research_gate_c_reward_entry", "id, campaign_id, status"],
]);

await checkLegacyTableRemoved();
await checkServiceDeleteRpcNoop();
await checkCommunityWriteGuardRpc();
await checkAssessmentResultClaimRpc();
await checkGateCRequestGuardRpc();
await checkSelfAccountDeletionRpc();
await checkAdminAtomicRpcs();
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
    ["feed", "content_report", "id, reporter_account_id, details"],
    ["feed", "community_write_bucket", "account_id, request_count"],
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

async function checkCommunityWriteGuardRpc() {
  const { data, error } = await serviceClient
    .schema("feed")
    .rpc("check_community_write_guard", {
      p_account_id: null,
      p_action: "create_post",
      p_body: null,
    });

  pushCheck({
    detail: error ? describeError(error) : `result=${String(data)}`,
    name: "service can execute feed.check_community_write_guard",
    ok: !error && data === "account_link_missing",
  });
}

async function checkAssessmentResultClaimRpc() {
  await checkRpcExists(
    "claim_assessment_result_atomic",
    {
      p_account_id: "00000000-0000-4000-8000-000000000000",
      p_assessment_kind: "readiness_check",
      p_assessment_slug: "readiness-check",
      p_code_scheme_version: "readiness",
      p_completed_at: new Date(0).toISOString(),
      p_item_release_version: "readiness",
      p_local_result_id: "server_readiness_noop",
      p_measurement_release_id: "readiness",
      p_profile_code: "ENAKQ",
      p_profile_name: "readiness",
      p_responses: [],
      p_score_payload: {},
      p_scoring_release_id: "readiness",
      p_scoring_version: "readiness",
      p_share_summary: {},
      p_summary: {},
    },
    "server-trusted assessment result claim RPC is available",
  );
}

async function checkGateCRequestGuardRpc() {
  const { data, error } = await serviceClient.rpc(
    "check_gate_c_request_guard",
    {
      p_action: "start_session",
      p_subject_hash: "invalid-readiness-subject",
    },
  );

  const missing = ["42883", "PGRST202"].includes(error?.code ?? "");
  pushCheck({
    detail: missing
      ? describeError(error)
      : error
        ? `available (${error.code ?? "expected guard"})`
        : `result=${String(data)}`,
    name: "Gate C request guard RPC is available",
    ok: !missing && (Boolean(error) || data === "invalid_subject"),
  });
}

async function checkSelfAccountDeletionRpc() {
  await checkRpcExists(
    "delete_own_nuang_account",
    {
      p_account_id: "00000000-0000-4000-8000-000000000000",
      p_supabase_user_id: "00000000-0000-4000-8000-000000000001",
    },
    "self-service account deletion RPC is available",
  );
}

async function checkAdminAtomicRpcs() {
  await checkRpcExists(
    "admin_apply_community_moderation",
    {
      target_action: "readiness_check",
      target_admin_account_id: null,
      target_id: null,
    },
    "admin community moderation is atomic",
  );
  await checkRpcExists(
    "admin_review_external_link",
    {
      target_action: "readiness_check",
      target_admin_account_id: null,
      target_link_id: null,
    },
    "admin external-link review is atomic",
  );
  await checkRpcExists(
    "admin_apply_member_action",
    {
      target_account_id: null,
      target_action: "readiness_check",
      target_admin_account_id: null,
    },
    "admin member action is atomic",
  );
  await checkRpcExists(
    "admin_manage_research_decision",
    {
      target_action: "start_review",
      target_admin_account_id: null,
      target_identity: {},
      target_note: null,
      target_scope: "gate_c_item",
    },
    "admin research decision is atomic",
  );
}

async function checkRpcExists(rpcName, args, label) {
  const { error } = await serviceClient.rpc(rpcName, args);
  const missing = ["42883", "PGRST202"].includes(error?.code ?? "");
  pushCheck({
    detail: missing
      ? describeError(error)
      : error
        ? `available (${error.code ?? "expected guard"})`
        : "available",
    name: label,
    ok: !missing,
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
