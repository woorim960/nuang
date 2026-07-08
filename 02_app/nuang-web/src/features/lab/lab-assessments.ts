export type LabSensitivity = "S1" | "S2";

export type LabResultProfile = {
  id: string;
  title: string;
  shortTitle: string;
  summary: string;
  strengths: string[];
  watch: string;
  relationTip: string;
  smallExperiment: string;
};

export type LabOption = {
  id: string;
  label: string;
  resultId: string;
};

export type LabQuestion = {
  id: string;
  text: string;
  options: LabOption[];
};

export type LabAssessment = {
  slug: string;
  title: string;
  cardTitle: string;
  caption: string;
  contentVersion: string;
  sensitivity: LabSensitivity;
  estimatedMinutes: number;
  safetyNote: string;
  resultLabel: string;
  questions: LabQuestion[];
  profiles: LabResultProfile[];
};

export type LabAnswer = {
  optionId: string;
  questionId: string;
  resultId: string;
};

export type LabScoreResult = {
  profile: LabResultProfile;
  scores: Record<string, number>;
  tiedProfileIds: string[];
};

export const labAssessments: LabAssessment[] = [
  {
    slug: "conversation-temperature",
    title: "대화 온도 실험",
    cardTitle: "관계 대화 스타일",
    caption: "말을 꺼내는 속도와 온도",
    contentVersion: "odd-trait-lab-result-copy.v0.1",
    sensitivity: "S1",
    estimatedMinutes: 2,
    resultLabel: "지금 가까운 대화 스타일",
    safetyNote:
      "대화 방식은 관계의 우열이나 성숙도를 판단하지 않아요. 서로 맞추기 위한 참고로만 봅니다.",
    profiles: [
      {
        id: "spark",
        title: "바로 불을 켜는 대화 스타일",
        shortTitle: "바로 대화",
        summary:
          "생각이 떠오르면 대화를 시작하며 정리하는 편이에요. 말하면서 방향이 잡히고, 상대의 반응을 보며 속도를 조절합니다.",
        strengths: [
          "어색한 침묵을 풀고 대화의 첫 문을 열 수 있어요.",
          "상대가 망설일 때 필요한 질문을 먼저 건네기 쉬워요.",
        ],
        watch:
          "상대가 아직 생각을 정리하지 못했을 때는 빠른 대화가 압박처럼 느껴질 수 있어요.",
        relationTip:
          "중요한 이야기를 시작할 때는 '지금 말해도 괜찮아?'를 먼저 붙이면 좋아요.",
        smallExperiment:
          "오늘 한 번은 바로 말하기 전에 상대가 생각할 시간을 원하는지 물어보세요.",
      },
      {
        id: "warmup",
        title: "천천히 온도를 올리는 대화 스타일",
        shortTitle: "온도 조율",
        summary:
          "바로 핵심으로 들어가기보다 분위기와 상대의 상태를 보며 대화를 데우는 편이에요.",
        strengths: [
          "상대가 방어적으로 느끼지 않게 대화의 문을 열 수 있어요.",
          "민감하지 않은 말부터 시작해 안전한 분위기를 만들기 쉬워요.",
        ],
        watch:
          "돌려 말하는 시간이 길어지면 상대가 핵심을 놓치거나 답답해할 수 있어요.",
        relationTip:
          "분위기를 만든 뒤에는 오늘 꼭 말하고 싶은 핵심을 한 문장으로 정리해 주세요.",
        smallExperiment:
          "대화 시작 전에 '내가 말하고 싶은 핵심은 하나야'라고 짧게 예고해보세요.",
      },
      {
        id: "draft",
        title: "정리한 뒤 꺼내는 대화 스타일",
        shortTitle: "정리 후 대화",
        summary:
          "생각과 감정을 먼저 혼자 정리한 뒤 말할 때 가장 편안해요. 즉흥 대화보다 준비된 대화에서 힘이 납니다.",
        strengths: [
          "중요한 말을 차분하고 정확하게 전달할 수 있어요.",
          "감정이 올라온 순간에도 바로 터뜨리기보다 의미를 정리하려는 힘이 있어요.",
        ],
        watch:
          "말할 준비가 될 때까지 너무 오래 걸리면 상대는 회피나 무관심으로 오해할 수 있어요.",
        relationTip:
          "바로 답하기 어렵다면 침묵보다 '조금 정리하고 말할게'라는 신호가 좋아요.",
        smallExperiment:
          "답을 미뤄야 할 때는 언제 다시 이야기할지 작은 시간을 함께 정해보세요.",
      },
    ],
    questions: [
      {
        id: "ct-01",
        text: "중요한 이야기가 생기면 나는 보통",
        options: [
          { id: "ct-01-a", label: "바로 말을 꺼내며 정리한다", resultId: "spark" },
          { id: "ct-01-b", label: "분위기를 살피며 천천히 꺼낸다", resultId: "warmup" },
          { id: "ct-01-c", label: "혼자 정리한 뒤 말한다", resultId: "draft" },
        ],
      },
      {
        id: "ct-02",
        text: "상대가 애매하게 말하면 나는",
        options: [
          { id: "ct-02-a", label: "무슨 뜻인지 바로 물어본다", resultId: "spark" },
          { id: "ct-02-b", label: "상대가 더 말할 수 있게 기다린다", resultId: "warmup" },
          { id: "ct-02-c", label: "들은 내용을 정리한 뒤 확인한다", resultId: "draft" },
        ],
      },
      {
        id: "ct-03",
        text: "대화가 불편해질 때 더 편한 방식은",
        options: [
          { id: "ct-03-a", label: "지금 바로 풀어보는 것", resultId: "spark" },
          { id: "ct-03-b", label: "가벼운 말로 긴장을 낮추는 것", resultId: "warmup" },
          { id: "ct-03-c", label: "잠깐 멈추고 정리하는 것", resultId: "draft" },
        ],
      },
      {
        id: "ct-04",
        text: "내 마음을 표현할 때 가까운 쪽은",
        options: [
          { id: "ct-04-a", label: "솔직하게 바로 말한다", resultId: "spark" },
          { id: "ct-04-b", label: "상대가 받을 수 있게 부드럽게 말한다", resultId: "warmup" },
          { id: "ct-04-c", label: "문장으로 정리해 정확히 말한다", resultId: "draft" },
        ],
      },
      {
        id: "ct-05",
        text: "단체 대화에서 내가 자주 하는 역할은",
        options: [
          { id: "ct-05-a", label: "질문을 던지고 흐름을 만든다", resultId: "spark" },
          { id: "ct-05-b", label: "분위기를 보며 연결한다", resultId: "warmup" },
          { id: "ct-05-c", label: "정리된 의견을 나중에 보탠다", resultId: "draft" },
        ],
      },
      {
        id: "ct-06",
        text: "상대가 바로 답하지 않으면 나는",
        options: [
          { id: "ct-06-a", label: "추가 질문으로 이어간다", resultId: "spark" },
          { id: "ct-06-b", label: "대화 온도를 낮추며 기다린다", resultId: "warmup" },
          { id: "ct-06-c", label: "상대도 정리 시간이 필요하다고 본다", resultId: "draft" },
        ],
      },
    ],
  },
  {
    slug: "recharge-ritual",
    title: "충전 루틴 실험",
    cardTitle: "휴식과 회복 방식",
    caption: "지친 뒤 다시 살아나는 방법",
    contentVersion: "odd-trait-lab-result-copy.v0.1",
    sensitivity: "S1",
    estimatedMinutes: 2,
    resultLabel: "지금 가까운 회복 스타일",
    safetyNote:
      "이 검사는 스트레스 심각도나 건강 상태를 판단하지 않아요. 쉬는 방식의 취향을 가볍게 살펴봅니다.",
    profiles: [
      {
        id: "quiet",
        title: "소음을 낮추는 조용한 회복 방식",
        shortTitle: "조용한 회복",
        summary:
          "자극을 줄이고 혼자 있을 때 에너지가 천천히 돌아오는 편이에요. 정적과 여백이 회복의 핵심입니다.",
        strengths: [
          "과한 자극에서 빠져나와 내 상태를 차분히 볼 수 있어요.",
          "혼자 있는 시간을 죄책감 없이 회복 자원으로 쓸 수 있어요.",
        ],
        watch:
          "계속 혼자만 버티다 보면 필요한 도움 요청까지 늦어질 수 있어요.",
        relationTip:
          "가까운 사람에게는 혼자 있고 싶은 마음이 거절이 아니라 회복이라는 점을 알려주세요.",
        smallExperiment:
          "오늘 15분만 알림을 끄고 몸이 조용해지는 시간을 만들어보세요.",
      },
      {
        id: "sensory",
        title: "감각을 바꾸는 전환 회복 방식",
        shortTitle: "감각 전환",
        summary:
          "공간, 음악, 산책, 음식, 정리처럼 감각을 바꾸면 기분과 리듬이 다시 움직이는 편이에요.",
        strengths: [
          "작은 환경 변화로도 빠르게 분위기를 전환할 수 있어요.",
          "몸과 감각을 활용해 머릿속 과부하를 낮추는 데 익숙해요.",
        ],
        watch:
          "전환 자극을 계속 찾다 보면 진짜 쉬어야 할 피로 신호를 놓칠 수 있어요.",
        relationTip:
          "함께 쉴 때는 상대에게 필요한 자극의 크기가 나와 다를 수 있음을 확인해 주세요.",
        smallExperiment:
          "지친 순간에 음악, 조명, 산책 중 하나만 골라 10분 전환을 해보세요.",
      },
      {
        id: "together",
        title: "온기를 나누는 연결 회복 방식",
        shortTitle: "연결 회복",
        summary:
          "혼자 버티기보다 누군가와 가볍게 연결될 때 에너지가 돌아오는 편이에요. 말과 반응이 회복의 통로가 됩니다.",
        strengths: [
          "힘든 기분을 관계 안에서 부드럽게 흘려보낼 수 있어요.",
          "가벼운 대화나 동행으로 기분 전환을 만들기 쉬워요.",
        ],
        watch:
          "상대가 바로 반응하지 못하면 서운함이 커지거나 회복이 상대 반응에 묶일 수 있어요.",
        relationTip:
          "연결이 필요할 때는 무거운 부탁보다 '잠깐 같이 있어줄래?'처럼 작게 요청해보세요.",
        smallExperiment:
          "오늘 한 사람에게 해결책 말고 10분만 같이 있어달라고 요청해보세요.",
      },
    ],
    questions: [
      {
        id: "rr-01",
        text: "기운이 빠진 날 가장 먼저 하고 싶은 일은",
        options: [
          { id: "rr-01-a", label: "혼자 조용히 쉬기", resultId: "quiet" },
          { id: "rr-01-b", label: "공간이나 분위기 바꾸기", resultId: "sensory" },
          { id: "rr-01-c", label: "누군가와 가볍게 연락하기", resultId: "together" },
        ],
      },
      {
        id: "rr-02",
        text: "쉬는 시간이 생기면 나는",
        options: [
          { id: "rr-02-a", label: "아무것도 안 하는 시간을 원한다", resultId: "quiet" },
          { id: "rr-02-b", label: "산책이나 음악처럼 전환을 원한다", resultId: "sensory" },
          { id: "rr-02-c", label: "편한 사람과 느슨하게 있고 싶다", resultId: "together" },
        ],
      },
      {
        id: "rr-03",
        text: "머릿속이 복잡할 때 도움 되는 것은",
        options: [
          { id: "rr-03-a", label: "조용한 공간", resultId: "quiet" },
          { id: "rr-03-b", label: "몸을 움직이는 전환", resultId: "sensory" },
          { id: "rr-03-c", label: "말로 풀어내는 시간", resultId: "together" },
        ],
      },
      {
        id: "rr-04",
        text: "주말이 끝나고 덜 지치려면",
        options: [
          { id: "rr-04-a", label: "혼자만의 여백이 필요하다", resultId: "quiet" },
          { id: "rr-04-b", label: "기분이 바뀌는 활동이 필요하다", resultId: "sensory" },
          { id: "rr-04-c", label: "좋은 사람과의 시간이 필요하다", resultId: "together" },
        ],
      },
      {
        id: "rr-05",
        text: "갑자기 약속이 취소되면 나는",
        options: [
          { id: "rr-05-a", label: "오히려 혼자 쉴 수 있어 좋다", resultId: "quiet" },
          { id: "rr-05-b", label: "다른 활동으로 흐름을 바꾼다", resultId: "sensory" },
          { id: "rr-05-c", label: "다른 사람에게 연락해본다", resultId: "together" },
        ],
      },
      {
        id: "rr-06",
        text: "회복됐다고 느끼는 순간은",
        options: [
          { id: "rr-06-a", label: "마음이 조용해졌을 때", resultId: "quiet" },
          { id: "rr-06-b", label: "감각과 기분이 바뀌었을 때", resultId: "sensory" },
          { id: "rr-06-c", label: "누군가와 연결됐다고 느낄 때", resultId: "together" },
        ],
      },
    ],
  },
  {
    slug: "conflict-repair",
    title: "갈등 회복 실험",
    cardTitle: "갈등 뒤 회복 방식",
    caption: "불편함을 다시 맞추는 방식",
    contentVersion: "odd-trait-lab-result-copy.v0.1",
    sensitivity: "S2",
    estimatedMinutes: 3,
    resultLabel: "지금 가까운 회복 대화 스타일",
    safetyNote:
      "이 검사는 폭력, 통제, 협박, 학대를 성향 차이로 설명하지 않아요. 위험하거나 두려운 관계라면 도움 연결 허브를 먼저 이용하세요.",
    profiles: [
      {
        id: "quick-check",
        title: "빨리 확인하고 회복하는 방식",
        shortTitle: "빠른 확인",
        summary:
          "불편함을 오래 두기보다 빠르게 확인하고 관계의 방향을 다시 맞추고 싶어 하는 편이에요.",
        strengths: [
          "문제가 커지기 전에 먼저 말문을 열 수 있어요.",
          "상대가 불확실성에 오래 머무르지 않도록 도울 수 있어요.",
        ],
        watch:
          "상대가 아직 진정되지 않았을 때는 빠른 확인이 추궁처럼 느껴질 수 있어요.",
        relationTip:
          "바로 이야기하고 싶을수록 '지금 괜찮아, 아니면 조금 뒤가 좋아?'를 함께 물어보세요.",
        smallExperiment:
          "불편함을 말할 때 바로 결론을 요구하지 않고 시간 선택지를 함께 주세요.",
      },
      {
        id: "time-space",
        title: "시간을 확보하고 회복하는 방식",
        shortTitle: "시간 확보",
        summary:
          "갈등 직후 바로 말하기보다 감정과 생각이 가라앉은 뒤 다시 이야기할 때 편안해요.",
        strengths: [
          "감정이 큰 순간의 말실수를 줄일 수 있어요.",
          "문제를 차분히 분리해 다시 보는 힘이 있어요.",
        ],
        watch:
          "시간을 두는 과정이 길어지면 상대가 회피나 무시로 느낄 수 있어요.",
        relationTip:
          "시간이 필요할 때는 언제 다시 이야기할지 함께 정하면 불안을 줄일 수 있어요.",
        smallExperiment:
          "잠깐 멈출 때는 '오늘 밤 9시에 다시 얘기하자'처럼 재개 시간을 붙여보세요.",
      },
      {
        id: "meaning-bridge",
        title: "서로의 뜻을 번역하며 회복하는 방식",
        shortTitle: "뜻 번역",
        summary:
          "누가 맞는지보다 서로 어떤 뜻으로 말했는지 확인하며 관계를 다시 잇는 편이에요.",
        strengths: [
          "갈등의 말과 의도를 분리해 오해를 줄일 수 있어요.",
          "상대가 방어적으로 굳기 전에 의미를 확인하는 질문을 잘 만들 수 있어요.",
        ],
        watch:
          "의미를 너무 오래 해석하다가 필요한 사과나 행동 변화를 미룰 수 있어요.",
        relationTip:
          "의도를 확인한 뒤에는 다음에 어떻게 다르게 할지 한 가지 행동으로 정리해 주세요.",
        smallExperiment:
          "갈등 뒤 '내가 들은 뜻은 이거였어. 맞아?'라고 한 번 확인해보세요.",
      },
    ],
    questions: [
      {
        id: "cr-01",
        text: "갈등이 생긴 직후 내가 더 원하는 것은",
        options: [
          { id: "cr-01-a", label: "빨리 확인하고 풀기", resultId: "quick-check" },
          { id: "cr-01-b", label: "시간을 두고 진정하기", resultId: "time-space" },
          { id: "cr-01-c", label: "서로의 뜻을 확인하기", resultId: "meaning-bridge" },
        ],
      },
      {
        id: "cr-02",
        text: "상대가 화난 것 같을 때 나는",
        options: [
          { id: "cr-02-a", label: "무슨 일인지 바로 묻는다", resultId: "quick-check" },
          { id: "cr-02-b", label: "조금 가라앉을 시간을 둔다", resultId: "time-space" },
          { id: "cr-02-c", label: "상대가 무엇을 중요하게 여겼는지 본다", resultId: "meaning-bridge" },
        ],
      },
      {
        id: "cr-03",
        text: "사과를 주고받을 때 더 중요하게 느끼는 것은",
        options: [
          { id: "cr-03-a", label: "빨리 인정하고 회복하는 것", resultId: "quick-check" },
          { id: "cr-03-b", label: "감정이 가라앉은 뒤 말하는 것", resultId: "time-space" },
          { id: "cr-03-c", label: "무엇이 상처였는지 이해하는 것", resultId: "meaning-bridge" },
        ],
      },
      {
        id: "cr-04",
        text: "갈등 대화가 길어질 때 나는",
        options: [
          { id: "cr-04-a", label: "핵심을 정리해 결론을 내고 싶다", resultId: "quick-check" },
          { id: "cr-04-b", label: "잠깐 쉬었다가 다시 하고 싶다", resultId: "time-space" },
          { id: "cr-04-c", label: "서로 다르게 이해한 지점을 찾고 싶다", resultId: "meaning-bridge" },
        ],
      },
      {
        id: "cr-05",
        text: "다시 관계를 맞출 때 내가 편한 말은",
        options: [
          { id: "cr-05-a", label: "그래서 지금 어떻게 할까?", resultId: "quick-check" },
          { id: "cr-05-b", label: "조금 뒤에 다시 얘기하자", resultId: "time-space" },
          { id: "cr-05-c", label: "내가 이해한 게 맞는지 확인할게", resultId: "meaning-bridge" },
        ],
      },
      {
        id: "cr-06",
        text: "갈등 후 가장 부담스러운 것은",
        options: [
          { id: "cr-06-a", label: "불편함이 오래 이어지는 것", resultId: "quick-check" },
          { id: "cr-06-b", label: "감정이 큰 상태에서 말하는 것", resultId: "time-space" },
          { id: "cr-06-c", label: "서로 다르게 이해한 채 넘어가는 것", resultId: "meaning-bridge" },
        ],
      },
    ],
  },
];

export function getLabAssessment(slug: string) {
  return labAssessments.find((assessment) => assessment.slug === slug) ?? null;
}

export function calculateLabResult(
  assessment: LabAssessment,
  answers: Record<string, LabAnswer>,
): LabScoreResult {
  const scores = Object.fromEntries(
    assessment.profiles.map((profile) => [profile.id, 0]),
  );

  Object.values(answers).forEach((answer) => {
    scores[answer.resultId] = (scores[answer.resultId] ?? 0) + 1;
  });

  const sortedProfiles = [...assessment.profiles].sort((a, b) => {
    const scoreDiff = (scores[b.id] ?? 0) - (scores[a.id] ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return assessment.profiles.indexOf(a) - assessment.profiles.indexOf(b);
  });
  const topScore = scores[sortedProfiles[0].id] ?? 0;

  return {
    profile: sortedProfiles[0],
    scores,
    tiedProfileIds: sortedProfiles
      .filter((profile) => (scores[profile.id] ?? 0) === topScore)
      .map((profile) => profile.id),
  };
}

export const forbiddenLabTopicKeywords = [
  "우울",
  "ADHD",
  "자살",
  "자해",
  "중독",
  "트라우마",
  "사이코패스",
  "소시오패스",
  "폭력 위험",
  "성적 지향",
  "약물 검사",
] as const;
