import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const env = {
  ...process.env,
  ...readEnvFile(".env"),
  ...readEnvFile(".env.local"),
};

for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!nonEmpty(env[key])) {
    console.error(`Assessment Studio REST smoke test failed: ${key} is missing.`);
    process.exit(1);
  }
}

const client = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const slug = "ops-assessment-studio-acceptance";
const firstTitle = "운영 인수 검수 기록";
const secondTitle = "운영 인수 검수 기록 수정본";
const description = "검사 스튜디오의 전체 생명주기를 확인한 운영센터 전용 보관 기록입니다.";
const checks = [];
let entryId = null;

try {
  const existing = await client
    .from("assessment_content_entry")
    .select("id,status,deleted_at")
    .eq("category", "together")
    .eq("slug", slug)
    .maybeSingle();
  throwIfError(existing.error);
  if (existing.data) {
    const verified = await verifyExistingRecord(existing.data.id);
    console.log(JSON.stringify({
      checks,
      entryId: existing.data.id,
      existing: true,
      finalStatus: existing.data.status,
      ok: verified,
      slug,
    }, null, 2));
    process.exit(verified ? 0 : 1);
  }

  const operator = await client
    .schema("identity")
    .from("operator_account")
    .select("account_id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(operator.error);
  assert(Boolean(operator.data?.account_id), "active_operator_available");
  const accountId = operator.data.account_id;

  const created = await upsert({
    accountId,
    document: friendDocument(firstTitle),
    entryId: null,
    expectedRevision: null,
  });
  entryId = created.entryId;
  assert(created.revision === 1 && created.status === "draft", "draft_created");

  await expectRpcError({
    name: "duplicate_slug_blocked",
    operation: () => upsert({
      accountId,
      document: friendDocument(firstTitle),
      entryId: null,
      expectedRevision: null,
    }),
    text: "duplicate",
  });
  await expectRpcError({
    name: "optimistic_lock_blocks_stale_save",
    operation: () => upsert({
      accountId,
      document: friendDocument(firstTitle),
      entryId,
      expectedRevision: 99,
    }),
    text: "assessment_content_revision_conflict",
  });

  await reorder(accountId, [entryId], "운영 검수 정렬 동작 확인");
  checks.push("reorder_completed");

  const firstSave = await upsert({
    accountId,
    document: friendDocument(firstTitle),
    entryId,
    expectedRevision: 1,
  });
  assert(firstSave.revision === 2, "working_revision_incremented");

  await manage(accountId, entryId, "submit_review", "초안 반려 흐름 검토 요청");
  const returned = await manage(accountId, entryId, "return_draft", "첫 검토 반려 동작 확인");
  assert(returned.status === "draft", "review_can_return_to_draft");

  await manage(accountId, entryId, "submit_review", "첫 번째 게시 검토 요청");
  const firstPublish = await manage(accountId, entryId, "publish", "첫 번째 검수 릴리스 게시");
  assert(firstPublish.status === "published" && firstPublish.releaseId, "first_release_published");
  const firstReleaseId = firstPublish.releaseId;

  const firstRelease = await client
    .from("assessment_content_release")
    .select("release_number,release_key,document,retired_at")
    .eq("id", firstReleaseId)
    .single();
  throwIfError(firstRelease.error);
  assert(
    firstRelease.data.release_number === 1 &&
      firstRelease.data.document.title === firstTitle &&
      firstRelease.data.retired_at === null,
    "first_release_snapshot_exact",
  );

  const mutation = await client
    .from("assessment_content_release")
    .update({ change_note: "허용되지 않은 직접 수정" })
    .eq("id", firstReleaseId);
  assert(Boolean(mutation.error), "published_release_direct_update_blocked");

  await manage(accountId, entryId, "pause", "신규 시작 차단 검수");
  await manage(accountId, entryId, "archive", "안전 보관 동작 검수");
  const restored = await manage(accountId, entryId, "restore", "보관 항목 복원 검수");
  assert(restored.status === "paused", "published_archive_restores_as_paused");

  await expectRpcError({
    name: "published_identity_is_locked",
    operation: () => upsert({
      accountId,
      document: { ...friendDocument(firstTitle), slug: `${slug}-changed` },
      entryId,
      expectedRevision: 2,
      slugOverride: `${slug}-changed`,
    }),
    text: "assessment_content_identity_locked",
  });

  const secondSave = await upsert({
    accountId,
    document: friendDocument(secondTitle),
    entryId,
    expectedRevision: 2,
  });
  assert(secondSave.revision === 3, "paused_release_can_create_new_working_copy");

  await manage(accountId, entryId, "submit_review", "두 번째 게시 검토 요청");
  const secondPublish = await manage(accountId, entryId, "publish", "두 번째 검수 릴리스 게시");
  assert(secondPublish.status === "published" && secondPublish.releaseId, "second_release_published");

  const rollback = await rpc("admin_rollback_assessment_content", {
    target_admin_account_id: accountId,
    target_entry_id: entryId,
    target_note: "첫 번째 검수 릴리스로 롤백",
    target_release_id: firstReleaseId,
  });
  assert(
    rollback.releaseId === firstReleaseId && rollback.status === "published",
    "rollback_completed",
  );

  const rolledBack = await client
    .from("assessment_content_entry")
    .select("title,status,published_release_id,document")
    .eq("id", entryId)
    .single();
  throwIfError(rolledBack.error);
  assert(
    rolledBack.data.title === firstTitle &&
      rolledBack.data.document.title === firstTitle &&
      rolledBack.data.published_release_id === firstReleaseId,
    "rollback_restores_exact_document",
  );

  const releases = await client
    .from("assessment_content_release")
    .select("id,release_number,retired_at")
    .eq("entry_id", entryId)
    .order("release_number", { ascending: true });
  throwIfError(releases.error);
  assert(
    releases.data.length === 2 &&
      releases.data[0].retired_at === null &&
      releases.data[1].retired_at !== null,
    "rollback_release_retirement_consistent",
  );

  await verifyAudit(entryId);
  await manage(accountId, entryId, "archive", "검수 종료 후 운영 기록 보관");
  const final = await client
    .from("assessment_content_entry")
    .select("status,deleted_at")
    .eq("id", entryId)
    .single();
  throwIfError(final.error);
  assert(
    final.data.status === "archived" && final.data.deleted_at !== null,
    "final_record_archived",
  );

  console.log(JSON.stringify({
    checks,
    entryId,
    finalStatus: final.data.status,
    ok: true,
    releaseCount: releases.data.length,
    slug,
  }, null, 2));
} catch (error) {
  if (entryId) await bestEffortArchive(entryId);
  console.error(JSON.stringify({
    checks,
    entryId,
    error: error instanceof Error ? error.message : String(error),
    ok: false,
    slug,
  }, null, 2));
  process.exitCode = 1;
}

async function verifyExistingRecord(id) {
  entryId = id;
  let entry = await client
    .from("assessment_content_entry")
    .select("status,deleted_at,published_release_id")
    .eq("id", id)
    .single();
  const releases = await client
    .from("assessment_content_release")
    .select("id", { count: "exact" })
    .eq("entry_id", id);
  throwIfError(entry.error);
  throwIfError(releases.error);
  const linkedReorder = await client
    .schema("audit")
    .from("admin_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("action", "assessment_content_reordered")
    .eq("target_table", "public.assessment_content_entry")
    .eq("target_id", id);
  throwIfError(linkedReorder.error);
  if ((linkedReorder.count ?? 0) === 0) {
    const operator = await client
      .schema("identity")
      .from("operator_account")
      .select("account_id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();
    throwIfError(operator.error);
    await manage(operator.data.account_id, id, "restore", "정렬 감사 보완 검수 복원");
    await reorder(operator.data.account_id, [id], "정렬 대상 감사 기록 보완 검수");
    await manage(operator.data.account_id, id, "archive", "정렬 감사 보완 후 다시 보관");
    checks.push("reorder_audit_rechecked");
    entry = await client
      .from("assessment_content_entry")
      .select("status,deleted_at,published_release_id")
      .eq("id", id)
      .single();
    throwIfError(entry.error);
  }
  await verifyAudit(id);
  assert(entry.data.status === "archived" && entry.data.deleted_at !== null, "existing_record_archived");
  assert((releases.count ?? releases.data.length) === 2, "existing_release_count_exact");
  return true;
}

async function verifyAudit(id) {
  const audit = await client
    .schema("audit")
    .from("admin_audit_log")
    .select("action")
    .eq("target_table", "public.assessment_content_entry")
    .eq("target_id", id);
  throwIfError(audit.error);
  const expected = [
    "assessment_content_created",
    "assessment_content_updated",
    "assessment_content_reordered",
    "assessment_content_submit_review",
    "assessment_content_return_draft",
    "assessment_content_publish",
    "assessment_content_pause",
    "assessment_content_archive",
    "assessment_content_restore",
    "assessment_content_rollback",
  ];
  const actions = new Set(audit.data.map((row) => row.action));
  assert(expected.every((action) => actions.has(action)), "audit_trail_complete");
}

function friendDocument(title) {
  const config = {
    choices: [
      { id: "plan", label: "새 계획부터 정하고 싶어요" },
      { id: "listen", label: "상황부터 충분히 듣고 싶어요" },
    ],
    contextLabel: "운영 검수 상황",
    description,
    expiredInviteDescription: "새로운 초대 링크를 만들어 주세요.",
    expiredInviteTitle: "초대 링크의 사용 기간이 지났어요",
    invalidInviteDescription: "링크를 다시 확인하거나 새 게임을 시작해 주세요.",
    invalidInviteTitle: "초대 링크를 확인할 수 없어요",
    invitationText: "내가 예상한 선택이 맞는지 확인해 주세요.",
    invitationTitle: "뉴앙 친구 성향 맞히기",
    predictionHeading: "친구라면 어떤 답을 고를까요?",
    question: "친구가 일정을 바꾸자고 할 때 나는 어떻게 반응할까요?",
    receiverHeading: "나는 실제로 어떤 답을 고를까요?",
    resultCopies: {
      bothDifferent: { description: "예상과 선택이 모두 달라요.", title: "새로운 차이를 발견했어요" },
      bothMatched: { description: "예상과 선택이 모두 같아요.", title: "서로를 정확히 알았어요" },
      choiceOnlyMatched: { description: "실제 선택이 같아요.", title: "예상 밖의 공통점을 찾았어요" },
      predictionOnlyMatched: { description: "친구의 예상을 맞혔어요.", title: "다른 선택까지 이해했어요" },
    },
    resultInsight: "한 장면의 선택을 계기로 서로의 이유를 이야기해 보세요.",
    senderHeading: "같은 상황에서 나는 어떻게 반응할까요?",
    title,
  };
  return {
    ageAccessPolicy: "all_ages",
    caption: description,
    category: "together",
    description,
    estimatedMinutes: 2,
    payload: { config },
    schemaVersion: 1,
    sensitivity: "general",
    slug,
    subtype: "friend_match",
    title,
  };
}

async function upsert({ accountId, document, entryId, expectedRevision, slugOverride }) {
  return rpc("admin_upsert_assessment_content", {
    target_admin_account_id: accountId,
    target_category: document.category,
    target_display_order: 100_000,
    target_document: document,
    target_entry_id: entryId,
    target_expected_revision: expectedRevision,
    target_slug: slugOverride ?? document.slug,
    target_source_origin: "operator",
    target_subtype: document.subtype,
    target_summary: document.description,
    target_title: document.title,
  });
}

async function manage(accountId, targetEntryId, action, note) {
  return rpc("admin_manage_assessment_content", {
    target_action: action,
    target_admin_account_id: accountId,
    target_entry_id: targetEntryId,
    target_note: note,
  });
}

async function reorder(accountId, entryIds, reason) {
  return rpc("admin_reorder_assessment_content", {
    target_admin_account_id: accountId,
    target_ordered_entry_ids: entryIds,
    target_reason: reason,
  });
}

async function rpc(name, payload) {
  const response = await client.rpc(name, payload);
  if (response.error) throw new Error(`${response.error.code ?? "database"}: ${response.error.message}`);
  return response.data;
}

async function expectRpcError({ name, operation, text }) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof Error && error.message.includes(text)) {
      checks.push(name);
      return;
    }
    throw error;
  }
  throw new Error(`${name}: expected ${text}, but operation succeeded`);
}

async function bestEffortArchive(targetEntryId) {
  try {
    const operator = await client
      .schema("identity")
      .from("operator_account")
      .select("account_id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();
    if (operator.data?.account_id) {
      await manage(operator.data.account_id, targetEntryId, "archive", "실패한 검수 기록 안전 보관");
    }
  } catch {}
}

function assert(condition, name) {
  if (!condition) throw new Error(`Assessment Studio REST smoke assertion failed: ${name}`);
  checks.push(name);
}

function throwIfError(error) {
  if (error) throw new Error(`${error.code ?? "database"}: ${error.message}`);
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
