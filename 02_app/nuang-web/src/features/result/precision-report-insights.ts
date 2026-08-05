export type ReportFacetScore = {
  facetId: string;
  label: string;
  score: number | null;
  status?: "insufficient" | "partial" | "valid";
};

export const precisionFacetInsightCopyVersion =
  "NUANG-PRECISION-FACET-COPY-1.0";

export type PrecisionFacetInsight = {
  copy: string;
  facetId: string;
  label: string;
  score: number;
};

type FacetCopy = {
  balanced: string;
  high: string;
  label: string;
  low: string;
};

const facetCopyById: Record<string, FacetCopy> = {
  "SE-RE": {
    balanced:
      "사람과 함께하는 시간, 혼자 보내는 시간을 지금 상황에 맞게 오가는 편이에요.",
    high:
      "사람들과 대화하거나 무언가를 함께할 때 에너지가 올라오는 편이에요.",
    label: "에너지를 채우는 방식",
    low: "혼자 조용히 시간을 보낼 때 에너지가 차분히 돌아오는 편이에요.",
  },
  "SE-AI": {
    balanced:
      "먼저 말할 때와 충분히 살핀 뒤 말할 때가 상황에 따라 달라지는 편이에요.",
    high:
      "여럿이 말을 꺼내거나 선택을 정할 때, 먼저 의견이나 선택지를 제안하는 편이에요.",
    label: "먼저 표현하는 정도",
    low: "전체 분위기와 상대의 말을 살핀 뒤, 생각이 정리되면 표현하는 편이에요.",
  },
  "OE-AE": {
    balanced:
      "감각적인 인상에 오래 머무를 때와 짧게 보고 넘어갈 때가 상황에 따라 달라지는 편이에요.",
    high:
      "공간의 분위기, 색, 소리처럼 감각으로 느껴지는 인상에 눈길이 오래 머무는 편이에요.",
    label: "분위기를 느끼는 정도",
    low: "색, 소리, 분위기가 주는 인상에 오래 머무르기보다 다음으로 넘어가는 편이에요.",
  },
  "OE-CI": {
    balanced:
      "눈앞의 내용과 그 앞뒤에 이어질 가능성을 함께 생각하는 편이에요.",
    high:
      "짧은 장면을 보아도 그 앞뒤에 어떤 이야기가 있었을지 자연스럽게 떠올리는 편이에요.",
    label: "이야기를 넓혀 보는 정도",
    low: "눈앞의 장면에서 앞뒤 이야기를 더 펼치기보다 보이는 내용에 머무르는 편이에요.",
  },
  "OE-IE": {
    balanced:
      "필요한 답에서 멈출 때와 이유·배경을 더 알아볼 때가 상황에 따라 달라지는 편이에요.",
    high:
      "필요한 답을 얻은 뒤에도 이유·배경·다른 설명을 더 알아보는 편이에요.",
    label: "원리와 새 방법을 찾는 정도",
    low: "필요한 답이나 사용법을 확인하면 관련 내용을 더 넓히기보다 다음으로 넘어가는 편이에요.",
  },
  "RO-EC": {
    balanced:
      "상대의 마음과 문제의 원인·해결 방법을 함께 살피는 편이에요.",
    high:
      "관계 문제에서는 무엇을 해결할지보다 상대가 어떤 마음일지 먼저 살피는 편이에요.",
    label: "관계에서 먼저 보는 것",
    low: "관계 문제에서는 감정보다 원인과 결과, 해결할 부분을 먼저 정리하는 편이에요.",
  },
  "SM-EP": {
    balanced:
      "해야 할 일을 꾸준히 이어갈 때와 관심과 에너지에 따라 속도가 달라질 때가 함께 보여요.",
    high:
      "해야 할 일을 시작하고, 잠시 멈춘 뒤에도 다시 이어가려는 편이에요.",
    label: "시작하고 이어가는 정도",
    low: "해야 할 일의 시작과 지속 정도가 그날의 관심·기운·계기에 따라 달라지는 편이에요.",
  },
  "SM-OS": {
    balanced:
      "미리 정리해 두는 방식과 상황에 맞춰 바꾸는 방식을 함께 사용하는 편이에요.",
    high:
      "물건의 자리나 할 일의 순서·때를 미리 정해두는 편이에요.",
    label: "계획과 정리를 사용하는 정도",
    low: "자리나 순서·때를 미리 정해두기보다 그때 쓰기 편하거나 눈에 띄는 방식으로 처리하는 편이에요.",
  },
  "ER-IR": {
    balanced:
      "불편한 감정의 크기가 달라지는 속도가 상황에 따라 달라지는 편이에요.",
    high:
      "불편한 일이 생기면 짜증·답답함 같은 감정의 크기가 비교적 빠르게 커지는 편이에요.",
    label: "감정이 커지는 정도",
    low: "불편한 일이 있어도 감정의 크기가 빠르게 달라지기보다 비교적 천천히 변하는 편이에요.",
  },
  "ER-WD": {
    balanced:
      "충분히 살펴보는 것과 결정을 내리고 움직이는 것 사이에서 균형을 찾는 편이에요.",
    high:
      "결과가 불확실하거나 반응을 기다릴 때, 좋지 않은 가능성이 반복해서 떠올라 결정이 늦어질 수 있어요.",
    label: "걱정하며 살펴보는 정도",
    low: "걱정이 생겨도 같은 가능성을 오래 되짚기보다 필요한 때 결정하거나 다음 시도를 생각하는 편이에요.",
  },
};

export function buildPrecisionFacetInsights(
  facets: ReadonlyArray<ReportFacetScore>,
  limit = 3,
): PrecisionFacetInsight[] {
  return facets
    .flatMap((facet) => {
      const copy = facetCopyById[facet.facetId];
      if (
        !copy ||
        facet.score === null ||
        facet.status !== "valid"
      ) {
        return [];
      }

      const score = clampScore(facet.score);
      return [
        {
          copy:
            score >= 58
              ? copy.high
              : score <= 42
                ? copy.low
                : copy.balanced,
          facetId: facet.facetId,
          label: copy.label,
          score,
        },
      ];
    })
    .sort((left, right) => {
      const distanceDifference =
        Math.abs(right.score - 50) - Math.abs(left.score - 50);
      if (distanceDifference !== 0) return distanceDifference;
      return left.facetId.localeCompare(right.facetId);
    })
    .slice(0, Math.max(0, limit));
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}
