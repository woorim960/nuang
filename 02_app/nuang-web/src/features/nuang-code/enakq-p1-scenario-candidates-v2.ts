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
      "가족과 새로운 장소·행사·생활 변화를 마주하면 가족 구성원이 어떻게 받아들이는지와 새 상황에서 함께 해볼 수 있는 가능성을 먼저 살피는 경향이 있다.",
    firstThought:
      "“이 변화가 우리에게 어떤 영향을 줄까?”와 “누가 먼저 적응을 도우면 좋을까?”를 함께 생각하기 쉽다.",
    actualResponse:
      "새로운 정보를 찾아 가족에게 설명하고, 각자의 걱정과 기대를 들은 뒤 실행할 순서를 정리하는 역할을 맡는 편이다.",
    communication:
      "변화를 좋다거나 나쁘다고 바로 정하기보다 달라지는 점과 선택할 수 있는 부분을 나눠 설명하고 가족의 의견을 묻는 방식이 잘 맞는다.",
    validationFocus: [
      "이사·새 가족 구성원·가족 행사를 서로 다른 장면으로 확인할 것",
      "가족 내 권한·연령·돌봄 책임을 성향 효과와 분리할 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-3",
    context: "family",
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
      "가족 모임에서는 대화에서 빠진 사람이 없는지, 어색해진 지점은 없는지, 모두가 함께 즐길 화제가 무엇인지 살피는 경향이 있다.",
    firstThought:
      "“분위기를 자연스럽게 이어가려면 무엇을 말하면 좋을까?”와 “누가 지금 불편하거나 소외됐을까?”를 생각하기 쉽다.",
    actualResponse:
      "대화를 먼저 열고 서로의 근황을 연결하며, 필요한 준비나 다음 일정을 정리해 모임의 흐름을 이어가는 편이다.",
    communication:
      "한 사람에게 답을 강요하지 않고 모두가 참여할 수 있는 질문을 건네며, 민감한 주제는 당사자의 선택을 확인한 뒤 다루는 방식이 잘 맞는다.",
    validationFocus: [
      "가족 분위기를 책임져야 한다는 의무감과 자발적 참여를 구분할 것",
      "명절·소규모 식사·온라인 가족 대화를 나눠 볼 것",
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
      "가족 일정이 갑자기 바뀌면 바뀐 이유와 각자에게 생길 부담, 다시 정해야 할 역할과 순서를 빠르게 살피는 경향이 있다.",
    firstThought:
      "예상 밖의 변화에 걱정이 생기면서 “누가 곤란해지고 어떤 대안이면 모두가 움직일 수 있을까?”를 곧바로 생각하기 쉽다.",
    actualResponse:
      "처음의 불편함을 정리한 뒤 가능한 선택지를 제안하고, 누가 무엇을 할지 다시 나눠 실제 일정으로 연결하는 편이다.",
    communication:
      "변경 이유를 묻고 자신에게 생긴 어려움을 말한 다음, 가능한 시간과 역할을 구체적으로 다시 정하는 방식이 잘 맞는다.",
    validationFocus: [
      "일정 변경 빈도와 사전 협의 여부를 함께 기록할 것",
      "가족을 챙기는 행동과 역할을 떠맡는 행동을 구분할 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-5",
    context: "family",
    moment: "uncertainty",
    evidenceFindingRefs: [
      "FND-DAILY-STRESS-SHIFTS-TRAIT-STATES",
      "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
    ],
    independentSourceRefs: [
      "SRC-DAILY-STRESS-STATES-2024",
      "SRC-SITUATION-CONTINGENCY-2007",
    ],
    attention:
      "가족의 건강·진로·경제처럼 앞일이 분명하지 않으면 좋지 않은 가능성과 필요한 정보, 가족이 느끼는 불안을 함께 살피는 경향이 있다.",
    firstThought:
      "여러 결과를 떠올리면서 “무엇부터 확인해야 걱정을 줄이고 다음 행동을 정할 수 있을까?”를 생각하기 쉽다.",
    actualResponse:
      "확인할 사실과 아직 모르는 부분을 나누고, 가족과 정보를 모은 뒤 지금 할 수 있는 작은 행동부터 정하는 편이다.",
    communication:
      "확정되지 않은 일을 단정하지 않고 현재 아는 것·모르는 것·다음 확인 시점을 분리해 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "일상 불확실성과 의료·재정처럼 전문 정보가 필요한 상황을 구분할 것",
      "걱정의 강도와 실제 정보 확인 행동을 별도로 측정할 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-9",
    context: "family",
    moment: "boundary",
    evidenceFindingRefs: [
      "FND-INTENTION-BEHAVIOR-SEPARATION",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: [
      "SRC-INTENTION-BEHAVIOR-2016",
      "SRC-EMOTION-PROCESS-1998",
    ],
    attention:
      "가족의 부탁을 거절하거나 선을 정해야 할 때 상대가 서운해할 지점과 자신이 감당할 수 있는 시간·에너지를 함께 살피는 경향이 있다.",
    firstThought:
      "“도와주고 싶지만 계속 맡으면 내가 버티기 어렵다”는 두 마음이 함께 떠올라 결정이 늦어지기 쉽다.",
    actualResponse:
      "처음에는 미안함을 느껴도 가능한 범위를 정리한 뒤, 할 수 없는 부분과 대신 가능한 도움을 구체적으로 말하는 편이다.",
    communication:
      "“이번에는 맡기 어려워. 대신 여기까지는 도울 수 있어”처럼 거절·이유·가능한 범위를 짧게 나눠 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "가족 의무·경제적 의존·권력 차이가 있는 상황을 별도 검토할 것",
      "배려와 자기희생을 같은 행동으로 처리하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-10",
    context: "family",
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
      "가족에게 좋은 일이 생기면 결과와 함께 그동안의 노력, 함께 도운 사람, 모두가 기쁨을 나눌 방법이 먼저 눈에 들어오는 경향이 있다.",
    firstThought:
      "“얼마나 기다렸던 일인지 알아봐 주고 싶다”와 “어떻게 함께 축하하면 좋을까?”를 생각하기 쉽다.",
    actualResponse:
      "기쁜 감정을 적극적으로 표현하고 구체적인 노력을 칭찬하며, 가족이 원하는 방식으로 축하 자리를 만들거나 다음 준비를 돕는 편이다.",
    communication:
      "성공을 가족 전체의 기대나 다음 목표로 곧바로 바꾸지 않고 당사자가 느끼는 의미와 원하는 축하 방식을 묻는 말하기가 잘 맞는다.",
    validationFocus: [
      "축하와 다음 성취 압박을 구분할 것",
      "가족 성취를 자신의 성취처럼 말하는 행동을 별도로 확인할 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-11",
    context: "family",
    moment: "setback",
    evidenceFindingRefs: [
      "FND-SUPPORT-MATCHING-CONTEXT",
      "FND-DAILY-STRESS-SHIFTS-TRAIT-STATES",
    ],
    independentSourceRefs: [
      "SRC-SUPPORT-MATCHING-2007",
      "SRC-DAILY-STRESS-STATES-2024",
    ],
    attention:
      "가족이 실패하거나 힘든 일을 겪으면 상한 마음과 현실적으로 막힌 원인, 지금 필요한 도움이 무엇인지 함께 살피는 경향이 있다.",
    firstThought:
      "“어떻게 해결하지?”가 먼저 떠올라도, “가족이 비난받는다고 느끼지 않게 감정을 먼저 확인해야겠다”는 생각이 뒤따르기 쉽다.",
    actualResponse:
      "상대의 이야기를 듣고 원하는 도움을 물은 뒤, 동의가 있으면 정보 찾기·일정 정리·실제 지원으로 이어가는 편이다.",
    communication:
      "“지금은 내 이야기를 들어주길 원하는지, 같이 방법을 찾길 원하는지 알려줘”처럼 지원 종류를 선택할 수 있게 묻는 방식이 잘 맞는다.",
    validationFocus: [
      "지원 제공자의 역할 부담과 실제 자원을 함께 기록할 것",
      "상대 동의 없는 해결 개입을 배려로 포장하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-12",
    context: "family",
    moment: "aftermath",
    evidenceFindingRefs: [
      "FND-STRESS-REACTIVITY-RECOVERY-DISTINCTION",
      "FND-SUPPORT-MATCHING-CONTEXT",
    ],
    independentSourceRefs: [
      "SRC-REACTIVITY-RECOVERY-2023",
      "SRC-SUPPORT-MATCHING-2007",
    ],
    attention:
      "가족 안의 부담스러운 일이 지나간 뒤에는 분위기가 실제로 회복됐는지, 남은 역할과 감정, 다시 정해야 할 약속이 있는지를 살피는 경향이 있다.",
    firstThought:
      "“다시 같은 일이 생기지 않으려면 무엇을 바꿔야 할까?”와 “아직 말하지 못한 마음이 남았을까?”를 생각하기 쉽다.",
    actualResponse:
      "상태를 다시 확인하고 필요한 일을 정리하며, 말로 끝낸 약속을 실제 분담이나 일정 변화로 이어가려는 편이다.",
    communication:
      "누가 옳았는지를 반복하기보다 남아 있는 어려움과 다음에 바꿀 한 가지를 가족 구성원별로 확인하는 방식이 잘 맞는다.",
    validationFocus: [
      "감정 회복과 문제 해결 완료를 같은 시점으로 보지 않을 것",
      "안전하지 않은 가족 관계에는 일반적인 대화 처방을 적용하지 않을 것",
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
      "친구 모임에서는 함께 즐길 주제와 활동, 대화에 덜 참여하는 친구, 다음에 이어갈 약속을 빠르게 살피는 경향이 있다.",
    firstThought:
      "“어떻게 하면 모두가 더 재미있게 참여할까?”와 “이 자리에서 새롭게 해볼 만한 건 무엇일까?”를 생각하기 쉽다.",
    actualResponse:
      "새 화제나 활동을 제안하고 친구들의 반응을 연결하며, 분위기가 좋으면 다음 만남의 계획까지 잡는 편이다.",
    communication:
      "몇 명만 대화를 차지하지 않도록 열린 질문을 던지고, 관심이 모인 활동은 날짜와 방식까지 가볍게 제안하는 말하기가 잘 맞는다.",
    validationFocus: [
      "친구 수·모임 크기·친숙도에 따른 행동 차이를 볼 것",
      "대화 참여량과 우정 만족을 같은 것으로 처리하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-FRIEND-4",
    context: "friend",
    moment: "plan_change",
    evidenceFindingRefs: [
      "FND-FRIEND-DAILY-INTERACTION-QUALITY",
      "FND-STRESS-CHANGES-MOMENTARY-PERSONALITY",
    ],
    independentSourceRefs: [
      "SRC-FRIEND-DAILY-2015",
      "SRC-STRESS-STATE-2026",
    ],
    attention:
      "친구와의 약속이 갑자기 바뀌면 이유와 친구의 사정, 다른 친구들에게 생길 영향, 다시 잡을 수 있는 선택지를 함께 살피는 경향이 있다.",
    firstThought:
      "서운함이나 걱정이 생겨도 “어떤 사정이 있었고 다음에는 어떻게 맞출 수 있을까?”를 빠르게 생각하기 쉽다.",
    actualResponse:
      "변경 이유를 확인하고 가능한 대안을 제안하며, 반복되는 변경이라면 관계를 탓하기보다 약속 방식과 자신의 한계를 분명히 말하는 편이다.",
    communication:
      "“이번 변경은 괜찮아. 다음에는 언제까지 알려주면 좋겠어”처럼 현재 수용과 다음 기준을 나눠 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "한 번의 변경과 반복 패턴을 구분할 것",
      "서운함을 감춘 행동과 실제로 괜찮은 반응을 구분할 것",
    ],
  },
  {
    scenarioId: "SCN-FRIEND-5",
    context: "friend",
    moment: "uncertainty",
    evidenceFindingRefs: [
      "FND-FRIEND-DAILY-INTERACTION-QUALITY",
      "FND-DAILY-STRESS-SHIFTS-TRAIT-STATES",
    ],
    independentSourceRefs: [
      "SRC-FRIEND-DAILY-2015",
      "SRC-DAILY-STRESS-STATES-2024",
    ],
    attention:
      "친구의 연락이 줄거나 관계의 분위기가 분명하지 않으면 최근 상호 행동과 가능한 이유, 관계에 남은 관심을 함께 살피는 경향이 있다.",
    firstThought:
      "“내가 놓친 일이 있나?”라는 걱정과 함께 바쁨·생활 변화·다른 고민처럼 여러 설명을 떠올리기 쉽다.",
    actualResponse:
      "한 번의 답장이나 침묵으로 우정을 결론 내리기보다 최근 행동을 돌아보고, 필요한 경우 부담이 적은 안부로 직접 확인하는 편이다.",
    communication:
      "“요즘 연락이 뜸해서 잘 지내는지 궁금했어. 여유 있을 때 알려줘”처럼 관찰한 변화와 관심을 말하되 답할 시간을 남기는 방식이 잘 맞는다.",
    validationFocus: [
      "연락 빈도와 관계 만족·친밀도를 분리할 것",
      "상대의 생활 변화와 기존 연락 규범을 함께 기록할 것",
    ],
  },
  {
    scenarioId: "SCN-FRIEND-8",
    context: "friend",
    moment: "need_expression",
    evidenceFindingRefs: [
      "FND-FRIEND-DAILY-INTERACTION-QUALITY",
      "FND-INTENTION-BEHAVIOR-SEPARATION",
    ],
    independentSourceRefs: [
      "SRC-FRIEND-DAILY-2015",
      "SRC-INTENTION-BEHAVIOR-2016",
    ],
    attention:
      "친구에게 자신의 필요를 말해야 할 때 관계가 어색해질 가능성과 친구가 이해하기 쉬운 배경, 실제로 바라는 행동을 함께 살피는 경향이 있다.",
    firstThought:
      "“내가 너무 많이 바라는 건 아닐까?”를 걱정하면서도 말을 하지 않으면 관계가 더 불분명해질 수 있다고 생각하기 쉽다.",
    actualResponse:
      "감정을 오래 설명하기보다 자신에게 중요했던 점과 다음에 바라는 구체적인 행동을 정리해 대화를 시작하는 편이다.",
    communication:
      "“나는 약속이 바뀔 때 미리 알려주면 마음이 놓여”처럼 비난보다 자신의 경험과 요청을 한 가지씩 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "요구·부탁·경계 설정 장면을 구분할 것",
      "말을 잘 꺼내는 것과 상대가 반드시 수용해야 하는 것을 구분할 것",
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
      "친구에게 좋은 일이 생기면 노력한 과정과 친구가 중요하게 여긴 의미, 함께 기뻐할 방법이 먼저 눈에 들어오는 경향이 있다.",
    firstThought:
      "“얼마나 기뻤을까, 이 이야기를 더 듣고 싶다”는 마음과 새로운 축하 아이디어가 함께 떠오르기 쉽다.",
    actualResponse:
      "기쁜 마음을 적극적으로 표현하고 성취의 구체적인 부분을 알아봐 주며, 친구가 원하는 방식으로 축하를 이어가는 편이다.",
    communication:
      "비교하거나 조언으로 넘어가기보다 친구가 가장 기뻤던 순간과 원하는 축하 방식을 묻는 말하기가 잘 맞는다.",
    validationFocus: [
      "친구의 성취를 자기 경험과 비교하는 행동을 별도 확인할 것",
      "표현 강도와 실제 우정 만족을 직접 연결하지 않을 것",
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
      "친구가 실패하거나 힘든 일을 겪으면 마음이 상한 지점과 문제의 원인, 자신이 실제로 도울 수 있는 부분을 함께 살피는 경향이 있다.",
    firstThought:
      "“어떻게 해결하지?”가 먼저 떠올라도, “친구는 지금 조언보다 이해받기를 원하는 게 아닐까?”라는 생각이 뒤따르기 쉽다.",
    actualResponse:
      "친구의 말을 듣고 원하는 도움을 확인한 뒤, 함께 방법을 찾거나 실제로 할 수 있는 지원을 구체적으로 제안하는 편이다.",
    communication:
      "“지금은 들어줄까, 방법을 같이 찾을까, 아니면 실제로 도울 일이 있을까?”처럼 도움의 종류를 선택하게 묻는 방식이 잘 맞는다.",
    validationFocus: [
      "지원 방식의 일치와 지원 효과를 동일시하지 않을 것",
      "친구의 거절·거리 두기 선택을 포함할 것",
    ],
  },
  {
    scenarioId: "SCN-FRIEND-12",
    context: "friend",
    moment: "aftermath",
    evidenceFindingRefs: [
      "FND-FRIEND-DAILY-INTERACTION-QUALITY",
      "FND-STRESS-REACTIVITY-RECOVERY-DISTINCTION",
    ],
    independentSourceRefs: [
      "SRC-FRIEND-DAILY-2015",
      "SRC-REACTIVITY-RECOVERY-2023",
    ],
    attention:
      "친구와의 부담스러운 일이 지나간 뒤에는 관계가 실제로 편해졌는지, 남은 오해와 지켜야 할 약속이 무엇인지 살피는 경향이 있다.",
    firstThought:
      "대화의 앞뒤를 다시 떠올리며 “무엇을 더 확인해야 하고 다음에는 어떻게 다르게 행동할까?”를 생각하기 쉽다.",
    actualResponse:
      "감정이 가라앉은 뒤 대화를 다시 열고, 필요한 사과나 설명을 전한 다음 실제 행동으로 관계를 회복하려는 편이다.",
    communication:
      "“지난 일에서 내가 놓친 게 있는지 듣고 싶어. 다음에는 이 부분을 바꾸려고 해”처럼 확인과 후속 행동을 함께 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "회복 대화 빈도보다 상대가 편한 시점과 실제 후속 행동을 볼 것",
      "관계가 안전하지 않은 상황에는 일반 회복 문구를 적용하지 않을 것",
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
      "새 업무·수업·팀을 만나면 함께 일할 사람과 탐색할 여지, 요구되는 기준과 앞으로 이어갈 순서를 먼저 살피는 경향이 있다.",
    firstThought:
      "“누구와 무엇을 맞춰야 하고, 이 과제에서 새롭게 볼 수 있는 부분은 무엇이며, 어디서부터 시작하지?”를 생각하기 쉽다.",
    actualResponse:
      "먼저 질문과 의견을 꺼내 관계를 만들고, 자료를 넓게 살핀 뒤 해야 할 일을 정리해 시작하는 편이다.",
    communication:
      "역할·목표·결정 기준을 묻고 자신이 탐색한 선택지를 공유한 다음, 누가 무엇을 이어갈지 확인하는 방식이 잘 맞는다.",
    validationFocus: [
      "신입·전환 배치·새 수업의 규칙과 재량 수준을 함께 기록할 것",
      "첫 참여 행동을 직무 적합성이나 성과로 확대하지 않을 것",
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
      "회의나 공동 과제에서는 논의가 어디에서 멈췄는지, 빠진 관점과 말하지 못한 사람이 있는지, 다음 결정이 무엇인지 살피는 경향이 있다.",
    firstThought:
      "“논의를 더 넓혀야 할까, 이제 결론과 담당을 정해야 할까?”와 “결정이 구성원에게 어떤 영향을 줄까?”를 함께 생각하기 쉽다.",
    actualResponse:
      "질문으로 논의를 열고 여러 의견을 연결한 뒤, 합의된 내용을 할 일과 일정으로 정리하는 역할을 맡는 편이다.",
    communication:
      "즉석 발언뿐 아니라 문서·채팅 의견도 끌어오고, 결론 전에는 반대 의견과 실행 조건을 확인하는 방식이 잘 맞는다.",
    validationFocus: [
      "회의 권한·발언 규범·역할을 성향과 분리할 것",
      "발언량을 리더십·협업 능력으로 환산하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-WORK-4",
    context: "work",
    moment: "plan_change",
    evidenceFindingRefs: [
      "FND-WORK-SITUATION-STRENGTH-ACTIVATION",
      "FND-STRESS-CHANGES-MOMENTARY-PERSONALITY",
    ],
    independentSourceRefs: [
      "SRC-PERSON-SITUATION-WORK-2015",
      "SRC-STRESS-STATE-2026",
    ],
    attention:
      "업무 계획이 갑자기 바뀌면 변경 이유와 관련된 사람의 부담, 새 선택지, 다시 정해야 할 우선순위와 마감이 먼저 눈에 들어오는 경향이 있다.",
    firstThought:
      "예상 밖의 변화에 걱정이 생겨도 “어떤 조건이 달라졌고 지금 가능한 최선의 순서는 무엇일까?”를 곧바로 생각하기 쉽다.",
    actualResponse:
      "변경 배경을 확인하고 대안을 비교한 뒤, 영향받는 사람과 새 일정·담당·확인 시점을 다시 정하는 편이다.",
    communication:
      "“바뀐 기준은 무엇이고, 그대로 유지해야 할 부분과 다시 정할 부분은 무엇인가요?”처럼 변화의 범위를 구체화하는 질문이 잘 맞는다.",
    validationFocus: [
      "변경 권한·설명·자원 제공 여부를 함께 기록할 것",
      "걱정 반응과 실제 적응 행동을 분리할 것",
    ],
  },
  {
    scenarioId: "SCN-WORK-5",
    context: "work",
    moment: "uncertainty",
    evidenceFindingRefs: [
      "FND-WORK-SITUATION-STRENGTH-ACTIVATION",
      "FND-DAILY-STRESS-SHIFTS-TRAIT-STATES",
    ],
    independentSourceRefs: [
      "SRC-PERSON-SITUATION-WORK-2015",
      "SRC-DAILY-STRESS-STATES-2024",
    ],
    attention:
      "업무 기준이나 결과가 분명하지 않으면 가능한 원인과 실패 지점, 결정에 필요한 정보, 다른 구성원에게 미칠 영향을 함께 살피는 경향이 있다.",
    firstThought:
      "좋지 않은 결과를 걱정하면서도 “어떤 정보를 더 모으면 선택지를 줄이고 실행을 시작할 수 있을까?”를 생각하기 쉽다.",
    actualResponse:
      "가능성을 넓게 검토한 뒤 확인할 질문과 임시 기준을 세우고, 작은 실행으로 정보를 더 얻는 편이다.",
    communication:
      "모르는 것을 감추기보다 현재 가정·필요한 정보·임시 결정·다음 확인 시점을 구분해 공유하는 방식이 잘 맞는다.",
    validationFocus: [
      "정보 부족과 권한 부족을 개인 성향 문제로 바꾸지 않을 것",
      "탐색 시간·걱정 강도·실행 시작 시점을 별도 측정할 것",
    ],
  },
  {
    scenarioId: "SCN-WORK-6",
    context: "work",
    moment: "disagreement",
    evidenceFindingRefs: [
      "FND-WORK-TRAIT-ACTIVATION-CONTEXT",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: [
      "SRC-TRAIT-ACTIVATION-2003",
      "SRC-EMOTION-PROCESS-1998",
    ],
    attention:
      "업무 의견이 부딪히면 판단 근거와 결과에 미칠 영향, 상대가 중요하게 보는 기준, 관계와 역할에 생길 부담을 함께 살피는 경향이 있다.",
    firstThought:
      "“근거를 따져 해결책을 찾고 싶다”면서도, “강하게 말하면 협업이 어려워지지 않을까?”를 걱정하기 쉽다.",
    actualResponse:
      "상대의 근거를 먼저 확인하고 자신의 기준과 우려를 분명히 제시한 뒤, 검증할 방법이나 다음 결정을 제안하는 편이다.",
    communication:
      "사람에 대한 평가 대신 “이 선택은 일정에 이런 영향을 줘서 다른 방법도 비교하고 싶습니다”처럼 기준·영향·대안을 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "상사·동료·후배와의 권력 차이를 구분할 것",
      "존중 표현과 의견 양보를 같은 것으로 보지 않을 것",
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
      "업무에서 필요한 자원·시간·도움을 말해야 할 때 요청이 다른 사람에게 줄 부담과 요청하지 않았을 때 결과에 생길 위험을 함께 살피는 경향이 있다.",
    firstThought:
      "“혼자 더 해볼까?”를 고민하면서도 필요한 조건을 말하지 않으면 약속한 결과를 지키기 어렵다고 판단하기 쉽다.",
    actualResponse:
      "현재까지 한 일과 막힌 지점, 필요한 지원, 지원을 받았을 때 가능한 다음 행동을 정리해 요청하는 편이다.",
    communication:
      "“현재 여기까지 진행했고 이 자료가 없으면 일정이 늦어집니다. 오늘까지 확인이 필요합니다”처럼 사실·영향·요청 시점을 분명히 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "도움 요청 권한과 조직의 심리적 안전을 함께 기록할 것",
      "요청하지 못한 행동을 책임감·능력 부족으로 해석하지 않을 것",
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
    independentSourceRefs: [
      "SRC-JOB-META-1991",
      "SRC-EMOTION-PROCESS-1998",
    ],
    attention:
      "좋은 업무 결과가 생기면 기여한 사람과 잘 작동한 과정, 다음에 확장할 가능성, 반복할 실행 방식을 먼저 살피는 경향이 있다.",
    firstThought:
      "“누구의 어떤 기여가 결과를 만들었고, 여기서 무엇을 더 발전시킬 수 있을까?”를 생각하기 쉽다.",
    actualResponse:
      "성과를 함께 축하하고 기여를 구체적으로 알리며, 잘된 과정을 정리해 다음 계획으로 이어가는 편이다.",
    communication:
      "결과만 과장하기보다 기여·배운 점·다음 실험을 나눠 공유하고, 팀원의 역할을 당사자가 납득할 수 있게 인정하는 방식이 잘 맞는다.",
    validationFocus: [
      "성향 설명을 업무 성과의 원인으로 제시하지 않을 것",
      "팀 성과와 개인 기여를 구분할 것",
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
      "실수하거나 기대한 성과가 나오지 않으면 사람들에게 미친 영향과 실패 원인, 놓친 가능성, 다시 세워야 할 실행 순서가 함께 눈에 들어오는 경향이 있다.",
    firstThought:
      "걱정과 자책이 빠르게 생겨도 “무엇이 실제 원인이며 지금 바로 고칠 수 있는 부분은 무엇일까?”를 생각하기 쉽다.",
    actualResponse:
      "영향받은 사람에게 상황을 알리고 확인된 사실과 원인을 정리한 뒤, 복구 행동과 다음 점검 시점을 제안하는 편이다.",
    communication:
      "변명이나 자기평가보다 “무엇이 발생했고 어떤 영향이 있으며 지금 무엇을 수정하고 있는지”를 순서대로 공유하는 방식이 잘 맞는다.",
    validationFocus: [
      "개인 실수와 시스템·자원·역할 문제를 구분할 것",
      "스트레스 순간의 자기평가를 대표 성향이나 능력으로 기록하지 않을 것",
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
      "부담스러운 업무가 지나간 뒤에는 사람들 사이에 남은 영향과 다시 생길 수 있는 문제, 회복에 필요한 시간, 다음에 바꿀 절차를 살피는 경향이 있다.",
    firstThought:
      "일을 다시 검토하며 “어디서부터 달라졌고 다음에는 무엇을 미리 준비하면 좋을까?”를 생각하기 쉽다.",
    actualResponse:
      "잠시 감정을 정리한 뒤 회고를 열고 잘된 점·막힌 점·바꿀 한 가지를 정리해 다음 실행에 반영하는 편이다.",
    communication:
      "개인의 탓을 찾기보다 사실과 과정, 필요한 지원, 다음 점검 시점을 구분해 말하는 회고 방식이 잘 맞는다.",
    validationFocus: [
      "회고 선호와 실제 회복 속도를 분리할 것",
      "성과 평가·채용·배치 판단에 코드 설명을 사용하지 않을 것",
    ],
  },
] as const satisfies readonly SceneDraft[];

const channelConfig = [
  ["attention", "attention", "attention"],
  ["process", "first_thought", "firstThought"],
  ["response", "actual_response", "actualResponse"],
  ["communication", "communication", "communication"],
] as const;

export const enakqP1ScenarioCandidatesV2 = sceneDrafts.flatMap((scene) =>
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
      riskDomains,
      publicationState: "research_only",
      reviews,
    } satisfies TraitMapClaimV2;
  }),
);

export const enakqP1ScenarioValidationQueueV2 = sceneDrafts.map((scene) => ({
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
