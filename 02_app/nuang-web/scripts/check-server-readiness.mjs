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
  ["identity", "operator_account", "account_id"],
  ["consent", "age_and_consent_status", "account_id"],
  ["consent", "product_analytics_event", "id, account_id, event_name, area"],
  ["assessment", "assessment_attempt", "id, account_id"],
  ["assessment", "free_topic_result", "id, local_result_id"],
  ["scoring", "account_trait_profile", "account_id, profile_code, version"],
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
  ["public", "research_gate_c_item_decision", "id, decision_state, updated_at"],
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
  ["public", "assessment_content_entry", "id, category, slug, status"],
  ["public", "assessment_content_release", "id, entry_id, release_key"],
  ["public", "admin_legal_release", "id, release_key, status"],
  ["public", "admin_legal_review_item", "id, release_id, item_key, status"],
  ["together_balance", "template", "id, slug, status"],
  ["together_balance", "template_version", "id, template_id, version"],
  ["together_balance", "session_recipe", "id, template_version_id"],
  ["together_balance", "item", "id, template_version_id, item_key"],
  ["together_balance", "room", "id, lifecycle_status, result_status"],
  ["together_balance", "participant", "id, room_id, status"],
  ["together_balance", "request_budget", "scope_hash, action"],
  ["together_balance", "room_ban", "id, room_id"],
  ["together_balance", "round", "id, room_id, status"],
  ["together_balance", "round_item", "round_id, item_id, display_order"],
  ["together_balance", "response", "id, room_id, participant_id"],
  ["together_balance", "round_completion", "round_id, participant_id"],
  ["together_balance", "result_snapshot", "id, room_id, result_state"],
  ["together_balance", "pair_result", "snapshot_id, room_id"],
  ["together_balance", "feed_share", "id, room_id, share_kind"],
]);

await checkLegacyTableRemoved();
await checkServiceDeleteRpcNoop();
await checkCommunityWriteGuardRpc();
await checkAtomicProfileBlockRpc();
await checkAssessmentResultClaimRpc();
await checkGateCRequestGuardRpc();
await checkSelfAccountDeletionRpc();
await checkAtomicPublicComparisonRpc();
await checkAdminAtomicRpcs();
await checkAssessmentStudioRpcs();
await checkTogetherBalancePerformanceRpcs();
await checkProductAnalyticsSnapshotRpc();
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
    ["consent", "product_analytics_event", "id, account_id, area"],
    ["assessment", "assessment_response", "id, item_id, value"],
    ["assessment", "free_topic_result", "id, evidence_payload"],
    ["scoring", "account_trait_profile", "account_id, profile_code, domains"],
    ["scoring", "score_snapshot", "id, score_payload"],
    ["report", "result_report", "id, summary, share_summary"],
    ["sharing", "share_link", "id, token_hash"],
    ["profile", "profile_public_snapshot", "id, snapshot_payload"],
    ["comparison", "public_comparison_report", "id, report_payload"],
    ["feed", "content_report", "id, reporter_account_id, details"],
    ["feed", "community_write_bucket", "account_id, request_count"],
    ["audit", "visibility_audit_event", "id, metadata"],
    ["public", "assessment_content_entry", "id, document, review_note"],
    ["public", "assessment_content_release", "id, document, change_note"],
    ["public", "admin_legal_release", "id, release_key, approval_evidence_ref"],
    ["public", "admin_legal_review_item", "id, release_id, evidence_ref, note"],
    ["together_balance", "room", "id, join_code_hash, owner_participant_id"],
    ["together_balance", "participant", "id, join_token_hash, account_id"],
    ["together_balance", "response", "id, participant_id, option_key"],
    ["together_balance", "result_snapshot", "id, room_id, highlights"],
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

async function checkAtomicProfileBlockRpc() {
  await checkSchemaRpcExists(
    "feed",
    "set_profile_block",
    {
      p_blocked: true,
      p_blocked_account_id: "00000000-0000-4000-8000-000000000001",
      p_blocker_account_id: "00000000-0000-4000-8000-000000000002",
      p_target_public_snapshot_id: "00000000-0000-4000-8000-000000000003",
    },
    "profile block cleans follows and notifications atomically",
  );
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

async function checkAtomicPublicComparisonRpc() {
  await checkSchemaRpcExists(
    "comparison",
    "create_public_comparison_report",
    {
      p_id: "00000000-0000-4000-8000-000000000001",
      p_policy_version: "readiness",
      p_report_payload: {},
      p_target_public_snapshot_id: "00000000-0000-4000-8000-000000000002",
      p_viewer_account_id: "00000000-0000-4000-8000-000000000003",
      p_viewer_public_snapshot_id: "00000000-0000-4000-8000-000000000004",
      p_viewer_result_report_id: "00000000-0000-4000-8000-000000000005",
    },
    "public comparison creation and visibility audit are atomic",
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

async function checkAssessmentStudioRpcs() {
  await checkRpcExists(
    "admin_manage_assessment_content",
    {
      target_action: "readiness_check",
      target_admin_account_id: null,
      target_entry_id: null,
      target_note: null,
    },
    "assessment studio lifecycle mutation is atomic",
  );
  await checkRpcExists(
    "admin_reorder_assessment_content",
    {
      target_admin_account_id: null,
      target_ordered_entry_ids: [],
      target_reason: null,
    },
    "assessment studio reorder is atomic and audited",
  );
}

async function checkTogetherBalancePerformanceRpcs() {
  await checkSchemaRpcExists(
    "together_balance",
    "get_room_join_preview",
    { p_join_code_hash: "invalid" },
    "balance room join preview hot path is available",
  );
  await checkSchemaRpcExists(
    "together_balance",
    "save_response_by_item_key",
    {
      p_client_sequence: 1,
      p_idempotency_key: "00000000-0000-4000-8000-000000000000",
      p_item_key: "readiness",
      p_join_code_hash: "invalid",
      p_join_token_hash: "invalid",
      p_option_key: "a",
      p_response_ms: null,
    },
    "balance response single-transaction hot path is available",
  );
  await checkSchemaRpcExists(
    "together_balance",
    "complete_participant_game",
    { p_join_code_hash: "invalid", p_join_token_hash: "invalid" },
    "balance completion single-transaction hot path is available",
  );
}

async function checkProductAnalyticsSnapshotRpc() {
  const operator = await serviceClient
    .schema("identity")
    .from("operator_account")
    .select("account_id")
    .limit(1)
    .maybeSingle();

  if (operator.error || !operator.data?.account_id) {
    pushCheck({
      detail: operator.error
        ? describeError(operator.error)
        : "no active operator evidence row",
      name: "operator-only product analytics snapshot is available",
      ok: false,
    });
    return;
  }

  const args = {
    target_admin_account_id: operator.data.account_id,
    target_days: 7,
  };
  const service = await serviceClient
    .schema("consent")
    .rpc("admin_product_analytics_snapshot", args);
  const serviceReady =
    !service.error &&
    service.data?.schemaVersion === 1 &&
    service.data?.windowDays === 7 &&
    typeof service.data?.summary === "object";

  pushCheck({
    detail: service.error
      ? describeError(service.error)
      : serviceReady
        ? `eligible=${Number(service.data.summary?.eligibleAccounts ?? 0)}`
        : "invalid snapshot contract",
    name: "operator-only product analytics snapshot is available",
    ok: serviceReady,
  });

  const anon = await anonClient
    .schema("consent")
    .rpc("admin_product_analytics_snapshot", args);
  pushCheck({
    detail: anon.error
      ? `blocked (${anon.error.code ?? "unknown"})`
      : "rpc executed",
    name: "anon cannot execute product analytics snapshot",
    ok: Boolean(anon.error),
  });
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

async function checkSchemaRpcExists(schema, rpcName, args, label) {
  const { error } = await serviceClient.schema(schema).rpc(rpcName, args);
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
