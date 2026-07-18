import { describe, expect, it } from "vitest";
import {
  moderationSafetyActionTargetOptions,
  moderationSafetyActionLabels,
  moderationSafetyActionPolicy,
  moderationSafetyActionRequestSchema,
  moderationSafetyActionTypes,
} from "@/features/moderation/safety-action-contract";

const validReportPayload = {
  action: "report",
  reason: "privacy",
  target: {
    id: "card_local_preview",
    type: "public_profile_card",
  },
};

describe("moderation safety action contract", () => {
  it("defines the required safety actions before public posting opens", () => {
    expect(moderationSafetyActionTypes).toEqual(["report", "hide", "block"]);
    expect(moderationSafetyActionPolicy).toEqual({
      blockRequiresAccount: true,
      hideIsPrivateToViewer: true,
      moderationQueueRequiredForReports: true,
      reportRequiresReason: true,
      safetyActionsOpenBeforePublicPosting: true,
    });
  });

  it("defines concrete preview targets for safety action UX", () => {
    expect(moderationSafetyActionTargetOptions.map((target) => target.type)).toEqual([
      "feed_post",
      "public_profile_card",
      "public_comparison_report",
    ]);
    expect(moderationSafetyActionTargetOptions.map((target) => target.id)).toEqual([
      "feed-post-preview",
      "local-public-profile-card-preview",
      "public-comparison-report-preview",
    ]);
  });

  it("requires a reason for report actions", () => {
    expect(
      moderationSafetyActionRequestSchema.safeParse(validReportPayload).success,
    ).toBe(true);
    expect(
      moderationSafetyActionRequestSchema.safeParse({
        ...validReportPayload,
        reason: undefined,
      }).success,
    ).toBe(false);
  });

  it("allows hide and block without a report reason", () => {
    ["hide", "block"].forEach((action) => {
      expect(
        moderationSafetyActionRequestSchema.safeParse({
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
    expect(Object.values(moderationSafetyActionLabels).map((item) => item.label)).toEqual([
      "차단",
      "숨김",
      "신고",
    ]);
  });
});
