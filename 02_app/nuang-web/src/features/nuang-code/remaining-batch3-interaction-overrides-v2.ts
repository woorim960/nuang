type InteractionScenarioOverride = {
  scenarioId: string;
  attention: string;
  firstThought: string;
  actualResponse: string;
  communication: string;
  reviewFocus: readonly string[];
};

export const remainingBatch3InteractionOverridesV2 = {
  ENGMC: [
    {
      scenarioId: "SCN-GENERAL-2",
      attention:
        "새로운 사람이나 장소를 만나면 먼저 말을 주고받으며 그 사람이 가진 여러 면과 앞으로 이어질 대화, 지금 함께 탐색하거나 해결해 볼 가능성을 살피는 경향이 있다.",
      firstThought:
        "“어떤 질문을 건네면 이 사람의 새로운 관점과 숨은 관심사를 알 수 있고, 함께 해볼 일을 찾을 수 있을까?”를 생각하기 쉽다.",
      actualResponse:
        "먼저 인사를 건네고 여러 주제의 질문으로 대화를 넓히다가 의미 있는 연결이 보이면 함께 탐색하거나 바로 시도할 활동을 제안하는 편이다.",
      communication:
        "“그 생각은 처음 들어봤어. 이 이야기와 연결된 걸 함께 해보면 어떨까?”처럼 새로 발견한 관점을 다음 대화나 경험으로 잇는다.",
      reviewFocus: [
        "E의 대화 속 에너지와 N의 가능성·연결 탐색을 각각 알아볼 수 있는지 확인할 것",
        "대화를 먼저 여는 행동을 관계 능력이나 친밀감의 깊이로 해석하지 않을 것",
      ],
    },
    {
      scenarioId: "SCN-FRIEND-2",
      attention:
        "새로운 사람과 친구가 될 때는 대화를 주고받으며 서로 다른 생각이 연결될 지점과 앞으로 함께 발견할 새로운 경험을 먼저 살피는 경향이 있다.",
      firstThought:
        "“어떤 이야기를 더 나누면 서로의 새로운 면을 알 수 있고, 둘이 무엇을 함께 탐색할 수 있을까?”를 떠올리기 쉽다.",
      actualResponse:
        "가벼운 질문으로 대화를 먼저 열고 숨은 관심사와 새로운 공통점을 찾으며, 흐름이 잘 이어지면 함께 처음 해볼 활동을 제안하는 편이다.",
      communication:
        "“그 관점 정말 새롭다. 다음에 관련된 곳에 같이 가서 더 이야기해 볼래?”처럼 대화에서 발견한 가능성을 다음 만남으로 잇는다.",
      reviewFocus: [
        "친구 관계에서 E의 즉각적 상호작용과 N의 새 관점 탐색이 함께 보이는지 확인할 것",
        "새로운 만남 선호를 관계의 지속성이나 책임감 판단으로 바꾸지 않을 것",
      ],
    },
  ],
  INAMC: [],
  IRAKC: [],
  IRGKQ: [
    {
      scenarioId: "SCN-GENERAL-4",
      attention:
        "계획이 갑자기 바뀌면 놓친 준비와 잘못될 가능성이 빠르게 눈에 들어오며, 원래 목표에서 반드시 지킬 부분과 다시 세워야 할 순서를 함께 살피는 경향이 있다.",
      firstThought:
        "“무엇이 잘못될 수 있고, 목표를 지키려면 빠진 부분을 어떤 순서로 다시 확인해야 할까?”를 생각하기 쉽다.",
      actualResponse:
        "걱정되는 항목을 확인 목록으로 바꾸고 변경된 조건에 맞는 새 순서와 완료 기준을 정한 뒤, 영향을 받는 사람과 계획을 다시 맞추는 편이다.",
      communication:
        "“이 변화로 이 부분이 걱정돼. 목표는 유지하면서 확인할 것과 새 순서를 정하고 단계마다 점검하자”처럼 걱정·고정점·대응을 나누어 말한다.",
      reviewFocus: [
        "K의 구조 재설정과 Q의 빠른 위험 감지를 각각 기록할 것",
        "걱정을 계획으로 바꾸는 행동을 불안 없음이나 과도한 통제의 증거로 해석하지 않을 것",
      ],
    },
  ],
  ERGMQ: [
    {
      scenarioId: "SCN-GENERAL-12",
      attention:
        "부담스러운 일이 지나간 뒤에는 관련된 사람들과 확인할 후속 행동, 다시 생길 가능성, 아직 남은 걱정과 몸의 긴장을 먼저 살피는 경향이 있다.",
      firstThought:
        "“사람들과 무엇을 바로 확인하면 다시 생길 위험을 줄이고, 남은 걱정을 실제 행동으로 바꿀 수 있을까?”를 생각하기 쉽다.",
      actualResponse:
        "필요한 사람과 상황과 후속 행동을 말로 맞추고 재발 방지 방법을 정한 뒤 다른 활동으로 옮기지만, 걱정과 피로가 줄어드는 데는 시간이 필요한 편이다.",
      communication:
        "“일은 끝났지만 아직 걱정이 남아 있어. 다음 행동을 같이 확인하고, 회복 상태도 나중에 다시 이야기할게”처럼 후속 대응과 회복을 함께 알린다.",
      reviewFocus: [
        "E의 대화 속 정리와 Q의 지속되는 걱정·긴장을 하나의 회복 속도로 합치지 않을 것",
        "다른 활동으로 옮기는 행동을 감정 해소 완료나 회피로 단정하지 않을 것",
      ],
    },
  ],
} as const satisfies Record<
  "ENGMC" | "INAMC" | "IRAKC" | "IRGKQ" | "ERGMQ",
  readonly InteractionScenarioOverride[]
>;
