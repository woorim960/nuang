import { describe, expect, it } from "vitest";
import {
  createModerationQueueItem,
  getModerationSeverity,
  moderationQueueContractVersion,
  moderationQueueReadinessItems,
  moderationQueueStatuses,
} from "@/features/moderation/moderation-queue-contract";

const reportRequest = {
  action: "report" as const,
  reason: "privacy" as const,
  target: {
    id: "card_local_preview",
    type: "public_profile_card" as const,
  },
};

describe("moderation queue contract", () => {
  it("creates a queue item for report actions without exposing restricted surfaces", () => {
    const item = createModerationQueueItem({
      actionRequest: reportRequest,
      createdAt: "2026-07-04T00:00:00.000Z",
      queueItemId: "mod_001",
    });

    expect(item.contractVersion).toBe(moderationQueueContractVersion);
    expect(item.status).toBe("queued");
    expect(item.severity).toBe("high");
    expect(item.triage).toEqual({
      adminDirectResponseAccessAllowed: false,
      personalContactShown: false,
      rawScoreShown: false,
      requiresHumanReview: true,
    });
  });

  it("rejects non-report actions from the moderation queue", () => {
    expect(() =>
      createModerationQueueItem({
        actionRequest: {
          action: "hide",
          target: {
            id: "card_local_preview",
            type: "public_profile_card",
          },
        },
        createdAt: "2026-07-04T00:00:00.000Z",
        queueItemId: "mod_001",
      }),
    ).toThrow("Only report actions");
  });

  it("maps report reasons to triage severity", () => {
    expect(getModerationSeverity("privacy")).toBe("high");
    expect(getModerationSeverity("sensitive_content")).toBe("high");
    expect(getModerationSeverity("harassment")).toBe("medium");
    expect(getModerationSeverity("spam")).toBe("low");
    expect(getModerationSeverity("other")).toBe("low");
  });

  it("keeps queue statuses and admin readiness explicit", () => {
    expect(moderationQueueStatuses).toEqual([
      "queued",
      "in_review",
      "action_required",
      "dismissed",
      "resolved",
    ]);
    expect(moderationQueueReadinessItems.map((item) => item.label)).toEqual([
      "신고 접수",
      "운영자 검토",
      "조치 기록",
    ]);
  });

  it("keeps moderation payloads free of direct responses and raw scores", () => {
    const item = createModerationQueueItem({
      actionRequest: reportRequest,
      createdAt: "2026-07-04T00:00:00.000Z",
      queueItemId: "mod_001",
    });
    const publicJson = JSON.stringify(item);

    expect(publicJson).not.toMatch(/"responses"\s*:/);
    expect(publicJson).not.toContain("score_payload");
    expect(publicJson).not.toContain("itemId");
    expect(publicJson).not.toContain("email");
    expect(publicJson).not.toContain("provider");
  });
});
