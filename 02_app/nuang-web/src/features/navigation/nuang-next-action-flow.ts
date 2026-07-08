export type NuangNextActionFlowItemId =
  | "assessment"
  | "map"
  | "visibility"
  | "together";

export type NuangNextActionFlowItem = {
  body: string;
  href: string;
  id: NuangNextActionFlowItemId;
  stepLabel: string;
  title: string;
};

export const nuangNextActionFlowItems: ReadonlyArray<NuangNextActionFlowItem> = [
  {
    body: "20문항부터 시작하고, 원하면 정밀 코어로 확장해요.",
    href: "/assessments",
    id: "assessment",
    stepLabel: "1",
    title: "검사",
  },
  {
    body: "5축과 10축 오각형으로 내 흐름을 확인해요.",
    href: "/map",
    id: "map",
    stepLabel: "2",
    title: "성향지도",
  },
  {
    body: "기본 프로필은 공개, 민감 항목은 비공개로 확인해요.",
    href: "/my",
    id: "visibility",
    stepLabel: "3",
    title: "공개 범위",
  },
  {
    body: "공개 범위 안에서 피드와 1:1 비교를 살펴봐요.",
    href: "/together",
    id: "together",
    stepLabel: "4",
    title: "함께",
  },
];

export function listNuangNextActionFlowItems() {
  return [...nuangNextActionFlowItems];
}
