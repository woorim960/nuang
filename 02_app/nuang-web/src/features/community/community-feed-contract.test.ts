import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as communityFeedPost } from "@/app/api/community-feed/route";
import {
  communityFeedModerationStatuses,
  communityFeedPolicy,
  communityFeedReactionTypes,
  communityFeedVisibilityLevels,
  communityFeedWriteActions,
  communityFeedWriteRequestSchema,
} from "@/features/community/community-feed-contract";

const validPostPayload = {
  action: "create_post",
  attachments: [
    {
      id: "local-public-profile-card-preview",
      type: "public_profile_card",
    },
  ],
  body: "오늘의 질문에 답해보고 싶어요.",
  clientRequestId: "local_request_001",
  promptId: "daily_prompt_001",
  visibility: "public",
};

describe("community feed write contract", () => {
  it("defines the first basic community write surfaces", () => {
    expect(communityFeedWriteActions).toEqual([
      "create_post",
      "create_comment",
      "react",
    ]);
    expect(communityFeedVisibilityLevels).toEqual([
      "public",
      "profile_public",
      "private_draft",
    ]);
    expect(communityFeedModerationStatuses).toEqual([
      "pending_review",
      "published",
      "limited",
      "removed",
    ]);
    expect(communityFeedReactionTypes).toEqual([
      "like",
      "same",
      "curious",
      "support",
    ]);
  });

  it("keeps feed write gated behind account, moderation, and privacy policy", () => {
    expect(communityFeedPolicy).toEqual({
      accountRequiredForWrite: true,
      defaultPostVisibility: "public",
      directAssessmentResponsesForbidden: true,
      moderationBeforePublishing: true,
      sensitiveProfileFieldsRemainPrivate: true,
      writeOpenAfterCredentialAndModeration: true,
    });
  });

  it("accepts a public post with safe profile-card attachment only", () => {
    const result = communityFeedWriteRequestSchema.safeParse(validPostPayload);

    expect(result.success).toBe(true);
    if (result.success && result.data.action === "create_post") {
      expect(result.data.body).toBe("오늘의 질문에 답해보고 싶어요.");
      expect(result.data.attachments?.[0]?.type).toBe("public_profile_card");
    }
  });

  it("accepts comments and reactions against feed targets", () => {
    expect(
      communityFeedWriteRequestSchema.safeParse({
        action: "create_comment",
        body: "이 관점은 저랑 조금 다르지만 궁금해요.",
        target: {
          id: "community_post_001",
          type: "community_feed_post",
        },
      }).success,
    ).toBe(true);

    expect(
      communityFeedWriteRequestSchema.safeParse({
        action: "react",
        reaction: "curious",
        target: {
          id: "community_post_001",
          type: "community_feed_post",
        },
      }).success,
    ).toBe(true);
  });

  it("rejects empty posts and unsupported attachment types", () => {
    expect(
      communityFeedWriteRequestSchema.safeParse({
        ...validPostPayload,
        body: "   ",
      }).success,
    ).toBe(false);

    expect(
      communityFeedWriteRequestSchema.safeParse({
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
});

describe("community feed route before credentials", () => {
  beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("valid feed write requests stop at the closed auth gate", async () => {
    const response = await communityFeedPost(jsonRequest(validPostPayload));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("feature_closed");
    expect(body.code).toBe("supabase_env_missing");
  });

  it("invalid feed write requests fail validation before auth", async () => {
    const response = await communityFeedPost(
      jsonRequest({
        action: "create_comment",
        body: "",
        target: {
          id: "x",
          type: "community_feed_post",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("validation_error");
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/community-feed", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}
