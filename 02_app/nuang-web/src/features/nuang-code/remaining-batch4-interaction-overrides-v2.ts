type InteractionScenarioOverride = {
  scenarioId: string;
  attention: string;
  firstThought: string;
  actualResponse: string;
  communication: string;
  reviewFocus: readonly string[];
};

export const remainingBatch4InteractionOverridesV2 = {
  ERAMC: [],
  ERGKC: [],
  INGKC: [
    {
      scenarioId: "SCN-GENERAL-1",
      attention:
        "평소 선택에서는 지금 방법 밖의 가능성과 앞으로 해결할 더 큰 문제를 넓혀 보면서, 이루려는 목표와 완료 기준·먼저 해야 할 순서를 함께 살피는 경향이 있다.",
      firstThought:
        "“다른 접근 중에서 목표에 가장 잘 맞는 것은 무엇이고, 어떤 순서로 시험해야 끝까지 확인할 수 있을까?”를 생각하기 쉽다.",
      actualResponse:
        "여러 가능성을 혼자 비교한 뒤 시험할 한 가지와 완료 기준을 정하고, 작은 단계와 점검 시점으로 나누어 꾸준히 이어가는 편이다.",
      communication:
        "“가능한 접근은 이 정도야. 목표에 맞는 하나를 먼저 시험하고, 이 기준까지 확인한 뒤 다음 방법을 결정하자”처럼 가능성·순서·완료 기준을 함께 말한다.",
      reviewFocus: [
        "N의 가능성 확장과 K의 목표·완료 구조를 각각 알아볼 수 있는지 확인할 것",
        "여러 대안을 계획하는 행동을 우유부단함이나 완벽주의의 증거로 해석하지 않을 것",
      ],
    },
  ],
  INGMQ: [
    {
      scenarioId: "SCN-GENERAL-5",
      attention:
        "앞일이 분명하지 않으면 가능한 원인과 앞으로 펼쳐질 여러 경로를 넓히면서, 좋지 않은 결과와 놓친 단서도 빠르게 살피는 경향이 있다.",
      firstThought:
        "“아직 생각하지 못한 설명은 무엇이고, 그중 가장 걱정되는 경우를 줄이려면 무엇부터 확인해야 할까?”를 생각하기 쉽다.",
      actualResponse:
        "여러 가설과 위험을 혼자 정리한 뒤 현재 확인할 수 있는 질문과 작은 대비 행동을 골라 가능성을 하나씩 좁히는 편이다.",
      communication:
        "“가능한 설명은 몇 가지지만 이 결과가 가장 걱정돼. 확인된 것과 모르는 것을 나누고 한 가지부터 확인하자”처럼 가능성·걱정·확인을 분리해 말한다.",
      reviewFocus: [
        "N의 여러 가능성 탐색과 Q의 빠른 위험 감지를 각각 기록할 것",
        "가능성을 넓히는 생각을 걱정의 크기나 판단 정확성과 동일시하지 않을 것",
      ],
    },
    {
      scenarioId: "SCN-PERSON-OF-INTEREST-5",
      attention:
        "마음에 드는 사람의 뜻이 분명하지 않으면 가능한 여러 이유와 관계가 이어질 방향을 떠올리면서, 거절이나 거리감으로 이어질 신호도 빠르게 살피는 경향이 있다.",
      firstThought:
        "“바쁘거나 조심스러운 것일 수도 있지만 마음이 달라진 건 아닐까? 혼자 만든 이야기에서 벗어나려면 무엇을 물어야 할까?”를 생각하기 쉽다.",
      actualResponse:
        "여러 가능성과 걱정을 혼자 정리한 뒤 가장 중요한 한 가지를 직접 묻고, 상대의 실제 답에 맞춰 관계의 속도와 다음 행동을 조정하는 편이다.",
      communication:
        "“여러 이유가 떠올라 혼자 걱정하고 싶지 않아. 다음에도 만나고 싶은지 네 생각을 직접 듣고 싶어”처럼 추측·걱정·질문을 나누어 말한다.",
      reviewFocus: [
        "호감 상황에서 N의 여러 해석과 Q의 좋지 않은 결과 감지가 함께 보이는지 확인할 것",
        "질문 전 생각이 많아지는 것을 애착·자존감·관계 능력으로 확대 해석하지 않을 것",
      ],
    },
  ],
  IRAMQ: [],
} as const satisfies Record<
  "ERAMC" | "ERGKC" | "INGKC" | "INGMQ" | "IRAMQ",
  readonly InteractionScenarioOverride[]
>;
