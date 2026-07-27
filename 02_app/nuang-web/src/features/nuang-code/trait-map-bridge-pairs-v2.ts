export const traitMapBridgePairsV2 = [
  {
    order: 1,
    axis: "SE_energy_and_expression",
    changedLetters: "E/I",
    enakqSide: {
      anchor: "ENAKQ",
      derivedCode: "INAKQ",
      roleName: "마음과 가능성을 살피는 안내자",
    },
    irgmcSide: {
      anchor: "IRGMC",
      derivedCode: "ERGMC",
      roleName: "유연하게 답을 찾는 대응가",
    },
    discriminatingScenarioIds: [
      "SCN-GENERAL-2",
      "SCN-GENERAL-3",
      "SCN-GENERAL-8",
      "SCN-GENERAL-12",
      "SCN-FRIEND-2",
      "SCN-FRIEND-3",
      "SCN-PARTNER-3",
      "SCN-PERSON-OF-INTEREST-2",
      "SCN-PERSON-OF-INTEREST-8",
      "SCN-WORK-3",
    ],
    reason:
      "사람과 함께한 뒤의 에너지, 참여 전 관찰 시간, 생각을 대화 중과 전후 어느 때 정리하는지가 여러 관계에서 반복 측정 가능하다.",
  },
  {
    order: 2,
    axis: "OE_exploration_and_interest",
    changedLetters: "N/R",
    enakqSide: {
      anchor: "ENAKQ",
      derivedCode: "ERAKQ",
      roleName: "관계 변화를 살피는 관계지기",
    },
    irgmcSide: {
      anchor: "IRGMC",
      derivedCode: "INGMC",
      roleName: "새 가능성을 찾는 탐험가",
    },
    discriminatingScenarioIds: [
      "SCN-GENERAL-1",
      "SCN-GENERAL-2",
      "SCN-GENERAL-5",
      "SCN-FAMILY-2",
      "SCN-FRIEND-2",
      "SCN-PARTNER-2",
      "SCN-PERSON-OF-INTEREST-1",
      "SCN-PERSON-OF-INTEREST-5",
      "SCN-WORK-2",
      "SCN-WORK-5",
    ],
    reason:
      "정보가 부족한 같은 장면에서 확인된 사실·직접 경험과 가능성·의미 연결 중 어느 쪽에서 생각이 시작되는지 비교할 수 있다.",
  },
  {
    order: 3,
    axis: "RO_relational_attention",
    changedLetters: "A/G",
    enakqSide: {
      anchor: "ENAKQ",
      derivedCode: "ENGKQ",
      roleName: "변화에 답하는 혁신가",
    },
    irgmcSide: {
      anchor: "IRGMC",
      derivedCode: "IRAMC",
      roleName: "조용히 곁을 맞추는 지원가",
    },
    discriminatingScenarioIds: [
      "SCN-GENERAL-6",
      "SCN-GENERAL-7",
      "SCN-FAMILY-6",
      "SCN-FAMILY-7",
      "SCN-FRIEND-6",
      "SCN-FRIEND-7",
      "SCN-PARTNER-6",
      "SCN-PARTNER-7",
      "SCN-PERSON-OF-INTEREST-7",
      "SCN-WORK-6",
    ],
    reason:
      "갈등과 지원 요청에서 원인·해결과 사람의 마음·관계 영향 중 처음 주의가 가는 곳을 실제 행동과 분리해 비교할 수 있다.",
  },
  {
    order: 4,
    axis: "SM_execution_and_structure",
    changedLetters: "K/M",
    enakqSide: {
      anchor: "ENAKQ",
      derivedCode: "ENAMQ",
      roleName: "마음과 상상을 펼치는 이야기꾼",
    },
    irgmcSide: {
      anchor: "IRGMC",
      derivedCode: "IRGKC",
      roleName: "차근차근 답을 쌓는 분석가",
    },
    discriminatingScenarioIds: [
      "SCN-GENERAL-1",
      "SCN-GENERAL-4",
      "SCN-FAMILY-1",
      "SCN-FAMILY-4",
      "SCN-FRIEND-1",
      "SCN-FRIEND-4",
      "SCN-PARTNER-1",
      "SCN-PARTNER-4",
      "SCN-WORK-1",
      "SCN-WORK-4",
    ],
    reason:
      "같은 목표에서 미리 정한 순서·완료 기준과 현재의 흥미·마감·에너지 중 무엇이 시작과 지속을 안정시키는지 비교할 수 있다.",
  },
  {
    order: 5,
    axis: "ER_emotional_activation_and_worry",
    changedLetters: "Q/C",
    enakqSide: {
      anchor: "ENAKQ",
      derivedCode: "ENAKC",
      roleName: "사람과 가능성을 잇는 연결가",
    },
    irgmcSide: {
      anchor: "IRGMC",
      derivedCode: "IRGMQ",
      roleName: "변화의 원인을 좇는 추적자",
    },
    discriminatingScenarioIds: [
      "SCN-GENERAL-4",
      "SCN-GENERAL-5",
      "SCN-GENERAL-11",
      "SCN-GENERAL-12",
      "SCN-FAMILY-5",
      "SCN-PARTNER-5",
      "SCN-PARTNER-11",
      "SCN-PERSON-OF-INTEREST-5",
      "SCN-PERSON-OF-INTEREST-11",
      "SCN-WORK-11",
    ],
    reason:
      "불편함을 처음 알아차린 시점, 걱정이 커지는 속도, 실제 행동, 일이 끝난 뒤 회복을 분리해 반복 비교할 수 있다.",
  },
] as const;

export const traitMapBridgeProductionOrderV2 =
  traitMapBridgePairsV2.flatMap((pair) => [
    pair.enakqSide.derivedCode,
    pair.irgmcSide.derivedCode,
  ]);
