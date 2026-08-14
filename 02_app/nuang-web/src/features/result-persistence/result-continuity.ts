export type ResultContinuityKind = "core" | "lab" | "topic";

export type ResultContinuityState =
  | "checking"
  | "error"
  | "guest"
  | "saved"
  | "saving";

export function buildResultSaveLoginHref(resultHref: string) {
  return `/login?reason=result_save&next=${encodeURIComponent(resultHref)}`;
}

export const resultContinuityCopy: Record<
  ResultContinuityKind,
  { benefits: [string, string, string]; description: string }
> = {
  core: {
    benefits: [
      "내 뉴앙 코드 다시 보기",
      "주제 검사와 함께 현재 성향 살펴보기",
      "결과 공개 범위 직접 바꾸기",
    ],
    description:
      "다른 기기에서도 다시 볼 수 있고, 이후 주제 검사가 더해지면 상황에 따라 달라지는 내 모습을 한곳에서 살펴볼 수 있어요.",
  },
  lab: {
    benefits: [
      "이번 생활 방식 결과 보관하기",
      "다른 기기에서도 다시 보기",
      "내 기록에서 결과 관리하기",
    ],
    description:
      "이 생활 방식 결과를 다른 기기에서도 다시 보고 내 기록에서 관리할 수 있어요. 별난 연구소 결과는 뉴앙코드를 바꾸지는 않아요.",
  },
  topic: {
    benefits: [
      "이번 주제 결과 보관하기",
      "다른 검사와 함께 내 모습 살펴보기",
      "결과 공개 범위 직접 바꾸기",
    ],
    description:
      "이번 결과를 내 기록에 저장하고, 다른 주제 결과와 함께 상황에 따라 달라지는 내 모습을 살펴볼 수 있어요.",
  },
};
