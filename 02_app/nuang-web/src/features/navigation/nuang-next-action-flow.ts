export type NuangNextActionFlowItemId =
  | "assessment"
  | "feed"
  | "map"
  | "reports";

export type NuangNextActionFlowItem = {
  body: string;
  href: string;
  id: NuangNextActionFlowItemId;
  stepLabel: string;
  title: string;
};

export const nuangNextActionFlowItems: ReadonlyArray<NuangNextActionFlowItem> = [
  {
    body: "빠른 코어부터 시작하고, 원하면 정밀 코어로 확장해요.",
    href: "/assessments",
    id: "assessment",
    stepLabel: "1",
    title: "검사",
  },
  {
    body: "성향 기반 질문과 사람들의 소식을 가볍게 둘러봐요.",
    href: "/feed",
    id: "feed",
    stepLabel: "2",
    title: "피드",
  },
  {
    body: "코드 지도와 세부 신호로 내 흐름을 확인해요.",
    href: "/map",
    id: "map",
    stepLabel: "3",
    title: "성향지도",
  },
  {
    body: "검사 결과와 비교 리포트를 한곳에서 다시 확인해요.",
    href: "/my/reports",
    id: "reports",
    stepLabel: "4",
    title: "내 리포트",
  },
];

export function listNuangNextActionFlowItems() {
  return [...nuangNextActionFlowItems];
}
