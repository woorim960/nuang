import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as communitySafetyActionsPost } from "@/app/api/community-safety-actions/route";
import {
  communitySafetyActionTargetOptions,
  communitySafetyActionLabels,
  communitySafetyActionPolicy,
  communitySafetyActionRequestSchema,
  communitySafetyActionTypes,
} from "@/features/community/safety-action-contract";

const validReportPayload = {
  action: "report",
  reason: "privacy",
  target: {
    id: "card_local_preview",
    type: "public_profile_card",
  },
};

describe("community safety action contract", () => {
  it("defines the required safety actions before public posting opens", () => {
    expect(communitySafetyActionTypes).toEqual(["report", "hide", "block"]);
    expect(communitySafetyActionPolicy).toEqual({
      blockRequiresAccount: true,
      hideIsPrivateToViewer: true,
      moderationQueueRequiredForReports: true,
      reportRequiresReason: true,
      safetyActionsOpenBeforePublicPosting: true,
    });
  });

  it("defines concrete preview targets for safety action UX", () => {
    expect(communitySafetyActionTargetOptions.map((target) => target.type)).toEqual([
      "community_preview_card",
      "public_profile_card",
      "public_comparison_report",
    ]);
    expect(communitySafetyActionTargetOptions.map((target) => target.id)).toEqual([
      "community_read_feed_card",
      "local-public-profile-card-preview",
      "public-comparison-report-preview",
    ]);
  });

  it("requires a reason for report actions", () => {
    expect(
      communitySafetyActionRequestSchema.safeParse(validReportPayload).success,
    ).toBe(true);
    expect(
      communitySafetyActionRequestSchema.safeParse({
        ...validReportPayload,
        reason: undefined,
      }).success,
    ).toBe(false);
  });

  it("allows hide and block without a report reason", () => {
    ["hide", "block"].forEach((action) => {
      expect(
        communitySafetyActionRequestSchema.safeParse({
          action,
          target: {
            id: "card_local_preview",
            type: "public_profile_card",
          },
        }).success,
      ).toBe(true);
    });
  });

  it("keeps visible action labels concise", () => {
    expect(Object.values(communitySafetyActionLabels).map((item) => item.label)).toEqual([
      "차단",
      "숨김",
      "신고",
    ]);
  });
});

describe("community safety action route before credentials", () => {
  beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("valid safety action requests stop at the closed auth gate", async () => {
    const response = await communitySafetyActionsPost(jsonRequest(validReportPayload));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("feature_closed");
    expect(body.code).toBe("supabase_env_missing");
  });

  it("invalid safety action requests fail validation before auth", async () => {
    const response = await communitySafetyActionsPost(
      jsonRequest({
        action: "report",
        target: {
          id: "x",
          type: "public_profile_card",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("validation_error");
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/test", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}
