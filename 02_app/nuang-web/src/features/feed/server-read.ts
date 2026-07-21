import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  mergeCommunityProfileIntoSnapshot,
  readCommunityProfileForAccount,
  readCommunityProfilesForAccounts,
} from "@/features/account/server-community-profile";
import { createPublicProfileCardPayload } from "@/features/public-profile/public-profile-card-contract";
import { createCharacterProfileImage } from "@/features/public-profile/profile-image";
import { readBlockedCommunityAccountIds } from "@/features/feed/server-community-social";
import {
  createFeedReadPayload,
  type FeedReadPayload,
} from "@/features/feed/feed-contract";
import type {
  FeedItem,
  FeedPostMedia,
  FeedPollSummary,
  FeedReplyPreview,
} from "@/features/feed/feed-seed";
import { feedCodeStatsDisplayThreshold } from "@/features/feed/feed-privacy";
import { feedMediaBucket } from "@/features/feed/feed-media";
import {
  feedPostTopicLabels,
  type FeedPostTopicCategory,
} from "@/features/feed/feed-topic";
import { homeDailyCommunityPollPromptId } from "@/features/feed/feed-prompts";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";
import { getCurrentNuangProfileName } from "@/features/nuang-code/profile-name-resolution";
import type { PublicProfileSnapshotPayload } from "@/features/together/public-comparison-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type FeedPostRow = {
  attachment_payload: unknown;
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
  topic_category: FeedPostTopicCategory | null;
  topic_tags: string[];
  visibility: "private_draft" | "profile_public" | "public";
};

const feedPostSelectWithTopics =
  "id, author_account_id, source, source_id, body, visibility, moderation_status, topic_category, topic_tags, attachment_payload, public_projection_payload, created_at, published_at";
const feedPostSelectLegacy =
  "id, author_account_id, source, source_id, body, visibility, moderation_status, attachment_payload, public_projection_payload, created_at, published_at";

type FeedPostMediaRow = {
  height: number | null;
  id: string;
  post_id: string;
  sort_order: number;
  storage_path: string;
  width: number | null;
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

type FeedPlaygroundVoteRow = FeedPollVoteRow & {
  created_at: string;
  id: string;
};

type FeedPlaygroundPollRow = FeedPollRow & {
  created_at: string;
  status: "active" | "closed" | "removed";
};

type FeedPlaygroundPostRow = {
  id: string;
  topic_category: FeedPostTopicCategory | null;
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

export type FeedPlaygroundRecord = {
  canRevote: boolean;
  participatedAt: string;
  poll: FeedPollSummary | null;
  pollId: string;
  postId: string | null;
  question: string;
  selectedCode: string | null;
  selectedOptionLabel: string;
  selectedProfileName: string | null;
  status: "active" | "closed" | "removed";
  topicLabel: string;
  voteId: string;
};

export type FeedPlaygroundRecordsPayload = {
  records: FeedPlaygroundRecord[];
  state: "ready" | "unauthenticated" | "unavailable";
};

export type FeedReportSharePayload = {
  body: string;
  createdAt: string;
  reportShare: NonNullable<FeedItem["reportShare"]>;
};

export type FeedPostDetailPayload = {
  comments: FeedReplyPreview[];
  post: FeedItem;
  viewer: {
    isAuthenticated: boolean;
  };
};

export type CommunityProfileReadPayload = {
  posts: FeedItem[];
  profile: NonNullable<FeedItem["authorProfile"]>;
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
  const [hiddenTargets, blockedAccountIds] = await Promise.all([
    readNotInterestedTargets({
      accountId,
      client: serviceClient,
      postIds: mergedRows.map((row) => row.id),
      seedKeys: [],
    }),
    readBlockedCommunityAccountIds({ accountId, client: serviceClient }),
  ]);
  const visibleRows = mergedRows.filter(
    (row) =>
      !hiddenTargets.postIds.has(row.id) &&
      !blockedAccountIds.has(row.author_account_id),
  );
  const authorProfilesByAccountId = await readPublicProfileCardsForAccounts({
    accountIds: [
      ...visibleRows.map((row) => row.author_account_id),
      ...(accountId ? [accountId] : []),
    ],
    client: serviceClient,
  });
  const [engagementByPostId, pollByPostId, mediaByPostId] = await Promise.all([
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
    readPostMedia({
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
        mediaByPostId.get(row.id),
      ),
    )
    .filter(isUsefulFeedItem);

  return {
    ...basePayload,
    items: dbItems,
    stories: [],
    viewerCode: accountId
      ? normalizeVisibleCode(
          authorProfilesByAccountId.get(accountId)?.display.code ?? null,
        )
      : null,
  };
}

export async function createServerCommunityProfilePayload(
  profileId: string,
): Promise<CommunityProfileReadPayload | null> {
  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient || !uuidPattern.test(profileId)) return null;

  const source = await readCommunityProfileSource({
    client: serviceClient,
    profileId,
  });
  if (!source) return null;

  const baseSnapshot = coercePublicProfileSnapshotPayload(
    source.snapshot.snapshot_payload,
    source.snapshot.id,
  );

  if (!baseSnapshot || !isCurrentNuangCode(baseSnapshot.profile.code)) {
    return null;
  }

  const snapshot = await mergeCommunityProfileIntoSnapshot({
    client: serviceClient,
    profile: source.communityProfile,
    snapshot: baseSnapshot,
  });

  const accountId = await getCurrentAccountId(serviceClient);
  const blockedAccountIds = await readBlockedCommunityAccountIds({
    accountId,
    client: serviceClient,
  });
  if (blockedAccountIds.has(source.snapshot.account_id)) return null;

  const profile = createPublicProfileCardPayload({
    cardId: `profile_${source.snapshot.id}`,
    communityProfileId: source.communityProfile?.id ?? source.snapshot.id,
    snapshot,
    status: "published",
  });
  const postRows = await readProfilePosts({
    accountId: source.snapshot.account_id,
    client: serviceClient,
    includeNonPublished: accountId === source.snapshot.account_id,
  });
  const [engagementByPostId, pollByPostId, mediaByPostId] = await Promise.all([
    readPostEngagements({ accountId, client: serviceClient, rows: postRows }),
    readPollSummaries({ accountId, client: serviceClient, rows: postRows }),
    readPostMedia({ client: serviceClient, rows: postRows }),
  ]);
  const posts = postRows
    .map((postRow, index) =>
      mapPostRowToFeedItem(
        postRow,
        accountId,
        index,
        engagementByPostId.get(postRow.id),
        profile,
        pollByPostId.get(postRow.id),
        mediaByPostId.get(postRow.id),
      ),
    )
    .filter(isUsefulFeedItem);

  return {
    posts,
    profile,
  };
}

async function readCommunityProfileSource({
  client,
  profileId,
}: {
  client: SupabaseClient;
  profileId: string;
}) {
  const communityResponse = await client
    .schema("profile")
    .from("community_profile")
    .select("account_id")
    .eq("id", profileId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (!communityResponse.error && communityResponse.data?.account_id) {
    const accountId = String(communityResponse.data.account_id);
    const snapshotResponse = await client
      .schema("profile")
      .from("profile_public_snapshot")
      .select("id, account_id, snapshot_payload")
      .eq("account_id", accountId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!snapshotResponse.error && snapshotResponse.data) {
      return {
        communityProfile: await readCommunityProfileForAccount({
          accountId,
          client,
        }),
        snapshot: snapshotResponse.data as PublicProfileSnapshotRow,
      };
    }
  }

  const snapshotResponse = await client
    .schema("profile")
    .from("profile_public_snapshot")
    .select("id, account_id, snapshot_payload")
    .eq("id", profileId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (snapshotResponse.error || !snapshotResponse.data) return null;
  const snapshot = snapshotResponse.data as PublicProfileSnapshotRow;

  return {
    communityProfile: await readCommunityProfileForAccount({
      accountId: snapshot.account_id,
      client,
    }),
    snapshot,
  };
}

/*
 * `profileId` accepts both the new stable community profile id and the old
 * public snapshot id so existing shared links keep working.
 */
export async function resolveCurrentCommunityProfileId() {
  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) return null;

  const accountId = await getCurrentAccountId(serviceClient);
  if (!accountId) return null;

  const profile = await readCommunityProfileForAccount({
    accountId,
    client: serviceClient,
  });
  if (profile) return profile.id;

  return resolveCurrentCommunityProfileSnapshotId();
}

/* Legacy snapshot lookup remains available for comparison and old links. */
export async function resolveCurrentCommunityProfileSnapshotId() {
  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) return null;

  const accountId = await getCurrentAccountId(serviceClient);
  if (!accountId) return null;

  const response = await serviceClient
    .schema("profile")
    .from("profile_public_snapshot")
    .select("id")
    .eq("account_id", accountId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (response.error || !response.data) return null;
  return String(response.data.id);
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

export async function createServerFeedPostDetailPayload(
  postId: string,
): Promise<FeedPostDetailPayload | null> {
  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient || !uuidPattern.test(postId)) {
    return null;
  }

  let response = await serviceClient
    .schema("feed")
    .from("feed_post")
    .select(feedPostSelectWithTopics)
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();

  if (isMissingFeedTopicColumns(response.error)) {
    response = await serviceClient
      .schema("feed")
      .from("feed_post")
      .select(feedPostSelectLegacy)
      .eq("id", postId)
      .is("deleted_at", null)
      .maybeSingle();
  }

  if (response.error || !response.data) {
    return null;
  }

  const row = normalizeFeedPostRow(response.data);
  const accountId = await getCurrentAccountId(serviceClient);
  const blockedAccountIds = await readBlockedCommunityAccountIds({
    accountId,
    client: serviceClient,
  });
  if (blockedAccountIds.has(row.author_account_id)) return null;
  const isOwnPost = row.author_account_id === accountId;
  const isPublicPost =
    row.moderation_status === "published" &&
    (row.visibility === "public" || row.visibility === "profile_public");

  if (!isOwnPost && !isPublicPost) {
    return null;
  }

  const [
    authorProfiles,
    engagementByPostId,
    pollByPostId,
    mediaByPostId,
    postReplies,
  ] = await Promise.all([
    readPublicProfileCardsForAccounts({
      accountIds: [row.author_account_id],
      client: serviceClient,
    }),
    readPostEngagements({
      accountId,
      client: serviceClient,
      rows: [row],
    }),
    readPollSummaries({
      accountId,
      client: serviceClient,
      rows: [row],
    }),
    readPostMedia({
      client: serviceClient,
      rows: [row],
    }),
    readPostReplies({
      accountId,
      client: serviceClient,
      postId: row.id,
    }),
  ]);
  const post = mapPostRowToFeedItem(
    row,
    accountId,
    0,
    engagementByPostId.get(row.id),
    authorProfiles.get(row.author_account_id),
    pollByPostId.get(row.id),
    mediaByPostId.get(row.id),
  );

  if (!isUsefulFeedItem(post)) {
    return null;
  }

  return {
    comments: postReplies.replies,
    post: {
      ...post,
      replyCount: postReplies.replyCount,
      replyLabel: formatFeedCountLabel("답글", postReplies.replyCount),
    },
    viewer: {
      isAuthenticated: Boolean(accountId),
    },
  };
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
    .filter(
      ([, codeVotes]) => codeVotes.length >= feedCodeStatsDisplayThreshold,
    )
    .sort(
      ([leftCode, leftVotes], [rightCode, rightVotes]) =>
        rightVotes.length - leftVotes.length ||
        leftCode.localeCompare(rightCode),
    )
    .map(([code, codeVotes]) => {
      const codeTotal = codeVotes.length;

      return {
        code,
        name:
          getCurrentNuangProfileName(code) ??
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

export async function createServerFeedPlaygroundRecordsPayload(): Promise<FeedPlaygroundRecordsPayload> {
  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return {
      records: [],
      state: "unavailable",
    };
  }

  const accountId = await getCurrentAccountId(serviceClient);

  if (!accountId) {
    return {
      records: [],
      state: "unauthenticated",
    };
  }

  const ownVoteResponse = await serviceClient
    .schema("feed")
    .from("feed_poll_vote")
    .select(
      "id, poll_id, option_id, account_id, nuang_code, profile_name, created_at",
    )
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (ownVoteResponse.error || !ownVoteResponse.data) {
    return {
      records: [],
      state: "unavailable",
    };
  }

  const ownVotes = ownVoteResponse.data as FeedPlaygroundVoteRow[];

  if (ownVotes.length === 0) {
    return {
      records: [],
      state: "ready",
    };
  }

  const pollIds = [...new Set(ownVotes.map((vote) => vote.poll_id))];
  const pollResponse = await serviceClient
    .schema("feed")
    .from("feed_poll")
    .select("id, post_id, prompt_id, question, status, created_at")
    .in("id", pollIds)
    .is("deleted_at", null);

  if (pollResponse.error || !pollResponse.data) {
    return {
      records: [],
      state: "unavailable",
    };
  }

  const polls = pollResponse.data as FeedPlaygroundPollRow[];
  const postIds = [
    ...new Set(polls.map((poll) => poll.post_id).filter(Boolean)),
  ];
  const [optionResponse, voteResponse, postResponse] = await Promise.all([
    serviceClient
      .schema("feed")
      .from("feed_poll_option")
      .select("id, poll_id, option_key, label, sort_order")
      .in("poll_id", pollIds)
      .order("sort_order", { ascending: true }),
    serviceClient
      .schema("feed")
      .from("feed_poll_vote")
      .select("poll_id, option_id, account_id, nuang_code, profile_name")
      .in("poll_id", pollIds)
      .is("deleted_at", null),
    postIds.length > 0
      ? serviceClient
          .schema("feed")
          .from("feed_post")
          .select("id, topic_category")
          .in("id", postIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (
    optionResponse.error ||
    !optionResponse.data ||
    voteResponse.error ||
    (postResponse.error && !isMissingFeedTopicColumns(postResponse.error))
  ) {
    return {
      records: [],
      state: "unavailable",
    };
  }

  const pollById = new Map(polls.map((poll) => [poll.id, poll]));
  const optionsByPollId = groupBy(
    optionResponse.data as FeedPollOptionRow[],
    (option) => option.poll_id,
  );
  const votesByPollId = groupBy(
    (voteResponse.data ?? []) as FeedPollVoteRow[],
    (vote) => vote.poll_id,
  );
  const postById = new Map(
    (
      (postResponse.error
        ? []
        : (postResponse.data ?? [])) as FeedPlaygroundPostRow[]
    ).map((post) => [post.id, post]),
  );

  return {
    records: ownVotes.map((ownVote) => {
      const poll = pollById.get(ownVote.poll_id);
      const options = optionsByPollId.get(ownVote.poll_id) ?? [];
      const selectedOption = options.find(
        (option) => option.id === ownVote.option_id,
      );
      const selectedCode = isCurrentNuangCode(ownVote.nuang_code)
        ? ownVote.nuang_code
        : null;
      const selectedProfileName = selectedCode
        ? (getCurrentNuangProfileName(selectedCode) ??
          getCandidateProfileDefinition(selectedCode)?.displayName ??
          ownVote.profile_name)
        : null;

      if (!poll) {
        return {
          canRevote: false,
          participatedAt: ownVote.created_at,
          poll: null,
          pollId: ownVote.poll_id,
          postId: null,
          question: "더 이상 볼 수 없는 질문",
          selectedCode,
          selectedOptionLabel: selectedOption?.label ?? "기록된 선택",
          selectedProfileName,
          status: "removed" as const,
          topicLabel: "지난 질문",
          voteId: ownVote.id,
        };
      }

      const votes = votesByPollId.get(poll.id) ?? [];
      const totalVotes = votes.length;
      const codeVotes = groupBy(
        votes.filter((vote) => isCurrentNuangCode(vote.nuang_code)),
        (vote) => String(vote.nuang_code),
      );
      const codePerspectives = [...codeVotes.entries()]
        .filter(
          ([, groupedVotes]) =>
            groupedVotes.length >= feedCodeStatsDisplayThreshold,
        )
        .sort(
          ([leftCode, leftVotes], [rightCode, rightVotes]) =>
            rightVotes.length - leftVotes.length ||
            leftCode.localeCompare(rightCode),
        )
        .map(([code, groupedVotes]) => ({
          code,
          name:
            getCurrentNuangProfileName(code) ??
            groupedVotes.find((vote) => vote.profile_name)?.profile_name ??
            "뉴앙 코드",
          options: options.map((option) => {
            const voteCount = groupedVotes.filter(
              (vote) => vote.option_id === option.id,
            ).length;

            return {
              label: option.label,
              ratio: Math.round((voteCount / groupedVotes.length) * 100),
              voteCount,
            };
          }),
          totalVotes: groupedVotes.length,
        }));
      const post = postById.get(poll.post_id);
      const pollSummary: FeedPollSummary = {
        canViewCodeStats: codePerspectives.length > 0,
        codePerspectives,
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
            viewerHasVoted: ownVote.option_id === option.id,
            voteCount,
          };
        }),
        promptId: poll.prompt_id,
        question: poll.question,
        statsHref: `/feed/polls/${poll.id}/stats`,
        totalVotes,
        viewerCode: selectedCode,
        viewerVoteOptionId: ownVote.option_id,
      };

      return {
        canRevote: poll.status === "active",
        participatedAt: ownVote.created_at,
        poll: pollSummary,
        pollId: poll.id,
        postId: poll.post_id,
        question: poll.question,
        selectedCode,
        selectedOptionLabel: selectedOption?.label ?? "기록된 선택",
        selectedProfileName,
        status: poll.status,
        topicLabel: resolvePlaygroundTopicLabel({
          category: post?.topic_category ?? null,
          promptId: poll.prompt_id,
          question: poll.question,
        }),
        voteId: ownVote.id,
      };
    }),
    state: "ready",
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
    .select(
      "id, author_account_id, body, moderation_status, public_projection_payload, visibility, created_at",
    )
    .eq("id", postId)
    .eq("source", "report_share")
    .is("deleted_at", null)
    .maybeSingle();

  if (response.error || !response.data) {
    return null;
  }

  const row = response.data as {
    author_account_id: string;
    body: string;
    created_at: string;
    id: string;
    moderation_status: FeedPostRow["moderation_status"];
    public_projection_payload: unknown;
    visibility: FeedPostRow["visibility"];
  };
  const accountId = await getCurrentAccountId(serviceClient);
  const isOwnPost = row.author_account_id === accountId;
  const isPublicPost =
    row.moderation_status === "published" &&
    (row.visibility === "public" || row.visibility === "profile_public");

  if (!isOwnPost && !isPublicPost) {
    return null;
  }

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
    .select(feedPostSelectWithTopics)
    .eq("moderation_status", "published")
    .eq("visibility", "public")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(20);

  if (isMissingFeedTopicColumns(response.error)) {
    const legacyResponse = await client
      .schema("feed")
      .from("feed_post")
      .select(feedPostSelectLegacy)
      .eq("moderation_status", "published")
      .eq("visibility", "public")
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .limit(20);

    if (legacyResponse.error || !legacyResponse.data) return [];
    return legacyResponse.data.map(normalizeFeedPostRow);
  }

  if (response.error || !response.data) {
    return [];
  }

  return response.data.map(normalizeFeedPostRow);
}

async function readOwnPosts(client: SupabaseClient, accountId: string) {
  const response = await client
    .schema("feed")
    .from("feed_post")
    .select(feedPostSelectWithTopics)
    .eq("author_account_id", accountId)
    .in("moderation_status", ["pending_review", "published", "limited"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (isMissingFeedTopicColumns(response.error)) {
    const legacyResponse = await client
      .schema("feed")
      .from("feed_post")
      .select(feedPostSelectLegacy)
      .eq("author_account_id", accountId)
      .in("moderation_status", ["pending_review", "published", "limited"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (legacyResponse.error || !legacyResponse.data) return [];
    return legacyResponse.data.map(normalizeFeedPostRow);
  }

  if (response.error || !response.data) {
    return [];
  }

  return response.data.map(normalizeFeedPostRow);
}

async function readProfilePosts({
  accountId,
  client,
  includeNonPublished,
}: {
  accountId: string;
  client: SupabaseClient;
  includeNonPublished: boolean;
}) {
  let query = client
    .schema("feed")
    .from("feed_post")
    .select(feedPostSelectWithTopics)
    .eq("author_account_id", accountId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  query = includeNonPublished
    ? query.in("moderation_status", ["pending_review", "published", "limited"])
    : query
        .eq("moderation_status", "published")
        .in("visibility", ["public", "profile_public"]);
  const response = await query;

  if (isMissingFeedTopicColumns(response.error)) {
    let legacyQuery = client
      .schema("feed")
      .from("feed_post")
      .select(feedPostSelectLegacy)
      .eq("author_account_id", accountId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    legacyQuery = includeNonPublished
      ? legacyQuery.in("moderation_status", [
          "pending_review",
          "published",
          "limited",
        ])
      : legacyQuery
          .eq("moderation_status", "published")
          .in("visibility", ["public", "profile_public"]);
    const legacyResponse = await legacyQuery;
    if (legacyResponse.error || !legacyResponse.data) return [];
    return legacyResponse.data.map(normalizeFeedPostRow);
  }

  if (response.error || !response.data) return [];
  return response.data.map(normalizeFeedPostRow);
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
    message.includes("topic_tags")
  );
}

function normalizeFeedPostRow(value: unknown): FeedPostRow {
  const row = value as Omit<FeedPostRow, "topic_category" | "topic_tags"> & {
    topic_category?: FeedPostTopicCategory | null;
    topic_tags?: unknown;
  };

  return {
    ...row,
    topic_category: row.topic_category ?? null,
    topic_tags: Array.isArray(row.topic_tags)
      ? row.topic_tags.filter((tag): tag is string => typeof tag === "string")
      : [],
  };
}

async function readPostMedia({
  client,
  rows,
}: {
  client: SupabaseClient;
  rows: FeedPostRow[];
}) {
  const mediaByPostId = new Map<string, FeedPostMedia[]>();
  const postIds = rows.map((row) => row.id);

  if (postIds.length === 0) return mediaByPostId;

  const response = await client
    .schema("feed")
    .from("feed_post_media")
    .select("id, post_id, storage_path, sort_order, width, height")
    .in("post_id", postIds)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (response.error || !response.data) {
    return readLegacyPostMedia({ client, rows });
  }

  const mediaRows = response.data as FeedPostMediaRow[];
  const signedResponse = await client.storage
    .from(feedMediaBucket)
    .createSignedUrls(
      mediaRows.map((row) => row.storage_path),
      60 * 60,
    );

  if (signedResponse.error || !signedResponse.data) return mediaByPostId;

  const signedUrlByPath = new Map(
    signedResponse.data.flatMap((item) =>
      item.signedUrl ? [[item.path, item.signedUrl] as const] : [],
    ),
  );

  for (const row of mediaRows) {
    const url = signedUrlByPath.get(row.storage_path);
    if (!url) continue;

    const media = mediaByPostId.get(row.post_id) ?? [];
    media.push({
      alt: `게시물 사진 ${row.sort_order}`,
      height: row.height,
      id: row.id,
      url,
      width: row.width,
    });
    mediaByPostId.set(row.post_id, media);
  }

  const legacyMediaByPostId = await readLegacyPostMedia({ client, rows });
  for (const [postId, legacyMedia] of legacyMediaByPostId) {
    if (!mediaByPostId.has(postId)) mediaByPostId.set(postId, legacyMedia);
  }

  return mediaByPostId;
}

async function readLegacyPostMedia({
  client,
  rows,
}: {
  client: SupabaseClient;
  rows: FeedPostRow[];
}) {
  const mediaByPostId = new Map<string, FeedPostMedia[]>();
  const storedItems = rows.flatMap((row) =>
    parseLegacyMediaAttachments(row.attachment_payload).flatMap((media) =>
      media.storagePath ? [{ postId: row.id, ...media }] : [],
    ),
  );
  const signedUrlByPath = new Map<string, string>();

  if (storedItems.length > 0) {
    const signedResponse = await client.storage
      .from(feedMediaBucket)
      .createSignedUrls(
        storedItems.map((item) => String(item.storagePath)),
        60 * 60,
      );
    for (const item of signedResponse.data ?? []) {
      if (item.path && item.signedUrl)
        signedUrlByPath.set(item.path, item.signedUrl);
    }
  }

  for (const row of rows) {
    const media = parseLegacyMediaAttachments(row.attachment_payload).flatMap(
      (item, index) => {
        const url =
          item.externalUrl ??
          (item.storagePath ? signedUrlByPath.get(item.storagePath) : null);
        if (!url) return [];

        return [
          {
            alt: item.alt ?? `게시물 사진 ${index + 1}`,
            height: item.height,
            id: item.id ?? `legacy_${row.id}_${index + 1}`,
            url,
            width: item.width,
          } satisfies FeedPostMedia,
        ];
      },
    );
    if (media.length > 0) mediaByPostId.set(row.id, media);
  }

  return mediaByPostId;
}

function parseLegacyMediaAttachments(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 19).flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Record<string, unknown>;
    const externalUrl = readAllowedReviewImageUrl(item.externalUrl);
    const storagePath = stringValue(item.storagePath);
    if (!externalUrl && !storagePath) return [];

    return [
      {
        alt: stringValue(item.alt),
        externalUrl,
        height: typeof item.height === "number" ? item.height : null,
        id: stringValue(item.id),
        storagePath,
        width: typeof item.width === "number" ? item.width : null,
      },
    ];
  });
}

function readAllowedReviewImageUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "images.unsplash.com") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
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
    const commentProfiles = await readPublicProfileCardsForAccounts({
      accountIds: (commentResponse.data as FeedPostCommentRow[]).map(
        (row) => row.author_account_id,
      ),
      client,
    });
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
        .map((comment) =>
          mapCommentRowToReplyPreview(
            comment,
            accountId,
            commentProfiles.get(comment.author_account_id),
          ),
        );
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
  const commentProfiles = await readPublicProfileCardsForAccounts({
    accountIds: visibleComments.map((row) => row.author_account_id),
    client,
  });

  return {
    replies: visibleComments.map((comment) =>
      mapCommentRowToReplyPreview(
        comment,
        accountId,
        commentProfiles.get(comment.author_account_id),
      ),
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
    const codePerspectives = [...codeVotes.entries()]
      .filter(
        ([, groupedVotes]) =>
          groupedVotes.length >= feedCodeStatsDisplayThreshold,
      )
      .sort(
        ([leftCode, leftVotes], [rightCode, rightVotes]) =>
          rightVotes.length - leftVotes.length ||
          leftCode.localeCompare(rightCode),
      )
      .map(([code, groupedVotes]) => ({
        code,
        name:
          getCurrentNuangProfileName(code) ??
          groupedVotes.find((vote) => vote.profile_name)?.profile_name ??
          "뉴앙 코드",
        options: options.map((option) => {
          const voteCount = groupedVotes.filter(
            (vote) => vote.option_id === option.id,
          ).length;

          return {
            label: option.label,
            ratio: Math.round((voteCount / groupedVotes.length) * 100),
            voteCount,
          };
        }),
        totalVotes: groupedVotes.length,
      }));

    pollByPostId.set(poll.post_id, {
      canViewCodeStats: codePerspectives.length > 0,
      codePerspectives,
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
      viewerCode: isCurrentNuangCode(viewerVote?.nuang_code)
        ? viewerVote.nuang_code
        : null,
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

  const communityProfiles = await readCommunityProfilesForAccounts({
    accountIds: uniqueAccountIds,
    client,
  });

  for (const row of response.data as PublicProfileSnapshotRow[]) {
    if (profilesByAccountId.has(row.account_id)) {
      continue;
    }

    const baseSnapshot = coercePublicProfileSnapshotPayload(
      row.snapshot_payload,
      row.id,
    );

    if (!baseSnapshot || !isCurrentNuangCode(baseSnapshot.profile.code)) {
      continue;
    }

    const communityProfile = communityProfiles.get(row.account_id) ?? null;
    const snapshot = await mergeCommunityProfileIntoSnapshot({
      client,
      profile: communityProfile,
      snapshot: baseSnapshot,
    });

    profilesByAccountId.set(
      row.account_id,
      createPublicProfileCardPayload({
        cardId: `profile_${row.id}`,
        communityProfileId: communityProfile?.id ?? row.id,
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
  media: FeedPostMedia[] = [],
): FeedItem {
  const isOwnPost = row.author_account_id === accountId;
  const publicProjection = readPublicProjection(row.public_projection_payload);
  const reportShare = publicProjection.reportShare
    ? {
        ...publicProjection.reportShare,
        href: `/feed/reports/${row.id}`,
      }
    : undefined;
  const topicCategory =
    row.topic_category ?? publicProjection.topic?.category ?? null;
  const topicTags =
    row.topic_tags.length > 0
      ? row.topic_tags
      : (publicProjection.topic?.tags ?? []);

  return {
    authorHandle:
      publicProjection.authorHandle ??
      (isOwnPost
        ? "me"
        : (authorProfile?.display.handle ??
          createFallbackHandle(authorProfile?.display.displayName))),
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
    media,
    poll,
    priority: -1000 + index,
    questionAudience: parseQuestionAudience(row.source_id),
    reportShare,
    replyCount: engagement.replies,
    replyLabel: formatFeedCountLabel("답글", engagement.replies),
    replyPreview: engagement.replyPreview,
    statusLabel: getStatusLabel(row),
    targetType: "feed_post",
    timeLabel: formatRelativeFeedTime(row.published_at ?? row.created_at),
    title: sourceTitleMap[row.source],
    topic:
      topicCategory || topicTags.length > 0
        ? {
            category: topicCategory,
            label: topicCategory ? feedPostTopicLabels[topicCategory] : null,
            tags: topicTags,
          }
        : undefined,
    viewerHasBookmarked: engagement.viewerHasBookmarked,
    viewerHasLiked: engagement.viewerHasLiked,
  };
}

function parseQuestionAudience(
  sourceId: string | null,
): FeedItem["questionAudience"] {
  if (!sourceId) return undefined;

  if (sourceId === "ask_all") return { codes: [], mode: "all" };
  if (sourceId === "ask_similar") return { codes: [], mode: "similar" };
  if (sourceId === "ask_different") return { codes: [], mode: "different" };

  if (sourceId.startsWith("ask_exact_")) {
    const code = sourceId.slice("ask_exact_".length).toUpperCase();
    return isCurrentNuangCode(code)
      ? { codes: [code], mode: "exact" }
      : undefined;
  }

  if (sourceId.startsWith("ask_trait_")) {
    const codes = sourceId
      .slice("ask_trait_".length)
      .split("_")
      .map((symbol) => symbol.toUpperCase())
      .filter((symbol) => /^[A-Z]$/.test(symbol))
      .slice(0, 3);
    return codes.length > 0 ? { codes, mode: "trait" } : undefined;
  }

  return undefined;
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
    topic?: unknown;
  };

  return {
    authorHandle: stringValue(projection.authorHandle),
    authorName: stringValue(projection.authorName),
    reportShare: parseReportShareProjection(projection.reportShare),
    topic: parseProjectionTopic(projection.topic),
  };
}

function parseProjectionTopic(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const topic = value as { category?: unknown; tags?: unknown };
  const category =
    typeof topic.category === "string" &&
    Object.prototype.hasOwnProperty.call(feedPostTopicLabels, topic.category)
      ? (topic.category as FeedPostTopicCategory)
      : null;
  const tags = Array.isArray(topic.tags)
    ? topic.tags
        .filter((tag): tag is string => typeof tag === "string")
        .slice(0, 8)
    : [];
  return category || tags.length > 0 ? { category, tags } : null;
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
      getCurrentNuangProfileName(reportShare.profileCode) ??
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

function normalizeVisibleCode(value: string | null) {
  return value && isCurrentNuangCode(value) ? value : null;
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

function resolvePlaygroundTopicLabel({
  category,
  promptId,
  question,
}: {
  category: FeedPostTopicCategory | null;
  promptId: string;
  question: string;
}) {
  if (category) {
    return feedPostTopicLabels[category];
  }

  const searchableText = `${promptId} ${question}`.toLocaleLowerCase("ko-KR");

  if (
    ["관계", "연인", "친구", "가족", "relationship"].some((keyword) =>
      searchableText.includes(keyword),
    )
  ) {
    return "관계";
  }

  if (
    ["대화", "말", "연락", "conversation"].some((keyword) =>
      searchableText.includes(keyword),
    )
  ) {
    return "대화";
  }

  if (
    ["취향", "여행", "음악", "카페", "preference", "trip"].some((keyword) =>
      searchableText.includes(keyword),
    )
  ) {
    return "취향";
  }

  return "일상";
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
  authorProfile?: FeedItem["authorProfile"],
): FeedReplyPreview {
  const isOwnComment = row.author_account_id === accountId;

  return {
    authorCode: authorProfile?.display.code,
    authorHandle: isOwnComment
      ? "me"
      : createFallbackHandle(authorProfile?.display.displayName),
    authorName: isOwnComment
      ? "나"
      : (authorProfile?.display.displayName ?? "NUANG 사용자"),
    body: row.body,
    id: row.id,
    statusLabel: getCommentStatusLabel(row),
    timeLabel: formatRelativeFeedTime(row.created_at),
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
