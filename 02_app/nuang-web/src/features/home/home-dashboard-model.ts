import { isCandidateFullRelease } from "@/features/assessment/candidate-full-core-seed";
import { isCandidateQuickRelease } from "@/features/assessment/candidate-quick-core-seed";
import { getValidatedLocalResultSnapshot } from "@/features/assessment/assessment-result-snapshot";
import { buildPrecisionIntroHref } from "@/features/assessment/precision-entry";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";

export type HomeResultModel = {
  code: string;
  href: string;
  profileName: string;
  summary: string;
};

export type HomeHeroModel =
  | {
      kind: "empty";
      href: string;
    }
  | {
      kind: "in_progress";
      adaptive: boolean;
      answered: number;
      assessmentLabel: string;
      href: string;
      latestResult: HomeResultModel | null;
      progress: number;
      total: number;
    }
  | {
      kind: "quick_complete";
      precisionHref: string;
      result: HomeResultModel;
    }
  | {
      kind: "full_complete";
      result: HomeResultModel;
    };

export type HomeDashboardModel = {
  hero: HomeHeroModel;
};

export function buildHomeDashboardModel(
  attempts: LocalAssessmentAttempt[],
): HomeDashboardModel {
  const activeFull = getLatestAttempt(
    attempts,
    (attempt) =>
      attempt.state === "in_progress" && isCandidateFullRelease(attempt),
  );
  const activeQuick = getLatestAttempt(
    attempts,
    (attempt) =>
      attempt.state === "in_progress" && isCandidateQuickRelease(attempt),
  );
  const fullResult = getLatestValidResult(attempts, isCandidateFullRelease);
  const quickResult = getLatestValidResult(attempts, isCandidateQuickRelease);
  const activeAttempt = activeFull ?? activeQuick;

  if (activeAttempt) {
    const answered = activeAttempt.itemIds.filter(
      (itemId) => activeAttempt.responses[itemId],
    ).length;
    const total = activeAttempt.itemIds.length;

    return {
      hero: {
        adaptive:
          activeAttempt.adaptiveStatus === "intro" ||
          activeAttempt.adaptiveStatus === "in_progress",
        answered,
        assessmentLabel:
          activeAttempt.mode === "full" ? "정밀 성향 검사" : "첫 성향 검사",
        href:
          activeAttempt.mode === "full"
            ? buildPrecisionIntroHref({
                backDestination: "/home",
                entrySource: "home",
                returnDestination: "/home",
              })
            : "/assessments/nu-core-quick?returnTo=%2Fhome",
        kind: "in_progress",
        latestResult: fullResult ?? quickResult,
        progress: total > 0 ? Math.round((answered / total) * 100) : 0,
        total,
      },
    };
  }

  if (fullResult) {
    return { hero: { kind: "full_complete", result: fullResult } };
  }

  if (quickResult) {
    return {
      hero: {
        kind: "quick_complete",
        precisionHref: buildPrecisionIntroHref({
          backDestination: quickResult.href,
          entrySource: "first-result",
          returnDestination: "/home",
        }),
        result: quickResult,
      },
    };
  }

  return {
    hero: {
      href: "/assessments/nu-core-quick?returnTo=%2Fhome",
      kind: "empty",
    },
  };
}

function getLatestAttempt(
  attempts: LocalAssessmentAttempt[],
  predicate: (attempt: LocalAssessmentAttempt) => boolean,
) {
  return [...attempts]
    .filter(predicate)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

function getLatestValidResult(
  attempts: LocalAssessmentAttempt[],
  isSupportedRelease: (attempt: LocalAssessmentAttempt) => boolean,
): HomeResultModel | null {
  const entry = [...attempts]
    .filter(
      (attempt) => attempt.state === "completed" && isSupportedRelease(attempt),
    )
    .map((attempt) => ({
      attempt,
      snapshot: getValidatedLocalResultSnapshot(attempt),
    }))
    .filter(
      (
        entry,
      ): entry is {
        attempt: LocalAssessmentAttempt;
        snapshot: NonNullable<
          ReturnType<typeof getValidatedLocalResultSnapshot>
        >;
      } =>
        Boolean(
          entry.snapshot?.scoreResult.code &&
          entry.snapshot.scoreResult.profileName,
        ),
    )
    .sort((a, b) =>
      (b.attempt.completedAt ?? b.attempt.updatedAt).localeCompare(
        a.attempt.completedAt ?? a.attempt.updatedAt,
      ),
    )[0];

  if (!entry) return null;

  const code = entry.snapshot.scoreResult.code;
  const profileName = entry.snapshot.scoreResult.profileName;
  if (!code || !profileName) return null;
  const definition = getCandidateProfileDefinition(code);

  return {
    code,
    href: `/results/local/${entry.attempt.id}`,
    profileName,
    summary:
      definition?.overview[0]?.text ??
      "검사에서 반복해서 나타난 내 모습을 자세히 살펴볼 수 있어요.",
  };
}
