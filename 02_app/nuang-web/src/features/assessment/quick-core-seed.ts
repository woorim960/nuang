import type { AssessmentDefinition } from "@/features/assessment/types";
import type {
  DomainDefinition,
  FacetDefinition,
  ScoringRelease,
} from "@/lib/scoring/types";

export const responseOptions = [
  { value: 1 as const, label: "전혀 내 모습이 아니다" },
  { value: 2 as const, label: "내 모습이 아닌 편이다" },
  { value: 3 as const, label: "반반이다" },
  { value: 4 as const, label: "내 모습인 편이다" },
  { value: 5 as const, label: "매우 내 모습이다" },
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
      text: "사람들과 함께하는 자리에 자연스럽게 참여하는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-ERIR-01",
      domainId: "ER",
      facetId: "ER-IR",
      text: "일이 예상대로 되지 않으면 짜증이 빠르게 올라오는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-SMEP-01",
      domainId: "SM",
      facetId: "SM-EP",
      text: "해야 할 일이 생기면 미루기보다 시작하는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-ROEC-01",
      domainId: "RO",
      facetId: "RO-EC",
      text: "가까운 사람이 힘든 이야기를 하면 그 마음을 이해하려고 듣는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-OEAS-01",
      domainId: "OE",
      facetId: "OE-AS",
      text: "음악이나 장면의 미묘한 분위기에 관심을 두는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-SEAI-01",
      domainId: "SE",
      facetId: "SE-AI",
      text: "여러 사람이 결정을 못 내릴 때 선택지를 먼저 제안하는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-ERWD-01",
      domainId: "ER",
      facetId: "ER-WD",
      text: "중요한 일을 앞두면 잘못될 가능성을 여러 번 생각하는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-SMOS-01",
      domainId: "SM",
      facetId: "SM-OS",
      text: "필요한 물건은 정해둔 곳에 두는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-RORN-02",
      domainId: "RO",
      facetId: "RO-RN",
      text: "원하는 것이 있어도 상대에게 선택을 강요하지 않는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-OEIE-01",
      domainId: "OE",
      facetId: "OE-IE",
      text: "복잡한 아이디어의 원리를 생각하는 것을 즐기는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-SERE-02",
      domainId: "SE",
      facetId: "SE-RE",
      text: "다른 사람들과 함께 시간을 보내면 기분이 살아나는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-ERIR-03",
      domainId: "ER",
      facetId: "ER-IR",
      text: "갑작스러운 문제가 생기면 평정심이 쉽게 흔들리는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-SMEP-05",
      domainId: "SM",
      facetId: "SM-EP",
      text: "시작한 일은 가능한 한 끝까지 마무리하는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-ROEC-05",
      domainId: "RO",
      facetId: "RO-EC",
      text: "가능한 범위에서 다른 사람의 부담을 덜어주고 싶어 하는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-OEAS-03",
      domainId: "OE",
      facetId: "OE-AS",
      text: "머릿속으로 장면이나 이야기를 상상하는 것을 즐기는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-SEAI-02",
      domainId: "SE",
      facetId: "SE-AI",
      text: "내 의견이 다르면 그 자리에서 분명히 말하는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-ERWD-04",
      domainId: "ER",
      facetId: "ER-WD",
      text: "한 번 좌절하면 다시 시작할 자신감이 쉽게 떨어지는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-SMOS-02",
      domainId: "SM",
      facetId: "SM-OS",
      text: "해야 할 일을 일정이나 목록으로 정리하는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-RORN-03",
      domainId: "RO",
      facetId: "RO-RN",
      text: "상대가 거절하면 그 선택을 인정하려는 편이다.",
      isReverse: false,
    },
    {
      itemId: "NU-C17-OEIE-03",
      domainId: "OE",
      facetId: "OE-IE",
      text: "내 생각과 다른 설명도 비교해보는 편이다.",
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
  { facetId: "RO-RN", label: "경계와 선택 존중" },
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

export const profileNames = {
    TVOAE: "불꽃 온기 탐험가",
    TVOAP: "불꽃 세심한 실천가",
    TVODE: "불꽃 새길 개척가",
    TVODP: "불꽃 현실 추진가",
    TVFAE: "불꽃 영감 동행자",
    TVFAP: "불꽃 편안한 조율가",
    TVFDE: "불꽃 자유 발견가",
    TVFDP: "불꽃 담백한 해결가",
    TCOAE: "햇살 온기 탐험가",
    TCOAP: "햇살 세심한 실천가",
    TCODE: "햇살 새길 개척가",
    TCODP: "햇살 현실 추진가",
    TCFAE: "햇살 영감 동행자",
    TCFAP: "햇살 편안한 조율가",
    TCFDE: "햇살 자유 발견가",
    TCFDP: "햇살 담백한 해결가",
    SVOAE: "물결 온기 탐험가",
    SVOAP: "물결 세심한 실천가",
    SVODE: "물결 새길 개척가",
    SVODP: "물결 현실 추진가",
    SVFAE: "물결 영감 동행자",
    SVFAP: "물결 편안한 조율가",
    SVFDE: "물결 자유 발견가",
    SVFDP: "물결 담백한 해결가",
    SCOAE: "숲 온기 탐험가",
    SCOAP: "숲 세심한 실천가",
    SCODE: "숲 새길 개척가",
    SCODP: "숲 현실 추진가",
    SCFAE: "숲 영감 동행자",
    SCFAP: "숲 편안한 조율가",
    SCFDE: "숲 자유 발견가",
    SCFDP: "숲 담백한 해결가",
  };

export function buildFacetDefinitions(
  minValidResponses: number,
): FacetDefinition[] {
  return coreFacetDefinitions.map((facet) => ({
    ...facet,
    minValidResponses,
  }));
}

export const quickScoringRelease: ScoringRelease = {
  items: quickCoreAssessment.items.map((item) => ({
    itemId: item.itemId,
    facetId: item.facetId,
    isReverse: item.isReverse,
  })),
  facets: buildFacetDefinitions(1),
  domains: coreDomainDefinitions,
  profileNames,
};
