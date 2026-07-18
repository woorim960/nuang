export type DailyQuestionTemplate = {
  id: string;
  prompt: string;
  version: string;
};

export type BalanceGameTemplate = {
  id: string;
  options: [
    {
      key: string;
      label: string;
    },
    {
      key: string;
      label: string;
    },
  ];
  question: string;
  version: string;
};

export const dailyQuestionTemplates = [
  {
    id: "daily_question_evening_001",
    prompt: "오늘 저녁 시간은 누구와 함께 보내시나요?",
    version: "daily-question.v0.1",
  },
  {
    id: "daily_question_routine_001",
    prompt: "요즘 나를 가장 편하게 해주는 루틴은 무엇인가요?",
    version: "daily-question.v0.1",
  },
  {
    id: "daily_question_gratitude_001",
    prompt: "오늘 누군가에게 고마웠던 순간이 있었나요?",
    version: "daily-question.v0.1",
  },
] as const satisfies readonly DailyQuestionTemplate[];

export const balanceGameTemplates = [
  {
    id: "balance_trip_mountain_sea_001",
    options: [
      {
        key: "mountain",
        label: "산",
      },
      {
        key: "sea",
        label: "바다",
      },
    ],
    question: "나 혼자 여행 간다면?",
    version: "balance-game.v0.1",
  },
  {
    id: "balance_food_black_noodle_spicy_seafood_001",
    options: [
      {
        key: "black_noodle",
        label: "짜장",
      },
      {
        key: "spicy_seafood",
        label: "짬뽕",
      },
    ],
    question: "평소 내가 고르는 음식은?",
    version: "balance-game.v0.1",
  },
  {
    id: "balance_dayoff_rest_goout_001",
    options: [
      {
        key: "rest",
        label: "아무 계획 없이 쉬기",
      },
      {
        key: "goout",
        label: "가고 싶던 곳 다녀오기",
      },
    ],
    question: "하루 쉬는 날 더 끌리는 건?",
    version: "balance-game.v0.1",
  },
] as const satisfies readonly BalanceGameTemplate[];

export function getDailyQuestionTemplate(id: string | null | undefined) {
  return dailyQuestionTemplates.find((template) => template.id === id) ?? null;
}

export function getDefaultDailyQuestionTemplate() {
  return dailyQuestionTemplates[0];
}

export function getBalanceGameTemplate(id: string | null | undefined) {
  return balanceGameTemplates.find((template) => template.id === id) ?? null;
}

export function getDefaultBalanceGameTemplate() {
  return balanceGameTemplates[0];
}

export function getBalanceGameOption(
  template: BalanceGameTemplate,
  optionKey: string | null | undefined,
) {
  return template.options.find((option) => option.key === optionKey) ?? null;
}
