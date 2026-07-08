import type { communityFeedTargetTypes } from "@/features/community/community-feed-contract";

export type CommunityWriteGateKind = "comment" | "reaction" | "post";
export type CommunityWriteGateTargetType =
  (typeof communityFeedTargetTypes)[number];

export type CommunityWriteGateTarget = {
  id: string;
  type: CommunityWriteGateTargetType;
};

export type CommunityWriteGateSelection = {
  cardTitle: string;
  kind: CommunityWriteGateKind;
  target?: CommunityWriteGateTarget;
};

export type CommunityWriteGateOption = {
  blockedBy: string[];
  description: string;
  kind: CommunityWriteGateKind;
  label: string;
  nextStep: string;
};

export const communityWriteGateSelectEventName =
  "nuang:community-write-gate-selected";

export const communityWriteGatePolicy = {
  commentsEnabled: false,
  postWriteEnabled: false,
  reactionWriteEnabled: false,
  requiresAccountBeforeWrite: true,
  requiresModerationBeforeWrite: true,
  sensitiveTopicWriteAllowed: false,
} as const;

export const communityWriteGateOptions = [
  {
    blockedBy: ["반응 저장소", "중복 반응 방지", "신고·숨김 연동"],
    description: "공감은 아직 저장하지 않고, 오픈 조건만 보여줘요.",
    kind: "reaction",
    label: "공감",
    nextStep: "반응 저장과 취소, 신고 연동이 검증되면 먼저 열겠습니다.",
  },
  {
    blockedBy: ["댓글 moderation", "신고 처리함", "민감 주제 차단"],
    description: "댓글은 안전 검토 체계가 준비된 뒤 열어요.",
    kind: "comment",
    label: "댓글",
    nextStep: "댓글 작성, 신고, 숨김, 운영자 검토가 연결되면 열겠습니다.",
  },
  {
    blockedBy: ["계정 연결", "게시글 moderation", "공개 범위 저장"],
    description: "글쓰기는 공개 범위와 moderation 연결 후 열어요.",
    kind: "post",
    label: "글쓰기",
    nextStep: "계정 저장과 공개 범위, 운영자 검토가 검증되면 열겠습니다.",
  },
] as const satisfies ReadonlyArray<CommunityWriteGateOption>;

export function getCommunityWriteGateOption(kind: CommunityWriteGateKind) {
  return (
    communityWriteGateOptions.find((option) => option.kind === kind) ??
    communityWriteGateOptions[0]
  );
}
