export const nuangCodeDictionaryVersion = "nuang-code-dictionary.v0.1";

export type NuangCodePositionId = "energy" | "emotion" | "rhythm" | "relation" | "thought";
export type NuangDomainId = "SE" | "ER" | "SM" | "RO" | "OE";
export type NuangCodeLetter = "S" | "T" | "C" | "V" | "F" | "O" | "D" | "A" | "P" | "E";

export type NuangCodePosition = {
  id: NuangCodePositionId;
  index: number;
  domainId: NuangDomainId;
  name: string;
  shortDescription: string;
  lowSymbol: NuangCodeLetter;
  highSymbol: NuangCodeLetter;
};

export type NuangCodeLetterInsight = {
  letter: NuangCodeLetter;
  name: string;
  summary: string;
  strengths: string;
  caution: string;
};

export type NuangCodeComparisonCopy = {
  same: string;
  different: string;
  possibleMisread: string;
  adjustmentQuestion: string;
};

export const nuangCodePositions = [
  {
    id: "energy",
    index: 0,
    domainId: "SE",
    name: "에너지가 시작되는 방식",
    shortDescription: "사람 사이에서 에너지를 얻고 표현을 시작하는 방식",
    lowSymbol: "S",
    highSymbol: "T",
  },
  {
    id: "emotion",
    index: 1,
    domainId: "ER",
    name: "마음이 흔들릴 때의 반응",
    shortDescription: "감정과 걱정이 올라올 때 안정시키는 방식",
    lowSymbol: "C",
    highSymbol: "V",
  },
  {
    id: "rhythm",
    index: 2,
    domainId: "SM",
    name: "일상을 굴리는 방식",
    shortDescription: "계획, 실행, 정리, 마감의 리듬",
    lowSymbol: "F",
    highSymbol: "O",
  },
  {
    id: "relation",
    index: 3,
    domainId: "RO",
    name: "관계를 맞추는 방식",
    shortDescription: "상대 마음과 내 기준, 관계의 여백을 함께 다루는 방식",
    lowSymbol: "D",
    highSymbol: "A",
  },
  {
    id: "thought",
    index: 4,
    domainId: "OE",
    name: "생각이 넓어지는 방식",
    shortDescription: "현실 감각과 아이디어 탐구를 쓰는 방식",
    lowSymbol: "P",
    highSymbol: "E",
  },
] as const satisfies readonly NuangCodePosition[];

export const nuangCodeLetterInsights = {
  S: {
    letter: "S",
    name: "조용히 살피는 에너지",
    summary: "분위기를 먼저 읽고, 안전한 흐름이 보일 때 가까워지는 편이에요.",
    strengths: "신중함, 관찰력, 과한 반응을 줄이는 안정감",
    caution: "괜찮은 기회도 너무 오래 지켜볼 수 있어요.",
  },
  T: {
    letter: "T",
    name: "먼저 움직이는 에너지",
    summary: "사람들과 함께 있을 때 반응이 빨라지고, 흐름을 먼저 여는 편이에요.",
    strengths: "추진력, 표현력, 분위기를 여는 힘",
    caution: "상대가 따라올 시간을 충분히 주지 못할 수 있어요.",
  },
  C: {
    letter: "C",
    name: "차분히 가라앉히는 마음",
    summary: "문제가 생기면 감정을 키우기보다 상황을 정리하며 안정감을 찾는 편이에요.",
    strengths: "침착함, 회복력, 과열을 낮추는 힘",
    caution: "속마음이 없는 것처럼 보일 수 있어요.",
  },
  V: {
    letter: "V",
    name: "감정 신호가 선명한 마음",
    summary: "마음의 변화와 불편함을 빨리 알아차리고, 관계 신호를 놓치지 않는 편이에요.",
    strengths: "민감한 포착력, 진심의 표현, 관계 신호를 읽는 힘",
    caution: "상대가 그 반응을 부담이나 예민함으로 오해할 수 있어요.",
  },
  F: {
    letter: "F",
    name: "유연하게 흘러가는 일상",
    summary: "상황이 바뀌면 계획도 함께 바꾸며, 여유와 즉흥성 속에서 컨디션이 살아나요.",
    strengths: "적응력, 가벼운 전환, 압박을 낮추는 힘",
    caution: "마감이나 정리가 뒤로 밀릴 수 있어요.",
  },
  O: {
    letter: "O",
    name: "정돈해서 완성하는 일상",
    summary: "해야 할 일을 구조화하고, 목록과 루틴 속에서 안정적으로 마무리하는 편이에요.",
    strengths: "실행력, 지속성, 약속을 지키는 힘",
    caution: "바뀐 상황을 받아들이는 데 시간이 걸릴 수 있어요.",
  },
  D: {
    letter: "D",
    name: "거리와 선택을 존중하는 관계",
    summary: "상대가 스스로 결정할 수 있는 여지를 중요하게 보고, 부담을 줄이는 편이에요.",
    strengths: "독립성, 선택 존중, 편안한 거리감",
    caution: "상대가 무심함이나 거리감으로 받아들일 수 있어요.",
  },
  A: {
    letter: "A",
    name: "마음을 살피는 관계",
    summary: "상대의 감정과 필요를 먼저 살피며, 가까운 사람을 챙기고 싶어 하는 편이에요.",
    strengths: "공감, 배려, 따뜻한 연결감",
    caution: "상대가 간섭이나 부담으로 느낄 수 있어요.",
  },
  P: {
    letter: "P",
    name: "현실에 붙여보는 생각",
    summary: "아이디어가 실제로 쓸 수 있는지 확인하고, 구체적인 기준에서 판단이 또렷해져요.",
    strengths: "실용성, 안정적인 판단, 현실 감각",
    caution: "가능성 탐색이 너무 빨리 닫힐 수 있어요.",
  },
  E: {
    letter: "E",
    name: "가능성을 탐험하는 생각",
    summary: "여러 가능성을 열어두고, 의미와 아이디어의 연결을 탐구하는 편이에요.",
    strengths: "상상력, 연결 능력, 탐구심",
    caution: "상대가 너무 추상적이거나 멀게 느낄 수 있어요.",
  },
} as const satisfies Record<NuangCodeLetter, NuangCodeLetterInsight>;

export const nuangProfileNames = {
  TVOAE: "불꽃의 온기 탐험가",
  TVOAP: "불꽃의 세심한 실천가",
  TVODE: "불꽃의 새길 개척가",
  TVODP: "불꽃의 현실 추진가",
  TVFAE: "불꽃의 영감 동행자",
  TVFAP: "불꽃의 편안한 조율가",
  TVFDE: "불꽃의 자유 발견가",
  TVFDP: "불꽃의 담백한 해결가",
  TCOAE: "햇살의 온기 탐험가",
  TCOAP: "햇살의 세심한 실천가",
  TCODE: "햇살의 새길 개척가",
  TCODP: "햇살의 현실 추진가",
  TCFAE: "햇살의 영감 동행자",
  TCFAP: "햇살의 편안한 조율가",
  TCFDE: "햇살의 자유 발견가",
  TCFDP: "햇살의 담백한 해결가",
  SVOAE: "물결의 온기 탐험가",
  SVOAP: "물결의 세심한 실천가",
  SVODE: "물결의 새길 개척가",
  SVODP: "물결의 현실 추진가",
  SVFAE: "물결의 영감 동행자",
  SVFAP: "물결의 편안한 조율가",
  SVFDE: "물결의 자유 발견가",
  SVFDP: "물결의 담백한 해결가",
  SCOAE: "숲의 온기 탐험가",
  SCOAP: "숲의 세심한 실천가",
  SCODE: "숲의 새길 개척가",
  SCODP: "숲의 현실 추진가",
  SCFAE: "숲의 영감 동행자",
  SCFAP: "숲의 편안한 조율가",
  SCFDE: "숲의 자유 발견가",
  SCFDP: "숲의 담백한 해결가",
} as const;

export type NuangCode = keyof typeof nuangProfileNames;

export const nuangCodeComparisonCopy = {
  energy: {
    same: "가까워지는 속도와 표현을 시작하는 지점이 비슷해요.",
    different: "한 사람은 바로 반응하며 가까워지고, 다른 한 사람은 관찰 시간이 있어야 편해져요.",
    possibleMisread: "답이 늦으면 관심이 없다고 오해하거나, 빠른 반응을 압박으로 느낄 수 있어요.",
    adjustmentQuestion: "바로 답이 필요해? 아니면 생각할 시간을 줄까?",
  },
  emotion: {
    same: "감정을 다루는 온도와 회복 속도가 비슷해요.",
    different: "한 사람은 차분히 정리하고, 다른 한 사람은 감정 신호를 선명하게 표현해요.",
    possibleMisread: "차분함을 무심함으로, 선명한 표현을 과함으로 볼 수 있어요.",
    adjustmentQuestion: "지금은 해결이 필요해, 아니면 마음을 먼저 들어주면 될까?",
  },
  rhythm: {
    same: "약속, 마감, 루틴을 맞추는 기준이 비슷해요.",
    different: "한 사람은 정돈과 예측 가능성, 다른 한 사람은 유연한 여백을 더 원해요.",
    possibleMisread: "계획을 통제로 느끼거나, 유연함을 무책임으로 볼 수 있어요.",
    adjustmentQuestion: "꼭 지킬 부분과 바뀌어도 되는 부분을 나눠보자.",
  },
  relation: {
    same: "챙김과 거리의 기준이 비슷해요.",
    different: "한 사람은 마음 확인, 다른 한 사람은 선택과 거리를 더 중요하게 봐요.",
    possibleMisread: "확인을 간섭으로, 여백을 무심함으로 오해할 수 있어요.",
    adjustmentQuestion: "내가 챙겨도 되는 부분과 혼자 두면 편한 부분을 알려줘.",
  },
  thought: {
    same: "판단 기준과 대화가 넓어지는 방식이 비슷해요.",
    different: "한 사람은 현실 적용, 다른 한 사람은 가능성 탐색을 더 원해요.",
    possibleMisread: "현실 기준을 답답함으로, 아이디어 확장을 뜬구름으로 볼 수 있어요.",
    adjustmentQuestion: "먼저 넓게 이야기해볼까, 아니면 바로 실행 기준부터 정할까?",
  },
} as const satisfies Record<NuangCodePositionId, NuangCodeComparisonCopy>;

const profileNameKeys = Object.keys(nuangProfileNames) as NuangCode[];
const validCodeSet = new Set<string>(profileNameKeys);
const positionsByDomainId = new Map<NuangDomainId, NuangCodePosition>(
  nuangCodePositions.map((position) => [position.domainId, position]),
);

export function isValidNuangCode(code: string | null | undefined): code is NuangCode {
  return typeof code === "string" && validCodeSet.has(code);
}

export function getNuangProfileName(code: string | null | undefined) {
  return isValidNuangCode(code) ? nuangProfileNames[code] : null;
}

export function getNuangCodePositionByDomainId(domainId: string) {
  return positionsByDomainId.get(domainId as NuangDomainId) ?? null;
}

export function getNuangCodeLetterAt(code: string | null | undefined, index: number) {
  if (!isValidNuangCode(code)) return null;

  return (code[index] as NuangCodeLetter | undefined) ?? null;
}

export function getNuangCodeLetterInsight(letter: string | null | undefined) {
  if (!letter || !(letter in nuangCodeLetterInsights)) return null;

  return nuangCodeLetterInsights[letter as NuangCodeLetter];
}

export function getBoundaryCopy() {
  return "이 자리는 한쪽으로 아주 강하게 기울기보다 두 모습이 함께 나타날 수 있어요.";
}
