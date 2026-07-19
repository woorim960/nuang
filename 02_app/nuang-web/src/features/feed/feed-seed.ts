import type { PublicProfileCardPayload } from "@/features/public-profile/public-profile-card-contract";
import { createPublicProfileCardPayload } from "@/features/public-profile/public-profile-card-contract";
import { createPublicProfileSnapshotPayload } from "@/features/together/public-comparison-contract";
import type { CoreScoreResult } from "@/lib/scoring/types";

export type FeedItemKind =
  | "balance_game"
  | "daily_mood"
  | "daily_question"
  | "map_reflection"
  | "official_note"
  | "report_share"
  | "trait_card"
  | "user_post";

export type FeedItemLayout = "media" | "thread";

export type FeedReplyPreview = {
  authorHandle: string;
  authorName: string;
  body: string;
  id: string;
  statusLabel?: string;
  timeLabel?: string;
};

export type FeedPollOptionSummary = {
  id: string;
  key: string;
  label: string;
  ratio: number;
  viewerHasVoted: boolean;
  voteCount: number;
};

export type FeedPollSummary = {
  canViewCodeStats: boolean;
  id: string;
  options: FeedPollOptionSummary[];
  promptId: string;
  question: string;
  statsHref: string;
  totalVotes: number;
  viewerVoteOptionId: string | null;
};

export type FeedReportShareSummary = {
  assessmentKind: "full" | "quick";
  completedAt: string;
  domains: Array<{
    domainId: string;
    label: string;
    score: number | null;
    symbol: string | null;
  }>;
  href: string;
  profileCode: string;
  profileName: string;
  resultLabel: string;
};

export type FeedItem = {
  authorHandle: string;
  authorName: string;
  authorProfile?: PublicProfileCardPayload;
  avatarLabel: string;
  body: string;
  id: string;
  kind: FeedItemKind;
  layout: FeedItemLayout;
  likeCount?: number;
  likeLabel: string;
  mediaLabel?: string;
  poll?: FeedPollSummary;
  priority: number;
  reportShare?: FeedReportShareSummary;
  replyCount?: number;
  replyLabel: string;
  replyPreview?: FeedReplyPreview[];
  statusLabel?: string;
  targetType?: "feed_post" | "feed_seed_card";
  timeLabel: string;
  title: string;
  verified?: boolean;
  viewerHasBookmarked?: boolean;
  viewerHasLiked?: boolean;
  visualTone?: "dark" | "light";
};

export type FeedStory = {
  avatarLabel: string;
  id: string;
  label: string;
  seen?: boolean;
  tone: "flame" | "forest" | "purple" | "sun" | "water";
};

export const feedPolicy = {
  bottomNavTab: false,
  homePreviewMaxItems: 3,
  publicWriteEnabled: false,
  recommendationMode: "single_stream_trait_seed",
  sensitiveTopicsAllowed: false,
} as const;

export const feedStories: ReadonlyArray<FeedStory> = [
  {
    avatarLabel: "나",
    id: "my_story",
    label: "내 기록",
    tone: "purple",
  },
  {
    avatarLabel: "불",
    id: "flame_story",
    label: "불꽃",
    tone: "flame",
  },
  {
    avatarLabel: "물",
    id: "water_story",
    label: "물결",
    tone: "water",
  },
  {
    avatarLabel: "숲",
    id: "forest_story",
    label: "숲",
    seen: true,
    tone: "forest",
  },
  {
    avatarLabel: "햇",
    id: "sun_story",
    label: "햇살",
    seen: true,
    tone: "sun",
  },
] as const;

const feedPublicProfiles = {
  mapJournal: createSeedPublicProfileCard({
    cardId: "feed_profile_map_journal",
    displayName: "성향지도 노트",
    motif: "forest",
    profileCode: "SCODE",
    profileName: "숲의 새길 개척가",
    snapshotId: "44444444-4444-4444-8444-444444444444",
    scores: [66, 58, 62, 71, 73],
  }),
  official: createSeedPublicProfileCard({
    cardId: "feed_profile_official",
    displayName: "NUANG",
    motif: "purple",
    profileCode: "TVOAE",
    profileName: "불꽃의 온기 탐험가",
    snapshotId: "11111111-1111-4111-8111-111111111111",
    scores: [72, 64, 68, 59, 76],
  }),
  question: createSeedPublicProfileCard({
    cardId: "feed_profile_question",
    displayName: "오늘의 질문",
    motif: "water",
    profileCode: "SVODE",
    profileName: "물결의 새길 개척가",
    snapshotId: "22222222-2222-4222-8222-222222222222",
    scores: [54, 70, 61, 63, 69],
  }),
  traitCard: createSeedPublicProfileCard({
    cardId: "feed_profile_trait_card",
    displayName: "성향 카드",
    motif: "flame",
    profileCode: "TVOAE",
    profileName: "불꽃의 온기 탐험가",
    snapshotId: "33333333-3333-4333-8333-333333333333",
    scores: [78, 67, 72, 57, 74],
  }),
} as const;

export const feedItems: ReadonlyArray<FeedItem> = [
  {
    authorHandle: "nuang.official",
    authorName: "NUANG",
    authorProfile: feedPublicProfiles.official,
    avatarLabel: "뉴",
    body: "지금 내 에너지는 어디에 가까운가요? 가벼운 선택으로 오늘의 내 모습을 남겨보세요.",
    id: "daily_mood_001",
    kind: "daily_mood",
    layout: "media",
    likeLabel: "좋아요 1,248개",
    mediaLabel: "Daily Mood",
    priority: 10,
    replyLabel: "답글 42개",
    timeLabel: "12분",
    title: "오늘 나는 어느 쪽에 가까울까요?",
    targetType: "feed_seed_card",
    verified: true,
    visualTone: "light",
  },
  {
    authorHandle: "question.note",
    authorName: "오늘의 질문",
    authorProfile: feedPublicProfiles.question,
    avatarLabel: "문",
    body: "나와 다른 사람을 만났을 때, 서로 편해지려면 무엇부터 확인하면 좋을까요?",
    id: "daily_question_001",
    kind: "daily_question",
    layout: "thread",
    likeLabel: "좋아요 864개",
    priority: 20,
    replyLabel: "답글 28개",
    timeLabel: "34분",
    title: "서로 다른 사람과 편하게 지내는 방법",
    targetType: "feed_seed_card",
  },
  {
    authorHandle: "trait.card",
    authorName: "성향 카드",
    authorProfile: feedPublicProfiles.traitCard,
    avatarLabel: "성",
    body: "뉴앙 코드와 코드 지도만 남기면, 나를 소개하는 문장이 훨씬 편해져요.",
    id: "trait_card_001",
    kind: "trait_card",
    layout: "media",
    likeLabel: "좋아요 2,102개",
    mediaLabel: "Trait Card",
    priority: 30,
    replyLabel: "답글 75개",
    timeLabel: "1시간",
    title: "내 성향을 한 장으로 소개한다면",
    targetType: "feed_seed_card",
    verified: true,
    visualTone: "dark",
  },
  {
    authorHandle: "map.journal",
    authorName: "성향지도 노트",
    authorProfile: feedPublicProfiles.mapJournal,
    avatarLabel: "지",
    body: "내 코드 지도에서 가장 선명한 자리를 한 문장으로 풀어보세요. 숫자보다 먼저 떠오르는 장면이 힌트가 됩니다.",
    id: "map_reflection_001",
    kind: "map_reflection",
    layout: "thread",
    likeLabel: "좋아요 529개",
    priority: 40,
    replyLabel: "답글 11개",
    timeLabel: "2시간",
    title: "지도에서 제일 먼저 보이는 부분",
    targetType: "feed_seed_card",
  },
  {
    authorHandle: "nuang.official",
    authorName: "NUANG",
    authorProfile: feedPublicProfiles.official,
    avatarLabel: "뉴",
    body: "비교와 공유는 내가 열어둔 범위 안에서만 작동해요. 자세한 값보다 서로 이해하기 쉬운 문장을 먼저 보여주는 방향으로 다듬고 있습니다.",
    id: "official_note_001",
    kind: "official_note",
    layout: "thread",
    likeLabel: "좋아요 713개",
    priority: 50,
    replyLabel: "답글 19개",
    timeLabel: "3시간",
    title: "공개 범위는 조용하게 지켜져야 하니까",
    targetType: "feed_seed_card",
    verified: true,
  },
] as const;

function createSeedPublicProfileCard({
  cardId,
  displayName,
  motif,
  profileCode,
  profileName,
  scores,
  snapshotId,
}: {
  cardId: string;
  displayName: string;
  motif: "flame" | "forest" | "purple" | "sun" | "water";
  profileCode: string;
  profileName: string;
  scores: [number, number, number, number, number];
  snapshotId: string;
}) {
  const snapshot = createPublicProfileSnapshotPayload({
    createdAt: "2026-07-10T00:00:00.000Z",
    displayProfile: {
      displayName,
      motif,
    },
    result: createSeedCoreResult({
      profileCode,
      profileName,
      scores,
    }),
    snapshotId,
  });

  return createPublicProfileCardPayload({
    cardId,
    snapshot,
    status: "published",
  });
}

function createSeedCoreResult({
  profileCode,
  profileName,
  scores,
}: {
  profileCode: string;
  profileName: string;
  scores: [number, number, number, number, number];
}): CoreScoreResult {
  const labels = [
    "사람 사이 에너지",
    "마음의 반응",
    "일상 리듬",
    "생각의 방향",
    "새로움 수용",
  ] as const;

  return {
    alternativeCodes: [],
    code: profileCode,
    domains: scores.map((score, index) => ({
      domainId: `domain_${index + 1}`,
      isBoundary: false,
      label: labels[index],
      score,
      status: "valid",
      symbol: profileCode[index] ?? null,
    })),
    facets: [],
    profileName,
  };
}

export function listFeedItems() {
  return [...feedItems].sort((a, b) => a.priority - b.priority);
}

export function listFeedStories() {
  return [...feedStories];
}

export function listHomeFeedPreviewItems() {
  return listFeedItems().slice(0, feedPolicy.homePreviewMaxItems);
}
