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
      "어색하거나 중요한 자리에서 먼저 말문을 열고 대화의 흐름을 만드는 편이에요.",
    label: "먼저 표현하는 정도",
    low: "전체 분위기와 상대의 말을 살핀 뒤, 생각이 정리되면 표현하는 편이에요.",
  },
  "OE-AE": {
    balanced:
      "분위기에서 받은 느낌과 실제 조건을 함께 살펴 선택하는 편이에요.",
    high:
      "공간의 분위기, 색, 소리, 표현처럼 감각으로 느껴지는 부분에 마음이 잘 움직이는 편이에요.",
    label: "분위기를 느끼는 정도",
    low: "첫인상이나 분위기보다 쓰임새와 분명한 정보를 먼저 확인하는 편이에요.",
  },
  "OE-CI": {
    balanced:
      "눈앞의 내용과 그 앞뒤에 이어질 가능성을 함께 생각하는 편이에요.",
    high:
      "짧은 장면을 보아도 그 앞뒤에 어떤 이야기가 있었을지 자연스럽게 떠올리는 편이에요.",
    label: "이야기를 넓혀 보는 정도",
    low: "직접 보고 들은 내용을 중심으로 생각하며, 확인되지 않은 이야기는 따로 더하지 않는 편이에요.",
  },
  "OE-IE": {
    balanced:
      "새로운 원리를 알아보는 것과 이미 효과가 확인된 방법을 함께 참고하는 편이에요.",
    high:
      "무엇이든 왜 그런지 원리와 이유를 알아보고, 새로운 방법을 찾는 데 관심이 가는 편이에요.",
    label: "원리와 새 방법을 찾는 정도",
    low: "새로운 설명보다 이미 해봤고 효과가 확인된 방법을 더 편하게 사용하는 편이에요.",
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
      "마음이 조금 내키지 않아도 해야 할 일을 시작하고 끝까지 이어가려는 편이에요.",
    label: "시작하고 이어가는 정도",
    low: "해야 한다는 이유만으로 밀어붙이기보다 지금의 관심과 에너지에 따라 속도를 조절하는 편이에요.",
  },
  "SM-OS": {
    balanced:
      "미리 정리해 두는 방식과 상황에 맞춰 바꾸는 방식을 함께 사용하는 편이에요.",
    high:
      "일정과 순서를 미리 정리하고, 해야 할 일을 눈에 보이게 관리할 때 편한 편이에요.",
    label: "계획과 정리를 사용하는 정도",
    low: "계획을 촘촘히 고정하기보다 그때의 상황에 맞춰 유연하게 바꾸는 편이에요.",
  },
  "ER-IR": {
    balanced:
      "감정이 커지는 속도와 겉으로 드러나는 정도가 상황에 따라 달라지는 편이에요.",
    high:
      "불편한 일이 생기면 감정이 비교적 빠르게 커지고 표정이나 말투에 드러나기 쉬운 편이에요.",
    label: "감정이 커지는 정도",
    low: "불편한 일이 있어도 감정이 바로 커지기보다 천천히 정리되고, 겉으로는 차분해 보이는 편이에요.",
  },
  "ER-WD": {
    balanced:
      "충분히 살펴보는 것과 결정을 내리고 움직이는 것 사이에서 균형을 찾는 편이에요.",
    high:
      "결정하기 전에 놓친 점은 없는지 여러 가능성을 오래 살펴보는 편이에요.",
    label: "걱정하며 살펴보는 정도",
    low: "필요한 만큼 확인했다면 걱정을 오래 이어가기보다 결정하고 다음으로 움직이는 편이에요.",
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
