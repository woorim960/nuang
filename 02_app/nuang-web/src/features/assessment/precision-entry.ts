import { fullCoreAssessment } from "@/features/assessment/full-core-seed";
import { betaCoreAssessment } from "@/features/assessment/beta-core-seed";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import { candidateQuickCoreAssessment } from "@/features/assessment/candidate-quick-core-seed";
import { quickCoreAssessment } from "@/features/assessment/quick-core-seed";
import { getValidatedLocalResultSnapshot } from "@/features/assessment/assessment-result-snapshot";
import { getApprovedReusableResponses } from "@/features/assessment/assessment-response-reuse";
import type {
  AssessmentDefinition,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";

export type PrecisionEntrySource =
  "code-map-gate" | "compare-gate" | "deep-link" | "first-result" | "home";

export type LocalPrecisionEntryDecision =
  | {
      action: "redirect_attempt";
      attempt: LocalAssessmentAttempt;
    }
  | {
      action: "redirect_first_assessment";
    }
  | {
      action: "redirect_report";
      attempt: LocalAssessmentAttempt;
    }
  | {
      action: "show_intro";
      provisionalCode: string | null;
      reusableAnswerCount: number;
      sourceAttempt: LocalAssessmentAttempt | undefined;
    };

export function resolveLocalPrecisionEntry(
  attempts: LocalAssessmentAttempt[],
  options: {
    assessment?: AssessmentDefinition;
    requireQuickPrerequisite?: boolean;
  } = {},
): LocalPrecisionEntryDecision {
  const assessment = options.assessment ?? fullCoreAssessment;
  const requireQuickPrerequisite = options.requireQuickPrerequisite ?? true;
  const fullAttempts = attempts
    .filter(
      (attempt) =>
        attempt.assessmentId === assessment.assessmentId &&
        attempt.releaseId === assessment.releaseId,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const completed = fullAttempts.find(
    (attempt) =>
      attempt.state === "completed" &&
      getValidatedLocalResultSnapshot(attempt) !== null,
  );
  const active = fullAttempts.find(
    (attempt) => attempt.state === "in_progress",
  );

  const completedAt = completed?.completedAt ?? completed?.updatedAt;
  const activeWasStartedAfterCompletedResult =
    active !== undefined &&
    (completedAt === undefined ||
      active.updatedAt.localeCompare(completedAt) > 0);

  if (activeWasStartedAfterCompletedResult) {
    return { action: "redirect_attempt", attempt: active };
  }

  if (completed) {
    return { action: "redirect_report", attempt: completed };
  }

  if (active) {
    return { action: "redirect_attempt", attempt: active };
  }

  if (!requireQuickPrerequisite) {
    return {
      action: "show_intro",
      provisionalCode: null,
      reusableAnswerCount: 0,
      sourceAttempt: undefined,
    };
  }

  const prerequisiteQuickAssessment =
    assessment.assessmentId === betaCoreAssessment.assessmentId ||
    assessment.releaseId === candidateFullCoreAssessment.releaseId
      ? candidateQuickCoreAssessment
      : quickCoreAssessment;
  const quickCompleted = attempts
    .filter(
      (attempt) =>
        attempt.assessmentId === prerequisiteQuickAssessment.assessmentId &&
        attempt.releaseId === prerequisiteQuickAssessment.releaseId &&
        attempt.state === "completed" &&
        getValidatedLocalResultSnapshot(attempt) !== null,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (!quickCompleted) {
    return { action: "redirect_first_assessment" };
  }

  return {
    action: "show_intro",
    provisionalCode: quickCompleted.resultSnapshot?.scoreResult.code ?? null,
    reusableAnswerCount: Object.keys(
      getApprovedReusableResponses(quickCompleted, assessment),
    ).length,
    sourceAttempt: quickCompleted,
  };
}

export function sanitizePrecisionDestination(
  value: string | null | undefined,
): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;

  const allowedRoutes = [
    "/assessments",
    "/home",
    "/map",
    "/my",
    "/results/local/",
    "/together",
  ];
  return allowedRoutes.some(
    (route) =>
      value === route ||
      (route.endsWith("/")
        ? value.startsWith(route)
        : value.startsWith(`${route}/`)),
  )
    ? value
    : null;
}

export function parsePrecisionEntrySource(
  value: string | null | undefined,
): PrecisionEntrySource {
  if (
    value === "code-map-gate" ||
    value === "compare-gate" ||
    value === "first-result" ||
    value === "home"
  ) {
    return value;
  }

  return "deep-link";
}

export function buildPrecisionIntroHref({
  backDestination,
  entrySource,
  returnDestination,
}: {
  backDestination?: string | null;
  entrySource: PrecisionEntrySource;
  returnDestination?: string | null;
}) {
  const params = new URLSearchParams({ from: entrySource });
  const safeBack = sanitizePrecisionDestination(backDestination);
  const safeReturn = sanitizePrecisionDestination(returnDestination);

  if (safeBack) params.set("backTo", safeBack);
  if (safeReturn) params.set("returnTo", safeReturn);

  return `/assessments/nu-core-full?${params.toString()}`;
}
