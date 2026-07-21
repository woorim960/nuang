import { fullCoreAssessment } from "@/features/assessment/full-core-seed";
import { betaCoreAssessment } from "@/features/assessment/beta-core-seed";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import {
  candidateQuickCoreAssessment,
  candidateQuickItemIds,
  isCandidateQuickRelease,
} from "@/features/assessment/candidate-quick-core-seed";
import { quickCoreAssessment } from "@/features/assessment/quick-core-seed";
import { getValidatedLocalResultSnapshot } from "@/features/assessment/assessment-result-snapshot";
import type {
  AssessmentAnswer,
  AssessmentDefinition,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";

type AssessmentResponseReuseManifest = {
  manifestId: string;
  reusableItemIds: readonly string[];
  sourceAssessmentId: string;
  sourceReleaseId: string;
  targetAssessmentId: string;
  targetReleaseId: string;
};

const quickToFullReuseV09: AssessmentResponseReuseManifest = {
  manifestId: "NUANG-QUICK-TO-FULL-REUSE-0.9",
  reusableItemIds: [
    "NU-C17-SERE-01",
    "NU-C17-ERIR-01",
    "NU-C17-SMEP-01",
    "NU-C17-ROEC-01",
    "NU-C17-OEAS-01",
    "NU-C17-SEAI-01",
    "NU-C17-ERWD-01",
    "NU-C17-SMOS-01",
    "NU-C17-RORN-02",
    "NU-C17-OEIE-01",
    "NU-C17-SERE-02",
    "NU-C17-ERIR-03",
    "NU-C17-SMEP-05",
    "NU-C17-ROEC-05",
    "NU-C17-OEAS-03",
    "NU-C17-SEAI-02",
    "NU-C17-ERWD-04",
    "NU-C17-SMOS-02",
    "NU-C17-RORN-03",
    "NU-C17-OEIE-03",
  ],
  sourceAssessmentId: quickCoreAssessment.assessmentId,
  sourceReleaseId: quickCoreAssessment.releaseId,
  targetAssessmentId: fullCoreAssessment.assessmentId,
  targetReleaseId: fullCoreAssessment.releaseId,
};

const candidateQuickToBetaReuseV10: AssessmentResponseReuseManifest = {
  manifestId: "NUANG-QUICK-CANDIDATE-TO-BETA-REUSE-1.0",
  reusableItemIds: candidateQuickItemIds,
  sourceAssessmentId: candidateQuickCoreAssessment.assessmentId,
  sourceReleaseId: candidateQuickCoreAssessment.releaseId,
  targetAssessmentId: betaCoreAssessment.assessmentId,
  targetReleaseId: betaCoreAssessment.releaseId,
};

const candidateQuickToFullReuseV10: AssessmentResponseReuseManifest = {
  manifestId: "NUANG-QUICK-CANDIDATE-TO-FULL-CANDIDATE-REUSE-1.0",
  reusableItemIds: candidateQuickItemIds,
  sourceAssessmentId: candidateQuickCoreAssessment.assessmentId,
  sourceReleaseId: candidateQuickCoreAssessment.releaseId,
  targetAssessmentId: candidateFullCoreAssessment.assessmentId,
  targetReleaseId: candidateFullCoreAssessment.releaseId,
};

const approvedReuseManifests = [
  quickToFullReuseV09,
  candidateQuickToBetaReuseV10,
  candidateQuickToFullReuseV10,
] as const;

export function getApprovedReusableResponses(
  sourceAttempt: LocalAssessmentAttempt | undefined,
  targetAssessment: AssessmentDefinition,
): Record<string, AssessmentAnswer> {
  if (!sourceAttempt || !getValidatedLocalResultSnapshot(sourceAttempt)) {
    return {};
  }

  const manifest = approvedReuseManifests.find(
    (candidate) =>
      candidate.sourceAssessmentId === sourceAttempt.assessmentId &&
      candidate.sourceReleaseId === sourceAttempt.releaseId &&
      candidate.targetAssessmentId === targetAssessment.assessmentId &&
      candidate.targetReleaseId === targetAssessment.releaseId,
  );

  if (!manifest) return {};

  const targetItemIds = new Set(
    targetAssessment.items.map((item) => item.itemId),
  );
  const sourceAssessment = isCandidateQuickRelease(sourceAttempt)
    ? candidateQuickCoreAssessment
    : quickCoreAssessment;
  const sourceItemById = new Map(
    sourceAssessment.items.map((item) => [item.itemId, item]),
  );
  const targetItemById = new Map(
    targetAssessment.items.map((item) => [item.itemId, item]),
  );

  return Object.fromEntries(
    manifest.reusableItemIds.flatMap((itemId) => {
      const response = sourceAttempt.responses[itemId];
      const sourceItem = sourceItemById.get(itemId);
      const targetItem = targetItemById.get(itemId);

      if (
        !targetItemIds.has(itemId) ||
        !response ||
        response.itemId !== itemId ||
        !sourceItem ||
        !targetItem ||
        sourceItem.domainId !== targetItem.domainId ||
        sourceItem.facetId !== targetItem.facetId ||
        sourceItem.isReverse !== targetItem.isReverse
      ) {
        return [];
      }

      return [[itemId, response]];
    }),
  );
}
