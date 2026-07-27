import { nextNuangCodeScheme } from "@/features/nuang-code/next-code-scheme";

export const candidateProfileNameReleaseId = "NUANG-PROFILE-NAME-CANDIDATE-2.1";
export const candidateSymbolLanguageReleaseId =
  "NUANG-CODE-SYMBOL-LANGUAGE-1.0";

export const candidateCodeSymbols = [
  ["I", "E"],
  ["R", "N"],
  ["G", "A"],
  ["M", "K"],
  ["C", "Q"],
] as const;

export const candidatePublicPairOrder = [
  ["E", "I"],
  ["R", "N"],
  ["G", "A"],
  ["K", "M"],
  ["C", "Q"],
] as const satisfies readonly (readonly CandidateCodeSymbol[])[];

export type CandidateCodeSymbol =
  "A" | "C" | "E" | "G" | "I" | "K" | "M" | "N" | "Q" | "R";

export type CandidateProfileDefinition = {
  accessibleName: string;
  code: string;
  codeTokens: readonly string[];
  codeTypeNames: readonly string[];
  displayName: string;
  familyId: CandidateProfileFamilyId;
  familyName: string;
  overview: readonly CandidateProfileOverviewItem[];
  preciseName: string;
  shortName: string;
  summary: string;
};

export type CandidateProfileOverviewItem = {
  label: string;
  text: string;
};

export type CandidateDirectionCopy = {
  detailTitle: string;
  description: string;
  oppositeSymbol: CandidateCodeSymbol;
  preciseToken: string;
  publicTypeName: string;
  shortToken: string;
  symbol: CandidateCodeSymbol;
};

export type CandidateAxisCopy = {
  domainId: string;
  label: string;
  position: number;
  directions: Record<string, CandidateDirectionCopy>;
  guardrail: string;
};

export type CandidateProfileFamilyId =
  | "CONCRETE_CARE"
  | "PRACTICAL_SOLUTION"
  | "POSSIBILITY_CONNECTION"
  | "POSSIBILITY_SOLUTION";

export type CandidateProfileNameEntry = {
  displayName: string;
  familyId: CandidateProfileFamilyId;
  shortName: string;
};

export const candidateProfileFamilies: Readonly<
  Record<
    CandidateProfileFamilyId,
    {
      description: string;
      name: string;
      symbols: "NA" | "NG" | "RA" | "RG";
    }
  >
> = {
  PRACTICAL_SOLUTION: {
    symbols: "RG",
    name: "현실 해법형",
    description:
      "확인된 사실과 구체적인 단서를 바탕으로 원인을 찾고 해결할 부분을 살펴봐요.",
  },
  CONCRETE_CARE: {
    symbols: "RA",
    name: "생활 관계형",
    description:
      "구체적인 상황을 살피면서 그 안에 있는 사람의 마음과 관계 변화를 중요하게 봐요.",
  },
  POSSIBILITY_SOLUTION: {
    symbols: "NG",
    name: "가능성 개척형",
    description:
      "새로운 가능성과 관점을 탐색하고, 아이디어를 실제 해결 방향으로 연결해요.",
  },
  POSSIBILITY_CONNECTION: {
    symbols: "NA",
    name: "관계 영감형",
    description:
      "사람의 마음과 새로운 가능성을 함께 살피며 생각과 관계를 이어가요.",
  },
};

export const candidateProfileNameCatalog: Readonly<
  Record<string, CandidateProfileNameEntry>
> = {
  ERGKC: {
    shortName: "운영가",
    displayName: "차분히 답을 세우는 운영가",
    familyId: "PRACTICAL_SOLUTION",
  },
  ERGKQ: {
    shortName: "해결사",
    displayName: "변수에 빠르게 반응하는 해결사",
    familyId: "PRACTICAL_SOLUTION",
  },
  ERGMC: {
    shortName: "대응가",
    displayName: "유연하게 답을 찾는 대응가",
    familyId: "PRACTICAL_SOLUTION",
  },
  ERGMQ: {
    shortName: "현장해결가",
    displayName: "빠르게 움직이는 현장해결가",
    familyId: "PRACTICAL_SOLUTION",
  },
  ERAKC: {
    shortName: "조율가",
    displayName: "차분히 관계를 맞추는 조율가",
    familyId: "CONCRETE_CARE",
  },
  ERAKQ: {
    shortName: "관계지기",
    displayName: "관계 변화를 살피는 관계지기",
    familyId: "CONCRETE_CARE",
  },
  ERAMC: {
    shortName: "동행가",
    displayName: "유연하게 곁을 걷는 동행가",
    familyId: "CONCRETE_CARE",
  },
  ERAMQ: {
    shortName: "공감자",
    displayName: "마음에 바로 반응하는 공감자",
    familyId: "CONCRETE_CARE",
  },
  ENGKC: {
    shortName: "기획자",
    displayName: "가능성을 계획하는 기획자",
    familyId: "POSSIBILITY_SOLUTION",
  },
  ENGKQ: {
    shortName: "혁신가",
    displayName: "변화에 답하는 혁신가",
    familyId: "POSSIBILITY_SOLUTION",
  },
  ENGMC: {
    shortName: "개척자",
    displayName: "새 길을 여는 개척자",
    familyId: "POSSIBILITY_SOLUTION",
  },
  ENGMQ: {
    shortName: "발상가",
    displayName: "가능성을 펼치는 발상가",
    familyId: "POSSIBILITY_SOLUTION",
  },
  ENAKC: {
    shortName: "연결가",
    displayName: "사람과 가능성을 잇는 연결가",
    familyId: "POSSIBILITY_CONNECTION",
  },
  ENAKQ: {
    shortName: "지휘자",
    displayName: "관계를 여는 지휘자",
    familyId: "POSSIBILITY_CONNECTION",
  },
  ENAMC: {
    shortName: "소통가",
    displayName: "상상과 마음을 나누는 소통가",
    familyId: "POSSIBILITY_CONNECTION",
  },
  ENAMQ: {
    shortName: "이야기꾼",
    displayName: "마음과 상상을 펼치는 이야기꾼",
    familyId: "POSSIBILITY_CONNECTION",
  },
  IRGKC: {
    shortName: "분석가",
    displayName: "차근차근 답을 쌓는 분석가",
    familyId: "PRACTICAL_SOLUTION",
  },
  IRGKQ: {
    shortName: "전략가",
    displayName: "변수를 꼼꼼히 살피는 전략가",
    familyId: "PRACTICAL_SOLUTION",
  },
  IRGMC: {
    shortName: "탐구자",
    displayName: "단서로 답을 찾는 탐구자",
    familyId: "PRACTICAL_SOLUTION",
  },
  IRGMQ: {
    shortName: "추적자",
    displayName: "변화의 원인을 좇는 추적자",
    familyId: "PRACTICAL_SOLUTION",
  },
  IRAKC: {
    shortName: "수호자",
    displayName: "조용히 마음을 지키는 수호자",
    familyId: "CONCRETE_CARE",
  },
  IRAKQ: {
    shortName: "관찰자",
    displayName: "마음 변화를 살피는 관찰자",
    familyId: "CONCRETE_CARE",
  },
  IRAMC: {
    shortName: "지원가",
    displayName: "조용히 곁을 맞추는 지원가",
    familyId: "CONCRETE_CARE",
  },
  IRAMQ: {
    shortName: "경청자",
    displayName: "마음 변화를 듣는 경청자",
    familyId: "CONCRETE_CARE",
  },
  INGKC: {
    shortName: "설계자",
    displayName: "가능성을 차근차근 짓는 설계자",
    familyId: "POSSIBILITY_SOLUTION",
  },
  INGKQ: {
    shortName: "구상가",
    displayName: "가능성과 변수를 살피는 구상가",
    familyId: "POSSIBILITY_SOLUTION",
  },
  INGMC: {
    shortName: "탐험가",
    displayName: "새 가능성을 찾는 탐험가",
    familyId: "POSSIBILITY_SOLUTION",
  },
  INGMQ: {
    shortName: "사색가",
    displayName: "가능성을 깊이 좇는 사색가",
    familyId: "POSSIBILITY_SOLUTION",
  },
  INAKC: {
    shortName: "조정자",
    displayName: "조용히 관계를 잇는 조정자",
    familyId: "POSSIBILITY_CONNECTION",
  },
  INAKQ: {
    shortName: "안내자",
    displayName: "마음과 가능성을 살피는 안내자",
    familyId: "POSSIBILITY_CONNECTION",
  },
  INAMC: {
    shortName: "상상가",
    displayName: "마음과 가능성을 그리는 상상가",
    familyId: "POSSIBILITY_CONNECTION",
  },
  INAMQ: {
    shortName: "기록가",
    displayName: "마음의 이야기를 품는 기록가",
    familyId: "POSSIBILITY_CONNECTION",
  },
};

export const candidateRoleNames: Readonly<Record<string, string>> =
  Object.fromEntries(
    Object.entries(candidateProfileNameCatalog).map(([code, profile]) => [
      code,
      profile.displayName,
    ]),
  );

const directionCopy: Record<CandidateCodeSymbol, CandidateDirectionCopy> = {
  E: {
    symbol: "E",
    oppositeSymbol: "I",
    shortToken: "함께",
    publicTypeName: "외향형",
    preciseToken: "함께 활력·먼저 표현",
    detailTitle: "함께할 때 활력이 올라요",
    description:
      "사람들과 함께할 때 활력이 오르고, 필요한 말을 먼저 꺼내는 편이에요.",
  },
  I: {
    symbol: "I",
    oppositeSymbol: "E",
    shortToken: "혼자",
    publicTypeName: "내향형",
    preciseToken: "혼자 회복·살핀 뒤 표현",
    detailTitle: "혼자 정리하며 회복해요",
    description:
      "혼자 생각을 정리하며 회복하고, 상황을 살핀 뒤 표현하는 편이에요.",
  },
  R: {
    symbol: "R",
    oppositeSymbol: "N",
    shortToken: "구체",
    publicTypeName: "현실형",
    preciseToken: "구체적인 것에 관심",
    detailTitle: "구체적인 것에 관심이 머물러요",
    description:
      "이미 확인된 내용이나 익숙하고 구체적인 대상부터 살펴보는 편이에요.",
  },
  N: {
    symbol: "N",
    oppositeSymbol: "R",
    shortToken: "탐색",
    publicTypeName: "가능성형",
    preciseToken: "새 관점과 가능성 탐색",
    detailTitle: "새 관점과 가능성을 더 찾아봐요",
    description:
      "보이는 내용 너머의 가능성, 새로운 원리와 관점을 더 탐색하는 편이에요.",
  },
  G: {
    symbol: "G",
    oppositeSymbol: "A",
    shortToken: "원인과 해결 살피기",
    publicTypeName: "해결형",
    preciseToken: "원인과 해결할 부분에 관심",
    detailTitle: "원인과 해결할 부분에 관심이 가요",
    description:
      "상대의 마음도 살피지만, 관계 상황에서는 무슨 일이 있었고 어떻게 풀 수 있을지에 관심이 가는 편이에요.",
  },
  A: {
    symbol: "A",
    oppositeSymbol: "G",
    shortToken: "상대 마음 살피기",
    publicTypeName: "마음형",
    preciseToken: "상대가 어떤 마음인지에 관심",
    detailTitle: "상대가 어떤 마음인지 살펴봐요",
    description:
      "해결 방법도 생각하지만, 관계 상황에서는 상대가 어떤 마음인지 자연스럽게 살펴보는 편이에요.",
  },
  K: {
    symbol: "K",
    oppositeSymbol: "M",
    shortToken: "꾸준",
    publicTypeName: "꾸준형",
    preciseToken: "비교적 꾸준히 이어짐",
    detailTitle: "일상의 흐름이 비교적 꾸준해요",
    description:
      "해야 할 일을 시작하고 이어가며 정리하는 흐름이 비교적 꾸준한 편이에요.",
  },
  M: {
    symbol: "M",
    oppositeSymbol: "K",
    shortToken: "상황 따라",
    publicTypeName: "상황형",
    preciseToken: "상황 영향을 더 받음",
    detailTitle: "일상의 흐름이 상황 영향을 더 받아요",
    description:
      "해야 할 일을 시작하고 이어가며 정리하는 흐름이 그날의 상황에 따라 더 달라지는 편이에요.",
  },
  C: {
    symbol: "C",
    oppositeSymbol: "Q",
    shortToken: "차분한 반응",
    publicTypeName: "차분반응형",
    preciseToken: "걱정·감정이 천천히 커짐",
    detailTitle: "걱정과 감정이 비교적 천천히 커져요",
    description:
      "불편한 상황에서도 걱정과 감정이 급격히 커지는 일이 비교적 적은 편이에요.",
  },
  Q: {
    symbol: "Q",
    oppositeSymbol: "C",
    shortToken: "빠른 걱정·감정 반응",
    publicTypeName: "빠른반응형",
    preciseToken: "걱정·감정이 빨리 커짐",
    detailTitle: "걱정과 감정이 비교적 빨리 커져요",
    description:
      "불편한 상황에서 걱정과 감정이 비교적 빨리 커질 수 있는 편이에요.",
  },
};

export const candidateAxisCopy: readonly CandidateAxisCopy[] =
  nextNuangCodeScheme.positions.map((position) => {
    const low = position.lowSymbol as CandidateCodeSymbol;
    const high = position.highSymbol as CandidateCodeSymbol;

    return {
      position: position.codePosition,
      domainId: position.domainId,
      label: position.label,
      directions: {
        [low]: directionCopy[low],
        [high]: directionCopy[high],
      },
      guardrail: getAxisGuardrail(position.domainId),
    };
  });

export const candidateProfileDefinitions = Object.fromEntries(
  buildCandidateCodes().map((code) => [code, buildProfileDefinition(code)]),
) as Record<string, CandidateProfileDefinition>;

export const candidateProfileNames = Object.fromEntries(
  Object.entries(candidateProfileDefinitions).map(([code, profile]) => [
    code,
    profile.displayName,
  ]),
);

export function getCandidateProfileDefinition(code: string) {
  return candidateProfileDefinitions[code] ?? null;
}

export function getCandidateDirectionCopy(position: number, symbol: string) {
  return candidateAxisCopy[position - 1]?.directions[symbol] ?? null;
}

function buildCandidateCodes() {
  return candidateCodeSymbols.reduce<string[]>(
    (codes, symbols) =>
      codes.flatMap((code) => symbols.map((symbol) => `${code}${symbol}`)),
    [""],
  );
}

function buildProfileDefinition(code: string): CandidateProfileDefinition {
  const directions = code
    .split("")
    .map((symbol) => directionCopy[symbol as CandidateCodeSymbol]);
  const nameEntry = candidateProfileNameCatalog[code];
  const displayName = nameEntry?.displayName;
  const overview = buildProfileOverview(code);
  const preciseName = directions
    .map((direction) => direction.preciseToken)
    .join(" · ");

  if (!displayName) {
    throw new Error(`Missing candidate role name for ${code}`);
  }

  const family = candidateProfileFamilies[nameEntry.familyId];

  return {
    code,
    displayName,
    shortName: nameEntry.shortName,
    familyId: nameEntry.familyId,
    familyName: family.name,
    accessibleName: `${displayName}, 뉴앙 코드 ${code}`,
    codeTokens: directions.map((direction) => direction.publicTypeName),
    codeTypeNames: directions.map((direction) => direction.publicTypeName),
    overview,
    preciseName,
    summary: overview.map((item) => item.text).join(" "),
  };
}

function buildProfileOverview(code: string): CandidateProfileOverviewItem[] {
  const [energy, interest, relationship, routine, emotion] = code.split("");

  return [
    {
      label: "에너지와 관심",
      text:
        energy === "E"
          ? interest === "R"
            ? "사람들과 함께할 때 활력이 오르고, 확인된 사실과 구체적인 내용을 중심으로 살펴봐요."
            : "사람들과 함께할 때 활력이 오르고, 보이는 내용 너머의 가능성과 새로운 관점을 더 찾아봐요."
          : interest === "R"
            ? "혼자 생각을 정리하며 회복하고, 확인된 사실과 구체적인 내용을 중심으로 살펴봐요."
            : "혼자 생각을 정리하며 회복하고, 보이는 내용 너머의 가능성과 새로운 관점을 더 찾아봐요.",
    },
    {
      label: "관계와 일상",
      text:
        relationship === "G"
          ? routine === "K"
            ? "관계 문제에서는 무슨 일이 있었고 어떻게 풀 수 있을지에 관심이 가며, 해야 할 일은 비교적 꾸준히 이어가요."
            : "관계 문제에서는 무슨 일이 있었고 어떻게 풀 수 있을지에 관심이 가며, 일의 시작과 지속은 그날의 상황에 따라 달라지는 편이에요."
          : routine === "K"
            ? "관계 문제에서는 상대가 어떤 마음인지 자연스럽게 살피며, 해야 할 일은 비교적 꾸준히 이어가요."
            : "관계 문제에서는 상대가 어떤 마음인지 자연스럽게 살피며, 일의 시작과 지속은 그날의 상황에 따라 달라지는 편이에요.",
    },
    {
      label: "걱정과 감정",
      text:
        emotion === "C"
          ? "불편한 일이 생겨도 걱정과 감정은 비교적 천천히 커지는 편이에요."
          : "불편한 일이 생기면 걱정과 감정이 비교적 빠르게 커질 수 있어요.",
    },
  ];
}

function getAxisGuardrail(domainId: string) {
  if (domainId === "SE") {
    return "사교성이나 소통 능력이 아니라, 교류에서 얻는 활력과 표현을 시작하는 방식의 차이예요.";
  }
  if (domainId === "OE") {
    return "현실 판단·지능·창의 능력이 아니라, 관심이 머무는 대상의 차이예요.";
  }
  if (domainId === "RO") {
    return "논리·공감·착함의 우열이 아니라, 관계 상황에서 자연스럽게 관심이 가는 곳의 차이예요.";
  }
  if (domainId === "SM") {
    return "성실함·책임감·유연성의 우열이 아니라, 시작·지속·정리가 상황 영향을 받는 정도예요.";
  }
  return "정신건강이나 감정조절 능력을 판단하지 않으며, 불편한 상황에서 걱정과 감정이 커지는 상대적 속도를 나타내요.";
}
