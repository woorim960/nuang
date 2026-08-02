"use client";

import {
  AssessmentBottomSheet,
  AssessmentSheetAction,
  AssessmentSheetActions,
} from "@/features/assessment/AssessmentQuestionControls";
import styles from "./AssessmentRestartSheet.module.css";

type AssessmentRestartSheetProps = {
  assessmentLabel: string;
  hasActiveAttempt: boolean;
  isWorking?: boolean;
  onClose: () => void;
  onRestart: () => void;
  onResume?: () => void;
  resumeLabel?: string;
};

export function AssessmentRestartSheet({
  assessmentLabel,
  hasActiveAttempt,
  isWorking = false,
  onClose,
  onRestart,
  onResume,
  resumeLabel = "답하던 곳부터 이어하기",
}: AssessmentRestartSheetProps) {
  const title = hasActiveAttempt
    ? "답하던 검사가 있어요"
    : "새 결과를 만들어볼까요?";
  const copy = hasActiveAttempt
    ? "현재 답한 내용부터 이어가거나, 이 회차만 정리하고 처음부터 시작할 수 있어요."
    : "이전 결과는 내 기록에 그대로 남고, 이번 답으로 새 리포트가 만들어져요.";

  return (
    <AssessmentBottomSheet copy={copy} onClose={onClose} title={title}>
      <div className={styles.assurance} role="note">
        <strong>{assessmentLabel}</strong>
        <span>완료한 이전 결과는 삭제되지 않아요.</span>
      </div>

      <AssessmentSheetActions>
        {hasActiveAttempt && onResume ? (
          <AssessmentSheetAction disabled={isWorking} onClick={onResume}>
            {resumeLabel}
          </AssessmentSheetAction>
        ) : (
          <AssessmentSheetAction disabled={isWorking} onClick={onRestart}>
            {isWorking ? "새 검사 준비 중" : "처음부터 다시 검사하기"}
          </AssessmentSheetAction>
        )}

        {hasActiveAttempt ? (
          <AssessmentSheetAction
            disabled={isWorking}
            onClick={onRestart}
            variant="secondary"
          >
            {isWorking ? "새 검사 준비 중" : "현재 답을 정리하고 처음부터"}
          </AssessmentSheetAction>
        ) : (
          <AssessmentSheetAction
            disabled={isWorking}
            onClick={onClose}
            variant="secondary"
          >
            취소
          </AssessmentSheetAction>
        )}
      </AssessmentSheetActions>
    </AssessmentBottomSheet>
  );
}
