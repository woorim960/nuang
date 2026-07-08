import { z } from "zod";

export const communitySafetyActionTypes = ["report", "hide", "block"] as const;
export type CommunitySafetyAction = (typeof communitySafetyActionTypes)[number];

export const communitySafetyTargetTypes = [
  "community_preview_card",
  "public_profile_card",
  "public_comparison_report",
] as const;
export type CommunitySafetyTargetType =
  (typeof communitySafetyTargetTypes)[number];

export type CommunitySafetyTargetOption = {
  description: string;
  id: string;
  label: string;
  type: CommunitySafetyTargetType;
};

export const communitySafetyTargetSelectEventName =
  "nuang:community-safety-target-selected";

export const communitySafetyActionTargetOptions = [
  {
    description: "공식 피드의 읽기 카드",
    id: "community_read_feed_card",
    label: "읽기 피드 카드",
    type: "community_preview_card",
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
] as const satisfies ReadonlyArray<CommunitySafetyTargetOption>;

export const communityReportReasons = [
  "privacy",
  "harassment",
  "sensitive_content",
  "spam",
  "other",
] as const;

export const communitySafetyActionPolicy = {
  blockRequiresAccount: true,
  hideIsPrivateToViewer: true,
  moderationQueueRequiredForReports: true,
  reportRequiresReason: true,
  safetyActionsOpenBeforePublicPosting: true,
} as const;

export const communitySafetyActionRequestSchema = z
  .object({
    action: z.enum(communitySafetyActionTypes),
    details: z.string().trim().max(500).optional(),
    reason: z.enum(communityReportReasons).optional(),
    target: z.object({
      id: z.string().trim().min(4).max(128),
      type: z.enum(communitySafetyTargetTypes),
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

export const communitySafetyActionLabels = {
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
  (typeof communitySafetyActionTypes)[number],
  {
    description: string;
    label: string;
  }
>;
