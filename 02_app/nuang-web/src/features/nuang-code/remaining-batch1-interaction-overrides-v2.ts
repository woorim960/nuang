type InteractionScenarioOverride = {
  scenarioId: string;
  attention: string;
  firstThought: string;
  actualResponse: string;
  communication: string;
  reviewFocus: readonly string[];
};

export const remainingBatch1InteractionOverridesV2 = {
  IRAKQ: [
    {
      scenarioId: "SCN-GENERAL-2",
      attention:
        "새로운 사람이나 장소를 만나면 바로 대화를 시작하기보다 실제로 보이는 행동과 말, 지금 지켜야 할 규칙, 편하게 말을 보탤 수 있는 구체적인 공통점을 먼저 살피는 경향이 있다.",
      firstThought:
        "“조금 더 들어보고 지금 확인한 내용을 정리한 뒤, 상대가 방금 말한 것에서 어떤 질문을 꺼내면 좋을까?”라고 생각하기 쉽다.",
      actualResponse:
        "처음에는 주변과 대화 흐름을 관찰하고, 상대가 실제로 말한 경험에서 연결점이 생기면 구체적인 질문이나 자신의 경험을 차분히 보태는 편이다.",
      communication:
        "“아까 그곳에 다녀왔다고 했지? 실제로 어떤 점이 좋았어?”처럼 충분히 들은 내용에서 하나를 골라 구체적인 후속 질문으로 이어가는 방식이 자연스럽다.",
      reviewFocus: [
        "I의 관찰·정리 시간과 R의 구체적 정보 출발을 각각 알아볼 수 있는지 확인할 것",
        "말을 늦게 시작한 것을 낮은 관심이나 사회 불안으로 해석하지 않을 것",
      ],
    },
    {
      scenarioId: "SCN-FRIEND-2",
      attention:
        "새로운 사람과 친구가 될 때는 빨리 친해질 방법보다 실제로 나눈 대화와 반복해서 보이는 행동, 조용히 오래 나눌 수 있는 구체적인 공통점을 먼저 살피는 경향이 있다.",
      firstThought:
        "“조금 더 들어보면 실제로 잘 맞는 대화나 활동을 알 수 있을 것 같아. 다음에는 무엇을 함께 해보면 좋을까?”라고 생각하기 쉽다.",
      actualResponse:
        "처음부터 많은 말을 하기보다 상대 이야기를 들으며 실제 공통점을 찾고, 편안한 상호작용이 확인되면 소수로 만날 구체적인 활동을 제안하는 편이다.",
      communication:
        "“아까 말한 카페 이야기가 계속 생각났어. 다음에 그곳에 같이 가서 천천히 더 이야기해 볼래?”처럼 들은 내용을 기억해 다음 만남으로 잇는 방식이 잘 맞는다.",
      reviewFocus: [
        "새 친구에 대한 상상보다 실제 대화·행동을 기준으로 삼는지 확인할 것",
        "소수 만남 선호를 관계 의지나 우정의 깊이로 바꾸어 해석하지 않을 것",
      ],
    },
  ],
  ERGKQ: [],
  ENGMQ: [],
  ENAMC: [
    {
      scenarioId: "SCN-GENERAL-4",
      attention:
        "계획이 갑자기 바뀌면 감정이 크게 올라오기 전 새 조건에서 지금 가능한 방법과 사람들의 상태, 남은 에너지를 먼저 살피는 경향이 있다.",
      firstThought:
        "“무엇이 달라졌고, 지금 사람들과 어떤 방법으로 바꾸면 흐름을 자연스럽게 이어갈 수 있을까?”를 생각하기 쉽다.",
      actualResponse:
        "감정이 크게 올라오기 전 목표에 필요한 핵심만 남기고 방법과 순서를 유연하게 바꿔 움직이며, 이후에 남은 피로와 감정을 따로 확인하는 편이다.",
      communication:
        "“목표는 그대로지만 지금 조건에서는 이 방법이 더 가능해 보여. 먼저 해보고, 나중에 우리 마음과 상황도 다시 맞추자”처럼 대응과 이후 점검을 나누어 말한다.",
      reviewFocus: [
        "M의 현재 조건 적응과 C의 느린 초기 감정 활성화를 각각 기록할 것",
        "빠른 방법 변경을 무책임으로, 차분한 첫 반응을 무관심이나 빠른 회복으로 해석하지 않을 것",
      ],
    },
  ],
  INAKC: [
    {
      scenarioId: "SCN-GENERAL-12",
      attention:
        "부담스러운 일이 지나간 직후에는 해결된 부분과 남은 후속 행동, 혼자 생각과 에너지를 정리할 시간, 나중에 다시 연결할 사람을 먼저 살피는 경향이 있다.",
      firstThought:
        "“잠시 혼자 정리하면 남은 일과 내 마음을 더 분명히 알 수 있을 것 같아. 그다음 누구와 다시 이야기해야 할까?”를 생각하기 쉽다.",
      actualResponse:
        "먼저 혼자 쉬거나 기록하며 후속 행동을 정리하고, 시간이 지나 선명해진 감정·피로·몸의 긴장을 확인한 뒤 필요한 사람과 다시 대화하는 편이다.",
      communication:
        "“일은 정리됐고 지금은 조금 혼자 있을 시간이 필요해. 오늘 저녁에 내 마음도 다시 확인한 뒤 이야기할게”처럼 회복 시간과 재연결 시점을 함께 알린다.",
      reviewFocus: [
        "I의 혼자 정리하는 회복 방식과 C의 늦은 감정 확인을 같은 과정으로 합치지 않을 것",
        "그 자리에서 차분했던 반응을 감정 없음이나 관계 회복 완료로 해석하지 않을 것",
      ],
    },
  ],
} as const satisfies Record<
  "IRAKQ" | "ERGKQ" | "ENGMQ" | "ENAMC" | "INAKC",
  readonly InteractionScenarioOverride[]
>;
