import { m05ParticipantDefinition } from "@/features/research/m05/m05-participant-fixture";

export type M05FacilitatorItem = {
  accessProbe: string;
  comprehensionProbe: string;
  constraintProbe?: string;
  desirabilityProbe: string;
  experienceProbe?: string;
  itemRevisionId: string;
  judgmentProbe: string;
  opaqueItemId: string;
  passEvidence: string;
  priorityIssue: string;
  recallProbe: string;
  seamProbe?: string;
  targetFacet: string;
  wordingProbe?: string;
};

const facilitatorItems: M05FacilitatorItem[] = [
  {
    accessProbe:
      "일정을 스스로 정하기 어려웠거나 건강·돌봄·다른 사람의 일정 때문에 늦어진 경험이 답에 섞였나요?",
    comprehensionProbe:
      "‘내가 맡은 부분’과 ‘정한 때에 맞춰 끝낸다’를 각각 어떻게 이해했나요?",
    constraintProbe:
      "일정 통제권·업무량·과제 난이도·건강·돌봄 조건이 달라도 같은 답을 골랐을까요?",
    desirabilityProbe:
      "때에 맞춰 끝낸다는 답이 더 책임감 있고 좋은 사람처럼 보여 선택에 영향을 줬나요? 결과가 공개되면 답을 바꾸고 싶나요?",
    experienceProbe:
      "최근 6개월 동안 다른 사람과 함께 맡은 일을 한 경험이 거의 없다면 ‘판단하기 어려움’을 선택할 수 있었나요?",
    itemRevisionId: "SMRL-C11-r3",
    judgmentProbe:
      "그 응답을 고른 가장 큰 이유는 평소 역할을 끝내는 방식이었나요, 과제 난이도나 시간 여유였나요?",
    opaqueItemId: "CIT-001",
    passEvidence:
      "평소 역할 이행 빈도로 설명하고 원인 탐색·능력·환경 제약과 구분하며, 경험 부족 시 판단 어려움을 사용할 수 있고 문구 의미가 안정적이다.",
    priorityIssue:
      "역할 이행과 원인 탐색·일정 통제·과제 난이도·책임감 인상의 구분",
    recallProbe:
      "최근 6개월 동안 다른 사람과 함께한 일 중 맡은 부분과 정한 때가 분명했던 실제 경험을 떠올렸나요?",
    seamProbe:
      "이 문항은 맡은 일을 끝내는 습관과 문제의 원인·해결 방법을 찾는 성향 중 무엇을 더 묻는다고 느꼈나요?",
    targetFacet: "SM-RL",
    wordingProbe:
      "‘정한 때에 맞춰’와 ‘정한 때까지’ 중 어느 표현이 더 분명했나요? 두 표현의 뜻이 다르게 느껴졌나요?",
  },
  {
    accessProbe:
      "다른 사람에게 결과물을 보내거나 보여줄 기회가 거의 없다면 어떻게 답했을 것 같나요?",
    comprehensionProbe:
      "‘같은 걱정을 되짚는 것’과 ‘필요한 부분을 확인하는 것’은 어떻게 다르다고 이해했나요?",
    desirabilityProbe: "어느 답이 더 용감하거나 유능한 사람처럼 보였나요?",
    itemRevisionId: "ERWD-C06-r3",
    judgmentProbe:
      "걱정 때문에 늦어진 것인가요, 확인할 정보나 시간이 더 필요해서 늦어진 것인가요?",
    opaqueItemId: "CIT-002",
    passEvidence:
      "걱정 반복이 행동을 늦추는지로 설명하며 신중함·완벽주의·기회 차이와 구분한다.",
    priorityIssue: "반복 걱정과 필요한 점검·완벽주의의 구분",
    recallProbe:
      "실제로 보내거나 보여주기 전에 같은 걱정을 여러 번 반복한 경험을 떠올렸나요?",
    targetFacet: "ER-WD",
  },
  {
    accessProbe:
      "가족·친구·연인 중 떠올릴 사람이 없거나 관계의 힘 차이가 크다면 답하기 어려웠나요?",
    comprehensionProbe:
      "‘함께 맞추려 한다’는 단순한 제안인가요, 상대도 같은 선택을 하게 하는 것인가요?",
    desirabilityProbe:
      "어느 답이 더 배려하거나 좋은 사람처럼 보였나요? 결과가 공개되면 답을 바꾸고 싶나요?",
    itemRevisionId: "RORN-P05-B-r3",
    judgmentProbe:
      "한쪽으로 맞춘 이유가 함께하는 경험 때문인가요, 상대 선택을 줄이려는 반응 때문인가요?",
    opaqueItemId: "CIT-003",
    passEvidence:
      "적극적 의견 표현이 아니라 상대가 따로 고를 수 있는 여지를 실제로 어떻게 다루는지로 설명한다.",
    priorityIssue: "함께 맞추자는 제안과 상대 선택 제한의 구분",
    recallProbe:
      "각자 다르게 골라도 실제로 문제가 없는 가족·친구·연인 장면을 떠올렸나요?",
    targetFacet: "RO-RN",
  },
  {
    accessProbe:
      "교대근무·돌봄·건강·다른 사람 일정 때문에 시간을 정할 수 없었던 경험이 답에 섞였나요?",
    comprehensionProbe:
      "‘그날 상황을 보고 정한다’에서 어떤 상황과 어떤 결정을 떠올렸나요?",
    desirabilityProbe:
      "미리 정하는 답과 그날 정하는 답 중 어느 쪽이 더 유능하거나 유연해 보였나요?",
    itemRevisionId: "SMOS-C08-r3",
    judgmentProbe:
      "언제 할지 정하는 방식으로 답했나요, 실제로 미루거나 시작한 시점으로 답했나요?",
    opaqueItemId: "CIT-004",
    passEvidence:
      "일정 자율성이 있는 상황에서 계획 시점만 설명하며 착수 능력이나 외부 제약과 구분한다.",
    priorityIssue: "계획 시점과 실제 시작·외부 일정 제약의 구분",
    recallProbe:
      "실제로 본인이 시간을 자유롭게 정할 수 있었던 최근 일을 떠올렸나요?",
    targetFacet: "SM-OS",
  },
  {
    accessProbe:
      "시간·기기·검색 환경·추가 설명 접근 여부가 선택한 답을 바꿨나요?",
    comprehensionProbe:
      "‘필요한 내용은 이해한 뒤’와 ‘이유나 배경을 더 알아본다’를 어떻게 구분했나요?",
    desirabilityProbe: "더 알아보는 답이 더 지적이거나 좋은 답처럼 보였나요?",
    itemRevisionId: "OEIE-C09-r3",
    judgmentProbe:
      "필요해서 더 본 것인가요, 이유·배경 자체가 궁금해서 더 본 것인가요?",
    opaqueItemId: "CIT-005",
    passEvidence:
      "이해 능력이나 정보 접근 성공이 아니라 필요한 범위 이후에도 탐구를 이어간 반응으로 설명한다.",
    priorityIssue: "필요한 이해와 이해 완료 뒤 추가 탐구의 구분",
    recallProbe:
      "이해를 마친 뒤에도 실제로 더 알아본 경험을 떠올렸나요, 궁금했던 마음만 떠올렸나요?",
    targetFacet: "OE-IE",
  },
];

export const m05FacilitatorDefinition = {
  commonProbes: [
    "이 문장을 본인 말로 다시 설명해 주세요.",
    "상황 라벨은 언제의 일이라고 이해했나요?",
    "어떤 실제 경험을 떠올렸고 최근 6개월 기준을 사용했나요?",
    "왜 그 응답을 골랐으며 1·3·5점은 어떻게 다르다고 생각했나요?",
    "판단하기 어려웠다면 경험 부족·문장·접근·개인정보 중 무엇 때문인가요?",
    "어느 방향이 더 좋은 사람처럼 보였고 결과가 공개되면 답을 바꾸고 싶나요?",
  ],
  items: facilitatorItems.map((item) => {
    const participantItem = m05ParticipantDefinition.items.find(
      (candidate) => candidate.opaqueItemId === item.opaqueItemId,
    );
    if (!participantItem) {
      throw new Error(`Missing M05 participant item: ${item.opaqueItemId}`);
    }
    return { ...item, participantItem };
  }),
  formId: m05ParticipantDefinition.formId,
  protocolVersion: m05ParticipantDefinition.protocolVersion,
  responseFormatId: m05ParticipantDefinition.responseFormatId,
} as const;
