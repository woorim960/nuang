import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createPublicProfileCardPayload } from "@/features/public-profile/public-profile-card-contract";
import { createCharacterProfileImage } from "@/features/public-profile/profile-image";
import {
  createFeedReadPayload,
  type FeedReadPayload,
} from "@/features/feed/feed-contract";
import type {
  FeedItem,
  FeedPollSummary,
  FeedReplyPreview,
} from "@/features/feed/feed-seed";
import { homeDailyCommunityPollPromptId } from "@/features/feed/feed-prompts";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";
import { getSupportedNuangProfileName } from "@/features/nuang-code/profile-name-resolution";
import type { PublicProfileSnapshotPayload } from "@/features/together/public-comparison-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type FeedPostRow = {
  author_account_id: string;
  body: string;
  created_at: string;
  id: string;
  moderation_status: "limited" | "pending_review" | "published" | "removed";
  published_at: string | null;
  public_projection_payload?: unknown;
  source:
    | "balance_game"
    | "daily_mood"
    | "daily_question"
    | "free_text"
    | "map_reflection"
    | "report_share"
    | "trait_card";
  source_id: string | null;
  visibility: "private_draft" | "profile_public" | "public";
};

type FeedCommentBaseRow = {
  author_account_id: string;
  body: string;
  created_at: string;
  id: string;
  moderation_status: "limited" | "pending_review" | "published" | "removed";
};

type FeedPostCommentRow = FeedCommentBaseRow & {
  post_id: string;
};

type FeedPostReactionCountRow = {
  account_id: string;
  target_id: string;
};

type FeedPostBookmarkRow = {
  post_id: string | null;
};

type FeedPostPreferenceRow = {
  target_id: string | null;
};

type FeedSeedPreferenceRow = {
  target_key: string | null;
};

type PublicProfileSnapshotRow = {
  account_id: string;
  id: string;
  snapshot_payload: unknown;
};

type FeedEngagement = {
  likes: number;
  replyPreview: FeedReplyPreview[];
  replies: number;
  viewerHasBookmarked: boolean;
  viewerHasLiked: boolean;
};

type FeedPollRow = {
  id: string;
  post_id: string;
  prompt_id: string;
  question: string;
};

type FeedPollOptionRow = {
  id: string;
  label: string;
  option_key: string;
  poll_id: string;
  sort_order: number;
};

type FeedPollVoteRow = {
  account_id: string;
  nuang_code: string | null;
  option_id: string;
  poll_id: string;
  profile_name: string | null;
};

export type FeedPollStatsPayload = {
  codeRows: Array<{
    code: string;
    name: string;
    options: Array<{
      label: string;
      ratio: number;
      voteCount: number;
    }>;
    totalVotes: number;
  }>;
  options: Array<{
    id: string;
    label: string;
    ratio: number;
    voteCount: number;
  }>;
  poll: {
    id: string;
    question: string;
  };
  post: {
    id: string;
    replyCount: number;
    replyPreview: FeedReplyPreview[];
  };
  totalVotes: number;
  viewer: {
    isAuthenticated: boolean;
    nuangCode: string | null;
    profileName: string | null;
    voteOptionId: string | null;
    voteOptionLabel: string | null;
  };
};

export type FeedReportSharePayload = {
  body: string;
  createdAt: string;
  reportShare: NonNullable<FeedItem["reportShare"]>;
};

type FeedHiddenTargets = {
  postIds: Set<string>;
  seedKeys: Set<string>;
};

const sourceTitleMap: Record<FeedPostRow["source"], string> = {
  balance_game: "밸런스 게임",
  daily_mood: "오늘의 기분",
  daily_question: "오늘의 질문",
  free_text: "오늘의 생각",
  map_reflection: "성향지도 노트",
  report_share: "리포트 공유",
  trait_card: "성향 카드",
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const demoFeedHandles = new Set([
  "doyun.forest",
  "harin.sun",
  "jiho.water",
  "minjae.spark",
  "seoyeon.flame",
]);

export async function createServerFeedReadPayload(): Promise<FeedReadPayload> {
  const basePayload = createFeedReadPayload();
  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return {
      ...basePayload,
      items: [],
      stories: [],
    };
  }

  const accountId = await getCurrentAccountId(serviceClient);
  const [publicPosts, ownPosts] = await Promise.all([
    readPublishedPosts(serviceClient),
    accountId ? readOwnPosts(serviceClient, accountId) : Promise.resolve([]),
  ]);
  const mergedRows = mergePostRows({
    accountId,
    ownPosts,
    publicPosts,
  });
  const hiddenTargets = await readNotInterestedTargets({
    accountId,
    client: serviceClient,
    postIds: mergedRows.map((row) => row.id),
    seedKeys: [],
  });
  const visibleRows = mergedRows.filter(
    (row) => !hiddenTargets.postIds.has(row.id),
  );
  const authorProfilesByAccountId = await readPublicProfileCardsForAccounts({
    accountIds: visibleRows.map((row) => row.author_account_id),
    client: serviceClient,
  });
  const [engagementByPostId, pollByPostId] = await Promise.all([
    readPostEngagements({
      accountId,
      client: serviceClient,
      rows: visibleRows,
    }),
    readPollSummaries({
      accountId,
      client: serviceClient,
      rows: visibleRows,
    }),
  ]);
  const dbItems = visibleRows
    .map((row, index) =>
      mapPostRowToFeedItem(
        row,
        accountId,
        index,
        engagementByPostId.get(row.id),
        authorProfilesByAccountId.get(row.author_account_id),
        pollByPostId.get(row.id),
      ),
    )
    .filter(isUsefulFeedItem);

  return {
    ...basePayload,
    items: dbItems,
    stories: [],
  };
}

export async function createServerHomeFeedPreviewItems() {
  const payload = await createServerFeedReadPayload();
  const communityPoll = payload.items.find(
    (item) => item.poll?.promptId === homeDailyCommunityPollPromptId,
  );

  if (!communityPoll) {
    return payload.items.slice(0, payload.policy.homePreviewMaxItems);
  }

  return [
    communityPoll,
    ...payload.items
      .filter((item) => item.id !== communityPoll.id)
      .slice(0, payload.policy.homePreviewMaxItems - 1),
  ];
}

export async function createServerFeedPollStatsPayload(
  pollId: string,
): Promise<FeedPollStatsPayload | null> {
  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient || !uuidPattern.test(pollId)) {
    return null;
  }

  const pollResponse = await serviceClient
    .schema("feed")
    .from("feed_poll")
    .select("id, post_id, prompt_id, question")
    .eq("id", pollId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (pollResponse.error || !pollResponse.data) {
    return null;
  }

  const [optionResponse, voteResponse] = await Promise.all([
    serviceClient
      .schema("feed")
      .from("feed_poll_option")
      .select("id, poll_id, option_key, label, sort_order")
      .eq("poll_id", pollId)
      .order("sort_order", { ascending: true }),
    serviceClient
      .schema("feed")
      .from("feed_poll_vote")
      .select("poll_id, option_id, account_id, nuang_code, profile_name")
      .eq("poll_id", pollId)
      .is("deleted_at", null),
  ]);

  if (optionResponse.error || !optionResponse.data || voteResponse.error) {
    return null;
  }

  const poll = pollResponse.data as FeedPollRow;
  const options = optionResponse.data as FeedPollOptionRow[];
  const votes = (voteResponse.data ?? []) as FeedPollVoteRow[];
  const totalVotes = votes.length;
  const optionSummaries = options.map((option) => {
    const voteCount = votes.filter(
      (vote) => vote.option_id === option.id,
    ).length;

    return {
      id: option.id,
      label: option.label,
      ratio: totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0,
      voteCount,
    };
  });
  const votesByCode = groupBy(
    votes.filter((vote) => isCurrentNuangCode(vote.nuang_code)),
    (vote) => String(vote.nuang_code),
  );
  const codeRows = [...votesByCode.entries()]
    .filter(([, codeVotes]) => codeVotes.length >= 3)
    .sort(([leftCode], [rightCode]) => leftCode.localeCompare(rightCode))
    .map(([code, codeVotes]) => {
      const codeTotal = codeVotes.length;

      return {
        code,
        name:
          getSupportedNuangProfileName(code) ??
          codeVotes.find((vote) => vote.profile_name)?.profile_name ??
          "뉴앙 코드",
        options: options.map((option) => {
          const voteCount = codeVotes.filter(
            (vote) => vote.option_id === option.id,
          ).length;

          return {
            label: option.label,
            ratio:
              codeTotal > 0 ? Math.round((voteCount / codeTotal) * 100) : 0,
            voteCount,
          };
        }),
        totalVotes: codeTotal,
      };
    });
  const accountId = await getCurrentAccountId(serviceClient);
  const viewerVote = accountId
    ? (votes.find((vote) => vote.account_id === accountId) ?? null)
    : null;
  const viewerCode = isCurrentNuangCode(viewerVote?.nuang_code)
    ? viewerVote.nuang_code
    : null;
  const postReplies = await readPostReplies({
    accountId,
    client: serviceClient,
    postId: poll.post_id,
  });

  return {
    codeRows,
    options: optionSummaries,
    poll: {
      id: poll.id,
      question: poll.question,
    },
    post: {
      id: poll.post_id,
      replyCount: postReplies.replyCount,
      replyPreview: postReplies.replies,
    },
    totalVotes,
    viewer: {
      isAuthenticated: Boolean(accountId),
      nuangCode: viewerCode,
      profileName: viewerCode
        ? (getCandidateProfileDefinition(viewerCode)?.displayName ?? null)
        : null,
      voteOptionId: viewerVote?.option_id ?? null,
      voteOptionLabel:
        options.find((option) => option.id === viewerVote?.option_id)?.label ??
        null,
    },
  };
}

export async function createServerFeedReportSharePayload(
  postId: string,
): Promise<FeedReportSharePayload | null> {
  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient || !uuidPattern.test(postId)) {
    return null;
  }

  const response = await serviceClient
    .schema("feed")
    .from("feed_post")
    .select("id, body, public_projection_payload, created_at")
    .eq("id", postId)
    .eq("source", "report_share")
    .is("deleted_at", null)
    .maybeSingle();

  if (response.error || !response.data) {
    return null;
  }

  const row = response.data as {
    body: string;
    created_at: string;
    id: string;
    public_projection_payload: unknown;
  };
  const publicProjection = readPublicProjection(row.public_projection_payload);

  if (!publicProjection.reportShare) {
    return null;
  }

  return {
    body: normalizeReportShareBody(
      row.body,
      publicProjection.reportShare,
      row.public_projection_payload,
    ),
    createdAt: row.created_at,
    reportShare: {
      ...publicProjection.reportShare,
      href: `/feed/reports/${row.id}`,
    },
  };
}

async function getCurrentAccountId(client: SupabaseClient) {
  const serverClient = await createServerSupabaseClient();

  if (!serverClient) {
    return null;
  }

  const { data, error } = await serverClient.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return readAccountIdForUser(client, data.user);
}

async function readAccountIdForUser(client: SupabaseClient, user: User) {
  const response = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", user.id)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (response.error || !response.data) {
    return null;
  }

  return (response.data as { account_id: string }).account_id;
}

async function readNotInterestedTargets({
  accountId,
  client,
  postIds,
  seedKeys,
}: {
  accountId: string | null;
  client: SupabaseClient;
  postIds: string[];
  seedKeys: string[];
}): Promise<FeedHiddenTargets> {
  const hiddenTargets: FeedHiddenTargets = {
    postIds: new Set(),
    seedKeys: new Set(),
  };

  if (!accountId) {
    return hiddenTargets;
  }

  const postPreferenceRequest =
    postIds.length > 0
      ? client
          .schema("feed")
          .from("feed_preference")
          .select("target_id")
          .eq("account_id", accountId)
          .eq("preference", "not_interested")
          .eq("target_type", "feed_post")
          .in("target_id", postIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [], error: null });
  const seedPreferenceRequest =
    seedKeys.length > 0
      ? client
          .schema("feed")
          .from("feed_preference")
          .select("target_key")
          .eq("account_id", accountId)
          .eq("preference", "not_interested")
          .eq("target_type", "feed_seed_card")
          .in("target_key", seedKeys)
          .is("deleted_at", null)
      : Promise.resolve({ data: [], error: null });
  const [postPreferenceResponse, seedPreferenceResponse] = await Promise.all([
    postPreferenceRequest,
    seedPreferenceRequest,
  ]);

  if (!postPreferenceResponse.error && postPreferenceResponse.data) {
    for (const row of postPreferenceResponse.data as FeedPostPreferenceRow[]) {
      if (row.target_id) {
        hiddenTargets.postIds.add(row.target_id);
      }
    }
  }

  if (!seedPreferenceResponse.error && seedPreferenceResponse.data) {
    for (const row of seedPreferenceResponse.data as FeedSeedPreferenceRow[]) {
      if (row.target_key) {
        hiddenTargets.seedKeys.add(row.target_key);
      }
    }
  }

  return hiddenTargets;
}

async function readPublishedPosts(client: SupabaseClient) {
  const response = await client
    .schema("feed")
    .from("feed_post")
    .select(
      "id, author_account_id, source, source_id, body, visibility, moderation_status, public_projection_payload, created_at, published_at",
    )
    .eq("moderation_status", "published")
    .in("visibility", ["public", "profile_public"])
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(20);

  if (response.error || !response.data) {
    return [];
  }

  return response.data as FeedPostRow[];
}

async function readOwnPosts(client: SupabaseClient, accountId: string) {
  const response = await client
    .schema("feed")
    .from("feed_post")
    .select(
      "id, author_account_id, source, source_id, body, visibility, moderation_status, public_projection_payload, created_at, published_at",
    )
    .eq("author_account_id", accountId)
    .in("moderation_status", ["pending_review", "published", "limited"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (response.error || !response.data) {
    return [];
  }

  return response.data as FeedPostRow[];
}

async function readPostEngagements({
  accountId,
  client,
  rows,
}: {
  accountId: string | null;
  client: SupabaseClient;
  rows: FeedPostRow[];
}) {
  const postIds = rows.map((row) => row.id);
  const engagementByPostId = new Map<string, FeedEngagement>(
    postIds.map((postId) => [
      postId,
      {
        likes: 0,
        replyPreview: [],
        replies: 0,
        viewerHasBookmarked: false,
        viewerHasLiked: false,
      },
    ]),
  );

  if (postIds.length === 0) {
    return engagementByPostId;
  }

  const bookmarkRequest = accountId
    ? client
        .schema("feed")
        .from("feed_bookmark")
        .select("post_id")
        .eq("account_id", accountId)
        .eq("target_type", "feed_post")
        .in("post_id", postIds)
        .is("deleted_at", null)
    : Promise.resolve({ data: [], error: null });

  const [commentResponse, reactionResponse, bookmarkResponse] =
    await Promise.all([
      client
        .schema("feed")
        .from("feed_comment")
        .select(
          "id, post_id, author_account_id, body, moderation_status, created_at",
        )
        .in("post_id", postIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200),
      client
        .schema("feed")
        .from("feed_reaction")
        .select("target_id, account_id")
        .eq("target_type", "feed_post")
        .in("target_id", postIds)
        .is("deleted_at", null),
      bookmarkRequest,
    ]);

  if (!commentResponse.error && commentResponse.data) {
    const visibleCommentsByPostId = new Map<string, FeedPostCommentRow[]>();

    for (const row of commentResponse.data as FeedPostCommentRow[]) {
      if (!isVisibleComment(row, accountId)) {
        continue;
      }

      const current = engagementByPostId.get(row.post_id);
      if (current) current.replies += 1;

      const comments = visibleCommentsByPostId.get(row.post_id) ?? [];
      comments.push(row);
      visibleCommentsByPostId.set(row.post_id, comments);
    }

    for (const [postId, comments] of visibleCommentsByPostId.entries()) {
      const current = engagementByPostId.get(postId);

      if (!current) {
        continue;
      }

      current.replyPreview = [...comments]
        .sort(compareCommentsByCreatedAtDesc)
        .slice(0, 2)
        .map((comment) => mapCommentRowToReplyPreview(comment, accountId));
    }
  }

  if (!reactionResponse.error && reactionResponse.data) {
    for (const row of reactionResponse.data as FeedPostReactionCountRow[]) {
      const current = engagementByPostId.get(row.target_id);
      if (!current) {
        continue;
      }

      current.likes += 1;
      if (accountId && row.account_id === accountId) {
        current.viewerHasLiked = true;
      }
    }
  }

  if (!bookmarkResponse.error && bookmarkResponse.data) {
    for (const row of bookmarkResponse.data as FeedPostBookmarkRow[]) {
      if (!row.post_id) {
        continue;
      }

      const current = engagementByPostId.get(row.post_id);
      if (current) current.viewerHasBookmarked = true;
    }
  }

  return engagementByPostId;
}

async function readPostReplies({
  accountId,
  client,
  postId,
}: {
  accountId: string | null;
  client: SupabaseClient;
  postId: string;
}) {
  const response = await client
    .schema("feed")
    .from("feed_comment")
    .select(
      "id, post_id, author_account_id, body, moderation_status, created_at",
    )
    .eq("post_id", postId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (response.error || !response.data) {
    return {
      replies: [] as FeedReplyPreview[],
      replyCount: 0,
    };
  }

  const visibleComments = (response.data as FeedPostCommentRow[])
    .filter((row) => isVisibleComment(row, accountId))
    .sort(compareCommentsByCreatedAtDesc);

  return {
    replies: visibleComments.map((comment) =>
      mapCommentRowToReplyPreview(comment, accountId),
    ),
    replyCount: visibleComments.length,
  };
}

async function readPollSummaries({
  accountId,
  client,
  rows,
}: {
  accountId: string | null;
  client: SupabaseClient;
  rows: FeedPostRow[];
}) {
  const balancePostIds = rows
    .filter((row) => row.source === "balance_game")
    .map((row) => row.id);
  const pollByPostId = new Map<string, FeedPollSummary>();

  if (balancePostIds.length === 0) {
    return pollByPostId;
  }

  const pollResponse = await client
    .schema("feed")
    .from("feed_poll")
    .select("id, post_id, prompt_id, question")
    .in("post_id", balancePostIds)
    .eq("status", "active")
    .is("deleted_at", null);

  if (pollResponse.error || !pollResponse.data) {
    return pollByPostId;
  }

  const polls = pollResponse.data as FeedPollRow[];
  const pollIds = polls.map((poll) => poll.id);

  if (pollIds.length === 0) {
    return pollByPostId;
  }

  const [optionResponse, voteResponse] = await Promise.all([
    client
      .schema("feed")
      .from("feed_poll_option")
      .select("id, poll_id, option_key, label, sort_order")
      .in("poll_id", pollIds)
      .order("sort_order", { ascending: true }),
    client
      .schema("feed")
      .from("feed_poll_vote")
      .select("poll_id, option_id, account_id, nuang_code, profile_name")
      .in("poll_id", pollIds)
      .is("deleted_at", null),
  ]);

  if (optionResponse.error || !optionResponse.data) {
    return pollByPostId;
  }

  const optionsByPollId = groupBy(
    optionResponse.data as FeedPollOptionRow[],
    (option) => option.poll_id,
  );
  const votesByPollId = voteResponse.error
    ? new Map<string, FeedPollVoteRow[]>()
    : groupBy(
        (voteResponse.data ?? []) as FeedPollVoteRow[],
        (vote) => vote.poll_id,
      );

  for (const poll of polls) {
    const options = optionsByPollId.get(poll.id) ?? [];
    const votes = votesByPollId.get(poll.id) ?? [];
    const totalVotes = votes.length;
    const viewerVote = accountId
      ? (votes.find((vote) => vote.account_id === accountId) ?? null)
      : null;

    const codeVotes = groupBy(
      votes.filter((vote) => isCurrentNuangCode(vote.nuang_code)),
      (vote) => String(vote.nuang_code),
    );

    pollByPostId.set(poll.post_id, {
      canViewCodeStats: [...codeVotes.values()].some(
        (groupedVotes) => groupedVotes.length >= 3,
      ),
      id: poll.id,
      options: options.map((option) => {
        const voteCount = votes.filter(
          (vote) => vote.option_id === option.id,
        ).length;

        return {
          id: option.id,
          key: option.option_key,
          label: option.label,
          ratio:
            totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0,
          viewerHasVoted: viewerVote?.option_id === option.id,
          voteCount,
        };
      }),
      promptId: poll.prompt_id,
      question: poll.question,
      statsHref: `/feed/polls/${poll.id}/stats`,
      totalVotes,
      viewerVoteOptionId: viewerVote?.option_id ?? null,
    });
  }

  return pollByPostId;
}

async function readPublicProfileCardsForAccounts({
  accountIds,
  client,
}: {
  accountIds: string[];
  client: SupabaseClient;
}) {
  const uniqueAccountIds = [...new Set(accountIds)].filter(Boolean);
  const profilesByAccountId = new Map<string, FeedItem["authorProfile"]>();

  if (uniqueAccountIds.length === 0) {
    return profilesByAccountId;
  }

  const response = await client
    .schema("profile")
    .from("profile_public_snapshot")
    .select("id, account_id, snapshot_payload")
    .in("account_id", uniqueAccountIds)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (response.error || !response.data) {
    return profilesByAccountId;
  }

  for (const row of response.data as PublicProfileSnapshotRow[]) {
    if (profilesByAccountId.has(row.account_id)) {
      continue;
    }

    const snapshot = coercePublicProfileSnapshotPayload(
      row.snapshot_payload,
      row.id,
    );

    if (!snapshot) {
      continue;
    }

    profilesByAccountId.set(
      row.account_id,
      createPublicProfileCardPayload({
        cardId: `profile_${row.id}`,
        snapshot,
        status: "published",
      }),
    );
  }

  return profilesByAccountId;
}

function mergePostRows({
  accountId,
  ownPosts,
  publicPosts,
}: {
  accountId: string | null;
  ownPosts: FeedPostRow[];
  publicPosts: FeedPostRow[];
}) {
  const rowsById = new Map<string, FeedPostRow>();

  for (const row of [...ownPosts, ...publicPosts]) {
    if (
      row.visibility === "private_draft" &&
      row.author_account_id !== accountId
    ) {
      continue;
    }

    rowsById.set(row.id, row);
  }

  return [...rowsById.values()].sort((a, b) => {
    const left = new Date(a.published_at ?? a.created_at).getTime();
    const right = new Date(b.published_at ?? b.created_at).getTime();

    return right - left;
  });
}

function mapPostRowToFeedItem(
  row: FeedPostRow,
  accountId: string | null,
  index: number,
  engagement: FeedEngagement = {
    likes: 0,
    replyPreview: [],
    replies: 0,
    viewerHasBookmarked: false,
    viewerHasLiked: false,
  },
  authorProfile?: FeedItem["authorProfile"],
  poll?: FeedPollSummary,
): FeedItem {
  const isOwnPost = row.author_account_id === accountId;
  const publicProjection = readPublicProjection(row.public_projection_payload);
  const reportShare = publicProjection.reportShare
    ? {
        ...publicProjection.reportShare,
        href: `/feed/reports/${row.id}`,
      }
    : undefined;

  return {
    authorHandle:
      publicProjection.authorHandle ??
      (isOwnPost
        ? "me"
        : createFallbackHandle(authorProfile?.display.displayName)),
    authorName:
      publicProjection.authorName ??
      authorProfile?.display.displayName ??
      (isOwnPost ? "나" : "NUANG 사용자"),
    authorProfile,
    avatarLabel: isOwnPost ? "나" : "유",
    body: normalizeReportShareBody(
      row.body,
      reportShare,
      row.public_projection_payload,
    ),
    id: row.id,
    kind: "user_post",
    layout: "thread",
    likeCount: engagement.likes,
    likeLabel: formatFeedCountLabel("좋아요", engagement.likes),
    poll,
    priority: -1000 + index,
    reportShare,
    replyCount: engagement.replies,
    replyLabel: formatFeedCountLabel("답글", engagement.replies),
    replyPreview: engagement.replyPreview,
    statusLabel: getStatusLabel(row),
    targetType: "feed_post",
    timeLabel: formatRelativeFeedTime(row.published_at ?? row.created_at),
    title: sourceTitleMap[row.source],
    viewerHasBookmarked: engagement.viewerHasBookmarked,
    viewerHasLiked: engagement.viewerHasLiked,
  };
}

function readPublicProjection(value: unknown) {
  if (!value || typeof value !== "object") {
    return {
      authorHandle: null,
      authorName: null,
    };
  }

  const projection = value as {
    authorHandle?: unknown;
    authorName?: unknown;
    reportShare?: unknown;
  };

  return {
    authorHandle: stringValue(projection.authorHandle),
    authorName: stringValue(projection.authorName),
    reportShare: parseReportShareProjection(projection.reportShare),
  };
}

function parseReportShareProjection(
  value: unknown,
): Omit<NonNullable<FeedItem["reportShare"]>, "href"> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const reportShare = value as {
    assessmentKind?: unknown;
    completedAt?: unknown;
    domains?: unknown;
    profileCode?: unknown;
    profileName?: unknown;
    resultLabel?: unknown;
  };

  if (
    typeof reportShare.profileCode !== "string" ||
    typeof reportShare.profileName !== "string"
  ) {
    return null;
  }

  return {
    assessmentKind:
      reportShare.assessmentKind === "quick" ||
      reportShare.assessmentKind === "full"
        ? reportShare.assessmentKind
        : "full",
    completedAt:
      typeof reportShare.completedAt === "string"
        ? reportShare.completedAt
        : "",
    domains: Array.isArray(reportShare.domains)
      ? reportShare.domains.slice(0, 5).flatMap((domain) => {
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
    profileCode: reportShare.profileCode,
    profileName:
      getSupportedNuangProfileName(reportShare.profileCode) ??
      reportShare.profileName,
    resultLabel:
      typeof reportShare.resultLabel === "string"
        ? reportShare.resultLabel
        : "뉴앙 리포트",
  };
}

function normalizeReportShareBody(
  body: string,
  reportShare:
    Omit<NonNullable<FeedItem["reportShare"]>, "href"> | null | undefined,
  rawProjection: unknown,
) {
  if (!reportShare) {
    return body;
  }

  const storedProfileName = readStoredReportShareProfileName(rawProjection);

  if (!storedProfileName || storedProfileName === reportShare.profileName) {
    return body;
  }

  return body.split(storedProfileName).join(reportShare.profileName);
}

function readStoredReportShareProfileName(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const projection = value as {
    reportShare?: unknown;
  };

  if (!projection.reportShare || typeof projection.reportShare !== "object") {
    return null;
  }

  const reportShare = projection.reportShare as {
    profileName?: unknown;
  };

  return stringValue(reportShare.profileName);
}

function createFallbackHandle(displayName?: string) {
  if (!displayName) return "nuang.user";

  return (
    displayName
      .trim()
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, ".")
      .replace(/^\.+|\.+$/g, "")
      .slice(0, 24) || "nuang.user"
  );
}

function coercePublicProfileSnapshotPayload(
  value: unknown,
  fallbackSnapshotId: string,
): PublicProfileSnapshotPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const snapshot = value as PublicProfileSnapshotPayload;
  const motif = snapshot.displayProfile?.motif;
  const displayName = snapshot.displayProfile?.displayName;

  if (
    !snapshot.profile?.code ||
    !snapshot.profile?.name ||
    !snapshot.publicData?.coreDomainMap ||
    !displayName ||
    !motif
  ) {
    return null;
  }

  return {
    ...snapshot,
    displayProfile: {
      ...snapshot.displayProfile,
      profileImage:
        snapshot.displayProfile.profileImage ??
        createCharacterProfileImage({
          alt: `${displayName} 프로필 이미지`,
          motif,
        }),
    },
    snapshotId: snapshot.snapshotId ?? fallbackSnapshotId,
  };
}

function isVisibleComment(row: FeedCommentBaseRow, accountId: string | null) {
  if (row.moderation_status === "published") {
    return true;
  }

  return Boolean(accountId && row.author_account_id === accountId);
}

function isCurrentNuangCode(code: string | null | undefined): code is string {
  return Boolean(code && getCandidateProfileDefinition(code));
}

function isUsefulFeedItem(item: FeedItem) {
  if (demoFeedHandles.has(item.authorHandle)) {
    return false;
  }

  if (item.reportShare) {
    return isCurrentNuangCode(item.reportShare.profileCode);
  }

  if (item.poll?.promptId === homeDailyCommunityPollPromptId) {
    return true;
  }

  const readableCharacterCount = `${item.title} ${item.body}`.match(
    /[가-힣A-Za-z0-9]/g,
  )?.length;

  return (readableCharacterCount ?? 0) >= 12;
}

function formatRelativeFeedTime(value: string) {
  const time = new Date(value).getTime();

  if (!Number.isFinite(time)) return "방금";

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - time) / 1000));

  if (elapsedSeconds < 60) return "방금";

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}분`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}시간`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 30) return `${elapsedDays}일`;

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
  }).format(new Date(time));
}

function compareCommentsByCreatedAtDesc(
  left: FeedCommentBaseRow,
  right: FeedCommentBaseRow,
) {
  return (
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

function mapCommentRowToReplyPreview(
  row: FeedCommentBaseRow,
  accountId: string | null,
): FeedReplyPreview {
  const isOwnComment = row.author_account_id === accountId;

  return {
    authorHandle: isOwnComment ? "me" : "nuang.user",
    authorName: isOwnComment ? "나" : "NUANG 사용자",
    body: row.body,
    id: row.id,
    statusLabel: getCommentStatusLabel(row),
  };
}

function getCommentStatusLabel(row: FeedCommentBaseRow) {
  if (row.moderation_status === "pending_review") {
    return "게시 전 확인 중";
  }

  if (row.moderation_status === "limited") {
    return "노출 제한";
  }

  return undefined;
}

function formatFeedCountLabel(label: "답글" | "좋아요", value: number) {
  return `${label} ${value.toLocaleString("ko-KR")}개`;
}

function groupBy<TItem>(items: TItem[], getKey: (item: TItem) => string) {
  const grouped = new Map<string, TItem[]>();

  for (const item of items) {
    const key = getKey(item);
    const current = grouped.get(key) ?? [];
    current.push(item);
    grouped.set(key, current);
  }

  return grouped;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getStatusLabel(row: FeedPostRow) {
  if (row.moderation_status === "pending_review") {
    return "게시 전 확인 중";
  }

  if (row.moderation_status === "limited") {
    return "노출 제한";
  }

  return undefined;
}
