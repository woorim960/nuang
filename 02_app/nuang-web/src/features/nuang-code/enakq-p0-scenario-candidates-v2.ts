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
    scenarioId: "SCN-GENERAL-2",
    context: "general",
    moment: "new_encounter",
    evidenceFindingRefs: [
      "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
      "FND-TRAIT-ENACTMENT-STABILITY-AND-VARIABILITY",
    ],
    independentSourceRefs: [
      "SRC-SITUATION-CONTINGENCY-2007",
      "SRC-TRAIT-ENACTMENT-2015",
    ],
    attention:
      "새로운 사람이나 장소를 만나면 대화를 시작할 실마리와 아직 드러나지 않은 가능성, 함께 있는 사람들이 편하게 참여하는지를 먼저 살피는 경향이 있다.",
    firstThought:
      "처음에는 “어떤 사람이고, 여기서 무엇을 새롭게 알아갈 수 있을까?”라는 궁금증과 “내가 먼저 말을 꺼내면 더 편해질까?”라는 생각이 함께 떠오르기 쉽다.",
    actualResponse:
      "낯선 상황에서도 공통점을 찾아 말을 걸거나 질문을 던져 분위기에 들어가는 편이다. 긴장이 생겨도 대화가 시작되면 참여가 빨라지는 경향이 있다.",
    communication:
      "상대가 답하기 쉬운 가벼운 질문으로 대화를 열고, 들은 내용에서 새로운 화제를 이어가며 관계의 첫 흐름을 만드는 편이다.",
    validationFocus: [
      "낯선 사람·낯선 장소·새 과제에서 같은 경향이 반복되는지",
      "먼저 말을 거는 행동과 속으로 느끼는 긴장을 각각 측정할 것",
    ],
  },
  {
    scenarioId: "SCN-GENERAL-3",
    context: "general",
    moment: "group_participation",
    evidenceFindingRefs: [
      "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
      "FND-TRAIT-ENACTMENT-STABILITY-AND-VARIABILITY",
    ],
    independentSourceRefs: [
      "SRC-SITUATION-CONTINGENCY-2007",
      "SRC-TRAIT-ENACTMENT-2015",
    ],
    attention:
      "여럿이 모인 자리에서는 사람들이 얼마나 대화에 들어와 있는지, 지금 이야기에서 더 넓혀 볼 만한 주제가 무엇인지 빠르게 살피는 경향이 있다.",
    firstThought:
      "“이 이야기를 더 재미있게 이어갈 수 있을까?”, “아직 말하지 못한 사람도 편하게 들어올 수 있을까?”를 함께 생각하기 쉽다.",
    actualResponse:
      "대화가 끊기면 새 화제를 꺼내고, 의견이 흩어지면 공통점을 묶으며, 다음에 함께할 행동까지 연결하는 역할을 맡는 편이다.",
    communication:
      "자기 의견만 길게 밀기보다 질문으로 참여를 열고, 나온 의견을 짧게 정리해 다음 대화나 행동으로 이어가는 말하기가 자연스럽다.",
    validationFocus: [
      "친한 집단과 낯선 집단의 발언 시작 차이",
      "대화를 이끄는 행동과 실제 리더 역할·능력을 혼동하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-GENERAL-6",
    context: "general",
    moment: "disagreement",
    evidenceFindingRefs: [
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
      "FND-INTENTION-BEHAVIOR-SEPARATION",
    ],
    independentSourceRefs: [
      "SRC-EMOTION-PROCESS-1998",
      "SRC-INTENTION-BEHAVIOR-2016",
    ],
    attention:
      "의견이 부딪히면 무엇이 문제를 만들었는지와 함께, 이 충돌이 상대에게 어떻게 받아들여지고 관계에 어떤 흔적을 남길지를 동시에 살피는 경향이 있다.",
    firstThought:
      "속으로는 “원인이 무엇이고 어떻게 풀 수 있지?”가 먼저 궁금해도, 곧바로 해결책을 말하면 상대가 무시당했다고 느끼지 않을지 함께 생각하기 쉽다.",
    actualResponse:
      "원인과 해결을 먼저 알고 싶어도 실제로는 상대가 불편했던 지점을 확인한 뒤, 서로 확인한 사실과 다음 해결 순서를 제안하는 반응으로 이어지는 편이다.",
    communication:
      "“어떤 점이 가장 불편했는지 먼저 듣고 싶어. 그다음 우리가 바꿀 수 있는 부분을 같이 보자”처럼 마음 확인과 문제 해결의 순서를 분명히 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "처음 드는 해결 중심 생각과 실제 상대 마음 확인 행동을 분리 측정할 것",
      "갈등 회피·공격성·공감 능력으로 확대하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-GENERAL-10",
    context: "general",
    moment: "success",
    evidenceFindingRefs: [
      "FND-EXTRAVERSION-NOT-SIMPLE-HAPPINESS",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: [
      "SRC-EXTRAVERSION-PA-2015",
      "SRC-EMOTION-PROCESS-1998",
    ],
    attention:
      "좋은 결과가 생기면 누가 함께 기여했는지와 이 결과에서 다음에 펼쳐 볼 가능성을 먼저 찾는 경향이 있다.",
    firstThought:
      "“누구와 이 기쁨을 나누고 싶지?”, “여기서 다음에는 무엇을 더 해볼 수 있을까?”라는 생각이 빠르게 이어지기 쉽다.",
    actualResponse:
      "기쁜 마음을 비교적 분명히 드러내고 주변 사람을 축하에 끌어들이며, 성취를 다음 계획이나 새로운 시도로 이어가는 편이다.",
    communication:
      "도움을 준 사람과 잘된 지점을 구체적으로 말하고, 기쁨을 함께 나눈 뒤 다음 목표를 제안하는 표현이 자연스럽다.",
    validationFocus: [
      "기쁨의 크기와 표현의 크기를 분리할 것",
      "성과 경쟁·과시·낙관성으로 확대하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-PARTNER-2",
    context: "partner",
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
      "연인과 새로운 장소나 활동을 시작하면 둘이 함께 즐길 지점과 연인이 낯선 상황을 편하게 느끼는지를 먼저 살피는 경향이 있다.",
    firstThought:
      "“함께 어떤 새로운 경험을 만들 수 있을까?”를 떠올리면서도 “상대 속도에 맞춰야 더 편하게 즐길 수 있겠다”는 생각이 뒤따르기 쉽다.",
    actualResponse:
      "새로운 활동을 먼저 제안하고 현장에서 대화를 열어 가되, 연인의 반응을 보며 일정과 참여 강도를 조정하는 편이다.",
    communication:
      "“이것도 해보고 싶은데, 너는 어느 정도가 편해?”처럼 제안과 선택권을 한 문장에 함께 담는 방식이 잘 맞는다.",
    validationFocus: [
      "데이트·여행·연인의 지인 만남을 구분할 것",
      "제안 빈도와 연인의 선택을 실제로 반영한 행동을 함께 볼 것",
    ],
  },
  {
    scenarioId: "SCN-PARTNER-3",
    context: "partner",
    moment: "group_participation",
    evidenceFindingRefs: [
      "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
      "FND-PERSON-SITUATION-INDEPENDENT-REALTIME",
    ],
    independentSourceRefs: [
      "SRC-SITUATION-CONTINGENCY-2007",
      "SRC-REALTIME-PERSON-SITUATION-2015",
    ],
    attention:
      "연인과 함께 모임에 가면 전체 분위기뿐 아니라 연인이 대화에 잘 들어와 있는지, 혼자 남는 순간은 없는지를 자주 확인하는 경향이 있다.",
    firstThought:
      "“이 자리에서 모두가 자연스럽게 어울리려면 무엇을 하면 좋을까?”와 “연인이 지금 편한가?”를 함께 생각하기 쉽다.",
    actualResponse:
      "여러 사람과 적극적으로 이야기하면서도 연인을 화제에 연결하거나 필요한 순간 곁으로 돌아와 모임 안에서 둘의 리듬을 맞추는 편이다.",
    communication:
      "연인을 대신해 마음을 단정하기보다 짧게 상태를 묻고, 함께 있을지 각자 대화할지 선택할 수 있게 말하는 방식이 자연스럽다.",
    validationFocus: [
      "돌봄 행동과 감시·소유 행동을 구분할 것",
      "연인의 표현 선호와 모임 친숙도를 함께 기록할 것",
    ],
  },
  {
    scenarioId: "SCN-PARTNER-4",
    context: "partner",
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
      "함께 정한 계획이 갑자기 바뀌면 바뀐 이유와 연인에게 생긴 부담, 다시 맞춰야 할 일정이 먼저 눈에 들어오는 경향이 있다.",
    firstThought:
      "예상 밖의 변화가 생기면 “둘 다 받아들일 수 있는 다른 방법을 어떻게 만들지?”를 곧바로 찾기 쉽다.",
    actualResponse:
      "처음에는 감정이 흔들려도 변경 이유를 확인하고 가능한 대안을 펼친 뒤, 다시 실행할 수 있는 새 약속을 정하는 쪽으로 움직이는 편이다.",
    communication:
      "“갑자기 바뀌어서 나는 조금 당황했어. 이유를 듣고 가능한 날짜를 다시 정하고 싶어”처럼 감정·확인·다음 행동을 나눠 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "계획 변경 주체·빈도·사전 설명 유무를 함께 기록할 것",
      "불편함의 크기와 실제 조정 행동을 분리할 것",
    ],
  },
  {
    scenarioId: "SCN-PARTNER-10",
    context: "partner",
    moment: "success",
    evidenceFindingRefs: [
      "FND-PARTNER-RESPONSIVENESS-LONGITUDINAL",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: [
      "SRC-RESPONSIVENESS-2017",
      "SRC-EMOTION-PROCESS-1998",
    ],
    attention:
      "연인에게 좋은 일이 생기면 결과 자체뿐 아니라 그 과정에서 연인이 애쓴 점과 지금 어떤 방식으로 기쁨을 나누고 싶은지를 먼저 살피는 경향이 있다.",
    firstThought:
      "“얼마나 기쁠까, 어떤 노력이 드디어 인정받은 걸까?”를 떠올리고 둘이 함께 축하할 새로운 방법까지 생각하기 쉽다.",
    actualResponse:
      "연인의 성취를 적극적으로 반기고 구체적인 노력을 알아봐 주며, 상대가 원하는 방식으로 축하를 함께 만드는 편이다.",
    communication:
      "“정말 잘했어”에서 끝내기보다 잘된 과정과 의미를 구체적으로 묻고, 축하 방식은 상대가 고를 수 있게 제안하는 말하기가 잘 맞는다.",
    validationFocus: [
      "상대의 성취를 자기 계획으로 곧바로 확장하지 않는지 확인할 것",
      "반응성 근거를 ENAKQ 고유 효과로 해석하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-PARTNER-11",
    context: "partner",
    moment: "setback",
    evidenceFindingRefs: [
      "FND-SUPPORT-MATCHING-CONTEXT",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: [
      "SRC-SUPPORT-MATCHING-2007",
      "SRC-EMOTION-PROCESS-1998",
    ],
    attention:
      "연인이 실수하거나 기대한 결과를 얻지 못하면 상한 마음과 함께 무엇이 막혔고 다음에는 무엇을 바꿀 수 있는지가 동시에 눈에 들어오는 경향이 있다.",
    firstThought:
      "속으로는 “원인이 무엇이고 어떻게 해결하지?”가 먼저 떠올라도, “지금 해결책을 말하면 연인의 감정을 놓치지 않을까?”라는 생각이 함께 들기 쉽다.",
    actualResponse:
      "해결이 궁금한 마음을 잠시 미루고 먼저 연인이 어떤 기분인지 살핀 뒤, 상대가 원할 때 원인 정리와 다음 행동을 함께 찾는 편이다.",
    communication:
      "“지금은 들어주는 게 좋을까, 같이 방법을 찾아보는 게 좋을까?”라고 물어 지원 방식을 맞춘 뒤 이야기를 이어가는 방식이 잘 맞는다.",
    validationFocus: [
      "처음 드는 해결 생각과 실제 나타나는 정서 지원 행동을 분리 측정할 것",
      "도움이 필요하지 않은 상대의 선택도 포함할 것",
    ],
  },
  {
    scenarioId: "SCN-PARTNER-12",
    context: "partner",
    moment: "aftermath",
    evidenceFindingRefs: [
      "FND-STRESS-REACTIVITY-RECOVERY-DISTINCTION",
      "FND-PARTNER-RESPONSIVENESS-LONGITUDINAL",
    ],
    independentSourceRefs: [
      "SRC-REACTIVITY-RECOVERY-2023",
      "SRC-RESPONSIVENESS-2017",
    ],
    attention:
      "부담스러운 일이 지나간 뒤에는 연인과의 분위기가 실제로 풀렸는지, 남은 감정이나 다시 맞춰야 할 약속이 있는지를 살피는 경향이 있다.",
    firstThought:
      "“이제 괜찮아졌을까?”라는 걱정과 “다음에는 같은 일이 반복되지 않게 무엇을 정하면 좋을까?”라는 생각이 이어지기 쉽다.",
    actualResponse:
      "그 일을 다시 이야기할 계기를 만들고 서로 남은 감정을 확인한 뒤, 필요한 사과·수정·새 약속을 실제 행동으로 이어가려는 편이다.",
    communication:
      "“아까 일은 지금 어떻게 느껴져? 내가 바꿔야 할 게 있으면 듣고 싶어”처럼 회복 상태와 다음 행동을 함께 확인하는 말하기가 잘 맞는다.",
    validationFocus: [
      "빠른 감정 반응과 회복 속도를 같은 것으로 추정하지 않을 것",
      "대화 재개가 도움이 되는 시점과 혼자 정리할 시간이 필요한 시점을 구분할 것",
    ],
  },
  {
    scenarioId: "SCN-PERSON-OF-INTEREST-2",
    context: "person_of_interest",
    moment: "new_encounter",
    evidenceFindingRefs: [
      "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
      "FND-INITIAL-ATTRACTION-SIMILARITY-NULL",
    ],
    independentSourceRefs: [
      "SRC-RELATIONAL-UNCERTAINTY-2011",
      "SRC-INITIAL-ATTRACTION-2023",
    ],
    attention:
      "마음에 드는 사람을 새롭게 만나면 대화를 이어갈 공통점과 상대가 편하게 반응하는 주제, 아직 알지 못한 여러 면을 빠르게 살피는 경향이 있다.",
    firstThought:
      "“어떤 사람일까, 무엇을 좋아할까?”라는 호기심과 함께 “내 표현이 부담스럽지 않을까?”라는 걱정이 빨리 생기기 쉽다.",
    actualResponse:
      "호감이 있어도 상대를 몰아붙이기보다 가벼운 질문으로 대화를 열고, 상대 반응을 보며 속도와 거리를 조정하는 편이다.",
    communication:
      "공통 관심사에서 질문을 시작하되, 답을 재촉하지 않고 다음 대화나 만남을 상대가 선택할 수 있게 제안하는 말하기가 잘 맞는다.",
    validationFocus: [
      "친절한 반응을 호감 신호로 해석하지 않을 것",
      "먼저 표현한 정도와 실제 상대 선택 존중 행동을 함께 볼 것",
    ],
  },
  {
    scenarioId: "SCN-PERSON-OF-INTEREST-3",
    context: "person_of_interest",
    moment: "group_participation",
    evidenceFindingRefs: [
      "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
      "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
    ],
    independentSourceRefs: [
      "SRC-RELATIONAL-UNCERTAINTY-2011",
      "SRC-SITUATION-CONTINGENCY-2007",
    ],
    attention:
      "마음에 드는 사람과 같은 모임에 있으면 전체 대화에 참여하면서도 그 사람이 어떤 주제에서 편하게 말하고 누구와 자연스럽게 어울리는지 자주 눈에 들어오는 경향이 있다.",
    firstThought:
      "“같이 이야기할 자연스러운 계기가 있을까?”를 떠올리면서, 지나치게 티를 내면 상대나 모임이 불편해지지 않을지 함께 생각하기 쉽다.",
    actualResponse:
      "모임 전체에 기여하는 방식으로 화제를 열고 상대에게도 말할 기회를 건네며, 단둘만의 흐름을 억지로 만들기보다 자연스러운 접점을 쌓는 편이다.",
    communication:
      "상대만 반복해서 지목하기보다 모두가 답할 수 있는 질문으로 대화를 열고, 공통점이 생기면 이후 대화를 가볍게 제안하는 방식이 잘 맞는다.",
    validationFocus: [
      "집단 참여와 호감 대상에게만 향한 주의를 구분할 것",
      "눈맞춤·웃음·답장 같은 단일 행동으로 호감을 추정하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-PERSON-OF-INTEREST-4",
    context: "person_of_interest",
    moment: "plan_change",
    evidenceFindingRefs: [
      "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
      "FND-STRESS-CHANGES-MOMENTARY-PERSONALITY",
    ],
    independentSourceRefs: [
      "SRC-RELATIONAL-UNCERTAINTY-2011",
      "SRC-STRESS-STATE-2026",
    ],
    attention:
      "약속이나 연락 계획이 바뀌면 실제 변경 이유와 함께 그 변화가 상대의 관심을 뜻하는지 아닌지가 먼저 신경 쓰이는 경향이 있다.",
    firstThought:
      "“관심이 줄어든 걸까?”를 걱정하면서도 바쁨·건강·다른 일정 같은 이유를 떠올리고, “무엇이 사실인지 확인하고 싶다”고 생각하기 쉽다.",
    actualResponse:
      "서운함이 생겨도 한 번의 변경으로 마음을 결론 내리기보다 이유를 묻고, 관계를 이어가고 싶다면 구체적인 다른 시간을 제안하는 편이다.",
    communication:
      "“변경된 건 이해했어. 다시 만날 생각이 있다면 가능한 날을 알려줘”처럼 감정과 다음 선택을 짧고 분명하게 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "변경 횟수·대안 제시·상대의 실제 후속 행동을 함께 볼 것",
      "불확실성의 걱정을 애착 유형이나 집착으로 이름 붙이지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-PERSON-OF-INTEREST-6",
    context: "person_of_interest",
    moment: "disagreement",
    evidenceFindingRefs: [
      "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: [
      "SRC-RELATIONAL-UNCERTAINTY-2011",
      "SRC-EMOTION-PROCESS-1998",
    ],
    attention:
      "마음에 드는 사람과 생각이 다르면 쟁점의 이유뿐 아니라 이 차이가 상대에게 나를 어떻게 보이게 할지, 관계가 어색해질지를 함께 살피는 경향이 있다.",
    firstThought:
      "“왜 다르게 생각하지?”라는 탐색과 “내 의견을 말하면 멀어지지 않을까?”라는 걱정이 동시에 떠오르기 쉽다.",
    actualResponse:
      "의견을 감추기보다 상대의 이유를 먼저 묻고, 관계를 지키면서도 자신의 기준과 다른 점을 차분히 설명하려는 편이다.",
    communication:
      "“나는 이 부분을 다르게 봐. 네가 그렇게 생각한 이유도 듣고 싶어”처럼 차이와 관심을 함께 드러내는 말하기가 잘 맞는다.",
    validationFocus: [
      "동의하는 행동과 갈등을 피하려는 행동을 구분할 것",
      "의견 차이를 관계 가능성이나 궁합 판정으로 바꾸지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-PERSON-OF-INTEREST-7",
    context: "person_of_interest",
    moment: "support_requested",
    evidenceFindingRefs: [
      "FND-SUPPORT-MATCHING-CONTEXT",
      "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
    ],
    independentSourceRefs: [
      "SRC-SUPPORT-MATCHING-2007",
      "SRC-RELATIONAL-UNCERTAINTY-2011",
    ],
    attention:
      "마음에 드는 사람이 힘든 일을 말하면 감정이 상한 지점과 문제의 원인, 지금 자신에게 기대하는 도움이 무엇인지 함께 살피는 경향이 있다.",
    firstThought:
      "“무슨 일이고 어떻게 해결할까?”가 궁금해도, “아직 가까워지는 중이라 조언이 부담이 되지 않을까?”라는 생각이 빠르게 따라오기 쉽다.",
    actualResponse:
      "바로 답을 정해 주기보다 이야기를 듣고 원하는 지원을 물은 뒤, 상대가 동의할 때에만 함께 방법을 찾거나 실제 도움을 제안하는 편이다.",
    communication:
      "“지금은 그냥 들어주는 게 좋을까, 같이 방법을 찾아볼까?”처럼 상대가 원하는 도움의 종류를 고를 수 있게 묻는 방식이 잘 맞는다.",
    validationFocus: [
      "도움 제공을 친밀감·호감의 증거로 해석하지 않을 것",
      "지원 제안과 상대의 거절·보류 선택 존중을 함께 측정할 것",
    ],
  },
  {
    scenarioId: "SCN-PERSON-OF-INTEREST-10",
    context: "person_of_interest",
    moment: "success",
    evidenceFindingRefs: [
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
      "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
    ],
    independentSourceRefs: [
      "SRC-EMOTION-PROCESS-1998",
      "SRC-SITUATION-CONTINGENCY-2007",
    ],
    attention:
      "마음에 드는 사람에게 좋은 일이 생기면 그 사람이 기뻐하는 방식과 노력한 과정, 함께 축하할 수 있는 자연스러운 계기가 먼저 눈에 들어오는 경향이 있다.",
    firstThought:
      "“진심으로 축하해 주고 싶다”는 마음과 함께, “이 기회에 대화를 더 이어가도 상대가 편할까?”를 생각하기 쉽다.",
    actualResponse:
      "성과를 구체적으로 축하하고 더 듣고 싶다는 관심을 보이되, 축하를 관계 진전의 수단으로 밀어붙이지 않고 상대 반응에 맞추는 편이다.",
    communication:
      "잘된 점을 구체적으로 알아봐 주고 “어떻게 축하하고 싶어?”처럼 상대가 원하는 방식과 대화 길이를 고를 수 있게 묻는 방식이 잘 맞는다.",
    validationFocus: [
      "축하 행동과 관계 진전 기대를 분리해 물을 것",
      "긍정 표현의 크기를 호감의 크기로 환산하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-PERSON-OF-INTEREST-11",
    context: "person_of_interest",
    moment: "setback",
    evidenceFindingRefs: [
      "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
      "FND-STRESS-CHANGES-MOMENTARY-PERSONALITY",
    ],
    independentSourceRefs: [
      "SRC-RELATIONAL-UNCERTAINTY-2011",
      "SRC-STRESS-STATE-2026",
    ],
    attention:
      "마음에 드는 사람 앞에서 실수하거나 기대와 다른 반응을 받으면, 실수의 원인과 함께 상대에게 남긴 인상과 관계의 다음 흐름이 크게 신경 쓰이는 경향이 있다.",
    firstThought:
      "“어디서 잘못됐고 어떻게 바로잡지?”와 “이 일로 나를 다르게 보지 않을까?”가 빠르게 이어지기 쉽다.",
    actualResponse:
      "생각이 많아져도 확인 가능한 실수는 짧게 인정하고 바로잡을 행동을 제안하며, 상대 마음은 추측보다 실제 반응과 말로 확인하려는 편이다.",
    communication:
      "“아까 내가 한 말은 적절하지 않았어. 미안해. 다음에는 이렇게 하려고 해”처럼 설명을 길게 늘이지 않고 책임과 다음 행동을 분명히 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "실제 실수와 상대 반응을 추측한 부분을 구분할 것",
      "일시적 스트레스 반응을 대표 코드의 고정 행동으로 쓰지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-PERSON-OF-INTEREST-12",
    context: "person_of_interest",
    moment: "aftermath",
    evidenceFindingRefs: [
      "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
      "FND-STRESS-REACTIVITY-RECOVERY-DISTINCTION",
    ],
    independentSourceRefs: [
      "SRC-RELATIONAL-UNCERTAINTY-2011",
      "SRC-REACTIVITY-RECOVERY-2023",
    ],
    attention:
      "부담스러운 만남이나 대화가 지나간 뒤에는 상대의 말과 자신의 표현을 다시 떠올리며, 관계가 어떻게 이어질지와 확인하지 못한 부분을 살피는 경향이 있다.",
    firstThought:
      "“그 말은 어떤 뜻이었을까?”를 되짚고 좋지 않은 결과를 걱정하면서도, “다음 연락에서 무엇을 확인할까?”를 정리하려 하기 쉽다.",
    actualResponse:
      "감정이 가라앉을 시간을 가진 뒤 필요한 말만 짧게 후속 연락으로 전하고, 답이 오기 전에는 추가 추측보다 자신의 일상으로 돌아가려는 편이다.",
    communication:
      "“아까 대화에서 내 뜻이 잘 전해졌는지 궁금했어. 편할 때 네 생각을 알려줘”처럼 확인할 한 가지와 답할 선택권을 함께 담는 방식이 잘 맞는다.",
    validationFocus: [
      "반응이 컸던 정도와 실제 회복 시간·방법을 별도로 기록할 것",
      "반복 연락·확인 행동과 적절한 후속 대화를 구분할 것",
    ],
  },
] as const satisfies readonly SceneDraft[];

const channelConfig = [
  ["attention", "attention", "attention"],
  ["process", "first_thought", "firstThought"],
  ["response", "actual_response", "actualResponse"],
  ["communication", "communication", "communication"],
] as const;

export const enakqP0ScenarioCandidatesV2 = sceneDrafts.flatMap((scene) =>
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

    const claim: TraitMapClaimV2 = {
      claimId: `ENAKQ.scenario.${scene.context}.${scene.moment}.${claimSuffix}`,
      entity: { kind: "profile", ref: "ENAKQ" },
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
      riskDomains:
        scene.context === "general" ? ["none"] : ["relationship_outcome"],
      publicationState: "research_only",
      reviews,
    };
    return claim;
  }),
);

export const enakqP0ScenarioValidationQueueV2 = sceneDrafts.map((scene) => ({
  scenarioId: scene.scenarioId,
  context: scene.context,
  moment: scene.moment,
  validationFocus: scene.validationFocus,
  participantQuestions: [
    "이 장면이 실제 생활에서 충분히 구체적으로 떠오르나요?",
    "처음 드는 생각과 실제 나타나는 반응 중 어느 설명이 더 가깝나요?",
    "이 설명과 다르게 행동했던 조건은 무엇이었나요?",
    "어렵거나 단정적으로 들리는 표현이 있나요?",
  ],
  status: "cognitive_review_required" as const,
}));
