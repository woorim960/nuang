import type { AssessmentDefinition } from "@/features/assessment/types";
import type {
  DomainDefinition,
  FacetDefinition,
  ScoringRelease,
} from "@/lib/scoring/types";
import { nuangProfileNames } from "@/features/nuang-code/nuang-code-dictionary";

export const responseOptions = [
  { value: 1 as const, label: "거의 그렇지 않아요" },
  { value: 2 as const, label: "드문 편이에요" },
  { value: 3 as const, label: "반반이에요" },
  { value: 4 as const, label: "자주 그래요" },
  { value: 5 as const, label: "거의 항상 그래요" },
];

export const quickCoreAssessment: AssessmentDefinition = {
  assessmentId: "nu-core-quick",
  releaseId: "NUANG-CORE-QUICK-0.9",
  mode: "quick",
  title: "빠른 코어",
  resultLabel: "가장 가까운 예비 성향",
  estimatedMinutes: 3,
  items: [
    {
      itemId: "NU-C17-SERE-01",
      domainId: "SE",
      facetId: "SE-RE",
      contextLabel: "사람들과 함께하는 자리에 있을 때",
      text: "그 흐름에 자연스럽게 참여한다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-ERIR-01",
      domainId: "ER",
      facetId: "ER-IR",
      contextLabel: "일이 예상대로 되지 않을 때",
      text: "짜증이 빠르게 올라온다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-SMEP-01",
      domainId: "SM",
      facetId: "SM-EP",
      contextLabel: "해야 할 일이 생겼을 때",
      text: "미루기보다 바로 시작한다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-ROEC-01",
      domainId: "RO",
      facetId: "RO-EC",
      contextLabel: "가까운 사람이 힘든 이야기를 할 때",
      text: "그 사람의 마음을 이해하려고 듣는다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-OEAS-01",
      domainId: "OE",
      facetId: "OE-AS",
      contextLabel: "음악을 듣거나 인상적인 장면을 볼 때",
      text: "미묘한 분위기에 관심이 간다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-SEAI-01",
      domainId: "SE",
      facetId: "SE-AI",
      contextLabel: "여러 사람이 결정을 미루고 있을 때",
      text: "선택지를 먼저 제안한다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-ERWD-01",
      domainId: "ER",
      facetId: "ER-WD",
      contextLabel: "중요한 일을 앞두고 있을 때",
      text: "잘못될 가능성을 여러 번 생각한다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-SMOS-01",
      domainId: "SM",
      facetId: "SM-OS",
      contextLabel: "자주 쓰는 물건을 둘 때",
      text: "다시 찾을 자리를 정해둔다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-RORN-02",
      domainId: "RO",
      facetId: "RO-RN",
      contextLabel: "상대에게 원하는 것이 있을 때",
      text: "내 선택을 강요하지 않는다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-OEIE-01",
      domainId: "OE",
      facetId: "OE-IE",
      contextLabel: "복잡한 아이디어를 접했을 때",
      text: "그 원리를 생각하는 일이 즐겁다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-SERE-02",
      domainId: "SE",
      facetId: "SE-RE",
      contextLabel: "다른 사람들과 함께 시간을 보낼 때",
      text: "기분이 살아난다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-ERIR-03",
      domainId: "ER",
      facetId: "ER-IR",
      contextLabel: "갑작스러운 문제가 생겼을 때",
      text: "평정심이 쉽게 흔들린다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-SMEP-05",
      domainId: "SM",
      facetId: "SM-EP",
      contextLabel: "하던 일을 시작한 뒤",
      text: "가능한 한 끝까지 마무리한다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-ROEC-05",
      domainId: "RO",
      facetId: "RO-EC",
      contextLabel: "다른 사람이 부담을 안고 있을 때",
      text: "내가 할 수 있는 범위에서 그 부담을 덜어주고 싶어진다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-OEAS-03",
      domainId: "OE",
      facetId: "OE-AS",
      contextLabel: "한 장면이나 이야기를 떠올릴 때",
      text: "머릿속으로 이어서 상상하는 일이 즐겁다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-SEAI-02",
      domainId: "SE",
      facetId: "SE-AI",
      contextLabel: "다른 사람과 의견이 다를 때",
      text: "그 자리에서 내 생각을 분명히 말한다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-ERWD-04",
      domainId: "ER",
      facetId: "ER-WD",
      contextLabel: "하던 일이 한 번 잘되지 않았을 때",
      text: "다시 시작할 자신감이 쉽게 떨어진다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-SMOS-02",
      domainId: "SM",
      facetId: "SM-OS",
      contextLabel: "해야 할 일이 여러 개 있을 때",
      text: "일정이나 목록으로 정리한다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-RORN-03",
      domainId: "RO",
      facetId: "RO-RN",
      contextLabel: "상대가 내 제안을 거절했을 때",
      text: "그 선택을 인정하려고 한다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-OEIE-03",
      domainId: "OE",
      facetId: "OE-IE",
      contextLabel: "내 생각과 다른 설명을 접했을 때",
      text: "어떤 차이가 있는지 비교해본다.",
      isReverse: false,
    },
  ],
};

export const coreFacetDefinitions = [
  { facetId: "SE-RE", label: "함께하는 에너지" },
  { facetId: "SE-AI", label: "먼저 표현하기" },
  { facetId: "ER-IR", label: "감정이 커지는 정도" },
  { facetId: "ER-WD", label: "걱정과 망설임" },
  { facetId: "SM-EP", label: "실행과 마무리" },
  { facetId: "SM-OS", label: "정리와 계획" },
  { facetId: "RO-EC", label: "상대 마음 살피기" },
  { facetId: "RO-RN", label: "기준과 선택 존중" },
  { facetId: "OE-AS", label: "감각과 상상" },
  { facetId: "OE-IE", label: "아이디어 탐구" },
];

export const coreDomainDefinitions: DomainDefinition[] = [
  {
    domainId: "SE",
    label: "사람 사이 에너지",
    lowSymbol: "S",
    highSymbol: "T",
    facetIds: ["SE-RE", "SE-AI"],
  },
  {
    domainId: "ER",
    label: "마음의 반응",
    lowSymbol: "C",
    highSymbol: "V",
    facetIds: ["ER-IR", "ER-WD"],
  },
  {
    domainId: "SM",
    label: "일상 리듬",
    lowSymbol: "F",
    highSymbol: "O",
    facetIds: ["SM-EP", "SM-OS"],
  },
  {
    domainId: "RO",
    label: "관계 방식",
    lowSymbol: "D",
    highSymbol: "A",
    facetIds: ["RO-EC", "RO-RN"],
  },
  {
    domainId: "OE",
    label: "감각과 생각",
    lowSymbol: "P",
    highSymbol: "E",
    facetIds: ["OE-AS", "OE-IE"],
  },
];

export const profileNames = nuangProfileNames;

export function buildFacetDefinitions(
  minValidResponses: number,
): FacetDefinition[] {
  return coreFacetDefinitions.map((facet) => ({
    ...facet,
    minValidResponses,
  }));
}

export const quickScoringRelease: ScoringRelease = {
  assessmentReleaseId: quickCoreAssessment.releaseId,
  scoringReleaseId: "NUANG-CORE-QUICK-SCORING-0.9",
  scoringModelVersion: "CORE_SCORING_ALGORITHM_SPEC_v1.0",
  codeSchemeVersion: "NUANG-CODE-5AXIS-PROVISIONAL-0.9",
  items: quickCoreAssessment.items.map((item) => ({
    itemId: item.itemId,
    facetId: item.facetId,
    isReverse: item.isReverse,
  })),
  facets: buildFacetDefinitions(1),
  domains: coreDomainDefinitions,
  profileNames,
};
