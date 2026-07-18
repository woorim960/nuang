import type { z } from "zod";
import {
  moderationReportReasons,
  moderationSafetyActionRequestSchema,
} from "@/features/moderation/safety-action-contract";

export const moderationQueueContractVersion = "moderation-queue.v0.1";

export const moderationQueueStatuses = [
  "queued",
  "in_review",
  "action_required",
  "dismissed",
  "resolved",
] as const;

export const moderationSeverityLevels = ["low", "medium", "high"] as const;

export type ModerationSafetyActionRequest = z.infer<
  typeof moderationSafetyActionRequestSchema
>;

export type ModerationQueueItem = {
  contractVersion: typeof moderationQueueContractVersion;
  createdAt: string;
  queueItemId: string;
  reason: (typeof moderationReportReasons)[number];
  severity: (typeof moderationSeverityLevels)[number];
  status: (typeof moderationQueueStatuses)[number];
  target: ModerationSafetyActionRequest["target"];
  triage: {
    adminDirectResponseAccessAllowed: false;
    personalContactShown: false;
    rawScoreShown: false;
    requiresHumanReview: true;
  };
};

export const moderationQueueReadinessItems = [
  {
    label: "신고 접수",
    status: "계약 준비",
  },
  {
    label: "운영자 검토",
    status: "권한 필요",
  },
  {
    label: "조치 기록",
    status: "감사 로그 필요",
  },
] as const;

export function createModerationQueueItem({
  actionRequest,
  createdAt,
  queueItemId,
}: {
  actionRequest: ModerationSafetyActionRequest;
  createdAt: string;
  queueItemId: string;
}): ModerationQueueItem {
  if (actionRequest.action !== "report" || !actionRequest.reason) {
    throw new Error("Only report actions with a reason can enter moderation queue.");
  }

  return {
    contractVersion: moderationQueueContractVersion,
    createdAt,
    queueItemId,
    reason: actionRequest.reason,
    severity: getModerationSeverity(actionRequest.reason),
    status: "queued",
    target: actionRequest.target,
    triage: {
      adminDirectResponseAccessAllowed: false,
      personalContactShown: false,
      rawScoreShown: false,
      requiresHumanReview: true,
    },
  };
}

export function getModerationSeverity(
  reason: (typeof moderationReportReasons)[number],
): (typeof moderationSeverityLevels)[number] {
  if (reason === "privacy" || reason === "sensitive_content") return "high";
  if (reason === "harassment") return "medium";
  return "low";
}
