import { CandidateCoreResultView } from "@/features/result/CandidateCoreResultView";
import {
  betaCoreAssessment,
  betaScoringRelease,
} from "@/features/assessment/beta-core-seed";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { calculateCoreScore } from "@/lib/scoring/core";

/** 내부 검토용: ENAKQ 정밀 결과 화면을 실제 결과 컴포넌트로 확인합니다. */
export default function EnakqResultPreviewPage() {
  const completedAt = "2026-07-22T00:00:00.000Z";
  const responses = Object.fromEntries(
    betaCoreAssessment.items.map((item) => [
      item.itemId,
      {
        answeredAt: completedAt,
        itemId: item.itemId,
        value: item.isReverse ? (1 as const) : (5 as const),
      },
    ]),
  );
  const attempt: LocalAssessmentAttempt = {
    assessmentId: betaCoreAssessment.assessmentId,
    completedAt,
    completionStatus: "completed",
    createdAt: completedAt,
    currentIndex: betaCoreAssessment.items.length - 1,
    expiresAt: "2026-08-01T00:00:00.000Z",
    id: "local_enakq_result_preview",
    itemIds: betaCoreAssessment.items.map((item) => item.itemId),
    mode: "full",
    releaseId: betaCoreAssessment.releaseId,
    responses,
    state: "completed",
    updatedAt: completedAt,
  };
  const result = calculateCoreScore(
    betaScoringRelease,
    Object.values(responses),
  );

  return <CandidateCoreResultView attempt={attempt} result={result} />;
}
