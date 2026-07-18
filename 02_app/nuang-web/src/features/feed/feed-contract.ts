import { z } from "zod";
import {
  feedItems,
  feedPolicy,
  feedStories,
  type FeedItem,
  type FeedStory,
} from "@/features/feed/feed-seed";

export const feedContractVersion = "feed.v0.1";

export const feedWriteActions = [
  "create_post",
  "create_comment",
  "react",
  "bookmark",
  "remove_reaction",
  "remove_bookmark",
  "not_interested",
  "vote_poll",
] as const;

export const feedPostSources = [
  "daily_mood",
  "daily_question",
  "trait_card",
  "map_reflection",
  "free_text",
  "balance_game",
  "report_share",
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

export const feedAttachmentTypes = [
  "trait_card",
  "map_summary",
  "result_summary",
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
  type: z.enum(feedAttachmentTypes),
});

export const createFeedPostRequestSchema = z.object({
  action: z.literal("create_post"),
  attachments: z.array(feedAttachmentSchema).max(2).optional(),
  body: z.string().trim().min(1).max(800),
  clientRequestId: z.string().trim().min(8).max(128).optional(),
  pollOptionKey: z.string().trim().min(1).max(64).optional(),
  source: z.enum(feedPostSources),
  sourceId: z.string().trim().min(4).max(128).optional(),
  visibility: z.enum(feedVisibilityLevels),
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

export const createFeedPollVoteRequestSchema = z.object({
  action: z.literal("vote_poll"),
  clientRequestId: z.string().trim().min(8).max(128).optional(),
  optionId: z.string().uuid(),
  pollId: z.string().uuid(),
});

export const feedWriteRequestSchema = z.discriminatedUnion("action", [
  createFeedPostRequestSchema,
  createFeedCommentRequestSchema,
  createFeedReactionRequestSchema,
  createFeedBookmarkRequestSchema,
  removeFeedReactionRequestSchema,
  removeFeedBookmarkRequestSchema,
  createFeedPreferenceRequestSchema,
  createFeedPollVoteRequestSchema,
]);

export type FeedWriteRequest = z.infer<typeof feedWriteRequestSchema>;

export type FeedReadPayload = {
  contractVersion: typeof feedContractVersion;
  items: FeedItem[];
  policy: typeof feedPolicy;
  stories: FeedStory[];
};

export function createFeedReadPayload(): FeedReadPayload {
  return {
    contractVersion: feedContractVersion,
    items: [...feedItems].sort((a, b) => a.priority - b.priority),
    policy: feedPolicy,
    stories: [...feedStories],
  };
}
