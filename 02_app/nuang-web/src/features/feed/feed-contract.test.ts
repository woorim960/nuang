import { describe, expect, it } from "vitest";
import {
  createFeedReadPayload,
  feedAttachmentTypes,
  feedContractVersion,
  feedModerationStatuses,
  feedPostSources,
  feedReactionTypes,
  feedVisibilityLevels,
  feedWriteActions,
  feedWritePolicy,
  feedWriteRequestSchema,
} from "@/features/feed/feed-contract";

const validPostPayload = {
  action: "create_post",
  attachments: [
    {
      id: "local-trait-card-preview",
      type: "trait_card",
    },
  ],
  body: "오늘의 질문에 답해보고 싶어요.",
  clientRequestId: "local_request_001",
  source: "daily_question",
  sourceId: "daily_question_001",
  visibility: "public",
};

describe("feed contract", () => {
  it("defines Nuang feed write surfaces without exposing old community labels", () => {
    expect(feedWriteActions).toEqual([
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
    ]);
    expect(feedPostSources).toEqual([
      "daily_mood",
      "daily_question",
      "trait_card",
      "map_reflection",
      "free_text",
      "balance_game",
      "report_share",
      "together_balance_room_share",
      "together_balance_result_share",
    ]);
    expect(feedVisibilityLevels).toEqual([
      "public",
      "profile_public",
      "private_draft",
    ]);
    expect(feedModerationStatuses).toEqual([
      "pending_review",
      "published",
      "limited",
      "removed",
    ]);
    expect(feedReactionTypes).toEqual(["like", "same", "curious", "support"]);
    expect(feedAttachmentTypes).toEqual([
      "trait_card",
      "map_summary",
      "result_summary",
      "original_report",
    ]);
  });

  it("keeps write gated behind account, moderation, and privacy policy", () => {
    expect(feedWritePolicy).toEqual({
      accountRequiredForWrite: true,
      defaultPostVisibility: "public",
      directAssessmentResponsesForbidden: true,
      rawScorePayloadForbidden: true,
      sensitiveProfileFieldsRemainPrivate: true,
      writeOpenAfterCredentialAndModeration: true,
    });
  });

  it("accepts safe post/comment/reaction/bookmark requests", () => {
    expect(feedWriteRequestSchema.safeParse(validPostPayload).success).toBe(
      true,
    );
    expect(
      feedWriteRequestSchema.safeParse({
        action: "create_comment",
        body: "이 관점은 저랑 조금 다르지만 궁금해요.",
        target: {
          id: "feed_post_001",
          type: "feed_post",
        },
      }).success,
    ).toBe(true);
    expect(
      feedWriteRequestSchema.safeParse({
        action: "create_post",
        attachments: [
          {
            id: "topic_44444444-4444-4444-8444-444444444444",
            profileId: "55555555-5555-4555-8555-555555555555",
            type: "original_report",
          },
        ],
        body: "공개 원본 리포트를 공유해요.",
        source: "report_share",
        sourceId: "topic_44444444-4444-4444-8444-444444444444",
        visibility: "public",
      }).success,
    ).toBe(true);
    expect(
      feedWriteRequestSchema.safeParse({
        action: "react",
        reaction: "curious",
        target: {
          id: "feed_post_001",
          type: "feed_post",
        },
      }).success,
    ).toBe(true);
    expect(
      feedWriteRequestSchema.safeParse({
        action: "bookmark",
        target: {
          id: "feed_post_001",
          type: "feed_post",
        },
      }).success,
    ).toBe(true);
    expect(
      feedWriteRequestSchema.safeParse({
        action: "remove_reaction",
        reaction: "like",
        target: {
          id: "feed_post_001",
          type: "feed_post",
        },
      }).success,
    ).toBe(true);
    expect(
      feedWriteRequestSchema.safeParse({
        action: "remove_bookmark",
        target: {
          id: "feed_post_001",
          type: "feed_post",
        },
      }).success,
    ).toBe(true);
    expect(
      feedWriteRequestSchema.safeParse({
        action: "not_interested",
        target: {
          id: "feed_post_001",
          type: "feed_post",
        },
      }).success,
    ).toBe(true);
    expect(
      feedWriteRequestSchema.safeParse({
        action: "vote_poll",
        optionId: "33333333-3333-4333-8333-333333333333",
        pollId: "22222222-2222-4222-8222-222222222222",
      }).success,
    ).toBe(true);
  });

  it("accepts a custom balance game and rejects duplicate choices", () => {
    const customBalanceGame = {
      action: "create_post",
      body: "친구들의 선택이 궁금해요.",
      poll: {
        options: ["바로 만나기", "조금 더 알아보기"],
        question: "마음에 드는 사람과 가까워지고 싶을 때?",
      },
      source: "balance_game",
      sourceId: "user_balance_game_v1",
      visibility: "public",
    };

    expect(feedWriteRequestSchema.safeParse(customBalanceGame).success).toBe(
      true,
    );
    expect(
      feedWriteRequestSchema.safeParse({
        ...customBalanceGame,
        poll: {
          ...customBalanceGame.poll,
          options: ["같은 선택", "같은 선택"],
        },
      }).success,
    ).toBe(false);
  });

  it("rejects raw or sensitive attachment shapes", () => {
    expect(
      feedWriteRequestSchema.safeParse({
        ...validPostPayload,
        attachments: [
          {
            id: "raw-answer-export",
            type: "raw_assessment_response",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("creates a read payload for the current single-stream UI", () => {
    const payload = createFeedReadPayload();

    expect(payload.contractVersion).toBe(feedContractVersion);
    expect(payload.policy.bottomNavTab).toBe(false);
    expect(payload.items.map((item) => item.id)).toEqual([
      "daily_mood_001",
      "daily_question_001",
      "trait_card_001",
      "map_reflection_001",
      "official_note_001",
    ]);
    expect(payload).not.toHaveProperty("community");
  });
});
