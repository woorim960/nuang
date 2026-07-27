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
    scenarioId: "SCN-FAMILY-2",
    context: "family",
    moment: "new_encounter",
    evidenceFindingRefs: [
      "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
      "FND-PERSON-SITUATION-INDEPENDENT-REALTIME",
    ],
    independentSourceRefs: [
      "SRC-SITUATION-CONTINGENCY-2007",
      "SRC-REALTIME-PERSON-SITUATION-2015",
    ],
    attention:
      "가족과 새로운 장소·행사·생활 변화를 마주하면 달라지는 일정과 역할, 가족이 실제로 불편해하는 부분을 먼저 살피는 경향이 있다.",
    firstThought:
      "“무엇이 달라지고 누가 어떤 준비를 해야 하지?”를 정리한 뒤 아직 확인하지 못한 부분을 가족에게 물어보려 하기 쉽다.",
    actualResponse:
      "필요한 정보를 조용히 찾아보고 현실적으로 먼저 할 수 있는 일부터 맡으며, 상황이 달라지면 준비 순서도 함께 조정하는 편이다.",
    communication:
      "“지금 확인된 건 여기까지야. 나는 이 부분을 할 수 있는데, 너희는 무엇이 필요해?”처럼 정보와 역할을 구체적으로 나눠 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "새로운 경험에 대한 관심과 실제 준비 행동을 구분할 것",
      "가족 내 연령·돌봄·경제적 책임을 성향 효과와 분리할 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-3",
    context: "family",
    moment: "group_participation",
    evidenceFindingRefs: [
      "FND-TRAIT-ENACTMENT-STABILITY-AND-VARIABILITY",
      "FND-PERSON-SITUATION-INDEPENDENT-REALTIME",
    ],
    independentSourceRefs: [
      "SRC-TRAIT-ENACTMENT-2015",
      "SRC-REALTIME-PERSON-SITUATION-2015",
    ],
    attention:
      "가족 모임에서는 분위기를 계속 이끌기보다 필요한 준비가 잘 되어 있는지, 실제로 해결해야 할 일과 자신의 역할이 무엇인지 먼저 살피는 경향이 있다.",
    firstThought:
      "“내가 지금 보탤 수 있는 일은 무엇이고, 굳이 꺼내지 않아도 되는 이야기는 무엇일까?”를 생각하기 쉽다.",
    actualResponse:
      "대화의 중심에 오래 있기보다 익숙한 사람과 이야기하거나 준비·정리처럼 구체적인 역할을 맡아 모임에 참여하는 편이다.",
    communication:
      "여러 사람 앞에서 길게 말하기보다 필요한 내용을 짧게 알리고, 민감한 이야기는 당사자와 따로 확인하는 방식이 자연스럽다.",
    validationFocus: [
      "말수가 적은 것과 가족 모임에 기여하지 않는 것을 구분할 것",
      "명절·소규모 식사·온라인 대화에서 역할이 달라지는지 확인할 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-4",
    context: "family",
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
      "가족 일정이 갑자기 바뀌면 감정을 크게 드러내기 전에 변경 이유와 지금 가능한 시간, 다시 나눠야 할 역할을 먼저 확인하는 경향이 있다.",
    firstThought:
      "“바뀐 조건 안에서 가장 현실적인 방법은 무엇이고, 같은 문제가 반복되지 않으려면 무엇을 확인해야 하지?”를 생각하기 쉽다.",
    actualResponse:
      "급한 일은 가능한 방식으로 먼저 처리하고, 여유가 생기면 변경 원인과 다음 기준을 가족과 다시 맞추는 편이다.",
    communication:
      "“이번에는 이렇게 바꾸면 돼. 다음에는 언제까지 알려주면 되는지도 정하자”처럼 현재 해결과 이후 기준을 나눠 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "가족 의무 때문에 따른 행동과 자발적인 적응을 구분할 것",
      "변경을 받아들인 행동과 속에서 느낀 불편함을 각각 측정할 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-5",
    context: "family",
    moment: "uncertainty",
    evidenceFindingRefs: [
      "FND-STRESS-CHANGES-MOMENTARY-PERSONALITY",
      "FND-SELF-KNOWLEDGE-PARTIAL",
    ],
    independentSourceRefs: ["SRC-STRESS-STATE-2026", "SRC-SELF-KNOWLEDGE-2010"],
    attention:
      "가족의 건강·진로·경제처럼 결과를 알기 어려운 일이 생기면 확인된 사실과 아직 모르는 부분, 당장 준비할 수 있는 행동을 구분하려는 경향이 있다.",
    firstThought:
      "“지금 확실한 정보는 무엇이고 누구에게 확인해야 하지?”를 생각하며 막연한 예상보다 실제 단서를 모으려 하기 쉽다.",
    actualResponse:
      "걱정이 생겨도 차분히 정보를 찾고, 바로 할 수 있는 연락·예약·비용 확인처럼 구체적인 행동부터 시작하는 편이다.",
    communication:
      "“아직 모르는 건 이 부분이고, 오늘 확인할 수 있는 건 이것이야”처럼 사실과 다음 행동을 분리해 가족에게 전하는 방식이 잘 맞는다.",
    validationFocus: [
      "건강·재정처럼 위험도가 다른 불확실성을 별도로 다룰 것",
      "차분한 문제 해결 행동을 불안이 전혀 없는 상태로 해석하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-9",
    context: "family",
    moment: "boundary",
    evidenceFindingRefs: [
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
      "FND-INTENTION-BEHAVIOR-SEPARATION",
    ],
    independentSourceRefs: ["SRC-IPC-2013", "SRC-INTENTION-BEHAVIOR-2016"],
    attention:
      "가족이 자신의 시간이나 물건, 사생활을 넘어서면 어떤 행동이 반복됐고 실제로 무엇을 바꿔야 하는지 먼저 살피는 경향이 있다.",
    firstThought:
      "“내가 불편한 정확한 지점은 무엇이고, 지킬 수 있는 기준을 어떻게 말해야 하지?”를 혼자 정리하기 쉽다.",
    actualResponse:
      "감정이 크게 폭발하기 전에 구체적인 행동 기준을 말하고, 이후에도 같은 일이 생기면 약속한 대응을 실행하는 편이다.",
    communication:
      "“내 방에 들어오기 전에는 먼저 물어봐 줘. 오늘부터는 이 기준을 지키고 싶어”처럼 대상 행동과 원하는 기준을 분명히 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "경계를 세우는 행동과 가족과의 정서적 거리감을 구분할 것",
      "권력 차이·의존 관계 때문에 실제 행동이 제한되는지 확인할 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-10",
    context: "family",
    moment: "success",
    evidenceFindingRefs: [
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
      "FND-PERSON-SITUATION-INDEPENDENT-REALTIME",
    ],
    independentSourceRefs: [
      "SRC-EMOTION-PROCESS-1998",
      "SRC-REALTIME-PERSON-SITUATION-2015",
    ],
    attention:
      "가족에게 좋은 일이 생기면 큰 축하 표현보다 그 사람이 실제로 애쓴 과정과 앞으로 달라질 생활을 먼저 살피는 경향이 있다.",
    firstThought:
      "“어떤 노력이 결과를 만들었고, 지금 가족에게 실질적으로 필요한 축하는 무엇일까?”를 생각하기 쉽다.",
    actualResponse:
      "구체적인 노력을 알아봐 주고 식사 준비나 필요한 물건처럼 바로 도움이 되는 방식으로 축하를 보태는 편이다.",
    communication:
      "“그동안 매일 준비한 게 결국 결과로 이어졌네. 오늘은 무엇을 하고 싶어?”처럼 관찰한 노력과 선택권을 함께 말하는 방식이 자연스럽다.",
    validationFocus: [
      "축하 표현의 크기와 실제 관심·지원 행동을 구분할 것",
      "가족의 성취를 자신의 기준으로 평가하는 행동과 분리할 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-11",
    context: "family",
    moment: "setback",
    evidenceFindingRefs: [
      "FND-SUPPORT-MATCHING-CONTEXT",
      "FND-INTENTION-BEHAVIOR-SEPARATION",
    ],
    independentSourceRefs: [
      "SRC-SUPPORT-MATCHING-2007",
      "SRC-INTENTION-BEHAVIOR-2016",
    ],
    attention:
      "가족이 실수하거나 어려움을 겪으면 무슨 일이 있었고 당장 해결해야 할 문제가 무엇인지, 가족이 원하는 도움이 무엇인지 먼저 구분하려는 경향이 있다.",
    firstThought:
      "“원인은 무엇이고 내가 실제로 도울 수 있는 부분은 어디까지지?”가 먼저 떠오르면서도 도움을 원하지 않을 수 있다는 점을 함께 생각하기 쉽다.",
    actualResponse:
      "상황을 들은 뒤 필요한 지원을 물어보고, 요청받은 범위에서 연락·정리·실행처럼 구체적인 도움을 제공하는 편이다.",
    communication:
      "“지금은 이야기를 들어주는 게 좋을까, 같이 처리할 일이 있을까?”처럼 도움 방식을 가족이 고르게 하는 말이 잘 맞는다.",
    validationFocus: [
      "가족을 대신해 모든 일을 처리하는 것과 요청 범위의 지원을 구분할 것",
      "해결을 먼저 떠올리는 생각과 실제 정서적 반응을 분리할 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-12",
    context: "family",
    moment: "aftermath",
    evidenceFindingRefs: [
      "FND-STRESS-REACTIVITY-RECOVERY-DISTINCTION",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: [
      "SRC-REACTIVITY-RECOVERY-2023",
      "SRC-EMOTION-PROCESS-1998",
    ],
    attention:
      "가족 갈등이나 큰일이 지나간 뒤에는 혼자 있을 때 실제로 일어난 순서와 풀리지 않은 문제, 다음에 달라져야 할 기준을 되짚는 경향이 있다.",
    firstThought:
      "“문제가 시작된 지점과 반복된 원인은 무엇이며, 다음에는 무엇을 먼저 말해야 할까?”를 정리하기 쉽다.",
    actualResponse:
      "바로 감정을 길게 나누기보다 생각이 정리된 뒤 필요한 가족에게 다시 말을 걸고, 다음에 지킬 구체적인 약속을 제안하는 편이다.",
    communication:
      "“그때 우리가 다르게 알고 있던 부분은 이거였어. 다음에는 이 시점에 먼저 알려주자”처럼 원인과 새 기준을 연결해 말하는 방식이 자연스럽다.",
    validationFocus: [
      "혼자 회복하는 시간과 관계 회피를 구분할 것",
      "감정 반응의 크기·회복 시간·후속 행동을 각각 기록할 것",
    ],
  },
  {
    scenarioId: "SCN-FRIEND-3",
    context: "friend",
    moment: "group_participation",
    evidenceFindingRefs: [
      "FND-FRIEND-DAILY-INTERACTION-QUALITY",
      "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
    ],
    independentSourceRefs: [
      "SRC-FRIEND-DAILY-2015",
      "SRC-SITUATION-CONTINGENCY-2007",
    ],
    attention:
      "친구 모임에서는 모두와 계속 대화하기보다 익숙한 친구, 구체적으로 흥미로운 화제, 자신이 자연스럽게 맡을 수 있는 역할을 먼저 찾는 경향이 있다.",
    firstThought:
      "“어느 대화에 들어가면 내가 아는 내용을 보탤 수 있을까?”, “잠깐 쉬었다가 다시 참여해도 될까?”를 생각하기 쉽다.",
    actualResponse:
      "소수와 깊게 이야기하거나 준비·사진·이동 같은 역할을 맡고, 에너지가 줄면 잠시 조용한 시간을 확보하는 편이다.",
    communication:
      "말없이 자리를 피하기보다 “잠깐 쉬었다가 다시 올게”처럼 필요한 시간을 짧게 알리는 방식이 관계 유지에 잘 맞는다.",
    validationFocus: [
      "모임 참여 시간과 상호작용의 질을 별도로 볼 것",
      "친구 수나 인기도를 대표 코드로 예측하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-FRIEND-4",
    context: "friend",
    moment: "plan_change",
    evidenceFindingRefs: [
      "FND-FRIEND-DAILY-INTERACTION-QUALITY",
      "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
    ],
    independentSourceRefs: [
      "SRC-FRIEND-DAILY-2015",
      "SRC-SITUATION-CONTINGENCY-2007",
    ],
    attention:
      "친구 약속이 갑자기 바뀌면 서운함을 크게 표현하기 전에 변경 이유와 실제 가능한 시간, 이동·비용 같은 조건을 먼저 확인하는 경향이 있다.",
    firstThought:
      "“이유가 무엇이고 지금 가능한 대안은 무엇이지?”를 생각하며 친구의 의도를 추측하기보다 후속 행동을 보려 하기 쉽다.",
    actualResponse:
      "가능한 일정이면 유연하게 바꾸고, 어렵다면 자신이 가능한 범위를 분명히 말해 새 약속을 정하는 편이다.",
    communication:
      "“오늘은 어렵고 토요일 오후는 가능해. 그때로 바꿀까?”처럼 판단에 필요한 정보를 간단히 주고받는 방식이 잘 맞는다.",
    validationFocus: [
      "한 번의 변경과 반복적인 약속 파기를 구분할 것",
      "수용 행동과 속에서 느낀 서운함을 각각 측정할 것",
    ],
  },
  {
    scenarioId: "SCN-FRIEND-5",
    context: "friend",
    moment: "uncertainty",
    evidenceFindingRefs: [
      "FND-FRIEND-DAILY-INTERACTION-QUALITY",
      "FND-SELF-OTHER-KNOWLEDGE-ASYMMETRY",
    ],
    independentSourceRefs: ["SRC-FRIEND-DAILY-2015", "SRC-SOKA-2010"],
    attention:
      "친구의 답장이 늦거나 태도가 달라 보이면 바로 관계 문제로 단정하기보다 실제로 달라진 행동과 마지막 대화, 확인 가능한 상황을 먼저 살피는 경향이 있다.",
    firstThought:
      "“내가 아는 사실은 답장이 늦었다는 것뿐인지, 다른 변화도 반복됐는지”를 구분하고 싶어 하기 쉽다.",
    actualResponse:
      "혼자 생각을 정리한 뒤 필요한 경우 안부를 짧게 묻고, 답을 재촉하기보다 친구의 실제 반응을 기다리는 편이다.",
    communication:
      "“요즘 답이 늦어서 바쁜가 했어. 괜찮을 때 근황 알려줘”처럼 관찰한 변화와 답할 여유를 함께 전하는 방식이 자연스럽다.",
    validationFocus: [
      "관찰 가능한 변화와 거절·갈등에 대한 추측을 구분할 것",
      "친밀도·연락 습관·최근 스트레스가 판단에 미치는 영향을 기록할 것",
    ],
  },
  {
    scenarioId: "SCN-FRIEND-8",
    context: "friend",
    moment: "need_expression",
    evidenceFindingRefs: [
      "FND-SUPPORT-MATCHING-CONTEXT",
      "FND-FRIEND-DAILY-INTERACTION-QUALITY",
    ],
    independentSourceRefs: [
      "SRC-SUPPORT-MATCHING-2007",
      "SRC-FRIEND-DAILY-2015",
    ],
    attention:
      "친구에게 도움이 필요할 때 감정을 넓게 설명하기보다 어떤 상황이고 무엇을 부탁하면 실제로 도움이 되는지 먼저 정리하려는 경향이 있다.",
    firstThought:
      "“내가 혼자 해결할 수 없는 부분은 무엇이고, 이 친구에게 어느 정도까지 부탁해도 될까?”를 생각하기 쉽다.",
    actualResponse:
      "요청할 내용을 구체적으로 만든 뒤 믿는 친구에게 연락하고, 필요한 시간이나 행동을 분명히 말하는 편이다.",
    communication:
      "“오늘 10분만 내 이야기를 들어줄 수 있어?” 또는 “이 자료를 한 번 봐줄 수 있어?”처럼 필요한 지원을 구체적으로 요청하는 방식이 잘 맞는다.",
    validationFocus: [
      "도움을 요청하기 전 혼자 정리하는 시간과 실제 요청 성공 여부를 볼 것",
      "구체적인 요청을 정서적 친밀감 부족으로 해석하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-FRIEND-10",
    context: "friend",
    moment: "success",
    evidenceFindingRefs: [
      "FND-FRIEND-DAILY-INTERACTION-QUALITY",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: [
      "SRC-FRIEND-DAILY-2015",
      "SRC-EMOTION-PROCESS-1998",
    ],
    attention:
      "친구에게 좋은 일이 생기면 큰 반응을 먼저 보이기보다 친구가 실제로 노력한 부분과 원하는 축하 방식을 살피는 경향이 있다.",
    firstThought:
      "“어떤 과정이 가장 힘들었고, 이 결과가 친구에게 실제로 무엇을 바꿔줄까?”를 구체적으로 궁금해하기 쉽다.",
    actualResponse:
      "친구의 노력을 짚어 축하하고, 가까운 관계라면 둘이 좋아하는 활동이나 작은 선물처럼 익숙하고 실질적인 방식으로 기쁨을 나누는 편이다.",
    communication:
      "“네가 그 부분을 오래 준비한 걸 알아. 정말 잘됐다”처럼 알고 있는 과정과 축하를 함께 말하는 방식이 자연스럽다.",
    validationFocus: [
      "축하 표현의 크기와 친구에 대한 관심의 깊이를 구분할 것",
      "친구의 성공을 비교·평가하는 반응과 분리할 것",
    ],
  },
  {
    scenarioId: "SCN-FRIEND-11",
    context: "friend",
    moment: "setback",
    evidenceFindingRefs: [
      "FND-SUPPORT-MATCHING-CONTEXT",
      "FND-FRIEND-DAILY-INTERACTION-QUALITY",
    ],
    independentSourceRefs: [
      "SRC-SUPPORT-MATCHING-2007",
      "SRC-FRIEND-DAILY-2015",
    ],
    attention:
      "친구가 실수하거나 힘든 일을 겪으면 실제로 무슨 일이 있었고 지금 필요한 것이 위로인지 해결인지 먼저 구분하려는 경향이 있다.",
    firstThought:
      "“어디서 문제가 생겼고 내가 할 수 있는 현실적인 도움은 무엇이지?”가 떠오르면서도 조언을 원하는지는 확인해야 한다고 생각하기 쉽다.",
    actualResponse:
      "친구의 말을 차분히 듣고 원하는 지원을 물은 뒤, 필요하면 일정 정리·정보 찾기·동행처럼 구체적인 행동을 제안하는 편이다.",
    communication:
      "“지금은 그냥 들어줄까, 아니면 같이 방법을 찾아볼까?”처럼 친구가 도움 방식을 선택하도록 묻는 말이 잘 맞는다.",
    validationFocus: [
      "원인·해결을 먼저 떠올린 생각과 실제 공감 행동을 분리할 것",
      "친구의 요청 범위를 넘어 대신 해결하는 행동과 구분할 것",
    ],
  },
  {
    scenarioId: "SCN-FRIEND-12",
    context: "friend",
    moment: "aftermath",
    evidenceFindingRefs: [
      "FND-STRESS-REACTIVITY-RECOVERY-DISTINCTION",
      "FND-FRIEND-DAILY-INTERACTION-QUALITY",
    ],
    independentSourceRefs: [
      "SRC-REACTIVITY-RECOVERY-2023",
      "SRC-FRIEND-DAILY-2015",
    ],
    attention:
      "친구와 불편한 일이 지나간 뒤에는 혼자서 오간 말과 행동을 되짚고, 오해가 시작된 지점과 다시 확인할 내용을 정리하는 경향이 있다.",
    firstThought:
      "“내가 실제로 잘못 전달한 부분은 무엇이고, 친구에게 직접 물어야 할 부분은 무엇이지?”를 나누어 생각하기 쉽다.",
    actualResponse:
      "감정이 정리된 뒤 친구에게 필요한 말만 전하고, 다음에는 어떻게 다르게 할지 구체적으로 제안하는 편이다.",
    communication:
      "“그때 내 말이 이렇게 들렸을 수 있겠더라. 내 뜻은 이거였고, 다음에는 먼저 확인할게”처럼 사실·책임·다음 행동을 연결해 말하는 방식이 자연스럽다.",
    validationFocus: [
      "혼자 정리하는 시간과 연락을 끊는 행동을 구분할 것",
      "갈등 강도에 따른 회복 시간과 후속 행동을 각각 기록할 것",
    ],
  },
  {
    scenarioId: "SCN-WORK-2",
    context: "work",
    moment: "new_encounter",
    evidenceFindingRefs: [
      "FND-WORK-TRAIT-ACTIVATION-CONTEXT",
      "FND-WORK-SITUATION-STRENGTH-ACTIVATION",
    ],
    independentSourceRefs: [
      "SRC-TRAIT-ACTIVATION-2003",
      "SRC-PERSON-SITUATION-WORK-2015",
    ],
    attention:
      "새 팀·수업·과제를 만나면 사람들에게 자신을 알리기보다 실제 목표와 규칙, 참고할 사례, 자신에게 맡겨진 범위를 먼저 파악하려는 경향이 있다.",
    firstThought:
      "“완료 기준은 무엇이고, 이미 정해진 방식과 내가 조정할 수 있는 부분은 어디까지지?”를 생각하기 쉽다.",
    actualResponse:
      "자료와 사례를 먼저 확인한 뒤 구체적인 질문을 하고, 시작 조건이 갖춰지면 자신의 방식으로 집중해 일을 진행하는 편이다.",
    communication:
      "“결과물 기준과 마감, 제가 결정해도 되는 범위를 먼저 확인하고 싶습니다”처럼 실행에 필요한 내용을 분명히 묻는 방식이 잘 맞는다.",
    validationFocus: [
      "초기 질문의 적고 많음보다 실제 정보 탐색 행동을 볼 것",
      "조용한 적응을 업무 소극성이나 능력 부족으로 해석하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-WORK-3",
    context: "work",
    moment: "group_participation",
    evidenceFindingRefs: [
      "FND-WORK-TRAIT-ACTIVATION-CONTEXT",
      "FND-WORK-SITUATION-STRENGTH-ACTIVATION",
    ],
    independentSourceRefs: [
      "SRC-TRAIT-ACTIVATION-2003",
      "SRC-PERSON-SITUATION-WORK-2015",
    ],
    attention:
      "회의나 공동 과제에서는 발언 기회 자체보다 논의가 해결해야 할 문제, 확인된 자료, 빠진 실행 조건이 무엇인지 먼저 살피는 경향이 있다.",
    firstThought:
      "“지금 결정에 필요한 정보가 충분한가?”, “말한다면 어떤 근거와 다음 행동을 함께 제시할까?”를 정리하기 쉽다.",
    actualResponse:
      "계속 대화를 주도하기보다 필요한 순간에 구체적인 문제와 대안을 말하고, 정해진 역할을 자기 방식으로 실행하는 편이다.",
    communication:
      "“현재 자료에서는 이 부분이 확인되지 않았습니다. 먼저 이것을 확인한 뒤 결정하면 좋겠습니다”처럼 근거와 다음 단계를 함께 전하는 방식이 자연스럽다.",
    validationFocus: [
      "발언 빈도와 판단의 정확성·업무 성과를 동일시하지 않을 것",
      "회의 규칙과 지위가 발언 행동에 미치는 영향을 분리할 것",
    ],
  },
  {
    scenarioId: "SCN-WORK-4",
    context: "work",
    moment: "plan_change",
    evidenceFindingRefs: [
      "FND-WORK-SITUATION-STRENGTH-ACTIVATION",
      "FND-DAILY-STRESS-SHIFTS-TRAIT-STATES",
    ],
    independentSourceRefs: [
      "SRC-PERSON-SITUATION-WORK-2015",
      "SRC-DAILY-STRESS-STATES-2024",
    ],
    attention:
      "업무 계획이 갑자기 바뀌면 불만을 크게 표현하기 전에 변경 이유와 새 우선순위, 이미 진행한 일에 미치는 영향을 먼저 확인하는 경향이 있다.",
    firstThought:
      "“지금 버려지는 일은 무엇이고, 새 기준에서 가장 먼저 처리할 것은 무엇이지?”를 생각하며 재정렬하려 하기 쉽다.",
    actualResponse:
      "마감과 영향이 분명하면 빠르게 방식과 순서를 바꾸고, 정보가 부족하면 필요한 결정을 요청한 뒤 실행하는 편이다.",
    communication:
      "“변경하면 A 작업은 중단되고 B를 먼저 하게 됩니다. 이 우선순위가 맞는지 확인해 주세요”처럼 영향과 확인 사항을 짧게 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "적응 속도와 변경에 대한 만족도를 별도로 측정할 것",
      "권한·마감·자원 부족을 개인 성향 효과와 구분할 것",
    ],
  },
  {
    scenarioId: "SCN-WORK-5",
    context: "work",
    moment: "uncertainty",
    evidenceFindingRefs: [
      "FND-WORK-SITUATION-STRENGTH-ACTIVATION",
      "FND-STATE-MEASUREMENT-DESIGN",
    ],
    independentSourceRefs: [
      "SRC-PERSON-SITUATION-WORK-2015",
      "SRC-STATE-MEASUREMENT-2020",
    ],
    attention:
      "정답이나 지시가 분명하지 않은 일에서는 확인된 요구사항과 참고 사례, 결정을 내릴 사람, 작은 시험으로 확인할 부분을 먼저 찾는 경향이 있다.",
    firstThought:
      "“지금 아는 것만으로 어디까지 만들 수 있고, 가장 적은 비용으로 무엇을 먼저 확인할까?”를 생각하기 쉽다.",
    actualResponse:
      "작은 예시나 초안을 만들어 반응을 확인하고, 얻은 정보에 따라 다음 방식과 속도를 조정하는 편이다.",
    communication:
      "“우선 이 범위로 시안을 만들어 확인받고, 결과에 따라 나머지를 진행하겠습니다”처럼 확인 단계와 다음 행동을 연결해 말하는 방식이 자연스럽다.",
    validationFocus: [
      "구체적 단서 선호와 새로운 해결책을 만들 수 있는 능력을 구분할 것",
      "불확실성의 크기·마감·피드백 가능성이 실행에 미치는 영향을 기록할 것",
    ],
  },
  {
    scenarioId: "SCN-WORK-6",
    context: "work",
    moment: "disagreement",
    evidenceFindingRefs: [
      "FND-WORK-TRAIT-ACTIVATION-CONTEXT",
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
    ],
    independentSourceRefs: ["SRC-TRAIT-ACTIVATION-2003", "SRC-IPC-2013"],
    attention:
      "업무 의견이 부딪히면 상대의 태도보다 기준이 다른 지점과 실제 자료, 결과에 미칠 영향을 먼저 확인하려는 경향이 있다.",
    firstThought:
      "“서로 다른 사실을 보고 있는지, 같은 사실에서 우선순위를 다르게 둔 것인지”를 구분하고 싶어 하기 쉽다.",
    actualResponse:
      "감정적으로 밀어붙이기보다 근거를 확인하고, 작은 비교나 시험으로 어느 방법이 맞는지 판단할 수 있는 절차를 제안하는 편이다.",
    communication:
      "“우리가 다르게 보는 기준은 이 부분 같습니다. 두 방식을 작은 범위에서 확인해 보면 어떨까요?”처럼 차이와 검증 방법을 함께 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "원인·근거 질문과 동료 감정을 실제로 무시하는 행동을 구분할 것",
      "직급·평가 위험이 의견 표현에 미치는 영향을 분리할 것",
    ],
  },
  {
    scenarioId: "SCN-WORK-8",
    context: "work",
    moment: "need_expression",
    evidenceFindingRefs: [
      "FND-WORK-SITUATION-STRENGTH-ACTIVATION",
      "FND-INTENTION-BEHAVIOR-SEPARATION",
    ],
    independentSourceRefs: [
      "SRC-PERSON-SITUATION-WORK-2015",
      "SRC-INTENTION-BEHAVIOR-2016",
    ],
    attention:
      "업무 도움이 필요할 때 막연히 힘들다고 말하기보다 막힌 지점과 필요한 정보·권한·시간을 먼저 정리하려는 경향이 있다.",
    firstThought:
      "“내가 더 확인할 수 있는 것은 무엇이고, 다른 사람의 결정이나 지원이 꼭 필요한 부분은 어디지?”를 생각하기 쉽다.",
    actualResponse:
      "혼자 해결을 시도한 내용을 정리한 뒤 담당자에게 구체적인 질문이나 자원 요청을 하는 편이다.",
    communication:
      "“A까지 확인했지만 B 결정이 없어 진행이 멈췄습니다. 오늘 중 이 기준을 정해주실 수 있을까요?”처럼 상태·막힘·요청을 분명히 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "도움 요청 시점과 혼자 해결하려 한 시간을 함께 기록할 것",
      "요청 행동을 업무 능력이나 성과 평가로 확대하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-WORK-10",
    context: "work",
    moment: "success",
    evidenceFindingRefs: [
      "FND-WORK-PERFORMANCE-CONSTRUCT-BOUNDARY",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: ["SRC-JOB-META-1991", "SRC-EMOTION-PROCESS-1998"],
    attention:
      "업무나 학업에서 좋은 결과가 생기면 칭찬 자체보다 실제로 효과가 있었던 과정과 다시 활용할 수 있는 방법을 먼저 살피는 경향이 있다.",
    firstThought:
      "“어떤 준비와 선택이 결과를 만들었고, 다음에도 유지해야 할 것은 무엇이지?”를 차분히 분석하기 쉽다.",
    actualResponse:
      "결과를 혼자 정리한 뒤 도움이 된 자료와 방법을 기록하고, 함께한 사람에게 구체적으로 공을 돌리는 편이다.",
    communication:
      "“이 단계에서 확인을 빨리한 것이 효과가 있었습니다. 다음에도 이 점검을 유지하겠습니다”처럼 성공 요인과 다음 행동을 연결해 말하는 방식이 자연스럽다.",
    validationFocus: [
      "성과 후 표현 방식과 실제 만족감의 크기를 분리할 것",
      "대표 코드로 업무 성과를 예측하거나 보장하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-WORK-11",
    context: "work",
    moment: "setback",
    evidenceFindingRefs: [
      "FND-WORK-TRAIT-ACTIVATION-CONTEXT",
      "FND-DAILY-STRESS-SHIFTS-TRAIT-STATES",
    ],
    independentSourceRefs: [
      "SRC-TRAIT-ACTIVATION-2003",
      "SRC-DAILY-STRESS-STATES-2024",
    ],
    attention:
      "실수하거나 기대한 성과가 나오지 않으면 자기평가를 크게 드러내기 전에 실제 발생한 문제와 원인, 복구할 수 있는 부분을 먼저 살피는 경향이 있다.",
    firstThought:
      "“어느 단계에서 문제가 생겼고, 지금 가장 먼저 되돌려야 할 것은 무엇이지?”를 생각하며 사실과 책임 범위를 정리하기 쉽다.",
    actualResponse:
      "침착하게 영향 범위를 확인하고 필요한 사람에게 알린 뒤, 수정 행동과 다시 점검할 시점을 제안하는 편이다.",
    communication:
      "“이 단계에서 오류가 발생해 이 범위에 영향이 있습니다. 지금 수정 중이며 다음 점검은 이 시간에 공유하겠습니다”처럼 사실·영향·조치를 순서대로 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "차분한 대응과 속에서 느낀 스트레스 수준을 별도로 측정할 것",
      "개인 실수와 시스템·자원·역할 문제를 구분할 것",
    ],
  },
  {
    scenarioId: "SCN-WORK-12",
    context: "work",
    moment: "aftermath",
    evidenceFindingRefs: [
      "FND-STRESS-REACTIVITY-RECOVERY-DISTINCTION",
      "FND-WORK-SITUATION-STRENGTH-ACTIVATION",
    ],
    independentSourceRefs: [
      "SRC-REACTIVITY-RECOVERY-2023",
      "SRC-PERSON-SITUATION-WORK-2015",
    ],
    attention:
      "부담스러운 업무가 지나간 뒤에는 혼자서 실제 진행 순서와 놓친 단서, 다음에 바꿀 작업 조건을 되짚는 경향이 있다.",
    firstThought:
      "“무엇이 원인이었고, 다음에는 어느 단계에서 먼저 확인하면 같은 일을 줄일 수 있을까?”를 정리하기 쉽다.",
    actualResponse:
      "잠시 집중을 내려놓고 회복한 뒤, 재발을 줄일 수 있는 점검 항목이나 작업 방식을 자신의 흐름에 맞게 고치는 편이다.",
    communication:
      "“이번에는 이 확인이 늦었습니다. 다음부터는 시작 전에 이 항목을 점검하겠습니다”처럼 배운 점과 바꿀 행동을 구체적으로 공유하는 방식이 자연스럽다.",
    validationFocus: [
      "회고 행동과 실제 정서 회복에 걸린 시간을 분리할 것",
      "회복 방식을 평가·채용·배치 판단에 사용하지 않을 것",
    ],
  },
] as const satisfies readonly SceneDraft[];

const channelConfig = [
  ["attention", "attention", "attention"],
  ["process", "first_thought", "firstThought"],
  ["response", "actual_response", "actualResponse"],
  ["communication", "communication", "communication"],
] as const;

export const irgmcP1ScenarioCandidatesV2 = sceneDrafts.flatMap((scene) =>
  channelConfig.map(([claimSuffix, claimKind, draftKey]) => {
    const requiredSignals: TraitMapClaimV2["requiredSignals"] = [
      "representative_code",
      "domain_scores",
      "facet_scores",
      "scenario_context",
      "relationship_context",
      "current_state",
    ];
    if (claimKind === "first_thought" || claimKind === "actual_response") {
      requiredSignals.push("private_process_signals");
    }

    const riskDomains: TraitMapClaimV2["riskDomains"] =
      scene.context === "work"
        ? ["work_performance"]
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

export const irgmcP1ScenarioValidationQueueV2 = sceneDrafts.map((scene) => ({
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
