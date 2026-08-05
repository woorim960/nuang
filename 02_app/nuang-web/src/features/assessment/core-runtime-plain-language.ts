import type { AssessmentDefinition } from "@/features/assessment/types";

/**
 * The beta research bank is immutable because its exact hash is tied to the
 * prereview evidence. Customer-facing copy revisions therefore live in this
 * versioned runtime layer instead of rewriting the reviewed research input.
 */
export const corePlainKoreanRuntimeCopyVersion =
  "NUANG-CORE-PLAIN-KOREAN-2026-08-05";

export const corePlainKoreanRuntimeCopy: Readonly<Record<string, string>> = {
  "NU-B1-003": "그 사람이 그때 어떤 기분이었는지 먼저 궁금해진다.",
  "NU-B1-013": "상대의 기분보다 문제가 생긴 이유와 해결 방법을 먼저 생각한다.",
  "NU-B1-018": "미리 순서를 정하기보다 그때 가장 먼저 보이는 일부터 한다.",
  "NU-B1-023": "상대의 기분보다 왜 그런 일이 생겼는지 먼저 궁금해진다.",
  "NU-B1-028": "정해 둔 자리보다 지금 쓰는 곳에서 가까운 곳에 둔다.",
  "NU-B1-033": "해결 방법을 말하기 전에 상대가 어떤 기분이었는지 더 듣고 싶다.",
  "NU-B1-043":
    "내 의견을 말하기 전에 그 사람이 그때 어떤 기분이었는지 먼저 묻고 싶다.",
  "NU-B1-050": "모르는 말이 나오면 그 뜻을 이해할 때까지 질문하거나 찾아본다.",
  "NU-B1-053":
    "누구의 기분이 상했는지보다 어느 부분에서 문제가 생겼는지 먼저 살핀다.",
  "NU-B1-056": "다른 사람들의 의견을 먼저 들은 다음 내 생각을 말한다.",
  "NU-B1-058":
    "정해 둔 자리를 따로 만들기보다 쓸 때마다 꺼내기 쉬운 곳에 둔다.",
};

export function applyCorePlainKoreanRuntimeCopy(
  definition: AssessmentDefinition,
): AssessmentDefinition {
  return {
    ...definition,
    items: definition.items.map((item) => ({
      ...item,
      text: corePlainKoreanRuntimeCopy[item.itemId] ?? item.text,
    })),
  };
}
