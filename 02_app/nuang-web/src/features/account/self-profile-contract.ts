import type { AccountResultSummary } from "@/features/account/account-result-contract";
import type { AccountAssessmentProgressEntry } from "@/features/assessment/account-assessment-progress-contract";
import { buildPrecisionIntroHref } from "@/features/assessment/precision-entry";
import type { FeedItem } from "@/features/feed/feed-seed";
import type { PublicProfileImage } from "@/features/public-profile/profile-image";
import type { OriginalProfileReportSummary } from "@/features/public-profile/profile-report-contract";
import { buildAccountCoreResultHref } from "@/features/result/unified-core-report/core-result-route-contract";

export type SelfAssessmentJourney =
  | { state: "not_started" }
  | {
      answeredCount: number;
      assessmentKind: "full" | "quick";
      href: string;
      resumeOrdinal: number;
      state: "in_progress";
      totalCount: number;
    }
  | {
      fullStartHref: string;
      reportHref: string;
      state: "quick_completed";
    }
  | { reportHref: string; state: "full_completed" }
  | { state: "unavailable" };

export type SelfProfilePayload = {
  assessmentJourney: SelfAssessmentJourney;
  capabilities: {
    canEdit: true;
    canShare: boolean;
    showAdminEntry: boolean;
  };
  contentState: {
    posts: "ready" | "unavailable";
    reports: "ready" | "unavailable";
    trait: "ready" | "unavailable";
  };
  posts: FeedItem[];
  profile: {
    bio: string;
    displayName: string;
    handle: string;
    image: PublicProfileImage;
    publicId: string;
    publicSnapshotId: string | null;
  };
  reports: OriginalProfileReportSummary[];
  stats: {
    followers: number | null;
    following: number | null;
    posts: number | null;
    reports: number | null;
  };
  trait: {
    code: string;
    completedAt: string;
    profileName: string;
    source: "full" | "quick";
  } | null;
  viewerCode: string | null;
};

export function buildSelfAssessmentJourney({
  attempts,
  results,
  resultsAvailable = true,
}: {
  attempts: AccountAssessmentProgressEntry[];
  results: AccountResultSummary[];
  resultsAvailable?: boolean;
}): SelfAssessmentJourney {
  const latestActive = (assessmentId: "nu-core-full" | "nu-core-quick") =>
    attempts
      .filter(
        (entry) =>
          entry.attempt.state === "in_progress" &&
          entry.attempt.assessmentId === assessmentId,
      )
      .sort((left, right) =>
        right.attempt.updatedAt.localeCompare(left.attempt.updatedAt),
      )[0];
  const active = latestActive("nu-core-full") ?? latestActive("nu-core-quick");

  if (active) {
    const attempt = active.attempt;
    const itemIds = [
      ...new Set([...attempt.itemIds, ...(attempt.adaptiveItemIds ?? [])]),
    ];
    const answeredCount = itemIds.filter((itemId) =>
      Object.hasOwn(attempt.responses, itemId),
    ).length;
    const totalCount = itemIds.length;
    const isFull = attempt.assessmentId === "nu-core-full";

    return {
      answeredCount,
      assessmentKind: isFull ? "full" : "quick",
      href: isFull
        ? buildPrecisionIntroHref({
            backDestination: "/my?tab=reports",
            entrySource: "home",
            returnDestination: "/my?tab=reports",
          })
        : "/assessments/nu-core-quick?returnTo=%2Fmy%3Ftab%3Dreports",
      resumeOrdinal: clamp(
        attempt.currentIndex + 1,
        1,
        Math.max(1, totalCount),
      ),
      state: "in_progress",
      totalCount,
    };
  }

  if (!resultsAvailable) return { state: "unavailable" };

  const fullResult = results.find((result) => result.kind === "full");
  if (fullResult) {
    return {
      reportHref: buildAccountCoreResultHref({
        backHref: "/my?tab=reports",
        resultReportId: fullResult.resultReportId,
      }),
      state: "full_completed",
    };
  }

  const quickResult = results.find((result) => result.kind === "quick");
  if (quickResult) {
    return {
      fullStartHref: buildPrecisionIntroHref({
        backDestination: "/my?tab=reports",
        entrySource: "first-result",
        returnDestination: "/my?tab=reports",
      }),
      reportHref: buildAccountCoreResultHref({
        backHref: "/my?tab=reports",
        resultReportId: quickResult.resultReportId,
      }),
      state: "quick_completed",
    };
  }

  if (attempts.some((entry) => entry.attempt.state === "completed")) {
    return { state: "unavailable" };
  }

  return { state: "not_started" };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
