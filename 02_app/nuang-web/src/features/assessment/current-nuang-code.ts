"use client";

import { readClientAccountResults } from "@/features/account/client-account-results";
import type { AccountTraitProfile } from "@/features/assessment/account-trait-profile-contract";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
import { calculateLocalAttemptScore } from "@/features/assessment/local-attempt-score";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";

type CodeCandidate = {
  code: string;
  completedAt: string;
  kind: "full" | "quick";
};

export async function loadCurrentNuangCode() {
  const [accountState, localCandidates] = await Promise.all([
    loadAccountCodeState(),
    loadLocalCodeCandidates(),
  ]);

  return (
    accountState.currentTraitProfile?.code ??
    pickRepresentativeCode([...accountState.candidates, ...localCandidates])
  );
}

export function pickRepresentativeCode(candidates: CodeCandidate[]) {
  const usable = candidates
    .filter((candidate) =>
      Boolean(getCandidateProfileDefinition(candidate.code)),
    )
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt));
  const latestFull = usable.find((candidate) => candidate.kind === "full");

  return latestFull?.code ?? usable[0]?.code ?? null;
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
      code: result.profileCode,
      completedAt: result.completedAt,
      kind: result.kind,
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
          code: score.code,
          completedAt: attempt.completedAt ?? attempt.updatedAt,
          kind: attempt.mode === "full" ? "full" : "quick",
        },
      ];
    });
  } catch {
    return [];
  }
}
