export type CommunityFeedBridgeItemId =
  | "start_core"
  | "open_map"
  | "check_visibility"
  | "compare_preview";

export type CommunityFeedBridgeItem = {
  actionLabel: string;
  body: string;
  href: string;
  id: CommunityFeedBridgeItemId;
  statusLabel: string;
  title: string;
};

export const communityFeedBridgeItems: ReadonlyArray<CommunityFeedBridgeItem> = [
  {
    actionLabel: "검사 홈",
    body: "20문항 빠른 코어부터 시작하고, 정밀 코어로 확장해요.",
    href: "/assessments",
    id: "start_core",
    statusLabel: "첫 기준",
    title: "내 기준 만들기",
  },
  {
    actionLabel: "성향지도",
    body: "5축과 10축 오각형 지표로 내 흐름을 다시 확인해요.",
    href: "/map",
    id: "open_map",
    statusLabel: "시각화",
    title: "지도에서 보기",
  },
  {
    actionLabel: "마이",
    body: "기본 프로필은 공개, 민감 항목은 비공개 기본값으로 확인해요.",
    href: "/my",
    id: "check_visibility",
    statusLabel: "공개 범위",
    title: "공개 범위 확인",
  },
  {
    actionLabel: "비교 미리보기",
    body: "상대 공개 범위 안에서만 서로 다른 지점을 미리 살펴봐요.",
    href: "/together/comparison-preview",
    id: "compare_preview",
    statusLabel: "1:1",
    title: "비교 흐름 보기",
  },
];

export function listCommunityFeedBridgeItems() {
  return [...communityFeedBridgeItems];
}
