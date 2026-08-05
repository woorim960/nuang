import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202607310001_together_balance_game_foundation.sql",
  "utf8",
);
const performanceMigration = readFileSync(
  "supabase/migrations/202608050001_together_balance_performance.sql",
  "utf8",
);
const serverImplementation = readFileSync(
  "src/features/together-balance/server.ts",
  "utf8",
);
const createRoute = readFileSync(
  "src/app/api/together/balance-game/rooms/route.ts",
  "utf8",
);
const previewRoute = readFileSync(
  "src/app/api/together/balance-game/rooms/[code]/preview/route.ts",
  "utf8",
);
const joinRoute = readFileSync(
  "src/app/api/together/balance-game/rooms/[code]/join/route.ts",
  "utf8",
);

describe("together balance game database contract", () => {
  it("keeps the new game separate from the legacy community poll domain", () => {
    expect(migration).toContain("create schema if not exists together_balance");
    expect(migration).toContain("'together_balance_room_share'");
    expect(migration).toContain("'together_balance_result_share'");
    expect(migration).toContain("create table together_balance.feed_share");
    expect(migration).toContain(
      "together_balance_feed_recruitment_boundary_violation",
    );
    expect(migration).toContain(
      "together_balance_feed_result_boundary_violation",
    );
    expect(migration).not.toContain("references feed.feed_poll");
  });

  it("versions content, recipes, and the exact item order for each room", () => {
    expect(migration).toContain(
      "create table together_balance.template_version",
    );
    expect(migration).toContain("create table together_balance.session_recipe");
    expect(migration).toContain("round_size smallint not null default 8");
    expect(migration).toContain("create table together_balance.round_item");
    expect(migration).toContain("unique (round_id, display_order)");
    expect(migration).toContain("together_balance_round_item_version_mismatch");
    expect(migration).toContain("unique (template_version_id, item_key)");
    expect(migration).toContain(
      "default_question_count in (8, 12, 16, 20, 24)",
    );
    expect(migration).toContain("'dilemma_fun'");
    expect(migration).toContain("'discovery_only'");
    expect(migration).not.toContain("default_question_count % 8");
  });

  it("enforces fixed 2-to-8-person small rooms", () => {
    expect(migration).toContain("target_participant_count between 2 and 8");
    expect(migration).toContain("hard_capacity = target_participant_count");
    expect(migration).toContain(
      "p_target_participant_count not between 2 and 8",
    );
    expect(migration).toContain(
      "create or replace function together_balance.resize_room",
    );
    expect(migration).toContain("together_balance_capacity_below_occupancy");
  });

  it("reserves seats atomically and expires abandoned reservations", () => {
    expect(migration).toContain(
      "create or replace function together_balance.reserve_seat",
    );
    expect(migration).toContain("for update;");
    expect(migration).toContain("status = 'expired'");
    expect(migration).toContain("now() + interval '15 minutes'");
    expect(migration).toContain("together_balance_room_full");
    expect(migration).toContain("create table together_balance.room_ban");
    expect(migration).toContain("together_balance_reentry_blocked");
    expect(migration).toContain(
      "create or replace function together_balance.confirm_seat",
    );
    expect(migration).toContain("together_balance_block_relationship");
    expect(migration).toContain("last_active_at");
    expect(migration).toContain("now() - interval '20 minutes'");
    expect(migration).toContain(
      "where response.participant_id = target_participant.id",
    );
    expect(migration).toContain(
      "v_participant.status in ('joined', 'completed')",
    );
  });

  it("rate-limits anonymous create, preview, and join traffic before service writes", () => {
    expect(migration).toContain("create table together_balance.request_budget");
    expect(migration).toContain(
      "create or replace function together_balance.consume_request_budget",
    );
    expect(migration).toContain("together_balance_rate_limited");
    expect(serverImplementation).toContain(
      "export async function enforceBalanceRequestRateLimit",
    );
    expect(serverImplementation).toContain('"create_room_short"');
    expect(serverImplementation).toContain('"preview_room_daily"');
    expect(serverImplementation).toContain('"join_room_daily"');
    expect(serverImplementation).not.toContain('get("x-forwarded-for")');
    expect(createRoute).toContain('action: "create_room"');
    expect(previewRoute).toContain('action: "preview_room"');
    expect(joinRoute).toContain('action: "join_room"');
  });

  it("keeps partial rooms hidden and repairs their deterministic question set", () => {
    expect(migration).toContain(
      "initialization_status text not null default 'pending'",
    );
    expect(migration).toContain(
      "create or replace function together_balance.mark_room_ready",
    );
    expect(migration).toContain("room.initialization_status = 'ready'");
    expect(serverImplementation).toContain(
      "readOwnedBalanceRoomForInitialization",
    );
    expect(serverImplementation).toContain("finishBalanceRoomInitialization");
    expect(serverImplementation).toContain(
      "balance:room:${roomId}:round:${round.roundNumber}",
    );
    expect(serverImplementation).toContain("const expectedItems");
    expect(serverImplementation).toContain(".insert(missingItems)");
  });

  it("stores only token digests and makes raw answer tables server-only", () => {
    expect(migration).toContain("join_code_hash ~ '^[0-9a-f]{64}$'");
    expect(migration).toContain("join_token_hash ~ '^[0-9a-f]{64}$'");
    expect(migration).not.toMatch(/\bjoin_code\s+text\b/);
    expect(migration).not.toMatch(/\bjoin_token\s+text\b/);
    expect(migration).toContain(
      "alter table together_balance.response enable row level security",
    );
    expect(migration).toContain(
      "revoke all on all tables in schema together_balance",
    );
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain(
      "grant select, insert, update, delete on all tables in schema together_balance",
    );
    expect(migration).toContain("to service_role");
    expect(migration).not.toMatch(
      /create policy[\s\S]{0,200}on together_balance\.response/i,
    );
  });

  it("makes response writes idempotent and locks completed answers", () => {
    expect(migration).toContain(
      "create or replace function together_balance.save_response",
    );
    expect(migration).toContain("unique (room_id, participant_id, item_id)");
    expect(migration).toContain("unique (participant_id, idempotency_key)");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain(
      "together_balance.response.client_sequence < excluded.client_sequence",
    );
    expect(migration).toContain("together_balance_completed_response_locked");
    expect(performanceMigration).toContain(
      "create or replace function together_balance.save_response_by_item_key",
    );
    expect(performanceMigration).toContain(
      "v_response_id := together_balance.save_response",
    );
    expect(serverImplementation).toContain('.rpc("save_response_by_item_key"');
  });

  it("opens current results at two completers and supports explicit finalization", () => {
    expect(migration).toContain(
      "result_min_completed smallint not null default 2",
    );
    expect(migration).toContain(
      "create table together_balance.round_completion",
    );
    expect(migration).toContain(
      "create or replace function together_balance.complete_round",
    );
    expect(migration).toContain(
      "create or replace function together_balance.finalize_room",
    );
    expect(migration).toContain(
      "create or replace function together_balance.complete_game",
    );
    expect(migration).toContain("v_answered_count <> v_question_count");
    expect(migration).toContain(
      "together_balance_not_enough_completed_participants",
    );
    expect(migration).toContain("result_status = 'final'");
    expect(performanceMigration).toContain(
      "create or replace function together_balance.complete_participant_game",
    );
    expect(performanceMigration).toContain(
      "perform together_balance.complete_round",
    );
    expect(performanceMigration).toContain(
      "perform together_balance.complete_game",
    );
  });

  it("stores reproducible group and pair result snapshots", () => {
    expect(migration).toContain(
      "create table together_balance.result_snapshot",
    );
    expect(migration).toContain("'pairwise_group_compatibility_v1'");
    expect(migration).toContain("'crowd_distribution_v1'");
    expect(migration).toContain(
      "pair_count = participant_count * (participant_count - 1) / 2",
    );
    expect(migration).toContain("create table together_balance.pair_result");
    expect(migration).toContain(
      "check (participant_low_id < participant_high_id)",
    );
    expect(serverImplementation).toContain(
      "async function persistLatestResultSnapshot",
    );
    expect(migration).toContain(
      "create or replace function together_balance.store_result_snapshot",
    );
    expect(serverImplementation).toContain('.rpc("store_result_snapshot"');
    expect(serverImplementation).toContain("participantSetHash");
    expect(migration).toContain("together_balance_result_snapshot_stale");
    expect(migration).toContain("p_participant_ids jsonb");
    expect(migration).toContain("together_balance_result_state_regression");
    expect(serverImplementation).toContain('.rpc("get_result_state"');
    expect(serverImplementation).toContain("applyStoredSnapshotToResult");
    expect(serverImplementation).toContain("loadBalancePackFromDatabase");
    expect(serverImplementation).toContain(
      "version:${release?.releaseId ?? pack.contentPoolVersion}:recipe:",
    );
    expect(serverImplementation).toContain("assessment_content_release_id");
    expect(serverImplementation).toContain(
      "balance:template-version:${templateVersionId}:item:",
    );
    expect(migration).toContain(
      "create or replace function together_balance.sync_result_feed_snapshot",
    );
    expect(migration).toContain(
      "perform together_balance.sync_result_feed_snapshot",
    );
  });

  it("returns room state without exposing another participant's responses", () => {
    expect(migration).toContain(
      "create or replace function together_balance.get_room_state",
    );
    expect(migration).toContain("'myResponses'");
    expect(migration).toContain("'roomName'");
    expect(migration).toContain("'ownerNickname'");
    expect(migration).toContain("'expiresAt'");
    expect(migration).toContain(
      "create or replace function together_balance.get_room_join_preview",
    );
    expect(migration).toContain(
      "create or replace function together_balance.get_result_state",
    );
    expect(migration).toContain("'myPairResults'");
    expect(migration).toContain(
      "pair_result.participant_low_id = p_participant_id",
    );
    expect(migration).toContain("response.participant_id = p_participant_id");
    expect(migration).not.toContain("'participantResponses'");
    expect(serverImplementation).toContain('resultStatus !== "waiting"');
    expect(performanceMigration).toContain(
      "v_participant_status <> 'completed'",
    );
    expect(migration).toContain("pair_visibility_consent = true");
    expect(migration).toContain("other_participant.pair_visibility_consent");
    expect(migration).toContain("and status = 'completed'");
    expect(performanceMigration).toContain("'packDescription'");
    expect(performanceMigration).toContain(
      "template_version.description_snapshot",
    );
  });

  it("keeps performance RPCs server-only and indexes hot room lookups", () => {
    expect(performanceMigration).toContain(
      "together_balance_round_item_room_order_idx",
    );
    expect(performanceMigration).toContain(
      "together_balance_round_completion_room_participant_idx",
    );
    expect(performanceMigration).toContain("from public, anon, authenticated");
    expect(performanceMigration).toContain("to service_role");
  });

  it("lets only the owner remove unfinished participants and blocks re-entry", () => {
    expect(migration).toContain(
      "create or replace function together_balance.remove_participant",
    );
    expect(migration).toContain("together_balance_owner_removal_forbidden");
    expect(migration).toContain(
      "together_balance_completed_participant_locked",
    );
    expect(migration).toContain("insert into together_balance.room_ban");
    expect(serverImplementation).toContain(
      "export async function removeBalanceParticipantOnServer",
    );
  });

  it("limits feed cards to anonymous, purpose-specific projections", () => {
    expect(migration).toContain(
      "create or replace function together_balance.guard_feed_projection",
    );
    expect(migration).toContain("'recruitmentStatus'");
    expect(migration).toContain("'resultStatus'");
    expect(migration).toContain(
      "together_balance_feed_projection_contains_private_key",
    );
    expect(migration).not.toMatch(
      /v_allowed_keys\s*:=\s*array\[[^\]]*nickname/i,
    );
    expect(migration).not.toMatch(
      /v_allowed_keys\s*:=\s*array\[[^\]]*optionKey/i,
    );
  });
});
