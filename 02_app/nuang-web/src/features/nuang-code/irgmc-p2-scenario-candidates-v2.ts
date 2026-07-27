import type { z } from "zod";
import { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";

type TraitMapClaimV2 = z.infer<typeof traitMapClaimV2Schema>;
type RelationshipContext = TraitMapClaimV2["contexts"][number];

type SceneDraft = {
  scenarioId: string;
  context: RelationshipContext;
  moment: string;
  evidenceFindingRefs: readonly string[];
  independentSourceRefs: readonly string[];
  attention: string;
  firstThought: string;
  actualResponse: string;
  communication: string;
  validationFocus: readonly string[];
};

const reviews = {
  personality_psychology: "not_started",
  psychometrics: "not_started",
  relationship_psychology: "not_started",
  clinical_safety: "not_started",
  plain_korean: "not_started",
  product: "not_started",
  design: "not_started",
} as const;

const sceneDrafts = [
  {
    scenarioId: "SCN-GENERAL-1",
    context: "general",
    moment: "ordinary_choice",
    evidenceFindingRefs: [
      "FND-OPENNESS-INTELLECT-DISTINCTION",
      "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
    ],
    independentSourceRefs: [
      "SRC-OPENNESS-INTELLECT-2009",
      "SRC-SITUATION-CONTINGENCY-2007",
    ],
    attention:
      "평범한 선택에서는 이미 써본 방법과 확인된 정보, 지금 자신의 에너지와 시간에 맞는지를 먼저 살피는 경향이 있다.",
    firstThought:
      "“실제로 잘 맞았던 선택은 무엇이고, 오늘 조건에서 가장 무리 없는 방법은 무엇이지?”를 생각하기 쉽다.",
    actualResponse:
      "익숙하고 쓸모가 분명한 선택에서 시작하되, 상황이 바뀌면 그 안에서 방법과 순서를 유연하게 조정하는 편이다.",
    communication:
      "“전에 이 방법이 잘 맞았고 오늘은 시간이 이만큼 있으니 이렇게 하자”처럼 경험과 현재 조건을 함께 말하는 방식이 자연스럽다.",
    validationFocus: [
      "익숙한 선택 선호와 새로운 선택을 거부하는 행동을 구분할 것",
      "시간·비용·피로가 선택에 미치는 영향을 함께 기록할 것",
    ],
  },
  {
    scenarioId: "SCN-GENERAL-4",
    context: "general",
    moment: "plan_change",
    evidenceFindingRefs: [
      "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
      "FND-STRESS-CHANGES-MOMENTARY-PERSONALITY",
    ],
    independentSourceRefs: [
      "SRC-SITUATION-CONTINGENCY-2007",
      "SRC-STRESS-STATE-2026",
    ],
    attention:
      "계획이 갑자기 바뀌면 처음 계획을 고집하기보다 무엇이 달라졌고 지금 가능한 선택지가 무엇인지 먼저 확인하는 경향이 있다.",
    firstThought:
      "“바뀐 이유와 새 조건에서 가장 먼저 처리할 일은 무엇이지?”를 생각하며 실행 순서를 다시 잡기 쉽다.",
    actualResponse:
      "감정이 크게 올라오기 전 필요한 정보를 모으고, 마감과 중요도에 맞춰 방법이나 순서를 바꾸어 움직이는 편이다.",
    communication:
      "“지금 조건에서는 이 방법이 가능합니다. 먼저 이것부터 바꾸겠습니다”처럼 변경된 사실과 다음 행동을 분명히 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "변화 수용 행동과 변화에 대한 만족도를 별도로 측정할 것",
      "중요도·손실·통제 가능성이 반응을 바꾸는지 확인할 것",
    ],
  },
  {
    scenarioId: "SCN-GENERAL-5",
    context: "general",
    moment: "uncertainty",
    evidenceFindingRefs: [
      "FND-STATE-MEASUREMENT-DESIGN",
      "FND-SELF-KNOWLEDGE-PARTIAL",
    ],
    independentSourceRefs: ["SRC-STATE-MEASUREMENT-2020", "SRC-SELF-KNOWLEDGE-2010"],
    attention:
      "결과를 알기 어려운 상황에서는 가능한 이야기를 넓게 만들기보다 지금 확인한 사실과 아직 모르는 부분, 다음에 확인할 단서를 먼저 나누는 경향이 있다.",
    firstThought:
      "“무엇을 알고 있고, 무엇은 추측이며, 가장 먼저 어디서 확인할 수 있지?”를 차분히 정리하기 쉽다.",
    actualResponse:
      "작게 확인할 수 있는 행동부터 시작하고, 새 정보가 들어오면 판단과 실행 방식을 그때그때 조정하는 편이다.",
    communication:
      "“현재 확인된 건 이것이고 이 부분은 아직 모릅니다. 먼저 여기부터 확인하겠습니다”처럼 사실·미확인·다음 행동을 구분해 말하는 방식이 자연스럽다.",
    validationFocus: [
      "정보 확인 선호와 불확실성을 견디는 정도를 구분할 것",
      "위험 수준과 정보 접근 가능성이 행동에 미치는 영향을 기록할 것",
    ],
  },
  {
    scenarioId: "SCN-GENERAL-7",
    context: "general",
    moment: "support_requested",
    evidenceFindingRefs: [
      "FND-SUPPORT-MATCHING-CONTEXT",
      "FND-INTENTION-BEHAVIOR-SEPARATION",
    ],
    independentSourceRefs: [
      "SRC-SUPPORT-MATCHING-2007",
      "SRC-INTENTION-BEHAVIOR-2016",
    ],
    attention:
      "누군가 도움을 요청하면 막연히 위로하기보다 어떤 일이 있었고 실제로 무엇을 원하는지, 자신이 할 수 있는 범위가 어디까지인지 먼저 살피는 경향이 있다.",
    firstThought:
      "“문제의 원인은 무엇이고, 지금 필요한 것은 듣기·정보·실행 중 어느 쪽일까?”를 구분하려 하기 쉽다.",
    actualResponse:
      "요청 내용을 차분히 듣고 도움의 종류를 확인한 뒤, 할 수 있는 구체적인 행동을 제안하는 편이다.",
    communication:
      "“지금은 이야기를 들어주면 될까, 아니면 같이 해결할 일을 찾을까?”처럼 필요한 도움을 직접 확인하는 말이 잘 맞는다.",
    validationFocus: [
      "해결 생각이 먼저 떠오르는 것과 상대 감정을 무시하는 행동을 구분할 것",
      "요청 범위를 넘어서 대신 결정하는 행동을 포함하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-GENERAL-8",
    context: "general",
    moment: "need_expression",
    evidenceFindingRefs: [
      "FND-INTENTION-BEHAVIOR-SEPARATION",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: [
      "SRC-INTENTION-BEHAVIOR-2016",
      "SRC-EMOTION-PROCESS-1998",
    ],
    attention:
      "자신에게 도움이 필요할 때 감정을 바로 넓게 표현하기보다 무엇이 막혔고 어떤 지원이 있어야 달라지는지 먼저 정리하려는 경향이 있다.",
    firstThought:
      "“내가 직접 해결할 부분과 다른 사람에게 부탁해야 할 부분은 무엇이지?”를 혼자 구분하기 쉽다.",
    actualResponse:
      "필요가 구체적으로 정리되면 믿을 만한 사람에게 시간·정보·행동처럼 분명한 형태로 도움을 요청하는 편이다.",
    communication:
      "“이 부분에서 막혔어. 오늘 10분만 같이 봐줄 수 있을까?”처럼 상황과 필요한 도움을 짧게 말하는 방식이 자연스럽다.",
    validationFocus: [
      "도움을 늦게 요청하는 조건과 실제 요청 방식을 각각 확인할 것",
      "구체적인 표현을 감정이 없거나 친밀감이 낮다는 뜻으로 해석하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-GENERAL-9",
    context: "general",
    moment: "boundary",
    evidenceFindingRefs: [
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
      "FND-INTENTION-BEHAVIOR-SEPARATION",
    ],
    independentSourceRefs: ["SRC-IPC-2013", "SRC-INTENTION-BEHAVIOR-2016"],
    attention:
      "자신의 시간·공간·역할이 침범됐다고 느끼면 불쾌함 자체보다 어떤 행동이 문제였고 앞으로 무엇이 달라져야 하는지 먼저 살피는 경향이 있다.",
    firstThought:
      "“내가 지키고 싶은 정확한 기준은 무엇이고, 상대가 이해할 수 있게 어떻게 말하지?”를 정리하기 쉽다.",
    actualResponse:
      "즉시 크게 반응하기보다 적절한 때에 구체적인 기준을 말하고, 반복되면 예고한 대응을 실행하는 편이다.",
    communication:
      "“이 시간에는 연락을 받기 어렵습니다. 급한 일이면 문자로 먼저 알려주세요”처럼 행동 기준과 대안을 함께 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "차분한 경계 표현과 계속 참는 행동을 구분할 것",
      "관계 권력과 안전 문제가 실제 표현을 제한하는지 확인할 것",
    ],
  },
  {
    scenarioId: "SCN-GENERAL-11",
    context: "general",
    moment: "setback",
    evidenceFindingRefs: [
      "FND-STRESS-CHANGES-MOMENTARY-PERSONALITY",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: [
      "SRC-STRESS-STATE-2026",
      "SRC-EMOTION-PROCESS-1998",
    ],
    attention:
      "실수하거나 기대한 결과를 얻지 못하면 자기비판을 크게 드러내기 전에 실제 원인과 고칠 수 있는 부분을 먼저 살피는 경향이 있다.",
    firstThought:
      "“어느 단계에서 달라졌고 지금 되돌릴 수 있는 것은 무엇이지?”를 차분하게 찾기 쉽다.",
    actualResponse:
      "문제를 작은 단계로 나누고 바로 수정 가능한 일부터 처리하며, 필요하면 구체적인 도움을 요청하는 편이다.",
    communication:
      "“이 지점에서 문제가 생겼고 지금 이 부분부터 고치고 있어”처럼 사실과 대응을 중심으로 말하는 방식이 자연스럽다.",
    validationFocus: [
      "겉으로 차분한 반응과 속에서 느낀 실망을 별도로 측정할 것",
      "실패 원인 분석을 능력에 대한 고정 평가로 확대하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-GENERAL-12",
    context: "general",
    moment: "aftermath",
    evidenceFindingRefs: [
      "FND-STRESS-REACTIVITY-RECOVERY-DISTINCTION",
      "FND-STATE-DISTRIBUTION-STABILITY-VARIABILITY",
    ],
    independentSourceRefs: [
      "SRC-REACTIVITY-RECOVERY-2023",
      "SRC-STATE-DISTRIBUTION-2001",
    ],
    attention:
      "부담스러운 일이 지나간 뒤에는 혼자 쉬면서 실제 진행 순서와 놓친 단서, 다음에 바꿀 행동을 되짚는 경향이 있다.",
    firstThought:
      "“무엇이 문제를 키웠고 다음에는 어느 시점에 다르게 움직이면 될까?”를 정리하기 쉽다.",
    actualResponse:
      "사람들과 계속 이야기하기보다 혼자 에너지를 회복한 뒤, 필요하면 배운 점을 기록하거나 다음 행동에 반영하는 편이다.",
    communication:
      "“조금 정리할 시간이 필요해. 생각이 정리되면 필요한 내용을 다시 이야기할게”처럼 회복 시간과 후속 행동을 함께 알리는 방식이 잘 맞는다.",
    validationFocus: [
      "초기 반응 크기와 회복에 걸리는 시간을 별도로 기록할 것",
      "혼자 회복하는 행동과 관계·과제 회피를 구분할 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-1",
    context: "family",
    moment: "ordinary_choice",
    evidenceFindingRefs: [
      "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
      "FND-INTENTION-BEHAVIOR-SEPARATION",
    ],
    independentSourceRefs: [
      "SRC-SITUATION-CONTINGENCY-2007",
      "SRC-INTENTION-BEHAVIOR-2016",
    ],
    attention:
      "가족의 평범한 일정이나 집안일을 정할 때 이미 잘 돌아가던 방식과 현재 가능한 시간·역할을 먼저 살피는 경향이 있다.",
    firstThought:
      "“누가 실제로 할 수 있고, 가장 적게 복잡한 방법은 무엇이지?”를 생각하며 현실적인 배분을 찾기 쉽다.",
    actualResponse:
      "자신이 할 수 있는 일을 맡고, 가족 상황이 달라지면 역할과 순서를 그때 맞게 조정하는 편이다.",
    communication:
      "“나는 오늘 이것을 할 수 있어. 나머지는 누가 언제 할 수 있어?”처럼 가능한 범위를 구체적으로 맞추는 방식이 자연스럽다.",
    validationFocus: [
      "가족 역할 관습과 개인의 선택을 구분할 것",
      "말보다 행동으로 참여한 부분을 함께 기록할 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-6",
    context: "family",
    moment: "disagreement",
    evidenceFindingRefs: [
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
      "FND-INTENTION-BEHAVIOR-SEPARATION",
    ],
    independentSourceRefs: ["SRC-IPC-2013", "SRC-INTENTION-BEHAVIOR-2016"],
    attention:
      "가족과 의견이 부딪히면 감정 표현보다 실제로 무엇을 다르게 알고 있고, 반복되는 원인이 무엇인지 먼저 확인하려는 경향이 있다.",
    firstThought:
      "“이번 한 번의 문제인지, 같은 조건에서 계속 생긴 문제인지”를 구분하고 해결 기준을 찾고 싶어 하기 쉽다.",
    actualResponse:
      "바로 크게 맞서기보다 상황을 듣고 사실을 정리한 뒤, 생활에서 실제로 지킬 수 있는 방법을 제안하는 편이다.",
    communication:
      "“우리가 다르게 알고 있는 부분부터 맞춰보자. 다음에는 이 기준으로 하자”처럼 확인과 해결을 순서대로 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "원인 탐색을 가족의 감정 무시로 단정하지 않을 것",
      "연령·경제 의존·권한 차이가 발언에 미치는 영향을 확인할 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-7",
    context: "family",
    moment: "support_requested",
    evidenceFindingRefs: [
      "FND-SUPPORT-MATCHING-CONTEXT",
      "FND-INTENTION-BEHAVIOR-SEPARATION",
    ],
    independentSourceRefs: [
      "SRC-SUPPORT-MATCHING-2007",
      "SRC-INTENTION-BEHAVIOR-2016",
    ],
    attention:
      "가족이 도움을 요청하면 어떤 일이 있었고 실제로 필요한 지원이 무엇인지, 자신이 책임질 범위가 어디까지인지 먼저 확인하려는 경향이 있다.",
    firstThought:
      "“무엇을 해결해야 하고, 내가 맡는 것이 가장 효과적인 부분은 어디지?”를 생각하기 쉽다.",
    actualResponse:
      "요청을 들은 뒤 필요한 행동을 구체화하고, 가능한 범위 안에서 연락·동행·정리 같은 실질적인 도움을 제공하는 편이다.",
    communication:
      "“내가 오늘 할 수 있는 건 이 두 가지야. 무엇이 더 필요해?”처럼 가능 범위와 추가 필요를 함께 확인하는 방식이 잘 맞는다.",
    validationFocus: [
      "가족 의무로 한 행동과 자발적 지원을 구분할 것",
      "도움의 효과를 관계 만족의 보장으로 확대하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-8",
    context: "family",
    moment: "need_expression",
    evidenceFindingRefs: [
      "FND-SUPPORT-MATCHING-CONTEXT",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: [
      "SRC-SUPPORT-MATCHING-2007",
      "SRC-EMOTION-PROCESS-1998",
    ],
    attention:
      "가족에게 자신의 필요를 말할 때 마음을 길게 설명하기보다 생활에서 무엇이 달라져야 하는지 먼저 정리하려는 경향이 있다.",
    firstThought:
      "“내가 원하는 행동은 정확히 무엇이고, 가족이 실제로 지킬 수 있는 수준은 어디까지일까?”를 생각하기 쉽다.",
    actualResponse:
      "생각을 혼자 정리한 뒤 시간·공간·역할처럼 확인 가능한 요청으로 바꾸어 말하는 편이다.",
    communication:
      "“저녁 9시 이후에는 혼자 쉬는 시간이 필요해. 그 시간에는 급한 일만 알려줘”처럼 필요와 행동 기준을 함께 전하는 방식이 자연스럽다.",
    validationFocus: [
      "구체적인 요청과 그 아래의 감정적 필요를 함께 확인할 것",
      "가족 내 안전·권력 문제로 표현이 어려운 경우를 별도 처리할 것",
    ],
  },
  {
    scenarioId: "SCN-FRIEND-1",
    context: "friend",
    moment: "ordinary_choice",
    evidenceFindingRefs: [
      "FND-FRIEND-DAILY-INTERACTION-QUALITY",
      "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
    ],
    independentSourceRefs: [
      "SRC-FRIEND-DAILY-2015",
      "SRC-SITUATION-CONTINGENCY-2007",
    ],
    attention:
      "친구와 평범한 시간을 보낼 때 새로운 선택지를 많이 늘리기보다 둘이 실제로 좋아했던 활동과 오늘의 에너지·시간을 먼저 살피는 경향이 있다.",
    firstThought:
      "“오늘 우리 둘이 무리 없이 즐길 수 있는 익숙한 선택은 무엇이지?”를 생각하기 쉽다.",
    actualResponse:
      "잘 맞았던 장소나 활동을 제안하되 친구의 현재 상태가 다르면 그 안에서 시간과 방식을 유연하게 바꾸는 편이다.",
    communication:
      "“전에 갔던 곳이 편했는데 오늘도 갈까, 아니면 가까운 곳에서 쉴까?”처럼 익숙한 선택과 대안을 함께 묻는 방식이 잘 맞는다.",
    validationFocus: [
      "익숙함 선호와 새로운 경험에 대한 개방성을 구분할 것",
      "친구 관계의 친밀도와 만남 빈도를 함께 기록할 것",
    ],
  },
  {
    scenarioId: "SCN-FRIEND-2",
    context: "friend",
    moment: "new_encounter",
    evidenceFindingRefs: [
      "FND-FRIEND-DYAD-SIMILARITY-NOT-SATISFACTION",
      "FND-INITIAL-ATTRACTION-SIMILARITY-NULL",
    ],
    independentSourceRefs: [
      "SRC-FRIEND-DYAD-2023",
      "SRC-INITIAL-ATTRACTION-2023",
    ],
    attention:
      "새로운 사람과 친구가 될 때 첫인상으로 관계를 크게 그리기보다 실제로 나눈 대화와 반복해서 보이는 행동, 편하게 함께할 수 있는 구체적인 공통점을 살피는 경향이 있다.",
    firstThought:
      "“이 사람과 실제로 잘 맞았던 대화나 활동은 무엇이고, 다음에 확인할 점은 무엇이지?”를 생각하기 쉽다.",
    actualResponse:
      "처음에는 소수의 화제에서 천천히 대화하고, 편안한 상호작용이 반복되면 만남과 연락을 조금씩 늘리는 편이다.",
    communication:
      "“아까 그 이야기가 재미있었어. 다음에 관련된 곳에 같이 갈래?”처럼 실제 대화에서 나온 계기로 다음 만남을 제안하는 방식이 자연스럽다.",
    validationFocus: [
      "초기 유사성 인식과 실제 우정 만족을 동일시하지 않을 것",
      "천천히 친해지는 속도를 관심 부족으로 해석하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-FRIEND-6",
    context: "friend",
    moment: "disagreement",
    evidenceFindingRefs: [
      "FND-FRIEND-DAILY-INTERACTION-QUALITY",
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
    ],
    independentSourceRefs: ["SRC-FRIEND-DAILY-2015", "SRC-IPC-2013"],
    attention:
      "친구와 의견이 다르면 관계가 나빠졌다고 바로 해석하기보다 어떤 경험과 기준이 달라서 결론이 달라졌는지 먼저 살피는 경향이 있다.",
    firstThought:
      "“우리가 다르게 알고 있는 사실이 있는지, 아니면 중요하게 보는 기준이 다른지”를 구분하고 싶어 하기 쉽다.",
    actualResponse:
      "친구 말을 들은 뒤 자신의 경험과 이유를 구체적으로 설명하고, 꼭 하나의 결론으로 합칠 필요가 없는지 판단하는 편이다.",
    communication:
      "“나는 이런 경험 때문에 이렇게 봤어. 너는 어떤 이유가 있었어?”처럼 차이의 배경을 묻는 방식이 자연스럽다.",
    validationFocus: [
      "이해를 위한 원인 질문과 친구를 설득해 이기려는 행동을 구분할 것",
      "의견 차이 이후의 상호작용 질을 별도로 기록할 것",
    ],
  },
  {
    scenarioId: "SCN-FRIEND-7",
    context: "friend",
    moment: "support_requested",
    evidenceFindingRefs: [
      "FND-SUPPORT-MATCHING-CONTEXT",
      "FND-FRIEND-DAILY-INTERACTION-QUALITY",
    ],
    independentSourceRefs: [
      "SRC-SUPPORT-MATCHING-2007",
      "SRC-FRIEND-DAILY-2015",
    ],
    attention:
      "친구가 도움을 요청하면 상황의 원인과 필요한 지원의 종류, 자신이 실제로 도울 수 있는 범위를 먼저 파악하려는 경향이 있다.",
    firstThought:
      "“친구는 지금 듣는 사람을 원하는지, 함께 처리할 사람을 원하는지”를 구분하고 싶어 하기 쉽다.",
    actualResponse:
      "친구가 원하는 지원을 확인한 뒤 정보 찾기·동행·일정 정리처럼 구체적인 행동으로 돕는 편이다.",
    communication:
      "“내가 들어줄까, 같이 해결할 한 가지를 찾을까?”처럼 지원 방식을 고를 수 있게 묻는 말이 잘 맞는다.",
    validationFocus: [
      "조언 충동과 실제로 친구 선택을 존중한 행동을 분리할 것",
      "지원 행동을 우정의 질이나 지속 여부의 보장으로 쓰지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-FRIEND-9",
    context: "friend",
    moment: "boundary",
    evidenceFindingRefs: [
      "FND-FRIEND-DAILY-INTERACTION-QUALITY",
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
    ],
    independentSourceRefs: ["SRC-FRIEND-DAILY-2015", "SRC-IPC-2013"],
    attention:
      "친구가 연락 빈도·농담·부탁에서 자신의 선을 넘으면 어떤 행동이 불편했고 관계를 유지하려면 무엇이 달라져야 하는지 먼저 살피는 경향이 있다.",
    firstThought:
      "“친구를 거절하는 것이 아니라 어떤 행동을 바꿔달라고 말해야 하지?”를 혼자 정리하기 쉽다.",
    actualResponse:
      "감정이 크게 쌓이기 전에 구체적인 행동 기준을 말하고, 친구 반응을 보며 이후의 거리와 연락 방식을 조정하는 편이다.",
    communication:
      "“그 농담은 나는 불편해. 앞으로는 그 주제로 놀리지 않았으면 좋겠어”처럼 대상 행동과 바라는 변화를 분명히 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "경계 표현과 우정 단절 의사를 구분할 것",
      "반복된 침범과 한 번의 실수를 나누어 확인할 것",
    ],
  },
  {
    scenarioId: "SCN-PARTNER-1",
    context: "partner",
    moment: "ordinary_choice",
    evidenceFindingRefs: [
      "FND-PARTNER-RESPONSIVENESS-LONGITUDINAL",
      "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
    ],
    independentSourceRefs: [
      "SRC-RESPONSIVENESS-2017",
      "SRC-SITUATION-CONTINGENCY-2007",
    ],
    attention:
      "연인과 평범한 선택을 할 때 둘이 실제로 편했던 경험과 오늘의 시간·비용·에너지, 상대가 지금 원하는 것을 먼저 살피는 경향이 있다.",
    firstThought:
      "“우리에게 잘 맞았던 방법 중 오늘 조건에 가장 알맞은 것은 무엇이지?”를 생각하기 쉽다.",
    actualResponse:
      "익숙한 선택을 먼저 제안하되 연인의 현재 선호를 물어보고, 필요하면 장소나 시간 같은 실행 방식을 바꾸는 편이다.",
    communication:
      "“지난번 방식이 편했는데 오늘도 괜찮아, 아니면 다르게 하고 싶어?”처럼 경험과 상대 선택을 함께 확인하는 방식이 자연스럽다.",
    validationFocus: [
      "익숙한 선택 제안과 연인의 선호를 실제로 반영한 행동을 함께 볼 것",
      "연인 관계의 기간과 공동생활 여부를 기록할 것",
    ],
  },
  {
    scenarioId: "SCN-PARTNER-5",
    context: "partner",
    moment: "uncertainty",
    evidenceFindingRefs: [
      "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
      "FND-PARTNER-RESPONSIVENESS-LONGITUDINAL",
    ],
    independentSourceRefs: [
      "SRC-RELATIONAL-UNCERTAINTY-2011",
      "SRC-RESPONSIVENESS-2017",
    ],
    attention:
      "연인의 태도나 관계의 다음 단계가 분명하지 않으면 추측을 넓히기보다 실제로 달라진 말과 행동, 아직 확인하지 않은 부분을 먼저 살피는 경향이 있다.",
    firstThought:
      "“내가 확인한 변화는 무엇이고, 상대에게 직접 물어야 할 한 가지는 무엇이지?”를 정리하기 쉽다.",
    actualResponse:
      "혼자 생각을 정리한 뒤 적절한 때에 구체적인 변화를 말하고, 연인의 설명을 들으며 다음 행동을 함께 정하는 편이다.",
    communication:
      "“최근 연락 시간이 달라져서 이유가 궁금했어. 요즘 어떤 상태인지 이야기해줄래?”처럼 관찰과 질문을 나누어 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "관찰한 변화와 관계 악화에 대한 추측을 구분할 것",
      "차분한 질문과 속에서 느낀 불확실성을 각각 측정할 것",
    ],
  },
  {
    scenarioId: "SCN-PARTNER-6",
    context: "partner",
    moment: "disagreement",
    evidenceFindingRefs: [
      "FND-PARTNER-RESPONSIVENESS-LONGITUDINAL",
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
    ],
    independentSourceRefs: ["SRC-RESPONSIVENESS-2017", "SRC-IPC-2013"],
    attention:
      "연인과 의견이 부딪히면 감정의 크기보다 실제로 무엇을 다르게 알고 있고 반복되는 원인이 무엇인지 먼저 파악하려는 경향이 있다.",
    firstThought:
      "“어디서부터 서로 다르게 이해했고, 해결하려면 어떤 기준을 다시 맞춰야 하지?”가 먼저 떠오르기 쉽다.",
    actualResponse:
      "목소리를 높이기보다 연인의 설명을 듣고 사실과 요구를 정리한 뒤, 둘이 지킬 수 있는 구체적인 방법을 찾는 편이다.",
    communication:
      "“나는 이 상황을 이렇게 이해했어. 네가 불편했던 지점도 듣고 다음 방법을 같이 정하고 싶어”처럼 확인과 해결 순서를 말하는 방식이 자연스럽다.",
    validationFocus: [
      "문제 해결을 먼저 생각하면서도 실제로 상대 감정을 확인하는지 별도 측정할 것",
      "갈등 주제·반복 빈도·안전 문제를 함께 기록할 것",
    ],
  },
  {
    scenarioId: "SCN-PARTNER-7",
    context: "partner",
    moment: "support_requested",
    evidenceFindingRefs: [
      "FND-SUPPORT-MATCHING-CONTEXT",
      "FND-PARTNER-RESPONSIVENESS-LONGITUDINAL",
    ],
    independentSourceRefs: [
      "SRC-SUPPORT-MATCHING-2007",
      "SRC-RESPONSIVENESS-2017",
    ],
    attention:
      "연인이 도움을 요청하면 문제의 원인과 필요한 지원의 종류, 자신이 실제로 할 수 있는 일을 먼저 구분하려는 경향이 있다.",
    firstThought:
      "“지금 해결할 일은 무엇이고, 연인은 듣기와 행동 중 무엇을 원하는가?”를 확인하고 싶어 하기 쉽다.",
    actualResponse:
      "연인의 이야기를 차분히 듣고 원하는 도움을 물은 뒤, 필요한 경우 함께 처리할 구체적인 행동을 맡는 편이다.",
    communication:
      "“지금은 내가 들어주는 게 좋을까, 같이 해결할 일을 정할까?”처럼 지원 방식을 직접 묻는 말이 잘 맞는다.",
    validationFocus: [
      "해결 지향적 첫 생각과 실제 정서 지원 행동을 구분할 것",
      "상대가 도움을 원하지 않는 선택도 반영할 것",
    ],
  },
  {
    scenarioId: "SCN-PARTNER-8",
    context: "partner",
    moment: "need_expression",
    evidenceFindingRefs: [
      "FND-PARTNER-RESPONSIVENESS-LONGITUDINAL",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: [
      "SRC-RESPONSIVENESS-2017",
      "SRC-EMOTION-PROCESS-1998",
    ],
    attention:
      "연인에게 자신의 필요를 말할 때 감정을 한꺼번에 쏟기보다 실제로 달라지길 바라는 행동과 대화할 적절한 시점을 먼저 정리하려는 경향이 있다.",
    firstThought:
      "“내가 원하는 것은 정확히 무엇이고, 상대가 실행할 수 있게 어떻게 말해야 하지?”를 생각하기 쉽다.",
    actualResponse:
      "혼자 생각을 정리한 뒤 비교적 차분한 때에 구체적인 상황과 요청을 말하고, 연인의 입장도 듣는 편이다.",
    communication:
      "“연락이 늦어질 때는 짧게 알려주면 좋겠어. 그러면 내가 기다리는 시간을 알 수 있어”처럼 행동과 이유를 함께 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "구체적인 요청 아래에 있는 감정적 필요도 함께 확인할 것",
      "표현 시점을 미루는 행동과 필요를 계속 숨기는 행동을 구분할 것",
    ],
  },
  {
    scenarioId: "SCN-PARTNER-9",
    context: "partner",
    moment: "boundary",
    evidenceFindingRefs: [
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
      "FND-PARTNER-RESPONSIVENESS-LONGITUDINAL",
    ],
    independentSourceRefs: ["SRC-IPC-2013", "SRC-RESPONSIVENESS-2017"],
    attention:
      "연인이 자신의 시간·사생활·선택을 넘어서면 어떤 행동이 문제였고 관계를 지키면서 바꿔야 할 기준이 무엇인지 먼저 살피는 경향이 있다.",
    firstThought:
      "“상대를 거절하는 것과 이 행동을 거절하는 것을 어떻게 분명히 나누어 말하지?”를 정리하기 쉽다.",
    actualResponse:
      "감정이 크게 쌓이기 전에 구체적인 경계를 말하고, 이후 상대가 기준을 존중하는지를 실제 행동으로 확인하는 편이다.",
    communication:
      "“내 휴대전화를 허락 없이 보는 것은 원하지 않아. 궁금한 점은 나에게 직접 물어봐 줘”처럼 금지 행동과 대안을 함께 말하는 방식이 자연스럽다.",
    validationFocus: [
      "경계 설정과 관계 거절을 구분할 것",
      "통제·폭력·안전 위험이 있으면 일반 관계 조언과 분리할 것",
    ],
  },
  {
    scenarioId: "SCN-PERSON-OF-INTEREST-1",
    context: "person_of_interest",
    moment: "ordinary_choice",
    evidenceFindingRefs: [
      "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
      "FND-INITIAL-ATTRACTION-SIMILARITY-NULL",
    ],
    independentSourceRefs: [
      "SRC-RELATIONAL-UNCERTAINTY-2011",
      "SRC-INITIAL-ATTRACTION-2023",
    ],
    attention:
      "마음에 드는 사람과 평범한 선택을 할 때 멋진 인상을 만들기보다 그 사람이 실제로 말한 취향과 지금 편하게 함께할 수 있는 조건을 먼저 살피는 경향이 있다.",
    firstThought:
      "“상대가 직접 좋아한다고 한 것은 무엇이고, 둘 다 부담 없이 할 수 있는 선택은 무엇이지?”를 생각하기 쉽다.",
    actualResponse:
      "확인한 취향에서 구체적인 선택지를 제안하고, 상대 반응에 따라 시간과 방법을 유연하게 바꾸는 편이다.",
    communication:
      "“전에 이걸 좋아한다고 했지? 이번에는 여기 가보는 건 어때?”처럼 기억한 정보와 제안을 연결하는 방식이 자연스럽다.",
    validationFocus: [
      "상대가 실제로 말한 취향과 호감 때문에 추측한 취향을 구분할 것",
      "제안의 구체성과 관계 결과를 동일시하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-PERSON-OF-INTEREST-5",
    context: "person_of_interest",
    moment: "uncertainty",
    evidenceFindingRefs: [
      "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
      "FND-SELF-OTHER-KNOWLEDGE-ASYMMETRY",
    ],
    independentSourceRefs: ["SRC-RELATIONAL-UNCERTAINTY-2011", "SRC-SOKA-2010"],
    attention:
      "마음에 드는 사람의 뜻이 분명하지 않으면 좋은 가능성과 나쁜 가능성을 늘리기보다 실제로 반복된 말과 행동, 아직 확인하지 못한 부분을 먼저 나누는 경향이 있다.",
    firstThought:
      "“호감이라고 볼 수 있는 확인된 행동이 있는가, 아니면 내가 의미를 더한 것인가?”를 스스로 점검하기 쉽다.",
    actualResponse:
      "급하게 결론 내리기보다 자연스러운 대화를 이어가며 반응을 확인하고, 관계가 충분히 쌓이면 필요한 질문을 직접 하는 편이다.",
    communication:
      "“나는 너를 더 알아가고 싶은데, 너는 어떻게 생각해?”처럼 추측을 사실처럼 말하지 않고 자신의 뜻과 질문을 나누는 방식이 잘 맞는다.",
    validationFocus: [
      "관찰 사실과 호감 해석을 분리할 것",
      "천천히 확인하는 행동을 관계 성공 가능성으로 확대하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-PERSON-OF-INTEREST-8",
    context: "person_of_interest",
    moment: "need_expression",
    evidenceFindingRefs: [
      "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
      "FND-INTENTION-BEHAVIOR-SEPARATION",
    ],
    independentSourceRefs: [
      "SRC-RELATIONAL-UNCERTAINTY-2011",
      "SRC-INTENTION-BEHAVIOR-2016",
    ],
    attention:
      "마음에 드는 사람에게 자신의 필요를 말할 때 감정을 크게 드러내기보다 어떤 행동이나 답을 원하는지 먼저 정리하려는 경향이 있다.",
    firstThought:
      "“지금 꼭 확인해야 할 한 가지는 무엇이고, 상대에게 부담을 덜 주면서 어떻게 물을까?”를 생각하기 쉽다.",
    actualResponse:
      "생각이 정리되면 원하는 만남·연락·답변을 구체적으로 말하고, 상대가 선택할 수 있는 여지를 함께 두는 편이다.",
    communication:
      "“이번 주에 한 번 더 만나고 싶은데, 너도 괜찮은지 알려줘”처럼 자신의 뜻과 상대 선택을 동시에 분명히 하는 방식이 자연스럽다.",
    validationFocus: [
      "구체적 요청과 감정 표현의 크기를 별도로 측정할 것",
      "상대의 거절 가능성을 존중하는 행동을 확인할 것",
    ],
  },
  {
    scenarioId: "SCN-PERSON-OF-INTEREST-9",
    context: "person_of_interest",
    moment: "boundary",
    evidenceFindingRefs: [
      "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
    ],
    independentSourceRefs: [
      "SRC-RELATIONAL-UNCERTAINTY-2011",
      "SRC-IPC-2013",
    ],
    attention:
      "마음에 드는 사람이라도 연락·질문·신체적 거리에서 불편함이 생기면 어떤 행동이 자신의 기준을 넘었는지 먼저 살피는 경향이 있다.",
    firstThought:
      "“호감과 별개로 지켜야 할 기준은 무엇이고, 오해 없이 어떻게 말하지?”를 정리하기 쉽다.",
    actualResponse:
      "상대를 몰아세우기보다 불편했던 행동과 원하는 기준을 구체적으로 말하고, 이후 존중 여부를 실제 행동으로 확인하는 편이다.",
    communication:
      "“나는 늦은 밤 반복 연락은 부담스러워. 다음 날 이야기했으면 좋겠어”처럼 행동과 대안을 분명히 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "호감 때문에 경계를 늦게 말하는 조건을 확인할 것",
      "안전 위험이 있으면 일반 관계 설명과 분리할 것",
    ],
  },
  {
    scenarioId: "SCN-WORK-1",
    context: "work",
    moment: "ordinary_choice",
    evidenceFindingRefs: [
      "FND-WORK-TRAIT-ACTIVATION-CONTEXT",
      "FND-WORK-SITUATION-STRENGTH-ACTIVATION",
    ],
    independentSourceRefs: [
      "SRC-TRAIT-ACTIVATION-2003",
      "SRC-PERSON-SITUATION-WORK-2015",
    ],
    attention:
      "평범한 업무 선택에서는 검증된 절차와 현재 마감·자원·집중 상태, 바로 확인할 수 있는 결과를 먼저 살피는 경향이 있다.",
    firstThought:
      "“전에 효과가 있었던 방식 중 지금 조건에 맞는 것은 무엇이고, 어디까지 바꿔도 되는가?”를 생각하기 쉽다.",
    actualResponse:
      "익숙한 절차로 시작하되 상황이 달라지면 작업 순서와 도구를 유연하게 조정하며 결과를 확인하는 편이다.",
    communication:
      "“기존 방식으로 시작하되 오늘 마감에 맞춰 이 단계는 줄이겠습니다”처럼 기준과 조정 내용을 함께 말하는 방식이 자연스럽다.",
    validationFocus: [
      "절차 선호와 새로운 방법을 만들 수 있는 능력을 구분할 것",
      "업무 자율성과 마감 압력이 행동에 미치는 영향을 기록할 것",
    ],
  },
  {
    scenarioId: "SCN-WORK-7",
    context: "work",
    moment: "support_requested",
    evidenceFindingRefs: [
      "FND-WORK-TRAIT-ACTIVATION-CONTEXT",
      "FND-SUPPORT-MATCHING-CONTEXT",
    ],
    independentSourceRefs: [
      "SRC-TRAIT-ACTIVATION-2003",
      "SRC-SUPPORT-MATCHING-2007",
    ],
    attention:
      "동료가 업무 도움을 요청하면 문제의 원인과 현재까지 한 일, 마감, 자신이 맡아야 할 정확한 범위를 먼저 확인하려는 경향이 있다.",
    firstThought:
      "“어느 단계가 막혔고, 내가 알려주는 것이 나은지 직접 맡는 것이 나은지”를 구분하려 하기 쉽다.",
    actualResponse:
      "상황을 들은 뒤 필요한 자료나 해결 순서를 정리하고, 자신이 할 수 있는 구체적인 부분을 맡는 편이다.",
    communication:
      "“지금 막힌 지점이 여기라면 나는 이 자료를 정리할게요. 나머지는 이 순서로 확인해 보세요”처럼 역할과 방법을 함께 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "도움을 주는 방식과 상대 업무를 대신 떠안는 행동을 구분할 것",
      "업무 성과·평가에 대한 결론으로 확대하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-WORK-9",
    context: "work",
    moment: "boundary",
    evidenceFindingRefs: [
      "FND-WORK-SITUATION-STRENGTH-ACTIVATION",
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
    ],
    independentSourceRefs: ["SRC-PERSON-SITUATION-WORK-2015", "SRC-IPC-2013"],
    attention:
      "업무 범위·시간·책임이 계속 넘어오면 불만을 크게 드러내기보다 어떤 요청이 기존 역할과 충돌하고 결과에 어떤 영향을 주는지 먼저 살피는 경향이 있다.",
    firstThought:
      "“현재 자원으로 가능한 범위는 어디까지고, 무엇을 조정해야 새 요청을 받을 수 있지?”를 정리하기 쉽다.",
    actualResponse:
      "감정적으로 거절하기보다 현재 업무와 영향, 가능한 대안을 구체적으로 제시해 우선순위 결정을 요청하는 편이다.",
    communication:
      "“이 일을 맡으면 기존 A의 마감이 늦어집니다. 무엇을 우선할지 정해주시면 그 기준에 맞추겠습니다”처럼 영향과 선택을 분명히 말하는 방식이 자연스럽다.",
    validationFocus: [
      "업무 경계 표현과 조직 권한·고용 안전을 함께 고려할 것",
      "대표 코드 설명을 인사 평가나 배치 결정에 사용하지 않을 것",
    ],
  },
] as const satisfies readonly SceneDraft[];

const channelConfig = [
  ["attention", "attention", "attention"],
  ["process", "first_thought", "firstThought"],
  ["response", "actual_response", "actualResponse"],
  ["communication", "communication", "communication"],
] as const;

export const irgmcP2ScenarioCandidatesV2 = sceneDrafts.flatMap((scene) =>
  channelConfig.map(([claimSuffix, claimKind, draftKey]) => {
    const requiredSignals: TraitMapClaimV2["requiredSignals"] = [
      "representative_code",
      "domain_scores",
      "facet_scores",
      "scenario_context",
      "current_state",
    ];
    if (scene.context !== "general") {
      requiredSignals.push("relationship_context");
    }
    if (claimKind === "first_thought" || claimKind === "actual_response") {
      requiredSignals.push("private_process_signals");
    }

    const riskDomains: TraitMapClaimV2["riskDomains"] =
      scene.context === "work"
        ? ["work_performance"]
        : scene.context === "general"
          ? ["none"]
          : ["relationship_outcome"];

    return {
      claimId: `IRGMC.scenario.${scene.context}.${scene.moment}.${claimSuffix}`,
      entity: { kind: "profile", ref: "IRGMC" },
      scope: "scenario",
      claimKind,
      assertion: scene[draftKey],
      contexts: [scene.context],
      scenarioRefs: [scene.scenarioId],
      requiredSignals,
      evidenceFindingRefs: [...scene.evidenceFindingRefs],
      independentSourceRefs: [...scene.independentSourceRefs],
      evidenceStatus: "nuang_validation_required",
      evidenceGrade: "C",
      privacyScope: "self_only",
      riskDomains,
      publicationState: "research_only",
      reviews,
    } satisfies TraitMapClaimV2;
  }),
);

export const irgmcP2ScenarioValidationQueueV2 = sceneDrafts.map((scene) => ({
  scenarioId: scene.scenarioId,
  context: scene.context,
  moment: scene.moment,
  validationFocus: scene.validationFocus,
  participantQuestions: [
    "이 장면이 실제 생활에서 충분히 구체적으로 떠오르나요?",
    "처음 드는 생각과 실제 나타나는 반응 중 어느 설명이 더 가깝나요?",
    "이 설명과 다르게 행동했던 조건은 무엇이었나요?",
    "역할·의무·권한 때문에 한 행동이 성향처럼 섞여 있나요?",
    "어렵거나 단정적으로 들리는 표현이 있나요?",
  ],
  status: "cognitive_review_required" as const,
}));
