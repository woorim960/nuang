import type { DomainScore, FacetScore } from "@/lib/scoring/types";

export type Direction = "high" | "low" | "middle" | "missing";

export const coreResultCopyVersion = "core-result-copy.v0.1";

type DomainCopy = {
  highName: string;
  lowName: string;
  highSummary: string;
  lowSummary: string;
  middleSummary: string;
  highStrengths: string[];
  lowStrengths: string[];
  highWatch: string;
  lowWatch: string;
  relationHigh: string;
  relationLow: string;
  actionHigh: string;
  actionLow: string;
};

type FacetCopy = {
  high: string;
  low: string;
};

const domainCopy: Record<string, DomainCopy> = {
  SE: {
    highName: "사람 쪽으로 에너지가 열리는 편",
    lowName: "혼자 정리한 뒤 연결되는 편",
    highSummary:
      "사람이 있는 자리에서 생각이 빨리 살아나고, 분위기 속에서 움직일 때 힘을 얻기 쉽습니다.",
    lowSummary:
      "혼자 생각을 정리할 시간이 있을 때 안정감이 커지고, 필요한 관계를 고르는 방식이 잘 맞을 수 있습니다.",
    middleSummary:
      "혼자 있는 시간과 사람 속에 있는 시간이 모두 필요합니다. 상황에 따라 에너지의 방향이 꽤 달라질 수 있어요.",
    highStrengths: [
      "새로운 자리에서 흐름을 빠르게 읽고 참여할 수 있어요.",
      "대화가 막혔을 때 먼저 온도를 올리는 역할을 하기도 해요.",
      "아이디어나 감정을 밖으로 꺼내며 정리하는 편이에요.",
    ],
    lowStrengths: [
      "필요한 관계와 거리를 비교적 차분히 고를 수 있어요.",
      "분위기에 휩쓸리기보다 혼자 생각을 정리하는 힘이 있어요.",
      "말수가 적어도 관계를 가볍게 여기지 않는 경우가 많아요.",
    ],
    highWatch:
      "반응이 느린 사람을 무관심으로 오해하거나, 혼자 있을 시간이 필요한 사람에게 속도를 빠르게 느끼게 할 수 있어요.",
    lowWatch:
      "참여 의사가 있어도 밖으로 잘 보이지 않아 거리감이나 거절로 오해받을 수 있어요.",
    relationHigh:
      "상대가 조용한 편이라면 바로 결론을 묻기보다 생각할 시간을 먼저 주는 것이 좋아요.",
    relationLow:
      "상대가 활발한 편이라면 짧은 반응이라도 먼저 보여주면 관계의 불필요한 긴장을 줄일 수 있어요.",
    actionHigh: "중요한 대화 전에는 상대가 생각할 시간을 얼마나 원하는지 먼저 물어보세요.",
    actionLow: "초대나 대화에 응할 마음이 있다면 짧은 문장으로 신호를 남겨보세요.",
  },
  ER: {
    highName: "마음의 파도가 크게 느껴지는 편",
    lowName: "감정의 온도를 천천히 올리는 편",
    highSummary:
      "감정과 걱정 신호가 빨리 감지되어 작은 변화도 놓치지 않는 편일 수 있습니다.",
    lowSummary:
      "일이 흔들려도 비교적 차분하게 받아들이고, 감정의 파장을 오래 키우지 않는 편일 수 있습니다.",
    middleSummary:
      "어떤 상황에서는 빠르게 흔들리고, 어떤 상황에서는 차분하게 버팁니다. 맥락의 영향을 크게 받을 수 있어요.",
    highStrengths: [
      "위험 신호나 관계의 미묘한 변화를 빨리 알아차릴 수 있어요.",
      "중요한 일을 허술하게 넘기지 않고 여러 가능성을 살피는 편이에요.",
      "감정 경험이 섬세해 공감의 재료가 풍부해질 수 있어요.",
    ],
    lowStrengths: [
      "갑작스러운 상황에서도 감정에 바로 휩쓸리지 않을 수 있어요.",
      "문제를 단순하고 실용적으로 바라보는 힘이 있어요.",
      "주변 사람이 불안할 때 안정감을 주기도 해요.",
    ],
    highWatch:
      "가능성을 많이 살피는 힘이 지나치면 아직 일어나지 않은 문제까지 현재의 부담처럼 느껴질 수 있어요.",
    lowWatch:
      "상대의 불안이나 상처를 작게 보거나, 감정 표현이 필요한 장면을 지나칠 수 있어요.",
    relationHigh:
      "상대에게는 해결책보다 먼저 확인과 안심의 말이 필요할 때가 있어요.",
    relationLow:
      "상대가 불안해할 때 '괜찮아'만 말하기보다 무엇이 걱정되는지 한 번 더 물어보세요.",
    actionHigh: "걱정이 커질 때는 사실, 추측, 지금 할 수 있는 일을 세 줄로 나눠 적어보세요.",
    actionLow: "상대가 감정적으로 말할 때는 해결 전에 '그럴 수 있겠다'를 먼저 건네보세요.",
  },
  SM: {
    highName: "일상을 구조화해 밀고 가는 편",
    lowName: "흐름에 맞춰 유연하게 움직이는 편",
    highSummary:
      "해야 할 일을 구조화하고 끝까지 가져가는 데 익숙하며, 예측 가능한 리듬에서 힘이 납니다.",
    lowSummary:
      "정해진 계획보다 그때그때의 맥락과 감각을 따라 유연하게 움직이는 방식이 편할 수 있습니다.",
    middleSummary:
      "큰 틀의 계획은 필요하지만 모든 것을 촘촘히 고정하면 답답해질 수 있습니다.",
    highStrengths: [
      "일을 시작하고 마무리하는 힘이 비교적 안정적이에요.",
      "정리된 기준과 일정이 있으면 성과를 꾸준히 쌓기 쉬워요.",
      "주변 사람에게 예측 가능성과 신뢰감을 줄 수 있어요.",
    ],
    lowStrengths: [
      "예상 밖의 변화에 맞춰 방향을 바꾸는 힘이 있어요.",
      "즉흥적인 기회나 재미를 놓치지 않는 편일 수 있어요.",
      "계획보다 실제 상황을 보며 움직이는 감각이 좋아요.",
    ],
    highWatch:
      "계획이 어긋났을 때 자신이나 타인에게 지나치게 엄격해질 수 있어요.",
    lowWatch:
      "마감이나 반복 관리가 필요한 일에서는 좋은 의도와 실제 결과 사이에 간격이 생길 수 있어요.",
    relationHigh:
      "상대가 느슨한 편이라면 기준을 공유하되 통제처럼 들리지 않게 선택지를 함께 두세요.",
    relationLow:
      "상대가 계획적인 편이라면 약속과 마감은 작은 단위로라도 먼저 확정해주는 것이 좋아요.",
    actionHigh: "일정표에 예외와 쉬는 시간을 처음부터 함께 넣어보세요.",
    actionLow: "반복되는 일은 의지보다 알림, 체크리스트, 고정 장소에 맡겨보세요.",
  },
  RO: {
    highName: "상대 마음과 내 기준을 함께 살피는 편",
    lowName: "솔직한 선택과 거리 조절을 중시하는 편",
    highSummary:
      "상대의 마음과 부담을 살피며, 관계 안에서 부드럽게 조율하려는 경향이 큽니다.",
    lowSummary:
      "관계에서 솔직함과 독립성을 중시하며, 불필요한 맞춤보다 분명한 선택을 편하게 느낄 수 있습니다.",
    middleSummary:
      "상대를 배려하고 싶은 마음과 내 기준을 지키고 싶은 마음이 함께 움직입니다.",
    highStrengths: [
      "상대가 불편해하지 않는지 세심하게 살필 수 있어요.",
      "갈등 상황에서 말의 온도와 표현 방식을 조절하려는 편이에요.",
      "관계의 안전감을 만드는 데 강점이 있어요.",
    ],
    lowStrengths: [
      "싫고 좋은 것을 비교적 분명하게 표현할 수 있어요.",
      "관계에서 과한 책임을 떠안지 않으려는 감각이 있어요.",
      "불편한 합의보다 솔직한 조정을 선택할 수 있어요.",
    ],
    highWatch:
      "상대를 배려하다가 내 필요를 뒤로 미루거나, 거절을 너무 늦게 말할 수 있어요.",
    lowWatch:
      "내 기준을 분명히 말하는 과정에서 상대가 차갑거나 단정적이라고 느낄 수 있어요.",
    relationHigh:
      "거절이 필요한 장면에서는 이유를 길게 설명하기보다 가능한 범위를 짧게 말해도 괜찮아요.",
    relationLow:
      "상대가 예민하게 받아들일 수 있는 말은 의도와 요청을 분리해서 말하면 좋아요.",
    actionHigh: "이번 주에 하나는 '해줄 수 있는 것'과 '어려운 것'을 나눠 말해보세요.",
    actionLow: "분명히 말해야 할 때도 상대의 선택권을 함께 확인하는 문장을 붙여보세요.",
  },
  OE: {
    highName: "감각과 아이디어를 넓게 탐색하는 편",
    lowName: "익숙하고 검증된 방식에서 안정되는 편",
    highSummary:
      "새로운 장면, 이야기, 관점, 아이디어에 끌리며 탐색 자체에서 에너지를 얻기 쉽습니다.",
    lowSummary:
      "새로움보다 실용성과 익숙함을 중시하며, 이미 검증된 방식에서 편안함을 느낄 수 있습니다.",
    middleSummary:
      "새로움에 호기심은 있지만, 실제 생활에서는 익숙한 기준과 균형을 맞추려는 편입니다.",
    highStrengths: [
      "다른 사람이 지나친 가능성이나 연결점을 발견할 수 있어요.",
      "새로운 콘텐츠, 공간, 아이디어를 즐기며 자극을 얻는 편이에요.",
      "정답 하나보다 여러 해석을 비교하는 데 익숙해요.",
    ],
    lowStrengths: [
      "현실적으로 쓸 수 있는 방식과 검증된 기준을 잘 붙잡을 수 있어요.",
      "복잡한 가능성보다 필요한 것을 단순하게 정리하는 힘이 있어요.",
      "유행이나 분위기에 휩쓸리지 않고 안정적인 선택을 할 수 있어요.",
    ],
    highWatch:
      "아이디어가 많아질수록 실행 우선순위가 흐려지거나, 익숙한 방식을 지루하게 느낄 수 있어요.",
    lowWatch:
      "새로운 제안을 너무 빨리 닫아버리면 배울 기회나 관계의 재미가 줄어들 수 있어요.",
    relationHigh:
      "상대가 현실적인 편이라면 아이디어를 바로 밀기보다 작은 실험 단위로 제안해보세요.",
    relationLow:
      "상대가 탐색적인 편이라면 완전한 동의가 아니어도 '한 번 들어볼게'라는 여지를 줄 수 있어요.",
    actionHigh: "떠오른 아이디어를 모두 실행하지 말고, 이번 주 실험 하나만 고르세요.",
    actionLow: "새로운 제안은 바로 판단하기 전에 비용이 작은 시도부터 확인해보세요.",
  },
};

const facetCopy: Record<string, FacetCopy> = {
  "SE-RE": {
    high: "사람들과 함께 있을 때 에너지가 살아나는 편이에요.",
    low: "사람이 많은 자리 뒤에는 혼자 회복할 시간이 필요할 수 있어요.",
  },
  "SE-AI": {
    high: "의견이나 선택지를 먼저 꺼내는 일이 비교적 자연스러워요.",
    low: "확신이 생기기 전까지는 표현을 아끼며 지켜보는 편일 수 있어요.",
  },
  "ER-IR": {
    high: "감정 반응이 빠르게 올라와 변화에 민감하게 반응할 수 있어요.",
    low: "감정이 크게 튀기보다 천천히 올라오는 편일 수 있어요.",
  },
  "ER-WD": {
    high: "중요한 일 앞에서 여러 가능성을 미리 살피는 편이에요.",
    low: "걱정에 오래 머무르기보다 현재 할 일을 보는 편일 수 있어요.",
  },
  "SM-EP": {
    high: "시작한 일을 끝까지 붙잡고 가는 힘이 비교적 좋아요.",
    low: "시작과 마무리 사이에 흥미와 상황의 영향을 크게 받을 수 있어요.",
  },
  "SM-OS": {
    high: "정리된 환경과 계획이 있을 때 안정감이 커져요.",
    low: "정해진 구조보다 유연한 흐름에서 편안함을 느낄 수 있어요.",
  },
  "RO-EC": {
    high: "상대의 감정과 부담을 살피려는 마음이 큰 편이에요.",
    low: "상대의 감정보다 사실과 선택을 먼저 보는 편일 수 있어요.",
  },
  "RO-RN": {
    high: "상대의 거절과 선택권을 존중하려는 감각이 뚜렷해요.",
    low: "내 기준이나 원하는 방향을 분명히 말하는 쪽이 편할 수 있어요.",
  },
  "OE-AS": {
    high: "장면, 분위기, 상상에서 자극을 많이 받는 편이에요.",
    low: "감각적 분위기보다 실제 쓸모와 명확함을 더 편하게 느낄 수 있어요.",
  },
  "OE-IE": {
    high: "아이디어의 원리나 다양한 설명을 비교하는 일을 즐기는 편이에요.",
    low: "복잡한 해석보다 바로 적용 가능한 설명을 선호할 수 있어요.",
  },
};

export function getDirection(score: number | null): Direction {
  if (score === null) return "missing";
  if (score >= 56) return "high";
  if (score <= 44) return "low";
  return "middle";
}

export function getDomainNarrative(domain: DomainScore) {
  const copy = domainCopy[domain.domainId];
  const direction = getDirection(domain.score);

  if (!copy || direction === "missing") {
    return {
      action: "응답이 더 쌓이면 이 영역의 설명을 보여드릴게요.",
      direction,
      relation: "아직 관계 해석을 만들기에는 응답이 부족해요.",
      strengths: [],
      summary: "응답이 더 필요해요.",
      title: domain.label,
      watch: "응답이 더 쌓인 뒤 확인해 주세요.",
    };
  }

  if (direction === "middle") {
    return {
      action: "최근 상황에 따라 어느 쪽 모습이 더 자주 나오는지 일주일만 관찰해보세요.",
      direction,
      relation:
        "상대와의 차이는 고정된 성향보다 그날의 맥락과 피로도에 따라 더 달라질 수 있어요.",
      strengths: [
        "한쪽으로만 설명되지 않는 유연함이 있어요.",
        "상황에 맞춰 다른 방식을 선택할 여지가 큽니다.",
      ],
      summary: copy.middleSummary,
      title: `${domain.label}${getTopicParticle(domain.label)} 균형 구간에 가까워요`,
      watch:
        "균형 구간은 작은 응답 변화로 코드가 바뀔 수 있으니 이름보다 실제 설명을 더 중요하게 봐주세요.",
    };
  }

  return {
    action: direction === "high" ? copy.actionHigh : copy.actionLow,
    direction,
    relation: direction === "high" ? copy.relationHigh : copy.relationLow,
    strengths: direction === "high" ? copy.highStrengths : copy.lowStrengths,
    summary: direction === "high" ? copy.highSummary : copy.lowSummary,
    title: direction === "high" ? copy.highName : copy.lowName,
    watch: direction === "high" ? copy.highWatch : copy.lowWatch,
  };
}

function getTopicParticle(value: string) {
  const lastCodePoint = value.codePointAt(value.length - 1);

  if (!lastCodePoint) return "은";

  const hangulOffset = lastCodePoint - 0xac00;
  const isHangulSyllable = hangulOffset >= 0 && hangulOffset <= 11171;

  if (!isHangulSyllable) return "은";

  return hangulOffset % 28 === 0 ? "는" : "은";
}

export function getFacetInsight(facet: FacetScore) {
  const copy = facetCopy[facet.facetId];
  const direction = getDirection(facet.score);

  if (!copy || direction === "missing") {
    return "응답이 더 쌓이면 세부 설명을 보여드릴게요.";
  }

  if (direction === "middle") {
    return "상황에 따라 양쪽 모습이 함께 나타나는 균형 구간에 가까워요.";
  }

  return direction === "high" ? copy.high : copy.low;
}

export function getHighestDomains(domains: DomainScore[], count = 2) {
  return domains
    .filter((domain) => domain.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, count);
}

export function getLowestDomains(domains: DomainScore[], count = 2) {
  return domains
    .filter((domain) => domain.score !== null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, count);
}
