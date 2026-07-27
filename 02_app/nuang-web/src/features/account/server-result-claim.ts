import {
  AssessmentCompletionError,
  prepareAssessmentCompletion,
} from "@/features/assessment/assessment-completion";
import {
  candidateFullCoreAssessment,
  candidateFullScoringRelease,
} from "@/features/assessment/candidate-full-core-seed";
import {
  candidateQuickCoreAssessment,
  candidateQuickScoringRelease,
} from "@/features/assessment/candidate-quick-core-seed";
import type {
  AssessmentAnswer,
  AssessmentDefinition,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";

export type TrustedClaimPayload = {
  assessmentKind: "full" | "quick";
  localResultId: string;
  responses: Array<Omit<AssessmentAnswer, "value"> & { value?: number }>;
  resultSummary: {
    completedAt: string;
  };
  versionBundle: {
    assessmentReleaseId: string;
    codeSchemeVersion: string;
    scoringModelVersion: string;
    scoringReleaseId: string;
  };
};

export type TrustedClaimResult = {
  assessment: AssessmentDefinition;
  completedAt: string;
  domains: ReturnType<typeof prepareAssessmentCompletion>["result"]["domains"];
  facets: ReturnType<typeof prepareAssessmentCompletion>["result"]["facets"];
  profileCode: string;
  profileName: string;
  responseRows: Array<{
    answeredAt: string;
    itemId: string;
    skipped: boolean;
    unsureReason: AssessmentAnswer["unsureReason"] | null;
    value: number | null;
  }>;
  resultLabel: string;
  trustedRelease: {
    assessmentReleaseId: string;
    codeSchemeVersion: string;
    scoringModelVersion: string;
    scoringReleaseId: string;
  };
};

export function deriveTrustedClaimResult(
  payload: TrustedClaimPayload,
): TrustedClaimResult | null {
  const assessment =
    payload.assessmentKind === "full"
      ? candidateFullCoreAssessment
      : candidateQuickCoreAssessment;
  const scoringRelease =
    payload.assessmentKind === "full"
      ? candidateFullScoringRelease
      : candidateQuickScoringRelease;
  const trustedRelease = {
    assessmentReleaseId: assessment.releaseId,
    codeSchemeVersion: scoringRelease.codeSchemeVersion,
    scoringModelVersion: scoringRelease.scoringModelVersion,
    scoringReleaseId: scoringRelease.scoringReleaseId,
  };

  if (
    !Object.entries(trustedRelease).every(
      ([key, value]) =>
        payload.versionBundle[key as keyof typeof trustedRelease] === value,
    )
  ) {
    return null;
  }

  const validItemIds = new Set([
    ...assessment.items.map((item) => item.itemId),
    ...(assessment.adaptiveItems ?? []).map((item) => item.itemId),
  ]);
  const responseIds = new Set(payload.responses.map((response) => response.itemId));

  if (
    responseIds.size !== payload.responses.length ||
    payload.responses.some(
      (response) =>
        !validItemIds.has(response.itemId) ||
        !(
          (response.isUnsure === true && response.value === undefined) ||
          (response.isUnsure !== true &&
            Number.isInteger(response.value) &&
            response.value !== undefined &&
            response.value >= 1 &&
            response.value <= 5)
        ),
    )
  ) {
    return null;
  }

  const responseById = Object.fromEntries(
    payload.responses.map((response) => [
      response.itemId,
      {
        ...response,
        value: response.value as AssessmentAnswer["value"],
      },
    ]),
  );
  const adaptiveItemIds = (assessment.adaptiveItems ?? [])
    .filter((item) => responseIds.has(item.itemId))
    .map((item) => item.itemId);
  const completedAt = payload.resultSummary.completedAt;
  const attempt: LocalAssessmentAttempt = {
    adaptiveItemIds,
    adaptiveStatus: adaptiveItemIds.length > 0 ? "completed" : undefined,
    assessmentId: assessment.assessmentId,
    completedAt,
    createdAt: completedAt,
    currentIndex: assessment.items.length + adaptiveItemIds.length - 1,
    expiresAt: completedAt,
    id: payload.localResultId,
    itemIds: assessment.items.map((item) => item.itemId),
    localPersistStatus: "saved",
    mode: assessment.mode,
    releaseId: assessment.releaseId,
    responses: responseById,
    state: "completed",
    updatedAt: completedAt,
  };

  try {
    const readiness = prepareAssessmentCompletion(assessment, attempt);
    const { result } = readiness;

    if (
      readiness.evidenceStatus === "insufficient_evidence" ||
      !result.code ||
      !result.profileName
    ) {
      return null;
    }

    return {
      assessment,
      completedAt,
      domains: result.domains,
      facets: result.facets,
      profileCode: result.code,
      profileName: result.profileName,
      responseRows: payload.responses.map((response) => ({
        answeredAt: response.answeredAt,
        itemId: response.itemId,
        skipped: response.isUnsure === true,
        unsureReason: response.unsureReason ?? null,
        value: response.value ?? null,
      })),
      resultLabel: assessment.resultLabel,
      trustedRelease,
    };
  } catch (error) {
    if (error instanceof AssessmentCompletionError) {
      return null;
    }

    throw error;
  }
}
