import { z } from "zod";
import {
  feedItems,
  feedPolicy,
  feedStories,
  type FeedItem,
  type FeedStory,
} from "@/features/feed/feed-seed";
import { feedPostTopicCategories } from "@/features/feed/feed-topic";

export const feedContractVersion = "feed.v0.1";

export const feedWriteActions = [
  "create_post",
  "update_post",
  "delete_post",
  "create_comment",
  "react",
  "bookmark",
  "remove_reaction",
  "remove_bookmark",
  "not_interested",
  "report_content",
  "vote_poll",
] as const;

// Legacy storage discriminator for the feed poll shown to users as
// "투표". The together assessment "밸런스 게임" uses a separate domain.
export const feedPostSources = [
  "daily_mood",
  "daily_question",
  "trait_card",
  "map_reflection",
  "free_text",
  "balance_game",
  "report_share",
  "together_balance_room_share",
  "together_balance_result_share",
] as const;

export const feedVisibilityLevels = [
  "public",
  "profile_public",
  "private_draft",
] as const;

export const feedModerationStatuses = [
  "pending_review",
  "published",
  "limited",
  "removed",
] as const;

export const feedReactionTypes = [
  "like",
  "same",
  "curious",
  "support",
] as const;

export const feedTargetTypes = [
  "feed_post",
  "feed_comment",
  "feed_seed_card",
] as const;

export const feedContentReportReasons = [
  "spam",
  "harassment",
  "hate",
  "sexual_content",
  "violence",
  "privacy",
  "fraud",
  "self_harm",
  "other",
] as const;

export const feedAttachmentTypes = [
  "trait_card",
  "map_summary",
  "result_summary",
  "original_report",
] as const;

export const feedWritePolicy = {
  accountRequiredForWrite: true,
  defaultPostVisibility: "public",
  directAssessmentResponsesForbidden: true,
  rawScorePayloadForbidden: true,
  sensitiveProfileFieldsRemainPrivate: true,
  writeOpenAfterCredentialAndModeration: true,
} as const;

const feedTargetSchema = z.object({
  id: z.string().trim().min(4).max(128),
  type: z.enum(feedTargetTypes),
});

const feedAttachmentSchema = z.object({
  id: z.string().trim().min(4).max(128),
  profileId: z.string().uuid().optional(),
  type: z.enum(feedAttachmentTypes),
});

const feedPostTopicSchema = z.object({
  category: z.enum(feedPostTopicCategories).nullable(),
  source: z.enum(["manual", "local_suggestion"]),
  tags: z
    .array(z.string().trim().min(1).max(20))
    .max(8)
    .refine(
      (tags) =>
        new Set(tags.map((tag) => tag.toLocaleLowerCase("ko-KR"))).size ===
        tags.length,
      "주제 태그는 중복될 수 없습니다.",
    ),
});

const feedPollDraftSchema = z
  .object({
    options: z.tuple([
      z.string().trim().min(1).max(80),
      z.string().trim().min(1).max(80),
    ]),
    question: z.string().trim().min(4).max(160),
  })
  .refine(
    ({ options }) =>
      options[0].toLocaleLowerCase("ko-KR") !==
      options[1].toLocaleLowerCase("ko-KR"),
    {
      message: "서로 다른 두 선택지를 입력해 주세요.",
      path: ["options", 1],
    },
  );

export const createFeedPostRequestSchema = z.object({
  action: z.literal("create_post"),
  attachments: z.array(feedAttachmentSchema).max(2).optional(),
  body: z.string().trim().max(800),
  clientRequestId: z.string().trim().min(8).max(128).optional(),
  poll: feedPollDraftSchema.optional(),
  pollOptionKey: z.string().trim().min(1).max(64).optional(),
  source: z.enum(feedPostSources),
  sourceId: z.string().trim().min(4).max(128).optional(),
  topic: feedPostTopicSchema.optional(),
  visibility: z.enum(feedVisibilityLevels),
});

export const updateFeedPostRequestSchema = z.object({
  action: z.literal("update_post"),
  body: z.string().trim().max(800),
  poll: feedPollDraftSchema.optional(),
  postId: z.string().uuid(),
  sourceId: z.string().trim().min(4).max(128).optional(),
  topic: feedPostTopicSchema.optional(),
  visibility: z.enum(feedVisibilityLevels),
});

export const deleteFeedPostRequestSchema = z.object({
  action: z.literal("delete_post"),
  postId: z.string().uuid(),
});

export const createFeedCommentRequestSchema = z.object({
  action: z.literal("create_comment"),
  body: z.string().trim().min(1).max(400),
  clientRequestId: z.string().trim().min(8).max(128).optional(),
  target: feedTargetSchema,
});

export const createFeedReactionRequestSchema = z.object({
  action: z.literal("react"),
  clientRequestId: z.string().trim().min(8).max(128).optional(),
  reaction: z.enum(feedReactionTypes),
  target: feedTargetSchema,
});

export const createFeedBookmarkRequestSchema = z.object({
  action: z.literal("bookmark"),
  clientRequestId: z.string().trim().min(8).max(128).optional(),
  target: feedTargetSchema,
});

export const removeFeedReactionRequestSchema = z.object({
  action: z.literal("remove_reaction"),
  clientRequestId: z.string().trim().min(8).max(128).optional(),
  reaction: z.enum(feedReactionTypes),
  target: feedTargetSchema,
});

export const removeFeedBookmarkRequestSchema = z.object({
  action: z.literal("remove_bookmark"),
  clientRequestId: z.string().trim().min(8).max(128).optional(),
  target: feedTargetSchema,
});

export const createFeedPreferenceRequestSchema = z.object({
  action: z.literal("not_interested"),
  clientRequestId: z.string().trim().min(8).max(128).optional(),
  target: feedTargetSchema,
});

export const createFeedContentReportRequestSchema = z.object({
  action: z.literal("report_content"),
  details: z.string().trim().max(500).optional(),
  reason: z.enum(feedContentReportReasons),
  target: z.object({
    id: z.string().uuid(),
    type: z.enum(["feed_post", "feed_comment"]),
  }),
});

export const createFeedPollVoteRequestSchema = z.object({
  action: z.literal("vote_poll"),
  clientRequestId: z.string().trim().min(8).max(128).optional(),
  optionId: z.string().uuid(),
  pollId: z.string().uuid(),
  replaceExisting: z.boolean().optional(),
});

export const feedWriteRequestSchema = z.discriminatedUnion("action", [
  createFeedPostRequestSchema,
  updateFeedPostRequestSchema,
  deleteFeedPostRequestSchema,
  createFeedCommentRequestSchema,
  createFeedReactionRequestSchema,
  createFeedBookmarkRequestSchema,
  removeFeedReactionRequestSchema,
  removeFeedBookmarkRequestSchema,
  createFeedPreferenceRequestSchema,
  createFeedContentReportRequestSchema,
  createFeedPollVoteRequestSchema,
]);

export type FeedWriteRequest = z.infer<typeof feedWriteRequestSchema>;

export type FeedReadPayload = {
  contractVersion: typeof feedContractVersion;
  items: FeedItem[];
  policy: typeof feedPolicy;
  stories: FeedStory[];
  viewerCode: string | null;
};

export function createFeedReadPayload(): FeedReadPayload {
  return {
    contractVersion: feedContractVersion,
    items: [...feedItems].sort((a, b) => a.priority - b.priority),
    policy: feedPolicy,
    stories: [...feedStories],
    viewerCode: null,
  };
}
