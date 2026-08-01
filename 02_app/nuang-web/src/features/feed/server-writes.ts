import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  ensureAccountForUser,
  type ServerWriteResult,
} from "@/features/account/server-writes";
import { sendAdminReviewNotification } from "@/features/admin/server-admin-review-notification";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";
import { isUserManageableFeedPostSource } from "@/features/feed/feed-post-management";
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
  persistExternalLinks,
  prepareExternalLinks,
  replaceExternalLinksForPost,
} from "@/features/feed/server-link-safety";
import {
  checkCommunityWriteGuard,
  type CommunityWriteGuardCode,
} from "@/features/feed/server-write-guard";
import {
  getCurrentNuangProfileName,
  isCurrentNuangCode,
} from "@/features/nuang-code/profile-name-resolution";
import {
  parseProfileReportKey,
  type ProfileReportKind,
} from "@/features/public-profile/profile-report-contract";
import {
  readOriginalProfileReport,
  resolveProfileOwnerAccountId,
  type OriginalProfileReport,
} from "@/features/public-profile/server-profile-reports";

type ServiceClient = SupabaseClient;

type ReportShareProjection = {
  assessmentKind: "full" | "quick";
  assessmentTitle?: string;
  completedAt: string;
  domains: Array<{
    domainId: string;
    label: string;
    score: number | null;
    symbol: string | null;
  }>;
  profileId?: string;
  profileCode: string;
  profileName: string;
  reportKey?: string;
  reportType?: ProfileReportKind;
  resultLabel: string;
  summary?: string;
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

  if (payload.action === "update_post") {
    return updateFeedPost({ accountId: account.accountId, client, payload });
  }

  if (payload.action === "delete_post") {
    return deleteFeedPost({ accountId: account.accountId, client, payload });
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

  if (payload.action === "report_content") {
    return writeFeedContentReport({
      accountId: account.accountId,
      client,
      payload,
    });
  }

  return writePollVote({ accountId: account.accountId, client, payload });
}

async function updateFeedPost({
  accountId,
  client,
  payload,
}: {
  accountId: string;
  client: ServiceClient;
  payload: Extract<FeedWriteRequest, { action: "update_post" }>;
}): Promise<ServerWriteResult<FeedWriteSuccessInput, FeedWriteFailureCode>> {
  const existingResponse = await client
    .schema("feed")
    .from("feed_post")
    .select(
      "id,source,source_id,attachment_payload,public_projection_payload,published_at",
    )
    .eq("id", payload.postId)
    .eq("author_account_id", accountId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingResponse.error) {
    return {
      code: getFeedDbFailureCode(
        existingResponse.error,
        "feed_post_update_failed",
      ),
      ok: false,
    };
  }

  if (!existingResponse.data) {
    return { code: "feed_target_invalid", ok: false };
  }

  const existing = existingResponse.data as {
    attachment_payload: unknown;
    id: string;
    public_projection_payload: unknown;
    published_at: string | null;
    source: string;
    source_id: string | null;
  };

  if (!isUserManageableFeedPostSource(existing.source)) {
    return { code: "feed_target_not_supported", ok: false };
  }

  if (payload.poll && existing.source !== "balance_game") {
    return { code: "feed_target_invalid", ok: false };
  }

  if (
    payload.sourceId &&
    (existing.source !== "free_text" ||
      !isValidQuestionAudienceSourceId(payload.sourceId))
  ) {
    return { code: "feed_target_invalid", ok: false };
  }

  if (
    payload.sourceId &&
    existing.source_id &&
    payload.sourceId !== existing.source_id
  ) {
    const replyResponse = await client
      .schema("feed")
      .from("feed_comment")
      .select("id", { count: "exact", head: true })
      .eq("post_id", payload.postId)
      .is("deleted_at", null);

    if (replyResponse.error) {
      return {
        code: getFeedDbFailureCode(
          replyResponse.error,
          "feed_post_update_failed",
        ),
        ok: false,
      };
    }
    if ((replyResponse.count ?? 0) > 0) {
      return { code: "feed_question_audience_locked", ok: false };
    }
  }

  if (!payload.body && existing.source !== "balance_game") {
    const mediaResponse = await client
      .schema("feed")
      .from("feed_post_media")
      .select("id", { count: "exact", head: true })
      .eq("post_id", payload.postId)
      .is("deleted_at", null);
    const hasFallbackMedia =
      Array.isArray(existing.attachment_payload) &&
      existing.attachment_payload.length > 0;

    if (
      mediaResponse.error &&
      !isMissingFeedMediaTable(mediaResponse.error) &&
      !hasFallbackMedia
    ) {
      return { code: "feed_post_update_failed", ok: false };
    }

    if (!hasFallbackMedia && (mediaResponse.count ?? 0) === 0) {
      return { code: "feed_target_invalid", ok: false };
    }
  }

  const moderationText = createPostModerationText(payload);
  const guardFailure = await checkCommunityWriteGuard({
    accountId,
    action: "create_post",
    body: moderationText,
    client,
  });
  if (guardFailure) {
    return { code: mapCommunityGuardFailure(guardFailure), ok: false };
  }

  const externalLinks = await prepareExternalLinks({
    client,
    text: moderationText,
  });
  if (externalLinks.some((link) => link.status === "blocked")) {
    return { code: "feed_external_link_blocked", ok: false };
  }

  const moderationStatus = externalLinks.some(
    (link) => link.status === "pending",
  )
    ? "pending_review"
    : "published";
  const existingProjection =
    existing.public_projection_payload &&
    typeof existing.public_projection_payload === "object" &&
    !Array.isArray(existing.public_projection_payload)
      ? existing.public_projection_payload
      : {};
  const publicProjection = {
    ...existingProjection,
    ...(payload.poll
      ? {
          balanceGame: {
            promptId: existing.source_id ?? "user_balance_game",
            question: payload.poll.question,
            selectedOptionKey: null,
            version: "user-balance-game.v1",
          },
        }
      : {}),
    sourceId: payload.sourceId ?? existing.source_id,
    topic: {
      category: payload.topic?.category ?? null,
      source: payload.topic?.source ?? "manual",
      tags: payload.topic?.tags ?? [],
    },
  };
  if (payload.poll) {
    const pollUpdate = await updateBalanceGamePollContent({
      client,
      poll: payload.poll,
      postId: payload.postId,
    });
    if (!pollUpdate.ok) return pollUpdate;
  }

  const sharedUpdate = {
    body: payload.body,
    limited_at: null,
    moderation_status: moderationStatus,
    public_projection_payload: publicProjection,
    published_at:
      moderationStatus === "published"
        ? (existing.published_at ?? new Date().toISOString())
        : null,
    removed_at: null,
    source_id: payload.sourceId ?? existing.source_id,
    visibility: payload.visibility,
  };
  let updateResponse = await client
    .schema("feed")
    .from("feed_post")
    .update({
      ...sharedUpdate,
      topic_category: payload.topic?.category ?? null,
      topic_source: payload.topic?.source ?? "manual",
      topic_tags: payload.topic?.tags ?? [],
    })
    .eq("id", payload.postId)
    .eq("author_account_id", accountId)
    .is("deleted_at", null)
    .select("id,moderation_status")
    .single();

  if (isMissingFeedTopicColumns(updateResponse.error)) {
    updateResponse = await client
      .schema("feed")
      .from("feed_post")
      .update(sharedUpdate)
      .eq("id", payload.postId)
      .eq("author_account_id", accountId)
      .is("deleted_at", null)
      .select("id,moderation_status")
      .single();
  }

  if (updateResponse.error || !updateResponse.data) {
    return {
      code: getFeedDbFailureCode(
        updateResponse.error,
        "feed_post_update_failed",
      ),
      ok: false,
    };
  }

  await replaceExternalLinksForPost({
    client,
    links: externalLinks,
    postId: payload.postId,
  });

  const row = updateResponse.data as {
    id: string;
    moderation_status: FeedWriteSuccessInput["moderationStatus"];
  };
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

async function updateBalanceGamePollContent({
  client,
  poll,
  postId,
}: {
  client: ServiceClient;
  poll: NonNullable<
    Extract<FeedWriteRequest, { action: "update_post" }>["poll"]
  >;
  postId: string;
}): Promise<ServerWriteResult<{ id: string }, FeedWriteFailureCode>> {
  const pollResponse = await client
    .schema("feed")
    .from("feed_poll")
    .select("id,status")
    .eq("post_id", postId)
    .is("deleted_at", null)
    .maybeSingle();

  if (pollResponse.error || !pollResponse.data) {
    return {
      code: getFeedDbFailureCode(
        pollResponse.error,
        "feed_post_update_failed",
      ),
      ok: false,
    };
  }

  const storedPoll = pollResponse.data as {
    id: string;
    status: "active" | "closed" | "removed";
  };
  const voteResponse = await client
    .schema("feed")
    .from("feed_poll_vote")
    .select("id", { count: "exact", head: true })
    .eq("poll_id", storedPoll.id)
    .is("deleted_at", null);

  if (voteResponse.error) {
    return {
      code: getFeedDbFailureCode(
        voteResponse.error,
        "feed_post_update_failed",
      ),
      ok: false,
    };
  }
  if (storedPoll.status !== "active" || (voteResponse.count ?? 0) > 0) {
    return { code: "feed_poll_content_locked", ok: false };
  }

  const optionsResponse = await client
    .schema("feed")
    .from("feed_poll_option")
    .select("id,sort_order")
    .eq("poll_id", storedPoll.id)
    .order("sort_order", { ascending: true });
  const options = (optionsResponse.data ?? []) as Array<{
    id: string;
    sort_order: number;
  }>;

  if (optionsResponse.error || options.length !== 2) {
    return { code: "feed_post_update_failed", ok: false };
  }

  const questionResponse = await client
    .schema("feed")
    .from("feed_poll")
    .update({ question: poll.question })
    .eq("id", storedPoll.id)
    .eq("status", "active")
    .is("deleted_at", null);

  if (questionResponse.error) {
    return { code: "feed_post_update_failed", ok: false };
  }

  for (const [index, option] of options.entries()) {
    const optionResponse = await client
      .schema("feed")
      .from("feed_poll_option")
      .update({ label: poll.options[index] })
      .eq("id", option.id)
      .eq("poll_id", storedPoll.id);

    if (optionResponse.error) {
      return { code: "feed_post_update_failed", ok: false };
    }
  }

  return { data: { id: storedPoll.id }, ok: true };
}

async function deleteFeedPost({
  accountId,
  client,
  payload,
}: {
  accountId: string;
  client: ServiceClient;
  payload: Extract<FeedWriteRequest, { action: "delete_post" }>;
}): Promise<ServerWriteResult<FeedWriteSuccessInput, FeedWriteFailureCode>> {
  const existingResponse = await client
    .schema("feed")
    .from("feed_post")
    .select("id,source")
    .eq("id", payload.postId)
    .eq("author_account_id", accountId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingResponse.error) {
    return {
      code: getFeedDbFailureCode(
        existingResponse.error,
        "feed_post_delete_failed",
      ),
      ok: false,
    };
  }

  if (!existingResponse.data) {
    return { code: "feed_target_invalid", ok: false };
  }

  if (!isUserManageableFeedPostSource(existingResponse.data.source)) {
    return { code: "feed_target_not_supported", ok: false };
  }

  const deletedAt = new Date().toISOString();
  const deleteResponse = await client
    .schema("feed")
    .from("feed_post")
    .update({
      deleted_at: deletedAt,
      moderation_status: "removed",
      removed_at: deletedAt,
    })
    .eq("id", payload.postId)
    .eq("author_account_id", accountId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (deleteResponse.error || !deleteResponse.data) {
    return {
      code: getFeedDbFailureCode(
        deleteResponse.error,
        "feed_post_delete_failed",
      ),
      ok: false,
    };
  }

  return {
    data: {
      action: payload.action,
      id: payload.postId,
      moderationStatus: "removed",
      targetType: "feed_post",
    },
    ok: true,
  };
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

  const moderationText = createPostModerationText(payload);
  const guardFailure = await checkCommunityWriteGuard({
    accountId,
    action: "create_post",
    body: moderationText,
    client,
  });
  if (guardFailure) {
    return { code: mapCommunityGuardFailure(guardFailure), ok: false };
  }

  const externalLinks = await prepareExternalLinks({
    client,
    text: moderationText,
  });
  if (externalLinks.some((link) => link.status === "blocked")) {
    return { code: "feed_external_link_blocked", ok: false };
  }
  const moderationStatus = externalLinks.some(
    (link) => link.status === "pending",
  )
    ? "pending_review"
    : "published";
  const publishedAt = new Date().toISOString();
  const sharedRow = {
    attachment_payload: payload.attachments ?? [],
    author_account_id: accountId,
    body: payload.body,
    moderation_status: moderationStatus,
    published_at: moderationStatus === "published" ? publishedAt : null,
    public_projection_payload: publicProjection,
    source: payload.source,
    source_id:
      publicProjection.reportShare?.reportKey ?? payload.sourceId ?? null,
    visibility: payload.visibility,
  };
  let response = await client
    .schema("feed")
    .from("feed_post")
    .insert({
      ...sharedRow,
      topic_category: payload.topic?.category ?? null,
      topic_source: payload.topic?.source ?? "manual",
      topic_tags: payload.topic?.tags ?? [],
    })
    .select("id, moderation_status")
    .single();

  if (isMissingFeedTopicColumns(response.error)) {
    response = await client
      .schema("feed")
      .from("feed_post")
      .insert({
        ...sharedRow,
        body:
          payload.body.trim() ||
          (payload.source === "balance_game"
            ? ""
            : "사진을 공유했어요."),
      })
      .select("id, moderation_status")
      .single();
  }

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

  await persistExternalLinks({
    client,
    links: externalLinks,
    postId: row.id,
  });

  if (payload.source === "balance_game") {
    const pollResult = await writeBalanceGamePoll({
      accountId,
      client,
      payload,
      postId: row.id,
    });

    if (!pollResult.ok) {
      await rollbackIncompleteBalanceGamePost({
        accountId,
        client,
        postId: row.id,
      });
      return pollResult;
    }
  }

  await sendAdminReviewNotification({
    id: String(response.data.id),
    kind: "content_report",
  });

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

function isMissingFeedTopicColumns(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  const message =
    typeof candidate.message === "string"
      ? candidate.message.toLocaleLowerCase("en-US")
      : "";

  return (
    candidate.code === "42703" ||
    candidate.code === "PGRST204" ||
    message.includes("topic_category") ||
    message.includes("topic_source") ||
    message.includes("topic_tags")
  );
}

function isMissingFeedMediaTable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  const message =
    typeof candidate.message === "string"
      ? candidate.message.toLocaleLowerCase("en-US")
      : "";

  return (
    candidate.code === "42P01" ||
    candidate.code === "PGRST205" ||
    message.includes("feed_post_media")
  );
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
  const customPoll = payload.poll;
  const template = getBalanceGameTemplate(payload.sourceId);

  if (!customPoll && !template) {
    return { code: "feed_target_invalid", ok: false };
  }

  const options = customPoll
    ? [
        { key: "option_a", label: customPoll.options[0] },
        { key: "option_b", label: customPoll.options[1] },
      ]
    : template!.options;
  const selectedOption = template
    ? getBalanceGameOption(template, payload.pollOptionKey)
    : null;

  if (!customPoll && !selectedOption) {
    return { code: "feed_target_invalid", ok: false };
  }

  const pollResponse = await client
    .schema("feed")
    .from("feed_poll")
    .insert({
      post_id: postId,
      prompt_id: template?.id ?? `user_balance_${postId}`,
      question: customPoll?.question ?? template!.question,
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
  const optionRows = options.map((option, index) => ({
    label: option.label,
    option_key: option.key,
    poll_id: poll.id,
    sort_order: index + 1,
  }));
  const optionResponse = await client
    .schema("feed")
    .from("feed_poll_option")
    .insert(optionRows)
    .select("id, option_key");

  if (optionResponse.error || !optionResponse.data) {
    return {
      code: getFeedDbFailureCode(
        optionResponse.error,
        "feed_poll_write_failed",
      ),
      ok: false,
    };
  }

  if (!selectedOption) {
    return {
      data: {
        id: poll.id,
      },
      ok: true,
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
    enforceOpen: false,
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

async function rollbackIncompleteBalanceGamePost({
  accountId,
  client,
  postId,
}: {
  accountId: string;
  client: ServiceClient;
  postId: string;
}) {
  await client
    .schema("feed")
    .from("feed_post")
    .delete()
    .eq("id", postId)
    .eq("author_account_id", accountId);
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

  if (
    target.data.postId &&
    (await isOfficialPostResponseClosed({
      client,
      postId: target.data.postId,
    }))
  ) {
    return { code: "feed_response_closed", ok: false };
  }

  const externalLinks = await prepareExternalLinks({
    client,
    text: payload.body,
  });
  if (externalLinks.some((link) => link.status === "blocked")) {
    return { code: "feed_external_link_blocked", ok: false };
  }
  const guardFailure = await checkCommunityWriteGuard({
    accountId,
    action: "create_comment",
    body: payload.body,
    client,
    target: {
      id: target.data.id,
      key: target.data.key,
      type: target.data.dbTargetType,
    },
  });
  if (guardFailure) {
    return { code: mapCommunityGuardFailure(guardFailure), ok: false };
  }
  const moderationStatus = externalLinks.some(
    (link) => link.status === "pending",
  )
    ? "pending_review"
    : "published";
  const response = await client
    .schema("feed")
    .from("feed_comment")
    .insert({
      author_account_id: accountId,
      body: payload.body,
      moderation_status: moderationStatus,
      post_id: target.data.postId,
      published_at:
        moderationStatus === "published" ? new Date().toISOString() : null,
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

  await persistExternalLinks({
    client,
    commentId: row.id,
    links: externalLinks,
  });

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

async function writeFeedContentReport({
  accountId,
  client,
  payload,
}: {
  accountId: string;
  client: ServiceClient;
  payload: Extract<FeedWriteRequest, { action: "report_content" }>;
}): Promise<ServerWriteResult<FeedWriteSuccessInput, FeedWriteFailureCode>> {
  const table =
    payload.target.type === "feed_post" ? "feed_post" : "feed_comment";
  const targetResponse = await client
    .schema("feed")
    .from(table)
    .select("id,author_account_id,moderation_status")
    .eq("id", payload.target.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (
    targetResponse.error ||
    !targetResponse.data ||
    !["published", "limited"].includes(targetResponse.data.moderation_status)
  ) {
    return { code: "feed_target_invalid", ok: false };
  }

  if (targetResponse.data.author_account_id === accountId) {
    return { code: "feed_target_invalid", ok: false };
  }

  const guardFailure = await checkCommunityWriteGuard({
    accountId,
    action: "report_content",
    client,
    target: {
      id: payload.target.id,
      key: null,
      type: payload.target.type,
    },
  });
  if (guardFailure) {
    return { code: mapCommunityGuardFailure(guardFailure), ok: false };
  }

  const response = await client
    .schema("feed")
    .from("content_report")
    .insert({
      comment_id:
        payload.target.type === "feed_comment" ? payload.target.id : null,
      details: payload.details?.trim() || null,
      post_id: payload.target.type === "feed_post" ? payload.target.id : null,
      reason: payload.reason,
      reporter_account_id: accountId,
      severity: getContentReportSeverity(payload.reason),
      status: "queued",
      target_author_account_id: targetResponse.data.author_account_id,
    })
    .select("id")
    .single();

  if (response.error || !response.data) {
    return {
      code:
        response.error?.code === "23505"
          ? "feed_already_reported"
          : getFeedDbFailureCode(response.error, "feed_report_write_failed"),
      ok: false,
    };
  }

  return {
    data: {
      action: payload.action,
      id: response.data.id,
      targetType: payload.target.type,
    },
    ok: true,
  };
}

function getContentReportSeverity(
  reason: Extract<
    FeedWriteRequest,
    { action: "report_content" }
  >["reason"],
) {
  if (
    ["hate", "sexual_content", "violence", "privacy", "self_harm"].includes(
      reason,
    )
  ) {
    return "high";
  }
  if (["harassment", "fraud"].includes(reason)) return "medium";
  return "low";
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

  const guardFailure = await checkCommunityWriteGuard({
    accountId,
    action: "react",
    client,
    target: {
      id: target.data.id,
      key: target.data.key,
      type: target.data.dbTargetType,
    },
  });
  if (guardFailure) {
    return { code: mapCommunityGuardFailure(guardFailure), ok: false };
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

  const guardFailure = await checkCommunityWriteGuard({
    accountId,
    action: "bookmark",
    client,
    target: {
      id: normalizedTarget.id,
      key: normalizedTarget.key,
      type: normalizedTarget.dbTargetType,
    },
  });
  if (guardFailure) {
    return { code: mapCommunityGuardFailure(guardFailure), ok: false };
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

  const guardFailure = await checkCommunityWriteGuard({
    accountId,
    action: "not_interested",
    client,
    target: {
      id: target.data.id,
      key: target.data.key,
      type: target.data.dbTargetType,
    },
  });
  if (guardFailure) {
    return { code: mapCommunityGuardFailure(guardFailure), ok: false };
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
  const [guardFailure, optionOpen, profile] = await Promise.all([
    checkCommunityWriteGuard({
      accountId,
      action: "vote_poll",
      client,
      target: {
        id: payload.pollId,
        key: null,
        type: "feed_poll",
      },
    }),
    isPollOptionOpen({
      client,
      optionId: payload.optionId,
      pollId: payload.pollId,
    }),
    readCurrentNuangCodeSnapshot({ accountId, client }),
  ]);

  if (guardFailure) {
    return { code: mapCommunityGuardFailure(guardFailure), ok: false };
  }

  if (!optionOpen) {
    return { code: "feed_response_closed", ok: false };
  }

  const response = await insertPollVote({
    accountId,
    client,
    enforceOpen: false,
    optionId: payload.optionId,
    pollId: payload.pollId,
    preferUpdate: payload.replaceExisting ?? false,
    profile,
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
  enforceOpen = true,
  optionId,
  pollId,
  preferUpdate = false,
  profile: suppliedProfile,
}: {
  accountId: string;
  client: ServiceClient;
  enforceOpen?: boolean;
  optionId: string;
  pollId: string;
  preferUpdate?: boolean;
  profile?: Awaited<ReturnType<typeof readCurrentNuangCodeSnapshot>>;
}): Promise<ServerWriteResult<{ id: string }, FeedWriteFailureCode>> {
  if (
    enforceOpen &&
    !(await isPollOptionOpen({
      client,
      optionId,
      pollId,
    }))
  ) {
    return { code: "feed_response_closed", ok: false };
  }

  const profile =
    suppliedProfile ??
    (await readCurrentNuangCodeSnapshot({ accountId, client }));
  const voteRow = {
    nuang_code: profile.code,
    option_id: optionId,
    profile_name: profile.name,
  };

  if (preferUpdate) {
    const directUpdate = await client
      .schema("feed")
      .from("feed_poll_vote")
      .update(voteRow)
      .eq("account_id", accountId)
      .eq("poll_id", pollId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (directUpdate.error) {
      return {
        code: getFeedDbFailureCode(
          directUpdate.error,
          "feed_poll_vote_write_failed",
        ),
        ok: false,
      };
    }

    if (directUpdate.data) {
      return {
        data: directUpdate.data as { id: string },
        ok: true,
      };
    }
  }

  const response = await client
    .schema("feed")
    .from("feed_poll_vote")
    .insert({
      account_id: accountId,
      poll_id: pollId,
      ...voteRow,
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

  const updated = await client
    .schema("feed")
    .from("feed_poll_vote")
    .update(voteRow)
    .eq("id", existing.data.id)
    .eq("account_id", accountId)
    .eq("poll_id", pollId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (updated.error || !updated.data) {
    return {
      code: getFeedDbFailureCode(updated.error, "feed_poll_vote_write_failed"),
      ok: false,
    };
  }

  return {
    data: updated.data as { id: string },
    ok: true,
  };
}

async function isOfficialPostResponseClosed({
  client,
  postId,
}: {
  client: ServiceClient;
  postId: string;
}) {
  const response = await client
    .schema("feed")
    .from("official_community_content")
    .select("lifecycle_status,response_closes_at")
    .eq("post_id", postId)
    .maybeSingle();

  if (!response.error && response.data) {
    const row = response.data as {
      lifecycle_status?: string | null;
      response_closes_at?: string | null;
    };
    const closesAt = row.response_closes_at
      ? new Date(row.response_closes_at).getTime()
      : Number.NaN;

    return (
      row.lifecycle_status === "closed" ||
      row.lifecycle_status === "archived" ||
      (Number.isFinite(closesAt) && closesAt <= Date.now())
    );
  }

  const legacyResponse = await client
    .schema("feed")
    .from("official_community_content")
    .select("lifecycle_status")
    .eq("post_id", postId)
    .maybeSingle();
  const legacyStatus = (
    legacyResponse.data as { lifecycle_status?: string | null } | null
  )?.lifecycle_status;

  return legacyStatus === "closed" || legacyStatus === "archived";
}

async function isPollOptionOpen({
  client,
  optionId,
  pollId,
}: {
  client: ServiceClient;
  optionId: string;
  pollId: string;
}) {
  const [pollResponse, optionResponse] = await Promise.all([
    client
      .schema("feed")
      .from("feed_poll")
      .select("id,status,post_id")
      .eq("id", pollId)
      .is("deleted_at", null)
      .maybeSingle(),
    client
      .schema("feed")
      .from("feed_poll_option")
      .select("id,poll_id")
      .eq("id", optionId)
      .eq("poll_id", pollId)
      .maybeSingle(),
  ]);

  if (pollResponse.error || optionResponse.error) return false;
  const poll = pollResponse.data as {
    id?: string;
    post_id?: string;
    status?: string;
  } | null;
  const option = optionResponse.data as {
    id?: string;
    poll_id?: string;
  } | null;

  const baseOpen =
    poll?.id === pollId &&
    poll.status === "active" &&
    option?.id === optionId &&
    option.poll_id === pollId;
  if (!baseOpen) return false;
  if (!poll.post_id) return true;

  return !(await isOfficialPostResponseClosed({
    client,
    postId: poll.post_id,
  }));
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

    if (isCurrentNuangCode(code)) {
      return {
        code,
        name:
          typeof report.profile_name === "string" && report.profile_name.trim()
            ? report.profile_name.trim()
            : getCurrentNuangProfileName(code),
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

  if (!isCurrentNuangCode(code)) {
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
        : getCurrentNuangProfileName(code),
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

function mapCommunityGuardFailure(
  failure: CommunityWriteGuardCode,
): FeedWriteFailureCode {
  if (failure === "duplicate_content") return "feed_duplicate_content";
  if (failure === "rate_limited") return "feed_rate_limited";
  if (failure === "required_consent_missing") {
    return "feed_required_consent_missing";
  }
  if (failure === "target_invalid") return "feed_target_invalid";
  if (failure === "guard_unavailable") {
    return "feed_write_guard_unavailable";
  }
  return "account_link_missing";
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
    balanceGame: payload.poll
      ? {
          promptId: payload.sourceId ?? "user_balance_game",
          question: payload.poll.question,
          selectedOptionKey: null,
          version: "user-balance-game.v1",
        }
      : balanceGame
      ? {
          promptId: balanceGame.id,
          question: balanceGame.question,
          selectedOptionKey: payload.pollOptionKey ?? null,
          version: balanceGame.version,
        }
      : null,
    reportShare,
    source: payload.source,
    sourceId: reportShare?.reportKey ?? payload.sourceId ?? null,
    topic: payload.topic ?? null,
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
  const originalAttachment = payload.attachments?.find(
    (attachment) => attachment.type === "original_report",
  );
  if (originalAttachment) {
    return readOriginalReportShareProjection({
      accountId,
      client,
      profileId: originalAttachment.profileId ?? "",
      reportKey: originalAttachment.id,
      sourceId: payload.sourceId,
    });
  }

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

  if (!isCurrentNuangCode(profileCode)) {
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
      getCurrentNuangProfileName(profileCode) ??
      (typeof row.profile_name === "string" && row.profile_name.trim()
        ? row.profile_name.trim()
        : (shareSummary?.profileName ?? "뉴앙 리포트")),
    resultLabel: shareSummary?.resultLabel ?? "뉴앙 리포트",
  };
}

async function readOriginalReportShareProjection({
  accountId,
  client,
  profileId,
  reportKey,
  sourceId,
}: {
  accountId: string;
  client: ServiceClient;
  profileId: string;
  reportKey: string;
  sourceId?: string;
}): Promise<ReportShareProjection | null> {
  const parsedKey = parseProfileReportKey(reportKey);
  if (
    !parsedKey ||
    !uuidPattern.test(profileId) ||
    (sourceId !== undefined && sourceId !== reportKey)
  ) {
    return null;
  }

  const ownerAccountId = await resolveProfileOwnerAccountId({
    client,
    profileId,
  });
  if (!ownerAccountId) return null;

  if (
    ownerAccountId !== accountId &&
    (await hasProfileBlockBetween({
      client,
      leftAccountId: accountId,
      rightAccountId: ownerAccountId,
    }))
  ) {
    return null;
  }

  const original = await readOriginalProfileReport({
    client,
    ownerAccountId,
    reportKey,
    viewerAccountId: accountId,
  });
  if (
    !original ||
    original.summary.visibility !== "profile_public" ||
    original.summary.type !== parsedKey.kind
  ) {
    return null;
  }

  return createOriginalReportProjection({ original, profileId, reportKey });
}

async function hasProfileBlockBetween({
  client,
  leftAccountId,
  rightAccountId,
}: {
  client: ServiceClient;
  leftAccountId: string;
  rightAccountId: string;
}) {
  const [blockedByViewer, blockedViewer] = await Promise.all([
    client
      .schema("feed")
      .from("profile_block")
      .select("blocker_account_id")
      .eq("blocker_account_id", leftAccountId)
      .eq("blocked_account_id", rightAccountId)
      .is("deleted_at", null)
      .maybeSingle(),
    client
      .schema("feed")
      .from("profile_block")
      .select("blocker_account_id")
      .eq("blocker_account_id", rightAccountId)
      .eq("blocked_account_id", leftAccountId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  return Boolean(
    blockedByViewer.error ||
      blockedViewer.error ||
      blockedByViewer.data ||
      blockedViewer.data,
  );
}

function createOriginalReportProjection({
  original,
  profileId,
  reportKey,
}: {
  original: OriginalProfileReport;
  profileId: string;
  reportKey: string;
}): ReportShareProjection {
  const profileCode =
    original.kind === "core"
      ? original.result.profileCode
      : original.kind === "topic"
        ? (original.result.nuangCodeContext?.code ?? "")
        : "";
  const profileName =
    original.kind === "core"
      ? original.result.profileName
      : original.summary.resultName;
  const resultLabel =
    original.kind === "core"
      ? original.result.resultLabel
      : original.summary.assessmentTitle;

  return {
    assessmentKind:
      original.kind === "core" ? original.result.kind : "full",
    assessmentTitle: original.summary.assessmentTitle,
    completedAt: original.summary.completedAt,
    domains:
      original.kind === "core"
        ? original.result.domains.map((domain) => ({
            ...domain,
            symbol: domain.symbol ?? null,
          }))
        : [],
    profileCode,
    profileId,
    profileName,
    reportKey,
    reportType: original.kind,
    resultLabel,
    summary: original.summary.summary,
  };
}

function parseReportShareSummary(value: unknown): ReportShareProjection | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const summary = value as {
    assessmentKind?: unknown;
    assessmentTitle?: unknown;
    completedAt?: unknown;
    domains?: unknown;
    profileId?: unknown;
    profileCode?: unknown;
    profileName?: unknown;
    reportKey?: unknown;
    reportType?: unknown;
    resultLabel?: unknown;
    summary?: unknown;
  };

  return {
    assessmentKind:
      summary.assessmentKind === "quick" || summary.assessmentKind === "full"
        ? summary.assessmentKind
        : "full",
    ...(typeof summary.assessmentTitle === "string"
      ? { assessmentTitle: summary.assessmentTitle }
      : {}),
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
    ...(typeof summary.profileId === "string"
      ? { profileId: summary.profileId }
      : {}),
    profileName:
      typeof summary.profileName === "string"
        ? summary.profileName
        : "뉴앙 리포트",
    ...(typeof summary.reportKey === "string"
      ? { reportKey: summary.reportKey }
      : {}),
    ...(summary.reportType === "core" ||
    summary.reportType === "topic" ||
    summary.reportType === "lab"
      ? { reportType: summary.reportType }
      : {}),
    resultLabel:
      typeof summary.resultLabel === "string"
        ? summary.resultLabel
        : "뉴앙 리포트",
    ...(typeof summary.summary === "string"
      ? { summary: summary.summary }
      : {}),
  };
}

function isValidPostSourcePayload(
  payload: Extract<FeedWriteRequest, { action: "create_post" }>,
) {
  if (payload.source === "daily_question") {
    return Boolean(getDailyQuestionTemplate(payload.sourceId));
  }

  if (payload.source === "balance_game") {
    if (payload.poll) {
      return !payload.pollOptionKey;
    }
    const template = getBalanceGameTemplate(payload.sourceId);

    return Boolean(
      template && getBalanceGameOption(template, payload.pollOptionKey),
    );
  }

  if (payload.source === "report_share") {
    const reportAttachments = (payload.attachments ?? []).filter(
      (attachment) =>
        attachment.type === "result_summary" ||
        attachment.type === "original_report",
    );
    if (reportAttachments.length !== 1) return false;

    const attachment = reportAttachments[0];
    if (attachment.type === "original_report") {
      return Boolean(
        attachment.profileId &&
          parseProfileReportKey(attachment.id) &&
          (!payload.sourceId || payload.sourceId === attachment.id),
      );
    }

    return uuidPattern.test(attachment.id);
  }

  return !payload.pollOptionKey;
}

function createPostModerationText(
  payload:
    | Extract<FeedWriteRequest, { action: "create_post" }>
    | Extract<FeedWriteRequest, { action: "update_post" }>,
) {
  if (!payload.poll) return payload.body;

  return [
    payload.poll.question,
    ...payload.poll.options,
    payload.body,
  ]
    .filter(Boolean)
    .join("\n");
}

function isValidQuestionAudienceSourceId(sourceId: string) {
  if (
    sourceId === "ask_all" ||
    sourceId === "ask_similar" ||
    sourceId === "ask_different"
  ) {
    return true;
  }

  if (sourceId.startsWith("ask_exact_")) {
    return isCurrentNuangCode(
      sourceId.slice("ask_exact_".length).toUpperCase(),
    );
  }

  if (!sourceId.startsWith("ask_trait_")) return false;
  const symbols = sourceId
    .slice("ask_trait_".length)
    .split("_")
    .map((symbol) => symbol.toUpperCase());
  const allowedSymbols = new Set(["E", "I", "R", "N", "G", "A", "K", "M", "C", "Q"]);

  return (
    symbols.length >= 1 &&
    symbols.length <= 3 &&
    new Set(symbols).size === symbols.length &&
    symbols.every((symbol) => allowedSymbols.has(symbol))
  );
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
