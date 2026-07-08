import { z } from "zod";

export const communityFeedWriteActions = [
  "create_post",
  "create_comment",
  "react",
] as const;

export const communityFeedVisibilityLevels = [
  "public",
  "profile_public",
  "private_draft",
] as const;

export const communityFeedModerationStatuses = [
  "pending_review",
  "published",
  "limited",
  "removed",
] as const;

export const communityFeedReactionTypes = [
  "like",
  "same",
  "curious",
  "support",
] as const;

export const communityFeedTargetTypes = [
  "community_feed_post",
  "community_feed_comment",
  "community_preview_card",
] as const;

export const communityFeedAttachmentTypes = [
  "public_profile_card",
  "public_comparison_report",
] as const;

export const communityFeedPolicy = {
  accountRequiredForWrite: true,
  defaultPostVisibility: "public",
  directAssessmentResponsesForbidden: true,
  moderationBeforePublishing: true,
  sensitiveProfileFieldsRemainPrivate: true,
  writeOpenAfterCredentialAndModeration: true,
} as const;

const communityFeedTargetSchema = z.object({
  id: z.string().trim().min(4).max(128),
  type: z.enum(communityFeedTargetTypes),
});

const communityFeedAttachmentSchema = z.object({
  id: z.string().trim().min(4).max(128),
  type: z.enum(communityFeedAttachmentTypes),
});

export const createCommunityFeedPostRequestSchema = z.object({
  action: z.literal("create_post"),
  attachments: z.array(communityFeedAttachmentSchema).max(2).optional(),
  body: z.string().trim().min(1).max(800),
  clientRequestId: z.string().trim().min(8).max(128).optional(),
  promptId: z.string().trim().min(4).max(128).optional(),
  visibility: z.enum(communityFeedVisibilityLevels),
});

export const createCommunityFeedCommentRequestSchema = z.object({
  action: z.literal("create_comment"),
  body: z.string().trim().min(1).max(400),
  clientRequestId: z.string().trim().min(8).max(128).optional(),
  target: communityFeedTargetSchema,
});

export const createCommunityFeedReactionRequestSchema = z.object({
  action: z.literal("react"),
  clientRequestId: z.string().trim().min(8).max(128).optional(),
  reaction: z.enum(communityFeedReactionTypes),
  target: communityFeedTargetSchema,
});

export const communityFeedWriteRequestSchema = z.discriminatedUnion("action", [
  createCommunityFeedPostRequestSchema,
  createCommunityFeedCommentRequestSchema,
  createCommunityFeedReactionRequestSchema,
]);
