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
      "FND-INTENTION-BEHAVIOR-SEPARATION",
    ],
    independentSourceRefs: [
      "SRC-OPENNESS-INTELLECT-2009",
      "SRC-INTENTION-BEHAVIOR-2016",
    ],
    attention:
      "평범한 선택에서도 새롭게 해볼 만한 가능성과 그 선택이 함께하는 사람에게 어떤 경험이 될지, 이후 계획을 이어갈 수 있는지를 함께 살피는 경향이 있다.",
    firstThought:
      "“이 선택으로 무엇을 새롭게 경험할 수 있고, 누구와 어떻게 이어갈 수 있을까?”를 떠올린 뒤 실현할 순서를 생각하기 쉽다.",
    actualResponse:
      "여러 선택지를 사람들과 이야기해 넓힌 뒤 중요한 기준을 정하고, 결정하면 예약이나 준비처럼 다음 행동을 차례로 이어가는 편이다.",
    communication:
      "“이런 가능성들이 있는데 우리에게 가장 기대되는 건 무엇일까? 정하면 내가 다음 준비를 할게”처럼 탐색과 실행을 연결해 말하는 방식이 자연스럽다.",
    validationFocus: [
      "선택지를 넓히는 행동과 결정을 실제로 끝내는 행동을 각각 기록할 것",
      "타인의 선호를 고려하는 것과 자신의 선호를 포기하는 것을 구분할 것",
    ],
  },
  {
    scenarioId: "SCN-GENERAL-4",
    context: "general",
    moment: "plan_change",
    evidenceFindingRefs: [
      "FND-STRESS-CHANGES-MOMENTARY-PERSONALITY",
      "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
    ],
    independentSourceRefs: [
      "SRC-STRESS-STATE-2026",
      "SRC-SITUATION-CONTINGENCY-2007",
    ],
    attention:
      "계획이 갑자기 바뀌면 누가 영향을 받는지와 잘못될 가능성, 기존 목표를 살리면서 선택할 수 있는 다른 방법이 무엇인지 빠르게 살피는 경향이 있다.",
    firstThought:
      "“이 변화로 누가 곤란해질까?”, “원래 하려던 일을 지키면서 다른 길을 만들 수 있을까?”라는 생각이 함께 떠오르기 쉽다.",
    actualResponse:
      "처음에는 걱정과 불편함이 올라와도 사람들에게 변경 내용을 알리고, 가능한 대안을 모아 새 순서와 약속을 다시 정하는 편이다.",
    communication:
      "“갑자기 바뀌어 걱정되는 부분은 이거야. 가능한 방법을 같이 보고 오늘 다시 일정을 정하자”처럼 영향·대안·다음 행동을 나눠 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "초기 감정 활성화와 실제 적응 행동을 분리할 것",
      "변경 주체·손실·사전 안내 여부가 반응을 바꾸는지 확인할 것",
    ],
  },
  {
    scenarioId: "SCN-GENERAL-5",
    context: "general",
    moment: "uncertainty",
    evidenceFindingRefs: [
      "FND-OPENNESS-INTELLECT-DISTINCTION",
      "FND-STRESS-CHANGES-MOMENTARY-PERSONALITY",
    ],
    independentSourceRefs: [
      "SRC-OPENNESS-INTELLECT-2009",
      "SRC-STRESS-STATE-2026",
    ],
    attention:
      "앞일이 분명하지 않으면 가능한 설명과 선택지를 넓게 떠올리고, 그중 사람과 관계에 부담을 줄 결과와 놓치면 안 될 준비를 살피는 경향이 있다.",
    firstThought:
      "“앞으로 어떤 일이 생길 수 있고, 좋지 않은 경우에 누구에게 어떤 영향이 갈까?”를 생각하며 대비할 부분을 찾기 쉽다.",
    actualResponse:
      "사람들과 정보를 나누어 가능성을 확인하고, 걱정되는 항목을 준비 목록으로 바꾸어 하나씩 점검하는 편이다.",
    communication:
      "“가능한 경우는 이 정도로 보여. 가장 걱정되는 부분부터 확인하고 준비 순서를 정하자”처럼 가능성·우려·계획을 연결해 말하는 방식이 자연스럽다.",
    validationFocus: [
      "가능성 탐색과 좋지 않은 결과에 대한 걱정을 별도로 측정할 것",
      "걱정의 크기를 능력이나 회복력 평가로 확대하지 않을 것",
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
      "누군가 힘든 일을 이야기하면 그 사람이 가장 힘들어하는 지점과 관계에 남을 영향, 앞으로 선택할 수 있는 여러 도움 방법을 먼저 살피는 경향이 있다.",
    firstThought:
      "“이 사람은 지금 어떤 마음이고, 내가 어떻게 반응해야 혼자라고 느끼지 않을까?”를 떠올린 뒤 필요한 도움을 생각하기 쉽다.",
    actualResponse:
      "상대의 경험과 감정을 먼저 듣고, 원하는 지원을 확인한 뒤 함께할 수 있는 행동과 다음 확인 시점을 정하는 편이다.",
    communication:
      "“그 일이 많이 힘들었겠다. 지금은 더 이야기하고 싶은지, 같이 방법을 찾아보고 싶은지 알려줘”처럼 경험 확인과 선택권을 함께 전하는 방식이 잘 맞는다.",
    validationFocus: [
      "상대 감정을 추측한 내용과 실제로 확인한 내용을 구분할 것",
      "지원 행동을 관계 만족이나 문제 해결의 보장으로 쓰지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-GENERAL-8",
    context: "general",
    moment: "need_expression",
    evidenceFindingRefs: [
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
      "FND-INTENTION-BEHAVIOR-SEPARATION",
    ],
    independentSourceRefs: [
      "SRC-EMOTION-PROCESS-1998",
      "SRC-INTENTION-BEHAVIOR-2016",
    ],
    attention:
      "자신의 필요를 말해야 할 때 상대가 어떻게 받아들일지와 관계가 달라질 가능성, 원하는 답을 얻기 위해 어떤 순서로 말할지를 먼저 살피는 경향이 있다.",
    firstThought:
      "“내 마음을 솔직히 말하면서도 상대가 부담받지 않게 하려면 어떻게 표현하지?”라는 생각과 거절될 가능성에 대한 걱정이 함께 들기 쉽다.",
    actualResponse:
      "말할 내용을 정리한 뒤 먼저 대화를 열고, 자신의 감정과 바라는 행동을 설명하며 상대의 생각도 듣는 편이다.",
    communication:
      "“나는 이럴 때 조금 서운했고, 다음에는 이렇게 해주면 좋겠어. 너는 어떻게 느꼈는지도 듣고 싶어”처럼 감정·요청·질문을 나누어 말하는 방식이 자연스럽다.",
    validationFocus: [
      "상대 반응에 대한 걱정과 실제 필요 표현 여부를 분리할 것",
      "배려 표현이 자신의 요구를 흐리는 조건을 확인할 것",
    ],
  },
  {
    scenarioId: "SCN-GENERAL-9",
    context: "general",
    moment: "boundary",
    evidenceFindingRefs: [
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: ["SRC-IPC-2013", "SRC-EMOTION-PROCESS-1998"],
    attention:
      "선을 정해야 할 때 자신이 불편한 지점과 함께 상대가 상처받거나 관계가 멀어질 가능성, 이후에도 지켜야 할 기준을 살피는 경향이 있다.",
    firstThought:
      "“거절하면 상대가 어떻게 느낄까?”라는 걱정이 먼저 올라와도 “계속 지킬 수 있는 기준을 분명히 말해야 한다”는 생각이 뒤따르기 쉽다.",
    actualResponse:
      "말을 고르는 시간이 필요하지만, 기준이 정리되면 상대를 존중하는 표현으로 거절하고 이후에도 같은 선을 유지하려는 편이다.",
    communication:
      "“도와주고 싶은 마음은 있지만 이번에는 어렵습니다. 다음 주라면 이 범위까지 가능해요”처럼 관계 존중과 경계를 함께 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "거절 전 걱정과 실제로 경계를 지킨 행동을 별도로 기록할 것",
      "위험하거나 강압적인 관계는 일반 의사소통 설명과 분리할 것",
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
      "실수하거나 기대한 결과가 나오지 않으면 사람들에게 미친 영향과 좋지 않은 다음 결과, 다시 세워야 할 계획을 빠르게 살피는 경향이 있다.",
    firstThought:
      "“누가 실망했을까?”, “이 일이 더 나빠지면 어떡하지?”라는 걱정이 올라오면서도 무엇부터 바로잡을지 생각하기 쉽다.",
    actualResponse:
      "마음이 흔들려도 영향받은 사람에게 상황을 알리고, 가능한 해결책을 모아 수정 순서와 다음 점검 시점을 정하는 편이다.",
    communication:
      "“이 일로 불편을 줘서 미안해. 지금 이 부분을 수정하고 있고 다음 확인은 이때 공유할게”처럼 영향·책임·행동을 연결해 말하는 방식이 자연스럽다.",
    validationFocus: [
      "걱정의 크기와 실제 문제 해결 행동을 별도로 측정할 것",
      "실수를 전체 능력이나 가치 평가로 확대하는 표현을 막을 것",
    ],
  },
  {
    scenarioId: "SCN-GENERAL-12",
    context: "general",
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
      "부담스러운 일이 지나간 뒤에는 사람들에게 남은 영향과 다시 생길 가능성, 관계를 회복하고 계획을 되돌릴 방법을 살피는 경향이 있다.",
    firstThought:
      "“아직 불편한 사람이 있을까?”, “다음에는 무엇을 미리 준비하면 같은 걱정을 줄일 수 있을까?”를 되짚기 쉽다.",
    actualResponse:
      "사람과 대화하며 일을 정리하고, 필요한 사과나 확인을 한 뒤 다음 계획을 세워 일상 흐름으로 돌아가려는 편이다.",
    communication:
      "“그 일이 지나간 뒤에도 마음에 남은 부분이 있는지 궁금해. 다음에는 이 시점에 먼저 확인하자”처럼 관계 확인과 예방 행동을 함께 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "초기 반응의 크기와 실제 회복 시간·방식을 분리할 것",
      "관계 확인이 반복적인 안심 요구로 바뀌는 조건을 확인할 것",
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
      "가족의 평범한 선택에서는 각자가 원하는 것과 가족 전체에 생길 경험, 선택 뒤 이어질 일정과 준비를 함께 살피는 경향이 있다.",
    firstThought:
      "“누구도 소외되지 않으면서 모두가 기대할 수 있는 선택은 무엇일까?”를 떠올리고 실행 순서를 생각하기 쉽다.",
    actualResponse:
      "가족의 의견을 먼저 물어 공통점을 찾고, 결정하면 연락·예약·준비처럼 다음 행동을 맡아 이어가는 편이다.",
    communication:
      "“각자 원하는 걸 말해보자. 공통되는 걸 정하면 내가 준비 순서를 맞출게”처럼 참여와 실행을 함께 여는 방식이 자연스럽다.",
    validationFocus: [
      "가족 의견을 묻는 행동과 실제로 선택에 반영한 행동을 함께 볼 것",
      "돌봄 역할과 자발적 관계 관심을 구분할 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-6",
    context: "family",
    moment: "disagreement",
    evidenceFindingRefs: [
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: ["SRC-IPC-2013", "SRC-EMOTION-PROCESS-1998"],
    attention:
      "가족과 의견이 부딪히면 누가 상처받았는지와 관계에 남을 영향, 모두가 받아들일 수 있는 다른 방법을 먼저 살피는 경향이 있다.",
    firstThought:
      "“내 말이 가족에게 어떻게 들렸을까?”, “서로의 뜻을 살리면서 풀 수 있는 길이 있을까?”를 생각하기 쉽다.",
    actualResponse:
      "감정이 올라와도 가족의 입장을 듣고 자신의 뜻을 설명한 뒤, 함께 지킬 수 있는 새 기준과 다음 행동을 정하는 편이다.",
    communication:
      "“네가 불편했던 지점을 먼저 듣고 싶어. 내 생각도 설명한 뒤 다음에는 어떻게 할지 같이 정하자”처럼 이해와 해결 순서를 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "가족의 감정을 배려하는 행동과 갈등을 피하는 행동을 구분할 것",
      "권한·의존·가족 문화가 표현에 미치는 영향을 확인할 것",
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
      "가족이 힘든 일을 말하면 가장 힘든 마음과 가족 생활에 생길 영향, 함께 마련할 수 있는 도움 방법을 먼저 살피는 경향이 있다.",
    firstThought:
      "“지금 이 사람이 혼자라고 느끼지 않으려면 무엇을 해야 하고, 우리 가족이 함께할 수 있는 일은 무엇일까?”를 생각하기 쉽다.",
    actualResponse:
      "가족의 이야기를 듣고 원하는 도움을 확인한 뒤, 역할을 나누어 실제 지원과 다음 확인을 꾸준히 이어가는 편이다.",
    communication:
      "“지금 가장 힘든 부분이 무엇인지 말해줘. 우리가 같이 할 수 있는 일을 하나씩 정해보자”처럼 경험 확인과 실행을 연결해 말하는 방식이 자연스럽다.",
    validationFocus: [
      "가족을 돕는 행동과 당사자 선택을 대신하는 행동을 구분할 것",
      "가족 의무로 한 행동을 성향 고유 효과와 분리할 것",
    ],
  },
  {
    scenarioId: "SCN-FAMILY-8",
    context: "family",
    moment: "need_expression",
    evidenceFindingRefs: [
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
      "FND-INTENTION-BEHAVIOR-SEPARATION",
    ],
    independentSourceRefs: [
      "SRC-EMOTION-PROCESS-1998",
      "SRC-INTENTION-BEHAVIOR-2016",
    ],
    attention:
      "가족에게 자신의 필요를 말할 때 가족이 어떻게 느낄지와 생활 관계가 달라질 가능성, 이후에도 지킬 수 있는 요청을 살피는 경향이 있다.",
    firstThought:
      "“내가 원하는 것을 말하면 서운해하지 않을까?”라는 걱정이 생겨도 오래 참지 않으려면 무엇을 말해야 하는지 생각하기 쉽다.",
    actualResponse:
      "대화를 먼저 열고 자신의 감정과 필요한 행동을 설명한 뒤, 가족이 가능한 범위를 들으며 함께 기준을 정하는 편이다.",
    communication:
      "“요즘 혼자 쉴 시간이 부족해 힘들었어. 저녁 한 시간은 방해받지 않고 쉬고 싶어”처럼 감정·이유·요청을 구체적으로 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "가족 배려 때문에 표현을 미루는 시간과 실제 표현 여부를 기록할 것",
      "안전하게 말하기 어려운 가족 관계는 별도 지원 흐름으로 다룰 것",
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
      "친구와 평범한 시간을 보낼 때 함께 새롭게 즐길 거리와 각자의 관심, 다음 만남으로 이어질 경험을 먼저 살피는 경향이 있다.",
    firstThought:
      "“우리가 같이 해보면 재미있을 새로운 일은 무엇이고, 모두가 편하게 참여하려면 어떻게 할까?”를 생각하기 쉽다.",
    actualResponse:
      "친구들에게 여러 선택지를 먼저 제안하고 의견을 모은 뒤, 정한 활동의 예약이나 준비를 이어가는 편이다.",
    communication:
      "“이런 것들을 해보고 싶은데 너희는 뭐가 가장 좋아? 정하면 내가 다음 준비를 할게”처럼 제안·참여·실행을 연결하는 방식이 자연스럽다.",
    validationFocus: [
      "친구 반응을 살피는 행동과 자신의 선호를 숨기는 행동을 구분할 것",
      "친구 관계의 친밀도와 모임 규모를 함께 기록할 것",
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
      "새로운 사람과 친구가 될 때 공통점과 아직 알지 못한 이야기, 상대가 편하게 대화에 들어오는지를 먼저 살피는 경향이 있다.",
    firstThought:
      "“어떤 이야기를 꺼내면 서로를 더 알아갈 수 있고, 다음에 무엇을 함께 해볼 수 있을까?”를 떠올리기 쉽다.",
    actualResponse:
      "먼저 가벼운 질문을 건네 공통 관심사를 찾고, 대화가 잘 이어지면 구체적인 다음 만남이나 활동을 제안하는 편이다.",
    communication:
      "“그 이야기가 재미있었어. 다음에 관련된 곳에 같이 가보지 않을래?”처럼 대화에서 발견한 연결점을 다음 행동으로 이어가는 방식이 잘 맞는다.",
    validationFocus: [
      "초기 공통점 인식과 실제 우정 만족을 동일시하지 않을 것",
      "먼저 다가가는 행동을 관계 능력이나 인기의 근거로 쓰지 않을 것",
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
      "친구와 의견이 다르면 친구가 어떤 마음인지와 우정에 남을 영향, 두 관점을 함께 살릴 수 있는 새로운 해석을 먼저 살피는 경향이 있다.",
    firstThought:
      "“내 말이 친구에게 어떻게 들렸고, 서로 다른 경험을 연결하면 어떤 새로운 관점을 볼 수 있을까?”를 생각하기 쉽다.",
    actualResponse:
      "친구의 이유를 듣고 자신의 생각을 설명하며, 꼭 같은 결론에 이르지 않아도 다음 관계가 편하도록 대화를 마무리하는 편이다.",
    communication:
      "“네가 그렇게 본 이유를 듣고 싶어. 나는 이렇게 생각했지만 다른 점을 알고도 편하게 이야기하고 싶어”처럼 차이와 관계를 함께 다루는 방식이 자연스럽다.",
    validationFocus: [
      "친구 마음을 고려하는 것과 의견을 양보하는 것을 구분할 것",
      "갈등 후 실제 상호작용의 변화를 별도로 기록할 것",
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
      "친구가 힘든 일을 말하면 가장 힘들었던 마음과 앞으로 걱정하는 일, 함께할 수 있는 지원 방법을 먼저 살피는 경향이 있다.",
    firstThought:
      "“친구가 지금 어떤 마음이고, 내가 어떻게 있어야 혼자가 아니라고 느낄까?”를 떠올린 뒤 도울 방법을 생각하기 쉽다.",
    actualResponse:
      "친구의 이야기를 충분히 듣고 원하는 지원을 물은 뒤, 연락·동행·다음 확인처럼 관계 안에서 지속할 행동을 정하는 편이다.",
    communication:
      "“그 일이 정말 힘들었겠다. 오늘은 더 말하고 싶은지, 내가 같이 해줄 일이 있는지 알려줘”처럼 감정 확인과 도움 선택을 함께 전하는 방식이 잘 맞는다.",
    validationFocus: [
      "친구 감정에 대한 추측과 실제 확인을 구분할 것",
      "지원 행동을 관계 만족의 원인으로 단정하지 않을 것",
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
      "친구가 자신의 선을 넘으면 친구가 상처받을 가능성과 우정을 지키면서 바꿔야 할 행동, 이후에도 유지할 기준을 살피는 경향이 있다.",
    firstThought:
      "“이 말을 하면 친구가 멀어지지 않을까?”라는 걱정과 “계속 편하게 지내려면 지금 알려야 한다”는 생각이 함께 들기 쉽다.",
    actualResponse:
      "표현을 고른 뒤 먼저 대화를 열어 불편했던 행동과 원하는 변화를 말하고, 친구의 반응을 들으며 경계를 유지하는 편이다.",
    communication:
      "“우리 사이가 중요해서 말하고 싶어. 그 농담은 불편했고 앞으로는 하지 않았으면 해”처럼 관계의 뜻과 경계를 함께 전하는 방식이 자연스럽다.",
    validationFocus: [
      "관계를 지키려는 표현과 실제 경계 유지 행동을 함께 볼 것",
      "반복된 침범과 한 번의 실수를 구분할 것",
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
      "연인과 평범한 선택을 할 때 둘이 함께 기대할 수 있는 가능성과 각자의 마음, 선택 뒤 이어질 경험을 먼저 살피는 경향이 있다.",
    firstThought:
      "“우리 둘에게 새롭고 즐거운 선택은 무엇이고, 상대는 무엇을 가장 원할까?”를 생각한 뒤 계획을 이어가기 쉽다.",
    actualResponse:
      "여러 선택지를 먼저 이야기하고 연인의 반응을 들은 뒤, 둘이 고른 선택을 실제 일정과 준비로 연결하는 편이다.",
    communication:
      "“나는 이런 걸 해보고 싶은데 너는 어떤 게 기대돼? 같이 정하면 내가 예약을 알아볼게”처럼 자신의 뜻과 상대 선택을 함께 여는 방식이 잘 맞는다.",
    validationFocus: [
      "연인 선호를 묻는 행동과 실제 반영 여부를 함께 확인할 것",
      "새로운 경험 선호를 관계 만족과 동일시하지 않을 것",
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
      "연인의 태도나 관계의 다음 단계가 분명하지 않으면 상대 마음에 생긴 변화와 좋지 않은 가능성, 관계를 이어가기 위해 확인할 대화를 먼저 살피는 경향이 있다.",
    firstThought:
      "“상대가 힘든 건지 마음이 달라진 건지, 내가 놓친 신호가 있는지” 여러 가능성을 떠올리며 걱정하기 쉽다.",
    actualResponse:
      "혼자 추측만 이어가기보다 적절한 때에 대화를 먼저 열고, 관찰한 변화와 자신의 마음을 말한 뒤 함께 다음 방향을 정하려는 편이다.",
    communication:
      "“최근 우리가 대화하는 시간이 줄어 걱정됐어. 너는 요즘 우리 관계를 어떻게 느끼는지 듣고 싶어”처럼 관찰·감정·질문을 나눠 말하는 방식이 자연스럽다.",
    validationFocus: [
      "가능성 탐색과 부정적 결과에 대한 걱정을 별도로 측정할 것",
      "상대 마음을 추측한 내용과 실제로 확인한 내용을 구분할 것",
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
      "연인과 의견이 부딪히면 연인이 가장 불편했던 마음과 관계에 남을 영향, 둘의 뜻을 함께 살릴 해결 방법을 먼저 살피는 경향이 있다.",
    firstThought:
      "“내 말이 어떻게 들렸고, 이 갈등이 관계를 더 나쁘게 만들지 않을까?”를 걱정하면서도 함께 풀 방법을 찾기 쉽다.",
    actualResponse:
      "감정이 올라와도 연인의 경험을 듣고 자신의 마음을 설명한 뒤, 다시 지킬 약속과 다음 대화 시점을 정하는 편이다.",
    communication:
      "“네가 불편했던 이유를 먼저 듣고 싶어. 내 마음도 설명한 뒤 우리가 바꿀 행동을 같이 정하자”처럼 관계 확인과 해결을 연결하는 방식이 잘 맞는다.",
    validationFocus: [
      "상대 마음 주의와 갈등 회피를 구분할 것",
      "안전하지 않은 관계는 일반 갈등 해결 흐름에서 제외할 것",
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
      "연인이 힘든 일을 말하면 가장 상한 마음과 혼자 감당한 부분, 앞으로 관계 안에서 함께할 수 있는 지원을 먼저 살피는 경향이 있다.",
    firstThought:
      "“얼마나 힘들었을까, 내가 어떤 방식으로 곁에 있어야 도움이 될까?”를 떠올리고 여러 지원 방법을 생각하기 쉽다.",
    actualResponse:
      "연인의 경험을 충분히 듣고 원하는 도움을 물은 뒤, 함께할 행동과 다음에 다시 확인할 약속을 정하는 편이다.",
    communication:
      "“많이 힘들었겠다. 지금은 내가 들어주는 게 좋은지, 같이 방법을 찾는 게 좋은지 말해줘”처럼 마음 확인과 지원 선택을 함께 전하는 방식이 자연스럽다.",
    validationFocus: [
      "지원 의도와 연인이 실제로 원한 지원 방식의 일치를 확인할 것",
      "상대 문제를 대신 책임지는 행동과 구분할 것",
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
      "연인에게 자신의 필요를 말할 때 상대 마음과 관계에 생길 변화, 서로 받아들일 수 있는 새 약속을 먼저 살피는 경향이 있다.",
    firstThought:
      "“내가 원하는 걸 말하면 부담스러워할까?”라는 걱정과 “관계를 위해 솔직히 말해야 한다”는 생각이 함께 들기 쉽다.",
    actualResponse:
      "대화를 먼저 요청해 자신의 감정과 필요를 설명하고, 연인의 입장도 들은 뒤 둘이 지킬 수 있는 행동을 정하는 편이다.",
    communication:
      "“요즘 함께 보내는 시간이 줄어 서운했어. 이번 주에는 둘만의 시간을 정하고 싶은데 너는 어때?”처럼 감정·요청·질문을 연결하는 방식이 잘 맞는다.",
    validationFocus: [
      "필요 표현 전 걱정과 실제 대화 행동을 구분할 것",
      "관계를 위한 양보와 자신의 필요를 계속 포기하는 행동을 분리할 것",
    ],
  },
  {
    scenarioId: "SCN-PARTNER-9",
    context: "partner",
    moment: "boundary",
    evidenceFindingRefs: [
      "FND-PARTNER-RESPONSIVENESS-LONGITUDINAL",
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
    ],
    independentSourceRefs: ["SRC-RESPONSIVENESS-2017", "SRC-IPC-2013"],
    attention:
      "연인이 자신의 선을 넘으면 관계를 잃을 걱정과 상대가 받을 상처, 둘이 안전하게 지내기 위해 꼭 바꿔야 할 행동을 살피는 경향이 있다.",
    firstThought:
      "“이 말을 하면 관계가 흔들리지 않을까?”라는 걱정이 생겨도 “존중받는 관계를 위해 기준을 알려야 한다”는 생각이 뒤따르기 쉽다.",
    actualResponse:
      "말을 고른 뒤 대화를 먼저 열어 불편했던 행동과 원하는 경계를 설명하고, 연인의 반응을 들으며 이후 기준을 지키는 편이다.",
    communication:
      "“우리 관계가 중요하지만 내 휴대전화를 허락 없이 보는 건 원하지 않아. 궁금한 점은 직접 물어봐 줘”처럼 관계와 경계를 함께 말하는 방식이 자연스럽다.",
    validationFocus: [
      "경계 표현과 관계 유지 욕구를 각각 기록할 것",
      "통제·폭력·위협은 일반 관계 조언과 분리할 것",
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
      "마음에 드는 사람과 평범한 선택을 할 때 함께 만들 수 있는 새로운 경험과 상대의 기대, 다음 관계로 이어질 가능성을 먼저 살피는 경향이 있다.",
    firstThought:
      "“어떤 선택을 하면 서로 더 알아갈 수 있고, 상대도 편하고 즐거울까?”를 생각하며 여러 방법을 떠올리기 쉽다.",
    actualResponse:
      "상대가 좋아할 만한 선택지를 먼저 제안하고 반응을 들은 뒤, 구체적인 시간과 준비를 정해 만남으로 이어가는 편이다.",
    communication:
      "“이런 걸 같이 해보고 싶은데 너는 어떤 게 좋아? 괜찮다면 이번 주에 날짜를 정하자”처럼 관심과 선택권, 다음 행동을 함께 전하는 방식이 잘 맞는다.",
    validationFocus: [
      "상대가 실제로 말한 선호와 호감 때문에 추측한 선호를 구분할 것",
      "적극적인 제안을 관계 성공 가능성으로 확대하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-PERSON-OF-INTEREST-5",
    context: "person_of_interest",
    moment: "uncertainty",
    evidenceFindingRefs: [
      "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
      "FND-STRESS-CHANGES-MOMENTARY-PERSONALITY",
    ],
    independentSourceRefs: [
      "SRC-RELATIONAL-UNCERTAINTY-2011",
      "SRC-STRESS-STATE-2026",
    ],
    attention:
      "마음에 드는 사람의 뜻이 분명하지 않으면 상대가 느낄 여러 마음과 관계가 이어질 가능성, 거절되거나 멀어질 가능성을 함께 살피는 경향이 있다.",
    firstThought:
      "“상대도 나를 궁금해할까, 아니면 부담스러울까?”라는 여러 해석이 떠오르며 좋지 않은 결과를 걱정하기 쉽다.",
    actualResponse:
      "대화를 계속 열어 상대 반응을 확인하고, 관계가 충분히 쌓이면 자신의 관심을 말한 뒤 상대의 뜻을 직접 묻는 편이다.",
    communication:
      "“나는 너를 더 알아가고 싶은데 너는 어떻게 느끼는지 궁금해”처럼 자신의 마음과 질문을 분리해 말하는 방식이 자연스럽다.",
    validationFocus: [
      "가능성 탐색과 부정적 결과 걱정을 별도로 측정할 것",
      "상대 행동을 호감의 확정 신호로 해석하지 않을 것",
    ],
  },
  {
    scenarioId: "SCN-PERSON-OF-INTEREST-8",
    context: "person_of_interest",
    moment: "need_expression",
    evidenceFindingRefs: [
      "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    independentSourceRefs: [
      "SRC-RELATIONAL-UNCERTAINTY-2011",
      "SRC-EMOTION-PROCESS-1998",
    ],
    attention:
      "마음에 드는 사람에게 자신의 필요를 말할 때 상대 마음과 관계가 달라질 가능성, 거절될 걱정, 다음 관계를 이어갈 표현을 먼저 살피는 경향이 있다.",
    firstThought:
      "“내가 더 만나고 싶다고 말하면 부담스러워하지 않을까?”를 걱정하면서도 서로의 뜻을 확인하고 싶어 하기 쉽다.",
    actualResponse:
      "적절한 때에 먼저 대화를 열어 자신의 바람을 말하고, 상대가 편하게 선택할 수 있도록 질문과 시간을 주는 편이다.",
    communication:
      "“나는 다음 주에도 만나고 싶어. 너도 같은 마음인지 편하게 알려줘”처럼 자신의 뜻과 상대 선택을 분명히 나누는 방식이 잘 맞는다.",
    validationFocus: [
      "거절 걱정과 실제 표현 행동을 구분할 것",
      "상대의 애매한 반응을 동의로 바꾸지 않는지 확인할 것",
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
      "마음에 드는 사람이라도 자신의 선을 넘으면 상대가 상처받을 가능성과 관계가 끊길 걱정, 꼭 지켜야 할 행동 기준을 함께 살피는 경향이 있다.",
    firstThought:
      "“좋아하는 마음을 잃지 않으면서 불편한 행동은 어떻게 분명히 거절하지?”를 생각하기 쉽다.",
    actualResponse:
      "표현을 고른 뒤 먼저 대화를 열어 불편했던 행동과 원하는 거리를 말하고, 이후 상대가 기준을 존중하는지 살피는 편이다.",
    communication:
      "“너와 계속 알아가고 싶지만 늦은 밤 반복 연락은 부담스러워. 다음 날 이야기했으면 좋겠어”처럼 관심과 경계를 함께 전하는 방식이 자연스럽다.",
    validationFocus: [
      "호감 때문에 경계 표현을 미루는 조건을 확인할 것",
      "안전 위험이 있는 상황은 관계 지속 안내와 분리할 것",
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
      "평범한 업무 선택에서는 더 나은 가능성과 구성원에게 미칠 영향, 목표를 끝까지 이어갈 순서와 잘못될 위험을 함께 살피는 경향이 있다.",
    firstThought:
      "“다른 방법으로 더 좋은 결과를 만들 수 있을까?”, “팀이 받아들일 수 있게 어떻게 실행하지?”를 생각하기 쉽다.",
    actualResponse:
      "사람들과 선택지를 논의한 뒤 기준을 정하고, 역할과 마감, 다음 점검 시점을 분명히 해 계획을 이어가는 편이다.",
    communication:
      "“가능한 방법은 이 세 가지입니다. 영향과 위험을 비교해 오늘 결정하고 담당과 일정을 정하겠습니다”처럼 탐색과 실행을 연결해 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "아이디어 제안과 실제 마무리 행동을 각각 기록할 것",
      "대표 코드로 업무 능력이나 성과를 예측하지 않을 것",
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
      "동료가 도움을 요청하면 동료가 가장 부담스러워하는 지점과 팀에 미칠 영향, 함께 시도할 수 있는 여러 해결 방법을 먼저 살피는 경향이 있다.",
    firstThought:
      "“이 사람이 혼자 감당하지 않게 하려면 내가 무엇을 맡고, 어떤 다른 방법도 열어둘 수 있을까?”를 생각하기 쉽다.",
    actualResponse:
      "동료의 상황과 원하는 도움을 듣고, 가능한 해결책을 함께 정리한 뒤 역할과 점검 시점을 정해 지원을 이어가는 편이다.",
    communication:
      "“어느 부분이 가장 막혔는지 알려주세요. 제가 맡을 일과 같이 확인할 방법을 정해보겠습니다”처럼 경험 확인과 실행을 연결하는 방식이 자연스럽다.",
    validationFocus: [
      "동료 지원과 상대 업무를 대신 책임지는 행동을 구분할 것",
      "업무 결과를 성향의 관계 배려 정도로 평가하지 않을 것",
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
      "업무 범위와 시간이 계속 침범되면 관계가 어색해질 걱정과 팀에 미칠 영향, 목표를 지키기 위해 조정할 기준을 함께 살피는 경향이 있다.",
    firstThought:
      "“거절하면 실망시키지 않을까?”라는 걱정이 생겨도 “현재 계획을 지키려면 우선순위를 분명히 해야 한다”는 생각이 뒤따르기 쉽다.",
    actualResponse:
      "상대와 대화를 열어 현재 업무의 영향과 가능한 대안을 설명하고, 결정된 우선순위와 마감을 기록해 이어가는 편이다.",
    communication:
      "“이 요청을 맡으면 기존 마감에 영향이 있습니다. 무엇을 우선할지 정해주시면 그 계획으로 진행하겠습니다”처럼 관계를 해치지 않으면서 기준을 분명히 말하는 방식이 잘 맞는다.",
    validationFocus: [
      "관계 걱정과 실제 경계 표현 행동을 분리할 것",
      "직급·고용 안전·조직 문화가 표현을 제한하는지 확인할 것",
    ],
  },
] as const satisfies readonly SceneDraft[];

const channelConfig = [
  ["attention", "attention", "attention"],
  ["process", "first_thought", "firstThought"],
  ["response", "actual_response", "actualResponse"],
  ["communication", "communication", "communication"],
] as const;

export const enakqP2ScenarioCandidatesV2 = sceneDrafts.flatMap((scene) =>
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

export const enakqP2ScenarioValidationQueueV2 = sceneDrafts.map((scene) => ({
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
