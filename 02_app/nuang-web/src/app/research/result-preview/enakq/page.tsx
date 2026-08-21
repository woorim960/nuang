import { notFound } from "next/navigation";

import { CandidateCoreResultView } from "@/features/result/CandidateCoreResultView";
import { prepareAssessmentCompletion } from "@/features/assessment/assessment-completion";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { coreResultCopyVersion } from "@/features/result/report-copy";

/** 내부 검토용: ENAKQ 정밀 결과 화면을 실제 결과 컴포넌트로 확인합니다. */
export default function EnakqResultPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const completedAt = "2026-07-22T00:00:00.000Z";
  const responses = Object.fromEntries(
    candidateFullCoreAssessment.items.map((item) => [
      item.itemId,
      {
        answeredAt: completedAt,
        itemId: item.itemId,
        value: item.isReverse ? (1 as const) : (5 as const),
      },
    ]),
  );
  const draft: LocalAssessmentAttempt = {
    assessmentId: candidateFullCoreAssessment.assessmentId,
    completedAt,
    completionStatus: "completed",
    createdAt: completedAt,
    currentIndex: candidateFullCoreAssessment.items.length - 1,
    expiresAt: "2026-08-01T00:00:00.000Z",
    id: "local_enakq_result_preview",
    itemIds: candidateFullCoreAssessment.items.map((item) => item.itemId),
    localPersistStatus: "saved",
    mode: "full",
    releaseId: candidateFullCoreAssessment.releaseId,
    responses,
    state: "completed",
    updatedAt: completedAt,
  };
  const readiness = prepareAssessmentCompletion(
    candidateFullCoreAssessment,
    draft,
  );
  const attempt: LocalAssessmentAttempt = {
    ...draft,
    responseSnapshotHash: readiness.responseSnapshotHash,
    resultCopyVersion: coreResultCopyVersion,
    resultEvidenceStatus: readiness.evidenceStatus,
    resultSnapshot: {
      ...readiness.versionBundle,
      createdAt: completedAt,
      responseSnapshotHash: readiness.responseSnapshotHash,
      resultCopyVersion: coreResultCopyVersion,
      resultStatus: "ready",
      scoreResult: readiness.result,
    },
  };

  return (
    <CandidateCoreResultView attempt={attempt} result={readiness.result} />
  );
}
