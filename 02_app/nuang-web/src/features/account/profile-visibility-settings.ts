import { z } from "zod";
import { profileVisibilityPolicyVersion } from "@/features/together/profile-visibility-policy";

export const communityProfileVisibilitySchema = z
  .object({
    codeVisible: z.boolean(),
    comparisonEnabled: z.boolean(),
    detailsVisible: z.boolean(),
    expectedRevision: z.number().int().positive(),
    policyVersion: z.literal(profileVisibilityPolicyVersion),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.codeVisible && value.detailsVisible) {
      context.addIssue({
        code: "custom",
        message: "대표 코드를 숨기면 상세 성향도 함께 숨겨야 해요.",
        path: ["detailsVisible"],
      });
    }

    if (!value.detailsVisible && value.comparisonEnabled) {
      context.addIssue({
        code: "custom",
        message: "상세 성향을 숨기면 나와 비교도 허용할 수 없어요.",
        path: ["comparisonEnabled"],
      });
    }
  });

export type CommunityProfileVisibility = z.infer<
  typeof communityProfileVisibilitySchema
>;

export type CommunityProfileVisibilityPayload = {
  code: string | null;
  comparisonEnabled: boolean;
  detailsVisible: boolean;
  displayName: string;
  codeVisible: boolean;
  profileName: string | null;
  publicId: string;
  revision: number;
};

export const alwaysPrivateProfileItems = [
  "검사에서 고른 답과 판단하기 어려웠던 문항",
  "원점수와 계산에 사용한 내부 점수",
  "민감한 검사 결과와 도움 연결 기록",
  "이메일·로그인 계정 등 개인 식별 정보",
  "저장한 게시물과 개인 활동 기록",
] as const;
