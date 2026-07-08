export type CommunityPreviewCardKind =
  | "daily_question"
  | "trait_card"
  | "public_profile";

export type CommunityPreviewCard = {
  actionLabel: string;
  body: string;
  kind: CommunityPreviewCardKind;
  motif: "flame" | "forest" | "purple" | "sun" | "water";
  status: "preview";
  title: string;
};

export const communityPreviewPolicy = {
  commentsEnabled: false,
  directMessagesEnabled: false,
  infiniteFeedEnabled: false,
  moderationRequiredBeforePosting: true,
  publicWriteEnabled: false,
  sensitiveTopicsAllowed: false,
} as const;

export const communityPreviewCards: ReadonlyArray<CommunityPreviewCard> = [
  {
    actionLabel: "답변 준비 중",
    body: "나와 다른 속도의 사람과 맞출 때, 먼저 확인하면 좋은 신호는 무엇일까요?",
    kind: "daily_question",
    motif: "sun",
    status: "preview",
    title: "오늘의 질문",
  },
  {
    actionLabel: "카드 만들기 준비 중",
    body: "대표 성향과 성향지도 요약만 골라 한 장의 소개 카드로 보여줘요.",
    kind: "trait_card",
    motif: "purple",
    status: "preview",
    title: "성향 카드",
  },
  {
    actionLabel: "프로필 공개 준비 중",
    body: "기본 프로필, 대표 성향, 5영역, 10세부 요약만 공개 범위에 담아요.",
    kind: "public_profile",
    motif: "water",
    status: "preview",
    title: "공개 프로필 카드",
  },
];

export const communityPreviewSafetyLines = [
  "댓글과 게시글 작성은 신고·차단 검증 후 열기",
  "민감 검사와 도움 연결 기록은 커뮤니티 미사용",
  "직접 응답과 원점수는 공개 카드에 미포함",
] as const;

export function listCommunityPreviewCards() {
  return communityPreviewCards;
}
