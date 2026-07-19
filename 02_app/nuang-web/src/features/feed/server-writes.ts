import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  ensureAccountForUser,
  type ServerWriteResult,
} from "@/features/account/server-writes";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";
import {
  getBalanceGameOption,
  getBalanceGameTemplate,
  getDailyQuestionTemplate,
} from "@/features/feed/feed-prompts";
import { feedItems } from "@/features/feed/feed-seed";
import type {
  FeedWriteFailureCode,
  FeedWriteSuccessInput,
} from "@/features/feed/feed-write-contract";
import {
  getSupportedNuangProfileName,
  isSupportedNuangCode,
} from "@/features/nuang-code/profile-name-resolution";

type ServiceClient = SupabaseClient;

type ReportShareProjection = {
  assessmentKind: "full" | "quick";
  completedAt: string;
  domains: Array<{
    domainId: string;
    label: string;
    score: number | null;
    symbol: string | null;
  }>;
  profileCode: string;
  profileName: string;
  resultLabel: string;
};

type NormalizedTarget =
  | {
      dbTargetType: "feed_post";
      id: string;
      key: null;
      postId: string;
    }
  | {
      dbTargetType: "feed_comment";
      id: string;
      key: null;
      postId: null;
    }
  | {
      dbTargetType: "feed_seed_card";
      id: null;
      key: string;
      postId: null;
    };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const feedSeedCardIds = new Set(feedItems.map((item) => item.id));

export async function writeFeedRequestForAccount({
  client,
  payload,
  user,
}: {
  client: ServiceClient;
  payload: FeedWriteRequest;
  user: User;
}): Promise<ServerWriteResult<FeedWriteSuccessInput, FeedWriteFailureCode>> {
  const account = await ensureAccountForUser(client, user);

  if (!account.ok) {
    return { code: "account_link_missing", ok: false };
  }

  if (payload.action === "create_post") {
    return writeFeedPost({ accountId: account.accountId, client, payload });
  }

  if (payload.action === "create_comment") {
    return writeFeedComment({ accountId: account.accountId, client, payload });
  }

  if (payload.action === "react") {
    return writeFeedReaction({ accountId: account.accountId, client, payload });
  }

  if (payload.action === "bookmark") {
    return writeFeedBookmark({ accountId: account.accountId, client, payload });
  }

  if (payload.action === "remove_reaction") {
    return removeFeedReaction({
      accountId: account.accountId,
      client,
      payload,
    });
  }

  if (payload.action === "remove_bookmark") {
    return removeFeedBookmark({
      accountId: account.accountId,
      client,
      payload,
    });
  }

  if (payload.action === "not_interested") {
    return writeFeedPreference({
      accountId: account.accountId,
      client,
      payload,
    });
  }

  return writePollVote({ accountId: account.accountId, client, payload });
}

async function writeFeedPost({
  accountId,
  client,
  payload,
}: {
  accountId: string;
  client: ServiceClient;
  payload: Extract<FeedWriteRequest, { action: "create_post" }>;
}): Promise<ServerWriteResult<FeedWriteSuccessInput, FeedWriteFailureCode>> {
  if (!isValidPostSourcePayload(payload)) {
    return { code: "feed_target_invalid", ok: false };
  }

  const publicProjection = await buildPostProjection({
    accountId,
    client,
    payload,
  });

  if (payload.source === "report_share" && !publicProjection.reportShare) {
    return { code: "feed_target_invalid", ok: false };
  }

  const response = await client
    .schema("feed")
    .from("feed_post")
    .insert({
      attachment_payload: payload.attachments ?? [],
      author_account_id: accountId,
      body: payload.body,
      moderation_status: "pending_review",
      public_projection_payload: publicProjection,
      source: payload.source,
      source_id: payload.sourceId ?? null,
      visibility: payload.visibility,
    })
    .select("id, moderation_status")
    .single();

  if (response.error || !response.data) {
    return {
      code: getFeedDbFailureCode(response.error, "feed_post_insert_failed"),
      ok: false,
    };
  }

  const row = response.data as {
    id: string;
    moderation_status: FeedWriteSuccessInput["moderationStatus"];
  };

  if (payload.source === "balance_game") {
    const pollResult = await writeBalanceGamePoll({
      accountId,
      client,
      payload,
      postId: row.id,
    });

    if (!pollResult.ok) {
      return pollResult;
    }
  }

  return {
    data: {
      action: payload.action,
      id: row.id,
      moderationStatus: row.moderation_status,
      targetType: "feed_post",
    },
    ok: true,
  };
}

async function writeBalanceGamePoll({
  accountId,
  client,
  payload,
  postId,
}: {
  accountId: string;
  client: ServiceClient;
  payload: Extract<FeedWriteRequest, { action: "create_post" }>;
  postId: string;
}): Promise<ServerWriteResult<{ id: string }, FeedWriteFailureCode>> {
  const template = getBalanceGameTemplate(payload.sourceId);

  if (!template) {
    return { code: "feed_target_invalid", ok: false };
  }

  const selectedOption = getBalanceGameOption(template, payload.pollOptionKey);

  if (!selectedOption) {
    return { code: "feed_target_invalid", ok: false };
  }

  const pollResponse = await client
    .schema("feed")
    .from("feed_poll")
    .insert({
      post_id: postId,
      prompt_id: template.id,
      question: template.question,
      status: "active",
    })
    .select("id")
    .single();

  if (pollResponse.error || !pollResponse.data) {
    return {
      code: getFeedDbFailureCode(pollResponse.error, "feed_poll_write_failed"),
      ok: false,
    };
  }

  const poll = pollResponse.data as { id: string };
  const optionRows = template.options.map((option, index) => ({
    label: option.label,
    option_key: option.key,
    poll_id: poll.id,
    sort_order: index + 1,
  }));
  const optionResponse = await client
    .schema("feed")
    .from("feed_poll_option")
    .insert(optionRows)
    .select("id, option_key")
    .order("sort_order", { ascending: true });

  if (optionResponse.error || !optionResponse.data) {
    return {
      code: getFeedDbFailureCode(
        optionResponse.error,
        "feed_poll_write_failed",
      ),
      ok: false,
    };
  }

  const selectedCreatedOption = (
    optionResponse.data as Array<{
      id: string;
      option_key: string;
    }>
  ).find((option) => option.option_key === selectedOption.key);

  if (!selectedCreatedOption) {
    return { code: "feed_poll_write_failed", ok: false };
  }

  const voteResult = await insertPollVote({
    accountId,
    client,
    optionId: selectedCreatedOption.id,
    pollId: poll.id,
  });

  if (!voteResult.ok) {
    return voteResult;
  }

  return {
    data: {
      id: poll.id,
    },
    ok: true,
  };
}

async function writeFeedComment({
  accountId,
  client,
  payload,
}: {
  accountId: string;
  client: ServiceClient;
  payload: Extract<FeedWriteRequest, { action: "create_comment" }>;
}): Promise<ServerWriteResult<FeedWriteSuccessInput, FeedWriteFailureCode>> {
  const target = normalizeTarget(payload.target);

  if (!target.ok) {
    return { code: target.code, ok: false };
  }

  if (target.data.dbTargetType === "feed_comment") {
    return { code: "feed_target_not_supported", ok: false };
  }

  const response = await client
    .schema("feed")
    .from("feed_comment")
    .insert({
      author_account_id: accountId,
      body: payload.body,
      moderation_status: "pending_review",
      post_id: target.data.postId,
      target_key: target.data.key,
      target_type: target.data.dbTargetType,
    })
    .select("id, moderation_status")
    .single();

  if (response.error || !response.data) {
    return {
      code: getFeedDbFailureCode(response.error, "feed_comment_insert_failed"),
      ok: false,
    };
  }

  const row = response.data as {
    id: string;
    moderation_status: FeedWriteSuccessInput["moderationStatus"];
  };

  return {
    data: {
      action: payload.action,
      id: row.id,
      moderationStatus: row.moderation_status,
      targetType: target.data.dbTargetType,
    },
    ok: true,
  };
}

async function writeFeedReaction({
  accountId,
  client,
  payload,
}: {
  accountId: string;
  client: ServiceClient;
  payload: Extract<FeedWriteRequest, { action: "react" }>;
}): Promise<ServerWriteResult<FeedWriteSuccessInput, FeedWriteFailureCode>> {
  const target = normalizeTarget(payload.target);

  if (!target.ok) {
    return { code: target.code, ok: false };
  }

  const row = {
    account_id: accountId,
    reaction: payload.reaction,
    target_id: target.data.id,
    target_key: target.data.key,
    target_type: target.data.dbTargetType,
  };
  const response = await insertOrReadExisting({
    client,
    failureCode: "feed_reaction_write_failed",
    row,
    restoreExisting: (id) =>
      restoreExistingFeedAction({
        client,
        id,
        table: "feed_reaction",
      }),
    selectActiveExisting: () =>
      buildExistingReactionQuery({
        accountId,
        client,
        includeDeleted: false,
        reaction: payload.reaction,
        target: target.data,
      }),
    selectRestorableExisting: () =>
      buildExistingReactionQuery({
        accountId,
        client,
        includeDeleted: true,
        reaction: payload.reaction,
        target: target.data,
      }),
    table: "feed_reaction",
  });

  if (!response.ok) return response;

  return {
    data: {
      action: payload.action,
      id: response.data.id,
      targetType: target.data.dbTargetType,
    },
    ok: true,
  };
}

async function writeFeedBookmark({
  accountId,
  client,
  payload,
}: {
  accountId: string;
  client: ServiceClient;
  payload: Extract<FeedWriteRequest, { action: "bookmark" }>;
}): Promise<ServerWriteResult<FeedWriteSuccessInput, FeedWriteFailureCode>> {
  const target = normalizeTarget(payload.target);

  if (!target.ok) {
    return { code: target.code, ok: false };
  }

  const normalizedTarget = target.data;

  if (normalizedTarget.dbTargetType === "feed_comment") {
    return { code: "feed_target_not_supported", ok: false };
  }

  const row = {
    account_id: accountId,
    post_id: normalizedTarget.postId,
    target_key: normalizedTarget.key,
    target_type: normalizedTarget.dbTargetType,
  };
  const response = await insertOrReadExisting({
    client,
    failureCode: "feed_bookmark_write_failed",
    row,
    restoreExisting: (id) =>
      restoreExistingFeedAction({
        client,
        id,
        table: "feed_bookmark",
      }),
    selectActiveExisting: () =>
      buildExistingBookmarkQuery({
        accountId,
        client,
        includeDeleted: false,
        target: normalizedTarget,
      }),
    selectRestorableExisting: () =>
      buildExistingBookmarkQuery({
        accountId,
        client,
        includeDeleted: true,
        target: normalizedTarget,
      }),
    table: "feed_bookmark",
  });

  if (!response.ok) return response;

  return {
    data: {
      action: payload.action,
      id: response.data.id,
      targetType: normalizedTarget.dbTargetType,
    },
    ok: true,
  };
}

async function removeFeedReaction({
  accountId,
  client,
  payload,
}: {
  accountId: string;
  client: ServiceClient;
  payload: Extract<FeedWriteRequest, { action: "remove_reaction" }>;
}): Promise<ServerWriteResult<FeedWriteSuccessInput, FeedWriteFailureCode>> {
  const target = normalizeTarget(payload.target);

  if (!target.ok) {
    return { code: target.code, ok: false };
  }

  const response = await updateExistingFeedAction({
    accountId,
    client,
    failureCode: "feed_reaction_remove_failed",
    reaction: payload.reaction,
    table: "feed_reaction",
    target: target.data,
  });

  if (!response.ok) return response;

  return {
    data: {
      action: payload.action,
      id: response.data.id,
      targetType: target.data.dbTargetType,
    },
    ok: true,
  };
}

async function removeFeedBookmark({
  accountId,
  client,
  payload,
}: {
  accountId: string;
  client: ServiceClient;
  payload: Extract<FeedWriteRequest, { action: "remove_bookmark" }>;
}): Promise<ServerWriteResult<FeedWriteSuccessInput, FeedWriteFailureCode>> {
  const target = normalizeTarget(payload.target);

  if (!target.ok) {
    return { code: target.code, ok: false };
  }

  if (target.data.dbTargetType === "feed_comment") {
    return { code: "feed_target_not_supported", ok: false };
  }

  const response = await updateExistingFeedAction({
    accountId,
    client,
    failureCode: "feed_bookmark_remove_failed",
    table: "feed_bookmark",
    target: target.data,
  });

  if (!response.ok) return response;

  return {
    data: {
      action: payload.action,
      id: response.data.id,
      targetType: target.data.dbTargetType,
    },
    ok: true,
  };
}

async function writeFeedPreference({
  accountId,
  client,
  payload,
}: {
  accountId: string;
  client: ServiceClient;
  payload: Extract<FeedWriteRequest, { action: "not_interested" }>;
}): Promise<ServerWriteResult<FeedWriteSuccessInput, FeedWriteFailureCode>> {
  const target = normalizeTarget(payload.target);

  if (!target.ok) {
    return { code: target.code, ok: false };
  }

  if (target.data.dbTargetType === "feed_comment") {
    return { code: "feed_target_not_supported", ok: false };
  }

  const response = await insertOrReadExistingPreference({
    accountId,
    client,
    target: target.data,
  });

  if (!response.ok) return response;

  return {
    data: {
      action: payload.action,
      id: response.data.id,
      targetType: target.data.dbTargetType,
    },
    ok: true,
  };
}

async function writePollVote({
  accountId,
  client,
  payload,
}: {
  accountId: string;
  client: ServiceClient;
  payload: Extract<FeedWriteRequest, { action: "vote_poll" }>;
}): Promise<ServerWriteResult<FeedWriteSuccessInput, FeedWriteFailureCode>> {
  const response = await insertPollVote({
    accountId,
    client,
    optionId: payload.optionId,
    pollId: payload.pollId,
  });

  if (!response.ok) return response;

  return {
    data: {
      action: payload.action,
      id: response.data.id,
      targetType: "feed_poll",
    },
    ok: true,
  };
}

async function insertPollVote({
  accountId,
  client,
  optionId,
  pollId,
}: {
  accountId: string;
  client: ServiceClient;
  optionId: string;
  pollId: string;
}): Promise<ServerWriteResult<{ id: string }, FeedWriteFailureCode>> {
  const profile = await readCurrentNuangCodeSnapshot({ accountId, client });
  const response = await client
    .schema("feed")
    .from("feed_poll_vote")
    .insert({
      account_id: accountId,
      nuang_code: profile.code,
      option_id: optionId,
      poll_id: pollId,
      profile_name: profile.name,
    })
    .select("id")
    .single();

  if (!response.error && response.data) {
    return {
      data: response.data as { id: string },
      ok: true,
    };
  }

  if (response.error?.code !== "23505") {
    return {
      code: getFeedDbFailureCode(response.error, "feed_poll_vote_write_failed"),
      ok: false,
    };
  }

  const existing = await client
    .schema("feed")
    .from("feed_poll_vote")
    .select("id")
    .eq("account_id", accountId)
    .eq("poll_id", pollId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing.error || !existing.data) {
    return {
      code: getFeedDbFailureCode(existing.error, "feed_poll_vote_write_failed"),
      ok: false,
    };
  }

  return {
    data: existing.data as { id: string },
    ok: true,
  };
}

async function readCurrentNuangCodeSnapshot({
  accountId,
  client,
}: {
  accountId: string;
  client: ServiceClient;
}) {
  const publicSnapshotResponse = await client
    .schema("profile")
    .from("profile_public_snapshot")
    .select("snapshot_payload")
    .eq("account_id", accountId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const publicSnapshotProfile = parseNuangCodeFromPublicSnapshot(
    publicSnapshotResponse.data
      ? (publicSnapshotResponse.data as { snapshot_payload?: unknown })
          .snapshot_payload
      : null,
  );

  if (publicSnapshotProfile.code) {
    return publicSnapshotProfile;
  }

  const reportResponse = await client
    .schema("report")
    .from("result_report")
    .select("profile_code, profile_name")
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reportResponse.data) {
    const report = reportResponse.data as {
      profile_code?: unknown;
      profile_name?: unknown;
    };
    const code =
      typeof report.profile_code === "string" ? report.profile_code : null;

    if (isSupportedNuangCode(code)) {
      return {
        code,
        name:
          typeof report.profile_name === "string" && report.profile_name.trim()
            ? report.profile_name.trim()
            : getSupportedNuangProfileName(code),
      };
    }
  }

  return {
    code: null,
    name: null,
  };
}

function parseNuangCodeFromPublicSnapshot(value: unknown) {
  if (!value || typeof value !== "object") {
    return {
      code: null,
      name: null,
    };
  }

  const snapshot = value as {
    profile?: {
      code?: unknown;
      name?: unknown;
    };
  };
  const code =
    typeof snapshot.profile?.code === "string" ? snapshot.profile.code : null;

  if (!isSupportedNuangCode(code)) {
    return {
      code: null,
      name: null,
    };
  }

  return {
    code,
    name:
      typeof snapshot.profile?.name === "string" && snapshot.profile.name.trim()
        ? snapshot.profile.name.trim()
        : getSupportedNuangProfileName(code),
  };
}

function normalizeTarget(
  target: FeedWriteRequestTarget,
):
  | { data: NormalizedTarget; ok: true }
  | { code: "feed_target_invalid"; ok: false } {
  if (target.type === "feed_seed_card") {
    if (!feedSeedCardIds.has(target.id)) {
      return { code: "feed_target_invalid", ok: false };
    }

    return {
      data: {
        dbTargetType: "feed_seed_card",
        id: null,
        key: target.id,
        postId: null,
      },
      ok: true,
    };
  }

  if (!uuidPattern.test(target.id)) {
    return { code: "feed_target_invalid", ok: false };
  }

  if (target.type === "feed_comment") {
    return {
      data: {
        dbTargetType: "feed_comment",
        id: target.id,
        key: null,
        postId: null,
      },
      ok: true,
    };
  }

  return {
    data: {
      dbTargetType: "feed_post",
      id: target.id,
      key: null,
      postId: target.id,
    },
    ok: true,
  };
}

async function insertOrReadExisting({
  client,
  failureCode,
  restoreExisting,
  row,
  selectActiveExisting,
  selectRestorableExisting,
  table,
}: {
  client: ServiceClient;
  failureCode: "feed_bookmark_write_failed" | "feed_reaction_write_failed";
  restoreExisting: (id: string) => PromiseLike<{
    data: unknown;
    error: { code?: string; message?: string } | null;
  }>;
  row: Record<string, unknown>;
  selectActiveExisting: () => PromiseLike<{
    data: unknown;
    error: { code?: string; message?: string } | null;
  }>;
  selectRestorableExisting: () => PromiseLike<{
    data: unknown;
    error: { code?: string; message?: string } | null;
  }>;
  table: "feed_bookmark" | "feed_reaction";
}): Promise<ServerWriteResult<{ id: string }, FeedWriteFailureCode>> {
  const response = await client
    .schema("feed")
    .from(table)
    .insert(row)
    .select("id")
    .single();

  if (!response.error && response.data) {
    return {
      data: response.data as { id: string },
      ok: true,
    };
  }

  if (response.error?.code !== "23505") {
    return {
      code: getFeedDbFailureCode(response.error, failureCode),
      ok: false,
    };
  }

  const existing = await selectActiveExisting();

  if (!existing.error && existing.data) {
    return {
      data: existing.data as { id: string },
      ok: true,
    };
  }

  const restorable = await selectRestorableExisting();
  const rowToRestore = restorable.data as {
    deleted_at?: string | null;
    id: string;
  } | null;

  if (restorable.error || !rowToRestore?.deleted_at) {
    return {
      code: getFeedDbFailureCode(restorable.error, failureCode),
      ok: false,
    };
  }

  const restored = await restoreExisting(rowToRestore.id);

  if (restored.error || !restored.data) {
    return {
      code: getFeedDbFailureCode(restored.error, failureCode),
      ok: false,
    };
  }

  return {
    data: restored.data as { id: string },
    ok: true,
  };
}

async function updateExistingFeedAction({
  accountId,
  client,
  failureCode,
  reaction,
  table,
  target,
}: {
  accountId: string;
  client: ServiceClient;
  failureCode: "feed_bookmark_remove_failed" | "feed_reaction_remove_failed";
  reaction?: string;
  table: "feed_bookmark" | "feed_reaction";
  target: NormalizedTarget;
}): Promise<ServerWriteResult<{ id: string }, FeedWriteFailureCode>> {
  const query = client
    .schema("feed")
    .from(table)
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq("account_id", accountId)
    .eq("target_type", target.dbTargetType)
    .is("deleted_at", null);

  if (table === "feed_reaction" && reaction) {
    query.eq("reaction", reaction);
  }

  const response =
    target.dbTargetType === "feed_seed_card"
      ? await query.eq("target_key", target.key).select("id").maybeSingle()
      : await query
          .eq(table === "feed_bookmark" ? "post_id" : "target_id", target.id)
          .select("id")
          .maybeSingle();

  if (response.error) {
    return {
      code: getFeedDbFailureCode(response.error, failureCode),
      ok: false,
    };
  }

  return {
    data: {
      id:
        (response.data as { id?: string } | null)?.id ??
        target.key ??
        target.id ??
        "",
    },
    ok: true,
  };
}

async function insertOrReadExistingPreference({
  accountId,
  client,
  target,
}: {
  accountId: string;
  client: ServiceClient;
  target: Extract<
    NormalizedTarget,
    { dbTargetType: "feed_post" | "feed_seed_card" }
  >;
}): Promise<ServerWriteResult<{ id: string }, FeedWriteFailureCode>> {
  const row = {
    account_id: accountId,
    preference: "not_interested",
    target_id: target.id,
    target_key: target.key,
    target_type: target.dbTargetType,
  };
  const response = await client
    .schema("feed")
    .from("feed_preference")
    .insert(row)
    .select("id")
    .single();

  if (!response.error && response.data) {
    return {
      data: response.data as { id: string },
      ok: true,
    };
  }

  if (response.error?.code !== "23505") {
    return {
      code: getFeedDbFailureCode(
        response.error,
        "feed_preference_write_failed",
      ),
      ok: false,
    };
  }

  const existing = await buildExistingPreferenceQuery({
    accountId,
    client,
    target,
  });

  if (existing.error || !existing.data) {
    return {
      code: getFeedDbFailureCode(
        existing.error,
        "feed_preference_write_failed",
      ),
      ok: false,
    };
  }

  return {
    data: existing.data as { id: string },
    ok: true,
  };
}

function restoreExistingFeedAction({
  client,
  id,
  table,
}: {
  client: ServiceClient;
  id: string;
  table: "feed_bookmark" | "feed_reaction";
}) {
  return client
    .schema("feed")
    .from(table)
    .update({
      deleted_at: null,
    })
    .eq("id", id)
    .select("id")
    .single();
}

function getFeedDbFailureCode(
  error: { code?: string; message?: string } | null,
  fallback: FeedWriteFailureCode,
): FeedWriteFailureCode {
  if (error?.code === "PGRST106") {
    return "feed_schema_not_available";
  }

  if (error?.code === "42501") {
    return "feed_schema_permission_missing";
  }

  return fallback;
}

function buildExistingReactionQuery({
  accountId,
  client,
  includeDeleted,
  reaction,
  target,
}: {
  accountId: string;
  client: ServiceClient;
  includeDeleted: boolean;
  reaction: string;
  target: NormalizedTarget;
}) {
  const query = client
    .schema("feed")
    .from("feed_reaction")
    .select("id, deleted_at")
    .eq("account_id", accountId)
    .eq("reaction", reaction)
    .eq("target_type", target.dbTargetType);

  if (!includeDeleted) {
    query.is("deleted_at", null);
  }

  if (target.dbTargetType === "feed_seed_card") {
    return query.eq("target_key", target.key).maybeSingle();
  }

  return query.eq("target_id", target.id).maybeSingle();
}

function buildExistingBookmarkQuery({
  accountId,
  client,
  includeDeleted,
  target,
}: {
  accountId: string;
  client: ServiceClient;
  includeDeleted: boolean;
  target: Extract<
    NormalizedTarget,
    { dbTargetType: "feed_post" | "feed_seed_card" }
  >;
}) {
  const query = client
    .schema("feed")
    .from("feed_bookmark")
    .select("id, deleted_at")
    .eq("account_id", accountId)
    .eq("target_type", target.dbTargetType);

  if (!includeDeleted) {
    query.is("deleted_at", null);
  }

  if (target.dbTargetType === "feed_seed_card") {
    return query.eq("target_key", target.key).maybeSingle();
  }

  return query.eq("post_id", target.postId).maybeSingle();
}

function buildExistingPreferenceQuery({
  accountId,
  client,
  target,
}: {
  accountId: string;
  client: ServiceClient;
  target: Extract<
    NormalizedTarget,
    { dbTargetType: "feed_post" | "feed_seed_card" }
  >;
}) {
  const query = client
    .schema("feed")
    .from("feed_preference")
    .select("id")
    .eq("account_id", accountId)
    .eq("preference", "not_interested")
    .eq("target_type", target.dbTargetType)
    .is("deleted_at", null);

  if (target.dbTargetType === "feed_seed_card") {
    return query.eq("target_key", target.key).maybeSingle();
  }

  return query.eq("target_id", target.id).maybeSingle();
}

async function buildPostProjection({
  accountId,
  client,
  payload,
}: {
  accountId: string;
  client: ServiceClient;
  payload: Extract<FeedWriteRequest, { action: "create_post" }>;
}) {
  const dailyQuestion =
    payload.source === "daily_question"
      ? getDailyQuestionTemplate(payload.sourceId)
      : null;
  const balanceGame =
    payload.source === "balance_game"
      ? getBalanceGameTemplate(payload.sourceId)
      : null;
  const reportShare =
    payload.source === "report_share"
      ? await readReportShareProjection({ accountId, client, payload })
      : null;

  return {
    attachmentTypes: payload.attachments?.map((item) => item.type) ?? [],
    bodyPreview: payload.body.slice(0, 160),
    dailyQuestion: dailyQuestion
      ? {
          prompt: dailyQuestion.prompt,
          promptId: dailyQuestion.id,
          version: dailyQuestion.version,
        }
      : null,
    balanceGame: balanceGame
      ? {
          promptId: balanceGame.id,
          question: balanceGame.question,
          selectedOptionKey: payload.pollOptionKey ?? null,
          version: balanceGame.version,
        }
      : null,
    reportShare,
    source: payload.source,
    sourceId: payload.sourceId ?? null,
  };
}

async function readReportShareProjection({
  accountId,
  client,
  payload,
}: {
  accountId: string;
  client: ServiceClient;
  payload: Extract<FeedWriteRequest, { action: "create_post" }>;
}): Promise<ReportShareProjection | null> {
  const resultReportId = payload.attachments?.find(
    (attachment) => attachment.type === "result_summary",
  )?.id;

  if (!resultReportId || !uuidPattern.test(resultReportId)) {
    return null;
  }

  const response = await client
    .schema("report")
    .from("result_report")
    .select("id, report_kind, profile_code, profile_name, share_summary")
    .eq("id", resultReportId)
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .maybeSingle();

  if (response.error || !response.data) {
    return null;
  }

  const row = response.data as {
    profile_code?: unknown;
    profile_name?: unknown;
    report_kind?: unknown;
    share_summary?: unknown;
  };
  const shareSummary = parseReportShareSummary(row.share_summary);
  const profileCode =
    typeof row.profile_code === "string" && row.profile_code.trim()
      ? row.profile_code.trim()
      : shareSummary?.profileCode;

  if (!profileCode) {
    return null;
  }

  return {
    assessmentKind:
      row.report_kind === "quick" || row.report_kind === "full"
        ? row.report_kind
        : (shareSummary?.assessmentKind ?? "full"),
    completedAt: shareSummary?.completedAt ?? "",
    domains: shareSummary?.domains ?? [],
    profileCode,
    profileName:
      getSupportedNuangProfileName(profileCode) ??
      (typeof row.profile_name === "string" && row.profile_name.trim()
        ? row.profile_name.trim()
        : (shareSummary?.profileName ?? "뉴앙 리포트")),
    resultLabel: shareSummary?.resultLabel ?? "뉴앙 리포트",
  };
}

function parseReportShareSummary(value: unknown): ReportShareProjection | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const summary = value as {
    assessmentKind?: unknown;
    completedAt?: unknown;
    domains?: unknown;
    profileCode?: unknown;
    profileName?: unknown;
    resultLabel?: unknown;
  };

  return {
    assessmentKind:
      summary.assessmentKind === "quick" || summary.assessmentKind === "full"
        ? summary.assessmentKind
        : "full",
    completedAt:
      typeof summary.completedAt === "string" ? summary.completedAt : "",
    domains: Array.isArray(summary.domains)
      ? summary.domains.slice(0, 5).flatMap((domain) => {
          if (!domain || typeof domain !== "object") return [];
          const item = domain as {
            domainId?: unknown;
            label?: unknown;
            score?: unknown;
            symbol?: unknown;
          };

          if (
            typeof item.domainId !== "string" ||
            typeof item.label !== "string"
          ) {
            return [];
          }

          return [
            {
              domainId: item.domainId,
              label: item.label,
              score: typeof item.score === "number" ? item.score : null,
              symbol: typeof item.symbol === "string" ? item.symbol : null,
            },
          ];
        })
      : [],
    profileCode:
      typeof summary.profileCode === "string" ? summary.profileCode : "",
    profileName:
      typeof summary.profileName === "string"
        ? summary.profileName
        : "뉴앙 리포트",
    resultLabel:
      typeof summary.resultLabel === "string"
        ? summary.resultLabel
        : "뉴앙 리포트",
  };
}

function isValidPostSourcePayload(
  payload: Extract<FeedWriteRequest, { action: "create_post" }>,
) {
  if (payload.source === "daily_question") {
    return Boolean(getDailyQuestionTemplate(payload.sourceId));
  }

  if (payload.source === "balance_game") {
    const template = getBalanceGameTemplate(payload.sourceId);

    return Boolean(
      template && getBalanceGameOption(template, payload.pollOptionKey),
    );
  }

  if (payload.source === "report_share") {
    return Boolean(
      payload.attachments?.some(
        (attachment) => attachment.type === "result_summary",
      ),
    );
  }

  return !payload.pollOptionKey;
}

type FeedWriteRequestTarget = Extract<
  FeedWriteRequest,
  {
    action:
      | "bookmark"
      | "create_comment"
      | "react"
      | "remove_bookmark"
      | "remove_reaction"
      | "not_interested";
  }
>["target"];
