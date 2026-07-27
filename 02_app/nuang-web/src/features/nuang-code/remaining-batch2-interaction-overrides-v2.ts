type InteractionScenarioOverride = {
  scenarioId: string;
  attention: string;
  firstThought: string;
  actualResponse: string;
  communication: string;
  reviewFocus: readonly string[];
};

export const remainingBatch2InteractionOverridesV2 = {
  INGKQ: [],
  INAMQ: [],
  ERAMQ: [
    {
      scenarioId: "SCN-GENERAL-1",
      attention:
        "평소 선택에서는 이미 확인한 조건과 직접 겪어 본 결과를 살피면서, 지금 마음이 가는 방향과 남은 시간·에너지·함께할 사람의 반응도 같이 살피는 경향이 있다.",
      firstThought:
        "“전에 실제로 잘됐던 방법 중에서 지금도 해볼 만하고, 오늘 조건에서 바로 시작하기 편한 것은 무엇일까?”를 생각하기 쉽다.",
      actualResponse:
        "확인된 조건과 이전 경험을 바탕으로 지금 가장 마음이 가는 선택을 작게 시작하고, 사람들의 반응과 진행 상태에 따라 방법과 순서를 조정하는 편이다.",
      communication:
        "“지난번에는 이 방법이 잘됐고 지금도 바로 해볼 수 있어. 먼저 시작한 뒤 반응을 보고 다음 순서를 맞추자”처럼 경험 근거와 현재 조건, 조정 가능성을 함께 말한다.",
      reviewFocus: [
        "R의 확인된 경험 출발과 M의 현재 조건에 따른 실행 조정을 각각 알아볼 수 있는지 확인할 것",
        "이전 경험을 참고하는 것을 변화 거부로, 순서 조정을 계획 없음으로 해석하지 않을 것",
      ],
    },
  ],
  ERAKC: [
    {
      scenarioId: "SCN-GENERAL-5",
      attention:
        "앞일이 분명하지 않아도 걱정이 크게 올라오기 전 현재 확인된 사실과 아직 모르는 부분, 직접 물어보거나 시험해 볼 수 있는 순서를 먼저 살피는 경향이 있다.",
      firstThought:
        "“지금 사실로 확인된 것은 무엇이고, 어떤 질문이나 작은 시험으로 모르는 부분을 줄일 수 있을까?”를 생각하기 쉽다.",
      actualResponse:
        "확인 가능한 정보를 사람들과 모아 선택지를 좁히고 가장 현실적인 계획부터 실행한 뒤, 시간이 지나 감정과 피로가 남았는지 따로 확인하는 편이다.",
      communication:
        "“확인된 건 여기까지고 이 부분은 아직 몰라. 먼저 이것을 알아본 뒤 결정하고, 나중에 마음도 다시 확인하자”처럼 사실·미확인 내용·행동·후속 점검을 나누어 말한다.",
      reviewFocus: [
        "R의 확인된 정보 출발과 C의 느린 초기 감정 활성화를 각각 기록할 것",
        "차분한 정보 확인을 불안 없음이나 결과에 대한 무관심으로 해석하지 않을 것",
      ],
    },
    {
      scenarioId: "SCN-PERSON-OF-INTEREST-5",
      attention:
        "마음에 드는 사람의 뜻이 분명하지 않아도 걱정이 크게 올라오기 전 실제로 한 말과 반복된 행동, 직접 확인할 수 있는 한 가지 질문을 먼저 살피는 경향이 있다.",
      firstThought:
        "“내가 실제로 확인한 반응은 무엇이고, 혼자 뜻을 정하지 않으려면 지금 무엇을 물어보는 게 좋을까?”를 생각하기 쉽다.",
      actualResponse:
        "한 번의 답장이나 표정만으로 결론 내리지 않고 반복되는 행동을 본 뒤 중요한 한 가지를 직접 묻고, 답에 맞춰 관계의 다음 속도를 정하는 편이다.",
      communication:
        "“지난번에는 다음에 보자고 했는데 이번 주도 같은 마음인지 궁금해. 네 생각을 듣고 나도 천천히 마음을 살펴볼게”처럼 관찰한 내용·질문·자기 점검을 함께 말한다.",
      reviewFocus: [
        "R의 반복 행동 확인과 C의 차분한 초기 반응을 각각 알아볼 수 있는지 확인할 것",
        "질문 전 관찰하는 시간을 관심 부족·회피·자신감의 높고 낮음으로 해석하지 않을 것",
      ],
    },
  ],
  ENGKC: [],
} as const satisfies Record<
  "INGKQ" | "INAMQ" | "ERAMQ" | "ERAKC" | "ENGKC",
  readonly InteractionScenarioOverride[]
>;
