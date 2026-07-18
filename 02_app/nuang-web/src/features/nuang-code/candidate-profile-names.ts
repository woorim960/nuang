import { nextNuangCodeScheme } from "@/features/nuang-code/next-code-scheme";

export const candidateProfileNameReleaseId = "NUANG-PROFILE-NAME-CANDIDATE-1.1";

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
  displayName: string;
  overview: readonly CandidateProfileOverviewItem[];
  preciseName: string;
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

export const candidateRoleNames: Readonly<Record<string, string>> = {
  ERGKC: "답을 세우는 설계자",
  ERGKQ: "뜨거운 해법 설계자",
  ERGMC: "현장의 해법 탐구자",
  ERGMQ: "열정의 현장 해결가",
  ERAKC: "온도를 맞추는 조율가",
  ERAKQ: "진심을 잇는 조율가",
  ERAMC: "곁을 맞추는 동행가",
  ERAMQ: "마음으로 걷는 동행가",
  ENGKC: "가능성을 짓는 기획자",
  ENGKQ: "영감을 키우는 기획자",
  ENGMC: "새 길을 여는 탐험가",
  ENGMQ: "번뜩이는 길잡이",
  ENAKC: "이야기를 잇는 연결가",
  ENAKQ: "관계를 여는 지휘자",
  ENAMC: "상상을 나누는 동행가",
  ENAMQ: "설렘을 잇는 이야기꾼",
  IRGKC: "답을 쌓는 설계자",
  IRGKQ: "열기를 품은 설계자",
  IRGMC: "단서를 좇는 탐구자",
  IRGMQ: "질문을 품은 탐구자",
  IRAKC: "마음을 지키는 조율가",
  IRAKQ: "파동을 품은 조율가",
  IRAMC: "곁을 지키는 동행가",
  IRAMQ: "마음결을 걷는 동행가",
  INGKC: "가능성을 짓는 전략가",
  INGKQ: "불꽃을 품은 전략가",
  INGMC: "새 길을 찾는 탐구자",
  INGMQ: "생각의 파도 탐험가",
  INAKC: "조용히 잇는 연결가",
  INAKQ: "고요한 마음 지휘자",
  INAMC: "상상을 걷는 동행가",
  INAMQ: "마음을 품은 이야기꾼",
};

const directionCopy: Record<CandidateCodeSymbol, CandidateDirectionCopy> = {
  E: {
    symbol: "E",
    oppositeSymbol: "I",
    shortToken: "함께",
    preciseToken: "함께 활력·먼저 표현",
    detailTitle: "함께할 때 활력이 올라요",
    description:
      "사람들과 함께할 때 활력이 오르고, 필요한 말을 먼저 꺼내는 편이에요.",
  },
  I: {
    symbol: "I",
    oppositeSymbol: "E",
    shortToken: "혼자",
    preciseToken: "혼자 회복·살핀 뒤 표현",
    detailTitle: "혼자 정리하며 회복해요",
    description:
      "혼자 생각을 정리하며 회복하고, 상황을 살핀 뒤 표현하는 편이에요.",
  },
  R: {
    symbol: "R",
    oppositeSymbol: "N",
    shortToken: "구체",
    preciseToken: "구체적인 것에 관심",
    detailTitle: "구체적인 것에 관심이 머물러요",
    description:
      "이미 확인된 내용이나 익숙하고 구체적인 대상부터 살펴보는 편이에요.",
  },
  N: {
    symbol: "N",
    oppositeSymbol: "R",
    shortToken: "탐색",
    preciseToken: "새 관점과 가능성 탐색",
    detailTitle: "새 관점과 가능성을 더 찾아봐요",
    description:
      "보이는 내용 너머의 가능성, 새로운 원리와 관점을 더 탐색하는 편이에요.",
  },
  G: {
    symbol: "G",
    oppositeSymbol: "A",
    shortToken: "원인과 해결 살피기",
    preciseToken: "원인과 해결할 부분에 관심",
    detailTitle: "원인과 해결할 부분에 관심이 가요",
    description:
      "상대의 마음도 살피지만, 관계 상황에서는 무슨 일이 있었고 어떻게 풀 수 있을지에 관심이 가는 편이에요.",
  },
  A: {
    symbol: "A",
    oppositeSymbol: "G",
    shortToken: "상대 마음 살피기",
    preciseToken: "상대가 어떤 마음인지에 관심",
    detailTitle: "상대가 어떤 마음인지 살펴봐요",
    description:
      "해결 방법도 생각하지만, 관계 상황에서는 상대가 어떤 마음인지 자연스럽게 살펴보는 편이에요.",
  },
  K: {
    symbol: "K",
    oppositeSymbol: "M",
    shortToken: "꾸준",
    preciseToken: "비교적 꾸준히 이어짐",
    detailTitle: "일상의 흐름이 비교적 꾸준해요",
    description:
      "해야 할 일을 시작하고 이어가며 정리하는 흐름이 비교적 꾸준한 편이에요.",
  },
  M: {
    symbol: "M",
    oppositeSymbol: "K",
    shortToken: "상황 따라",
    preciseToken: "상황 영향을 더 받음",
    detailTitle: "일상의 흐름이 상황 영향을 더 받아요",
    description:
      "해야 할 일을 시작하고 이어가며 정리하는 흐름이 그날의 상황에 따라 더 달라지는 편이에요.",
  },
  C: {
    symbol: "C",
    oppositeSymbol: "Q",
    shortToken: "차분한 반응",
    preciseToken: "걱정·감정이 천천히 커짐",
    detailTitle: "걱정과 감정이 비교적 천천히 커져요",
    description:
      "불편한 상황에서도 걱정과 감정이 급격히 커지는 일이 비교적 적은 편이에요.",
  },
  Q: {
    symbol: "Q",
    oppositeSymbol: "C",
    shortToken: "빠른 걱정·감정 반응",
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
  const displayName = candidateRoleNames[code];
  const overview = buildProfileOverview(code);
  const preciseName = directions
    .map((direction) => direction.preciseToken)
    .join(" · ");

  if (!displayName) {
    throw new Error(`Missing candidate role name for ${code}`);
  }

  return {
    code,
    displayName,
    accessibleName: `${displayName}, 뉴앙 코드 ${code}`,
    codeTokens: directions.map((direction) => direction.shortToken),
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
