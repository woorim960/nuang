import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import {
  mergeCommunityProfileIntoSnapshot,
  readCommunityProfileForAccount,
  readCommunityProfilesForAccounts,
} from "@/features/account/server-community-profile";
import { readOperatorAccountIds } from "@/features/admin/server-operator-identity";
import { createPublicProfileCardPayload } from "@/features/public-profile/public-profile-card-contract";
import { createCharacterProfileImage } from "@/features/public-profile/profile-image";
import { readBlockedCommunityAccountIds } from "@/features/feed/server-community-social";
import {
  readExternalLinksForComments,
  readExternalLinksForPosts,
} from "@/features/feed/server-link-safety";
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
import { isUserManageableFeedPostSource } from "@/features/feed/feed-post-management";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";
import { getCurrentNuangProfileName } from "@/features/nuang-code/profile-name-resolution";
import { readOriginalProfileReportSummaries } from "@/features/public-profile/server-profile-reports";
import {
  parseProfileReportKey,
  type OriginalProfileReportSummary,
  type ProfileReportKind,
} from "@/features/public-profile/profile-report-contract";
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
    | "together_balance_room_share"
    | "together_balance_result_share"
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
  status: "active" | "closed";
};

type OfficialContentState = {
  isFeatured: boolean;
  responseClosesAt: string | null;
  responseStatus: "closed" | "open";
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
  topic_tags: string[];
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
  tags: string[];
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
    nuangCode: string | null;
  };
};

export type CommunityProfileReadPayload = {
  posts: FeedItem[];
  profile: NonNullable<FeedItem["authorProfile"]>;
  reports: OriginalProfileReportSummary[];
  viewerCode: string | null;
};

type FeedHiddenTargets = {
  postIds: Set<string>;
  seedKeys: Set<string>;
};

const sourceTitleMap: Record<FeedPostRow["source"], string> = {
  balance_game: "투표",
  daily_mood: "오늘의 기분",
  daily_question: "오늘의 질문",
  free_text: "오늘의 생각",
  map_reflection: "성향지도 노트",
  report_share: "리포트 공유",
  together_balance_room_share: "밸런스 게임",
  together_balance_result_share: "밸런스 게임 결과",
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

export const communityFeedCacheTag = "community-feed-read-v1";
const anonymousFeedViewerKey = "anonymous";
const readCachedFeedPayload = unstable_cache(
  async (viewerKey: string) =>
    createFeedReadPayloadForViewer(
      viewerKey === anonymousFeedViewerKey ? null : viewerKey,
    ),
  ["community-feed-read-payload-v1"],
  {
    revalidate: 15,
    tags: [communityFeedCacheTag],
  },
);

export async function createServerFeedReadPayload({
  requiredPollId,
}: {
  requiredPollId?: string;
} = {}): Promise<FeedReadPayload> {
  const viewerId = await getCurrentSupabaseUserId();

  let payload: FeedReadPayload;
  if (process.env.NODE_ENV === "test") {
    payload = await createFeedReadPayloadForViewer(viewerId);
  } else {
    payload = await readCachedFeedPayload(viewerId ?? anonymousFeedViewerKey);
  }

  return requiredPollId
    ? ensureFeedPayloadIncludesPoll(payload, requiredPollId)
    : payload;
}

async function ensureFeedPayloadIncludesPoll(
  payload: FeedReadPayload,
  pollId: string,
): Promise<FeedReadPayload> {
  if (
    !uuidPattern.test(pollId) ||
    payload.items.some((item) => item.poll?.id === pollId)
  ) {
    return payload;
  }

  const pollPayload = await createServerFeedPollStatsPayload(pollId);
  if (!pollPayload) return payload;

  const postPayload = await createServerFeedPostDetailPayload(
    pollPayload.post.id,
  );
  if (postPayload?.post.poll?.id !== pollId) return payload;

  return {
    ...payload,
    items: [
      postPayload.post,
      ...payload.items.filter((item) => item.id !== postPayload.post.id),
    ],
  };
}

async function createFeedReadPayloadForViewer(
  viewerId: string | null,
): Promise<FeedReadPayload> {
  const basePayload = createFeedReadPayload();
  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return {
      ...basePayload,
      items: [],
      stories: [],
    };
  }

  const [accountId, publicPosts] = await Promise.all([
    viewerId
      ? readAccountIdForUser(serviceClient, viewerId)
      : Promise.resolve(null),
    readPublishedPosts(serviceClient),
  ]);
  const ownPosts = accountId
    ? await readOwnPosts(serviceClient, accountId)
    : [];
  const mergedRows = mergePostRows({
    accountId,
    ownPosts,
    publicPosts,
  });
  const [
    hiddenTargets,
    blockedAccountIdsResult,
    authorProfilesByAccountId,
    engagementByPostId,
    pollByPostId,
    mediaByPostId,
    linksByPostId,
    officialStateByPostId,
  ] = await Promise.all([
    readNotInterestedTargets({
      accountId,
      client: serviceClient,
      postIds: mergedRows.map((row) => row.id),
      seedKeys: [],
    }),
    readBlockedCommunityAccountIds({ accountId, client: serviceClient }),
    readPublicProfileCardsForAccounts({
      accountIds: [
        ...mergedRows.map((row) => row.author_account_id),
        ...(accountId ? [accountId] : []),
      ],
      client: serviceClient,
    }),
    readPostEngagements({
      accountId,
      client: serviceClient,
      rows: mergedRows,
    }),
    readPollSummaries({
      accountId,
      client: serviceClient,
      rows: mergedRows,
    }),
    readPostMedia({
      client: serviceClient,
      rows: mergedRows,
    }),
    readExternalLinksForPosts({
      client: serviceClient,
      postIds: mergedRows.map((row) => row.id),
    }),
    readOfficialContentStates({
      client: serviceClient,
      postIds: mergedRows.map((row) => row.id),
    }),
  ]);
  if (blockedAccountIdsResult.state === "unavailable") {
    return {
      ...basePayload,
      items: [],
      stories: [],
    };
  }
  const { blockedAccountIds } = blockedAccountIdsResult;
  const inaccessibleOriginalReportPostIds =
    await readInaccessibleOriginalReportPostIds({
      blockedAccountIds,
      client: serviceClient,
      rows: mergedRows,
      viewerAccountId: accountId,
    });
  const visibleRows = mergedRows.filter(
    (row) =>
      !hiddenTargets.postIds.has(row.id) &&
      !blockedAccountIds.has(row.author_account_id) &&
      !inaccessibleOriginalReportPostIds.has(row.id),
  );
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
        linksByPostId.get(row.id),
        officialStateByPostId.get(row.id),
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
  const blockedAccountIdsResult = await readBlockedCommunityAccountIds({
    accountId,
    client: serviceClient,
  });
  if (blockedAccountIdsResult.state === "unavailable") return null;
  const { blockedAccountIds } = blockedAccountIdsResult;
  if (blockedAccountIds.has(source.snapshot.account_id)) return null;

  const operatorAccountIds = await readOperatorAccountIds({
    accountIds: [source.snapshot.account_id],
    client: serviceClient,
  });
  const profile = createPublicProfileCardPayload({
    cardId: `profile_${source.snapshot.id}`,
    communityProfileId: source.communityProfile?.id ?? source.snapshot.id,
    isOperator: operatorAccountIds.has(source.snapshot.account_id),
    snapshot,
    status: "published",
  });
  const [postRows, reports, viewerProfiles] = await Promise.all([
    readProfilePosts({
      accountId: source.snapshot.account_id,
      client: serviceClient,
      includeNonPublished: accountId === source.snapshot.account_id,
    }),
    readOriginalProfileReportSummaries({
      client: serviceClient,
      ownerAccountId: source.snapshot.account_id,
      viewerAccountId: accountId,
    }),
    accountId && accountId !== source.snapshot.account_id
      ? readPublicProfileCardsForAccounts({
          accountIds: [accountId],
          client: serviceClient,
        })
      : Promise.resolve(new Map<string, FeedItem["authorProfile"]>()),
  ]);
  const [
    engagementByPostId,
    pollByPostId,
    mediaByPostId,
    linksByPostId,
    officialStateByPostId,
  ] = await Promise.all([
    readPostEngagements({ accountId, client: serviceClient, rows: postRows }),
    readPollSummaries({ accountId, client: serviceClient, rows: postRows }),
    readPostMedia({ client: serviceClient, rows: postRows }),
    readExternalLinksForPosts({
      client: serviceClient,
      postIds: postRows.map((row) => row.id),
    }),
    readOfficialContentStates({
      client: serviceClient,
      postIds: postRows.map((row) => row.id),
    }),
  ]);
  const inaccessibleOriginalReportPostIds =
    await readInaccessibleOriginalReportPostIds({
      blockedAccountIds,
      client: serviceClient,
      rows: postRows,
      viewerAccountId: accountId,
    });
  const posts = postRows
    .filter((row) => !inaccessibleOriginalReportPostIds.has(row.id))
    .map((postRow, index) =>
      mapPostRowToFeedItem(
        postRow,
        accountId,
        index,
        engagementByPostId.get(postRow.id),
        profile,
        pollByPostId.get(postRow.id),
        mediaByPostId.get(postRow.id),
        linksByPostId.get(postRow.id),
        officialStateByPostId.get(postRow.id),
      ),
    )
    .filter(isUsefulFeedItem);

  return {
    posts,
    profile,
    reports,
    viewerCode:
      accountId === source.snapshot.account_id
        ? normalizeVisibleCode(profile.display.code)
        : accountId
          ? normalizeVisibleCode(
              viewerProfiles.get(accountId)?.display.code ?? null,
            )
          : null,
  };
}

export async function readCommunityProfileSource({
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

  if (communityResponse.error) return null;

  if (communityResponse.data?.account_id) {
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

    if (snapshotResponse.error || !snapshotResponse.data) return null;

    const communityProfile = await readCommunityProfileForAccount({
      accountId,
      client,
    });
    if (!communityProfile) return null;

    return {
      communityProfile,
      snapshot: snapshotResponse.data as PublicProfileSnapshotRow,
    };
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
  const communityProfile = await readCommunityProfileForAccount({
    accountId: snapshot.account_id,
    client,
  });
  if (!communityProfile) return null;

  return {
    communityProfile,
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
    (item) =>
      item.kind === "balance_game" &&
      item.authorHandle === "nuang.official" &&
      Boolean(item.poll),
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
  const blockedAccountIdsResult = await readBlockedCommunityAccountIds({
    accountId,
    client: serviceClient,
  });
  if (blockedAccountIdsResult.state === "unavailable") return null;
  const { blockedAccountIds } = blockedAccountIdsResult;
  if (blockedAccountIds.has(row.author_account_id)) return null;
  const isOwnPost = row.author_account_id === accountId;
  const isPublicPost =
    row.moderation_status === "published" &&
    (row.visibility === "public" || row.visibility === "profile_public");

  if (!isOwnPost && !isPublicPost) {
    return null;
  }
  const inaccessibleOriginalReportPostIds =
    await readInaccessibleOriginalReportPostIds({
      blockedAccountIds,
      client: serviceClient,
      rows: [row],
      viewerAccountId: accountId,
    });
  if (inaccessibleOriginalReportPostIds.has(row.id)) return null;

  const [
    authorProfiles,
    engagementByPostId,
    pollByPostId,
    mediaByPostId,
    linksByPostId,
    officialStateByPostId,
    postReplies,
  ] = await Promise.all([
    readPublicProfileCardsForAccounts({
      accountIds: [
        row.author_account_id,
        ...(accountId && accountId !== row.author_account_id
          ? [accountId]
          : []),
      ],
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
    readExternalLinksForPosts({
      client: serviceClient,
      postIds: [row.id],
    }),
    readOfficialContentStates({
      client: serviceClient,
      postIds: [row.id],
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
    linksByPostId.get(row.id),
    officialStateByPostId.get(row.id),
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
      nuangCode: accountId
        ? normalizeVisibleCode(
            authorProfiles.get(accountId)?.display.code ??
              (accountId === row.author_account_id
                ? (authorProfiles.get(row.author_account_id)?.display.code ??
                  null)
                : null),
          )
        : null,
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
          .select("id, topic_category, topic_tags")
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
          tags: [],
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
        tags: Array.isArray(post?.topic_tags)
          ? post.topic_tags.filter(
              (tag): tag is string => typeof tag === "string",
            )
          : [],
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
      "id, author_account_id, body, moderation_status, source, source_id, attachment_payload, public_projection_payload, visibility, created_at, published_at",
    )
    .eq("id", postId)
    .eq("source", "report_share")
    .is("deleted_at", null)
    .maybeSingle();

  if (response.error || !response.data) {
    return null;
  }

  const row = response.data as {
    attachment_payload: unknown;
    author_account_id: string;
    body: string;
    created_at: string;
    id: string;
    moderation_status: FeedPostRow["moderation_status"];
    published_at: string | null;
    public_projection_payload: unknown;
    source: "report_share";
    source_id: string | null;
    visibility: FeedPostRow["visibility"];
  };
  const accountId = await getCurrentAccountId(serviceClient);
  const blockedAccountIdsResult = await readBlockedCommunityAccountIds({
    accountId,
    client: serviceClient,
  });
  if (blockedAccountIdsResult.state === "unavailable") return null;
  const { blockedAccountIds } = blockedAccountIdsResult;
  if (blockedAccountIds.has(row.author_account_id)) return null;
  const isOwnPost = row.author_account_id === accountId;
  const isPublicPost =
    row.moderation_status === "published" &&
    (row.visibility === "public" || row.visibility === "profile_public");

  if (!isOwnPost && !isPublicPost) {
    return null;
  }
  const normalizedRow = normalizeFeedPostRow(row);
  const inaccessibleOriginalReportPostIds =
    await readInaccessibleOriginalReportPostIds({
      blockedAccountIds,
      client: serviceClient,
      rows: [normalizedRow],
      viewerAccountId: accountId,
    });
  if (inaccessibleOriginalReportPostIds.has(row.id)) return null;

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
      href: getReportShareHref(publicProjection.reportShare, row.id),
    },
  };
}

async function getCurrentAccountId(client: SupabaseClient) {
  const userId = await getCurrentSupabaseUserId();
  return userId ? readAccountIdForUser(client, userId) : null;
}

async function getCurrentSupabaseUserId() {
  const serverClient = await createServerSupabaseClient();

  if (!serverClient) {
    return null;
  }

  const { data, error } = await serverClient.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (error || !userId) {
    return null;
  }

  return userId;
}

async function readAccountIdForUser(client: SupabaseClient, userId: string) {
  const response = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", userId)
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

  const legacyMediaByPostId = await readLegacyPostMedia({
    client,
    rows: rows.filter((row) => !mediaByPostId.has(row.id)),
  });
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
    const commentRows = commentResponse.data as FeedPostCommentRow[];
    const [commentProfiles, commentLinks] = await Promise.all([
      readPublicProfileCardsForAccounts({
        accountIds: commentRows.map((row) => row.author_account_id),
        client,
      }),
      readExternalLinksForComments({
        client,
        commentIds: commentRows.map((row) => row.id),
      }),
    ]);
    const visibleCommentsByPostId = new Map<string, FeedPostCommentRow[]>();

    for (const row of commentRows) {
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
            commentLinks.get(comment.id),
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
  const [commentProfiles, commentLinks] = await Promise.all([
    readPublicProfileCardsForAccounts({
      accountIds: visibleComments.map((row) => row.author_account_id),
      client,
    }),
    readExternalLinksForComments({
      client,
      commentIds: visibleComments.map((row) => row.id),
    }),
  ]);

  return {
    replies: visibleComments.map((comment) =>
      mapCommentRowToReplyPreview(
        comment,
        accountId,
        commentProfiles.get(comment.author_account_id),
        commentLinks.get(comment.id),
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
    .select("id, post_id, prompt_id, question, status")
    .in("post_id", balancePostIds)
    .in("status", ["active", "closed"])
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
      status: poll.status,
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

async function readOfficialContentStates({
  client,
  postIds,
}: {
  client: SupabaseClient;
  postIds: string[];
}) {
  const stateByPostId = new Map<string, OfficialContentState>();
  if (postIds.length === 0) return stateByPostId;

  const response = await client
    .schema("feed")
    .from("official_community_content")
    .select("post_id,lifecycle_status,is_featured,response_closes_at")
    .in("post_id", postIds);

  let rows: Array<{
    is_featured?: boolean | null;
    lifecycle_status?: string | null;
    post_id?: string | null;
    response_closes_at?: string | null;
  }> = [];

  if (!response.error && response.data) {
    rows = response.data;
  } else {
    const legacyResponse = await client
      .schema("feed")
      .from("official_community_content")
      .select("post_id,lifecycle_status")
      .in("post_id", postIds);
    if (!legacyResponse.error && legacyResponse.data) {
      rows = legacyResponse.data;
    }
  }

  const now = Date.now();
  for (const candidate of rows) {
    if (!candidate.post_id) continue;
    const closeTime = candidate.response_closes_at
      ? new Date(candidate.response_closes_at).getTime()
      : Number.NaN;
    const responseStatus =
      candidate.lifecycle_status === "closed" ||
      candidate.lifecycle_status === "archived" ||
      (Number.isFinite(closeTime) && closeTime <= now)
        ? "closed"
        : "open";

    stateByPostId.set(candidate.post_id, {
      isFeatured: candidate.is_featured === true,
      responseClosesAt: candidate.response_closes_at ?? null,
      responseStatus,
    });
  }

  return stateByPostId;
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

  const [communityProfiles, operatorAccountIds] = await Promise.all([
    readCommunityProfilesForAccounts({
      accountIds: uniqueAccountIds,
      client,
    }),
    readOperatorAccountIds({
      accountIds: uniqueAccountIds,
      client,
    }),
  ]);

  const latestSnapshots = new Map<
    string,
    { row: PublicProfileSnapshotRow; snapshot: PublicProfileSnapshotPayload }
  >();

  for (const row of response.data as PublicProfileSnapshotRow[]) {
    if (latestSnapshots.has(row.account_id)) continue;

    const snapshot = coercePublicProfileSnapshotPayload(
      row.snapshot_payload,
      row.id,
    );
    if (!snapshot || !isCurrentNuangCode(snapshot.profile.code)) continue;

    latestSnapshots.set(row.account_id, { row, snapshot });
  }

  const cards = await Promise.all(
    [...latestSnapshots.entries()].map(
      async ([accountId, { row, snapshot: baseSnapshot }]) => {
        const communityProfile = communityProfiles.get(accountId) ?? null;
        const snapshot = await mergeCommunityProfileIntoSnapshot({
          client,
          profile: communityProfile,
          snapshot: baseSnapshot,
        });

        return [
          accountId,
          createPublicProfileCardPayload({
            cardId: `profile_${row.id}`,
            communityProfileId: communityProfile?.id ?? row.id,
            isOperator: operatorAccountIds.has(accountId),
            snapshot,
            status: "published",
          }),
        ] as const;
      },
    ),
  );

  for (const [accountId, card] of cards) {
    profilesByAccountId.set(accountId, card);
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

type OriginalReportFeedReference = {
  kind: ProfileReportKind;
  postId: string;
  profileId: string;
  reportKey: string;
  sourceId: string;
};

async function readInaccessibleOriginalReportPostIds({
  blockedAccountIds,
  client,
  rows,
  viewerAccountId,
}: {
  blockedAccountIds: Set<string>;
  client: SupabaseClient;
  rows: FeedPostRow[];
  viewerAccountId: string | null;
}) {
  const inaccessible = new Set<string>();
  const references = rows.flatMap((row) => {
    const parsed = readOriginalReportFeedReference(row);
    if (parsed === "invalid") {
      inaccessible.add(row.id);
      return [];
    }
    return parsed ? [parsed] : [];
  });
  if (references.length === 0) return inaccessible;

  const idsByKind = new Map<ProfileReportKind, string[]>([
    ["core", []],
    ["topic", []],
    ["lab", []],
  ]);
  for (const reference of references) {
    idsByKind.get(reference.kind)?.push(reference.sourceId);
  }
  const profileIds = [...new Set(references.map((item) => item.profileId))];
  const sourceIds = [...new Set(references.map((item) => item.sourceId))];

  const [
    coreRows,
    topicRows,
    labRows,
    visibilityRows,
    communityProfiles,
    snapshots,
  ] = await Promise.all([
    readOriginalSourceOwners({
      client,
      ids: idsByKind.get("core") ?? [],
      kind: "core",
    }),
    readOriginalSourceOwners({
      client,
      ids: idsByKind.get("topic") ?? [],
      kind: "topic",
    }),
    readOriginalSourceOwners({
      client,
      ids: idsByKind.get("lab") ?? [],
      kind: "lab",
    }),
    client
      .schema("profile")
      .from("profile_report_visibility")
      .select("account_id,source_kind,source_id,visibility")
      .in("source_id", sourceIds),
    client
      .schema("profile")
      .from("community_profile")
      .select("id,account_id")
      .in("id", profileIds)
      .eq("status", "active")
      .is("deleted_at", null),
    client
      .schema("profile")
      .from("profile_public_snapshot")
      .select("id,account_id")
      .in("id", profileIds)
      .eq("status", "active")
      .is("deleted_at", null),
  ]);

  const sourceOwnerByKey = new Map<string, string>();
  for (const result of [coreRows, topicRows, labRows]) {
    for (const row of result.rows) {
      sourceOwnerByKey.set(`${result.kind}:${row.id}`, row.accountId);
    }
  }
  const failedKinds = new Set(
    [coreRows, topicRows, labRows]
      .filter((result) => result.failed)
      .map((result) => result.kind),
  );
  const profileOwnerById = new Map<string, string>();
  for (const response of [communityProfiles, snapshots]) {
    if (response.error) continue;
    for (const row of response.data ?? []) {
      if (row.id && row.account_id) {
        profileOwnerById.set(String(row.id), String(row.account_id));
      }
    }
  }
  const visibilityByKey = new Map<string, string>();
  if (!visibilityRows.error) {
    for (const row of visibilityRows.data ?? []) {
      visibilityByKey.set(
        `${String(row.account_id)}:${String(row.source_kind)}:${String(row.source_id)}`,
        String(row.visibility),
      );
    }
  }

  for (const reference of references) {
    const ownerAccountId = sourceOwnerByKey.get(
      `${reference.kind}:${reference.sourceId}`,
    );
    const profileOwnerAccountId = profileOwnerById.get(reference.profileId);
    const visibility = ownerAccountId
      ? visibilityByKey.get(
          `${ownerAccountId}:${reference.kind}:${reference.sourceId}`,
        )
      : null;
    const isPrivateForViewer =
      visibility === "private" && ownerAccountId !== viewerAccountId;

    if (
      failedKinds.has(reference.kind) ||
      Boolean(visibilityRows.error) ||
      !ownerAccountId ||
      profileOwnerAccountId !== ownerAccountId ||
      blockedAccountIds.has(ownerAccountId) ||
      isPrivateForViewer
    ) {
      inaccessible.add(reference.postId);
    }
  }

  return inaccessible;
}

async function readOriginalSourceOwners({
  client,
  ids,
  kind,
}: {
  client: SupabaseClient;
  ids: string[];
  kind: ProfileReportKind;
}) {
  if (ids.length === 0) {
    return {
      failed: false,
      kind,
      rows: [] as Array<{ accountId: string; id: string }>,
    };
  }
  const table =
    kind === "core"
      ? { schema: "report", table: "result_report" }
      : kind === "topic"
        ? { schema: "assessment", table: "free_topic_result" }
        : { schema: "assessment", table: "lab_result" };
  const response = await client
    .schema(table.schema)
    .from(table.table)
    .select("id,account_id")
    .in("id", [...new Set(ids)])
    .is("deleted_at", null);

  return {
    failed: Boolean(response.error),
    kind,
    rows: (response.data ?? []).flatMap((row) =>
      row.id && row.account_id
        ? [{ accountId: String(row.account_id), id: String(row.id) }]
        : [],
    ),
  };
}

function readOriginalReportFeedReference(
  row: FeedPostRow,
): OriginalReportFeedReference | "invalid" | null {
  if (row.source !== "report_share") return null;
  const projection = readPublicProjection(row.public_projection_payload);
  const projected = projection.reportShare;
  const attachments = Array.isArray(row.attachment_payload)
    ? row.attachment_payload
    : [];
  const attachment = attachments.find((value) => {
    if (!value || typeof value !== "object") return false;
    return (value as { type?: unknown }).type === "original_report";
  }) as { id?: unknown; profileId?: unknown } | undefined;
  const reportKey =
    typeof projected?.reportKey === "string"
      ? projected.reportKey
      : typeof attachment?.id === "string"
        ? attachment.id
        : null;
  const profileId =
    typeof projected?.profileId === "string"
      ? projected.profileId
      : typeof attachment?.profileId === "string"
        ? attachment.profileId
        : null;
  const parsedKey = reportKey ? parseProfileReportKey(reportKey) : null;
  const hasOriginalSignal = Boolean(attachment || projected?.reportKey);
  if (!hasOriginalSignal) return null;
  if (
    !reportKey ||
    !profileId ||
    !uuidPattern.test(profileId) ||
    !parsedKey ||
    row.source_id !== reportKey
  ) {
    return "invalid";
  }

  return {
    kind: parsedKey.kind,
    postId: row.id,
    profileId,
    reportKey,
    sourceId: parsedKey.sourceId,
  };
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
  links: FeedItem["links"] = [],
  officialState?: OfficialContentState,
): FeedItem {
  const isOwnPost = row.author_account_id === accountId;
  const publicProjection = readPublicProjection(row.public_projection_payload);
  const reportShare = publicProjection.reportShare
    ? {
        ...publicProjection.reportShare,
        href: getReportShareHref(publicProjection.reportShare, row.id),
      }
    : undefined;
  const togetherBalanceRoom = publicProjection.togetherBalanceRoom ?? undefined;
  const togetherBalanceResult =
    publicProjection.togetherBalanceResult ?? undefined;
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
    kind:
      row.source === "balance_game"
        ? "balance_game"
        : row.source === "together_balance_room_share"
          ? "together_balance_room_share"
          : row.source === "together_balance_result_share"
            ? "together_balance_result_share"
            : row.source === "daily_question"
              ? "daily_question"
              : "user_post",
    layout: "thread",
    links,
    likeCount: engagement.likes,
    likeLabel: formatFeedCountLabel("좋아요", engagement.likes),
    media,
    officialFeatured: officialState?.isFeatured,
    poll,
    priority: -1000 + index,
    questionAudience: parseQuestionAudience(row.source_id),
    reportShare,
    togetherBalanceResult,
    togetherBalanceRoom,
    replyCount: engagement.replies,
    replyLabel: formatFeedCountLabel("답글", engagement.replies),
    replyPreview: engagement.replyPreview,
    responseClosesAt: officialState?.responseClosesAt,
    responseStatus: officialState?.responseStatus,
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
    viewerCanManage: isOwnPost && isUserManageableFeedPostSource(row.source),
    viewerIsAuthor: isOwnPost,
    visibility: row.visibility,
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
    capacity?: unknown;
    completedCount?: unknown;
    highlight?: unknown;
    occupancy?: unknown;
    packSlug?: unknown;
    packTitle?: unknown;
    questionCount?: unknown;
    recruitmentStatus?: unknown;
    resultStatus?: unknown;
    roomCode?: unknown;
    roomName?: unknown;
    score?: unknown;
    scoreLabel?: unknown;
    topic?: unknown;
  };

  return {
    authorHandle: stringValue(projection.authorHandle),
    authorName: stringValue(projection.authorName),
    reportShare: parseReportShareProjection(projection.reportShare),
    togetherBalanceResult: parseTogetherBalanceResultProjection(projection),
    togetherBalanceRoom: parseTogetherBalanceRoomProjection(projection),
    topic: parseProjectionTopic(projection.topic),
  };
}

function parseTogetherBalanceResultProjection(value: {
  completedCount?: unknown;
  highlight?: unknown;
  packSlug?: unknown;
  packTitle?: unknown;
  resultStatus?: unknown;
  roomName?: unknown;
  score?: unknown;
  scoreLabel?: unknown;
}): FeedItem["togetherBalanceResult"] | null {
  if (
    typeof value.completedCount !== "number" ||
    typeof value.packSlug !== "string" ||
    typeof value.packTitle !== "string" ||
    typeof value.roomName !== "string" ||
    typeof value.score !== "number" ||
    typeof value.scoreLabel !== "string" ||
    !["current", "final"].includes(String(value.resultStatus))
  ) {
    return null;
  }
  return {
    completedCount: value.completedCount,
    highlight: typeof value.highlight === "string" ? value.highlight : null,
    href: `/assessments/together/balance-game?pack=${encodeURIComponent(
      value.packSlug,
    )}`,
    packSlug: value.packSlug,
    packTitle: value.packTitle,
    resultStatus: value.resultStatus as "current" | "final",
    roomName: value.roomName,
    score: value.score,
    scoreLabel: value.scoreLabel,
  };
}

function parseTogetherBalanceRoomProjection(value: {
  capacity?: unknown;
  occupancy?: unknown;
  packSlug?: unknown;
  packTitle?: unknown;
  questionCount?: unknown;
  recruitmentStatus?: unknown;
  roomCode?: unknown;
  roomName?: unknown;
}): FeedItem["togetherBalanceRoom"] | null {
  if (
    typeof value.capacity !== "number" ||
    typeof value.occupancy !== "number" ||
    typeof value.packSlug !== "string" ||
    typeof value.packTitle !== "string" ||
    typeof value.questionCount !== "number" ||
    typeof value.roomCode !== "string" ||
    typeof value.roomName !== "string" ||
    !["open", "full", "closed"].includes(String(value.recruitmentStatus))
  ) {
    return null;
  }
  return {
    capacity: value.capacity,
    href: `/assessments/together/balance-game/rooms/${encodeURIComponent(
      value.roomCode,
    )}`,
    occupancy: value.occupancy,
    packSlug: value.packSlug,
    packTitle: value.packTitle,
    questionCount: value.questionCount,
    recruitmentStatus: value.recruitmentStatus as "open" | "full" | "closed",
    roomName: value.roomName,
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
    ...(typeof reportShare.assessmentTitle === "string"
      ? { assessmentTitle: reportShare.assessmentTitle }
      : {}),
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
    ...(typeof reportShare.profileId === "string"
      ? { profileId: reportShare.profileId }
      : {}),
    profileName:
      getCurrentNuangProfileName(reportShare.profileCode) ??
      reportShare.profileName,
    ...(typeof reportShare.reportKey === "string"
      ? { reportKey: reportShare.reportKey }
      : {}),
    ...(reportShare.reportType === "core" ||
    reportShare.reportType === "topic" ||
    reportShare.reportType === "lab"
      ? { reportType: reportShare.reportType }
      : {}),
    resultLabel:
      typeof reportShare.resultLabel === "string"
        ? reportShare.resultLabel
        : "뉴앙 리포트",
    ...(typeof reportShare.summary === "string"
      ? { summary: reportShare.summary }
      : {}),
  };
}

function getReportShareHref(
  reportShare: Omit<NonNullable<FeedItem["reportShare"]>, "href">,
  postId: string,
) {
  if (
    reportShare.profileId &&
    uuidPattern.test(reportShare.profileId) &&
    reportShare.reportKey &&
    parseProfileReportKey(reportShare.reportKey)
  ) {
    return `/feed/profiles/${reportShare.profileId}/reports/${reportShare.reportKey}`;
  }

  return `/feed/reports/${postId}`;
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

  if (item.kind === "balance_game") {
    return Boolean(item.poll && item.poll.options.length === 2);
  }

  if (item.kind === "together_balance_room_share") {
    return Boolean(item.togetherBalanceRoom);
  }

  if (item.kind === "together_balance_result_share") {
    return Boolean(item.togetherBalanceResult);
  }

  if (item.reportShare) {
    return item.reportShare.reportType && item.reportShare.reportType !== "core"
      ? true
      : isCurrentNuangCode(item.reportShare.profileCode);
  }

  if (item.poll) {
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
  links: FeedReplyPreview["links"] = [],
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
    links,
    reportable: !isOwnComment,
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
