export const localInProgressRetentionDays = 7;
export const localCompletedRetentionDays = 30;

export const localRetentionPolicy = {
  completedCopy: `완료한 결과는 ${localCompletedRetentionDays}일 동안 다시 열 수 있어요.`,
  completedDays: localCompletedRetentionDays,
  inProgressDays: localInProgressRetentionDays,
  inProgressLabel: `진행 중 검사는 ${localInProgressRetentionDays}일 동안 이어갈 수 있어요.`,
} as const;
