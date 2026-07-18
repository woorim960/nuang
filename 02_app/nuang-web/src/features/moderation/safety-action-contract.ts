import { z } from "zod";

export const moderationSafetyActionTypes = ["report", "hide", "block"] as const;
export type ModerationSafetyAction = (typeof moderationSafetyActionTypes)[number];

export const moderationSafetyTargetTypes = [
  "feed_post",
  "public_profile_card",
  "public_comparison_report",
] as const;
export type ModerationSafetyTargetType =
  (typeof moderationSafetyTargetTypes)[number];

export type ModerationSafetyTargetOption = {
  description: string;
  id: string;
  label: string;
  type: ModerationSafetyTargetType;
};

export const moderationSafetyTargetSelectEventName =
  "nuang:moderation-safety-target-selected";

export const moderationSafetyActionTargetOptions = [
  {
    description: "피드에 공개된 글",
    id: "feed-post-preview",
    label: "피드 글",
    type: "feed_post",
  },
  {
    description: "내 공개 프로필 미리보기 카드",
    id: "local-public-profile-card-preview",
    label: "공개 프로필 카드",
    type: "public_profile_card",
  },
  {
    description: "공개 비교 리포트 미리보기",
    id: "public-comparison-report-preview",
    label: "1:1 비교 리포트",
    type: "public_comparison_report",
  },
] as const satisfies ReadonlyArray<ModerationSafetyTargetOption>;

export const moderationReportReasons = [
  "privacy",
  "harassment",
  "sensitive_content",
  "spam",
  "other",
] as const;

export const moderationSafetyActionPolicy = {
  blockRequiresAccount: true,
  hideIsPrivateToViewer: true,
  moderationQueueRequiredForReports: true,
  reportRequiresReason: true,
  safetyActionsOpenBeforePublicPosting: true,
} as const;

export const moderationSafetyActionRequestSchema = z
  .object({
    action: z.enum(moderationSafetyActionTypes),
    details: z.string().trim().max(500).optional(),
    reason: z.enum(moderationReportReasons).optional(),
    target: z.object({
      id: z.string().trim().min(4).max(128),
      type: z.enum(moderationSafetyTargetTypes),
    }),
  })
  .superRefine((payload, context) => {
    if (payload.action === "report" && !payload.reason) {
      context.addIssue({
        code: "custom",
        message: "Report actions require a reason.",
        path: ["reason"],
      });
    }
  });

export const moderationSafetyActionLabels = {
  block: {
    description: "이 사용자의 공개 카드를 다시 보지 않도록 준비합니다.",
    label: "차단",
  },
  hide: {
    description: "내 피드에서 이 카드만 숨기는 기능을 준비합니다.",
    label: "숨김",
  },
  report: {
    description: "신고 사유를 moderation queue로 보내는 기능을 준비합니다.",
    label: "신고",
  },
} as const satisfies Record<
  (typeof moderationSafetyActionTypes)[number],
  {
    description: string;
    label: string;
  }
>;
