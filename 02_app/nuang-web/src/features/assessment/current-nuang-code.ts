"use client";

import { readClientAccountResults } from "@/features/account/client-account-results";
import type { AccountTraitProfile } from "@/features/assessment/account-trait-profile-contract";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
import { canPromoteCoreResultToRepresentative } from "@/features/assessment/legacy-core-containment-policy";
import { calculateLocalAttemptScore } from "@/features/assessment/local-attempt-score";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";

type CodeCandidate = {
  assessmentReleaseId: string | null;
  code: string;
  completedAt: string;
  kind: "full" | "quick";
  resultReportId: string | null;
};

export async function loadCurrentNuangCode() {
  const [accountState, localCandidates] = await Promise.all([
    loadAccountCodeState(),
    loadLocalCodeCandidates(),
  ]);

  return (
    pickCurrentTraitProfileCode(
      accountState.currentTraitProfile,
      accountState.candidates,
    ) ??
    pickRepresentativeCode([...accountState.candidates, ...localCandidates])
  );
}

export function pickRepresentativeCode(candidates: CodeCandidate[]) {
  const usable = candidates
    .filter(
      (candidate) =>
        isRepresentativeEligibleRelease(candidate.assessmentReleaseId) &&
        Boolean(getCandidateProfileDefinition(candidate.code)),
    )
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt));
  const latestFull = usable.find((candidate) => candidate.kind === "full");

  return latestFull?.code ?? usable[0]?.code ?? null;
}

export function pickCurrentTraitProfileCode(
  currentTraitProfile: AccountTraitProfile | null,
  accountCandidates: CodeCandidate[],
) {
  if (
    !currentTraitProfile ||
    !getCandidateProfileDefinition(currentTraitProfile.code)
  ) {
    return null;
  }

  const baseResult = accountCandidates.find(
    (candidate) =>
      candidate.resultReportId === currentTraitProfile.baseResultReportId,
  );

  return baseResult &&
    isRepresentativeEligibleRelease(baseResult.assessmentReleaseId)
    ? currentTraitProfile.code
    : null;
}

function isRepresentativeEligibleRelease(releaseId: string | null) {
  return canPromoteCoreResultToRepresentative({
    assessmentReleaseId: releaseId,
  });
}

async function loadAccountCodeState(): Promise<{
  candidates: CodeCandidate[];
  currentTraitProfile: AccountTraitProfile | null;
}> {
  const accountRead = await readClientAccountResults();
  if (accountRead.state !== "ready") {
    return { candidates: [], currentTraitProfile: null };
  }

  return {
    candidates: accountRead.results.map((result) => ({
      assessmentReleaseId: result.versionBundle?.assessmentReleaseId ?? null,
      code: result.profileCode,
      completedAt: result.completedAt,
      kind: result.kind,
      resultReportId: result.resultReportId,
    })),
    currentTraitProfile: accountRead.currentTraitProfile,
  };
}

async function loadLocalCodeCandidates(): Promise<CodeCandidate[]> {
  try {
    const attempts = await listLocalAttempts();

    return attempts.flatMap((attempt): CodeCandidate[] => {
      if (attempt.state !== "completed") return [];
      const score = calculateLocalAttemptScore(attempt);
      if (!score?.code) return [];

      return [
        {
          assessmentReleaseId: attempt.releaseId,
          code: score.code,
          completedAt: attempt.completedAt ?? attempt.updatedAt,
          kind: attempt.mode === "full" ? "full" : "quick",
          resultReportId: null,
        },
      ];
    });
  } catch {
    return [];
  }
}
