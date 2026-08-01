export const dataCenterOperationsGuideVersion = "1.0" as const;

export const dataCenterWeeklyWorkflow = [
  {
    description:
      "문항 이해 어려움과 결과 문장 불일치를 코드·문장 버전별로 확인합니다.",
    title: "품질 신호 확인",
  },
  {
    description:
      "표본 수와 반복 이유를 함께 보고 유지·검토·수정 후보를 판단합니다.",
    title: "검토 순서 결정",
  },
  {
    description:
      "기존 문장을 덮어쓰지 않고 새 버전을 전문 검토한 뒤 발행합니다.",
    title: "새 버전 승인·발행",
  },
] as const;

export const dataCenterDataLayers = [
  {
    label: "완료 당시 측정값",
    rule: "없는 점수를 만들거나 과거 결과를 재채점하지 않아요.",
  },
  {
    label: "고객 공개 코드 가이드",
    rule: "수정할 때 기존 원문을 덮지 않고 새 가이드 버전을 만들어요.",
  },
  {
    label: "결과 본문 선택 규칙",
    rule: "코어 20%·정밀 25%·최소 2,000자와 주제 균형을 검사해요.",
  },
  {
    label: "승인된 정밀 문장",
    rule: "근거와 전문 검토를 모두 통과한 문장만 결과에 추가해요.",
  },
] as const;

export const dataCenterSampleRules = [
  { action: "수집 유지", sample: "1~9명" },
  { action: "반복 이유 확인", sample: "10~19명" },
  { action: "불일치 25% 이상이면 우선 검토", sample: "20명 이상" },
  { action: "전문가 수정·제한 노출 후보", sample: "100명 이상" },
] as const;

export const dataCenterPublishChecklist = [
  "기존 가이드·문장·manifest 버전을 그대로 보관했나요?",
  "근거와 적용 코드·축·상황을 다시 찾을 수 있나요?",
  "심리학·성향검사·쉬운 문장·서비스 안전 검토가 끝났나요?",
  "강점과 함께 과해질 때의 비용·조정 방법이 있나요?",
  "32개 코드의 코어·정밀 결과 본문 계약을 통과했나요?",
  "개인 점수가 공개·공유 화면에 나오지 않나요?",
  "이전 승인본으로 바로 되돌릴 수 있나요?",
] as const;

export const dataCenterProhibitedActions = [
  "게시 중인 문장이나 과거 결과를 DB에서 직접 고치기",
  "표본이 적은 비율 하나로 문장을 자동 교체하기",
  "이전 버전과 새 버전의 반응을 합쳐 계산하기",
  "검토하지 않은 생성 문장을 고객에게 바로 공개하기",
] as const;
