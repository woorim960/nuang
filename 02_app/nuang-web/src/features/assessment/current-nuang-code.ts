"use client";

import type { AccountResultSummary } from "@/features/account/account-result-contract";
import {
  listLocalAttempts,
} from "@/features/assessment/assessment-storage";
import { calculateLocalAttemptScore } from "@/features/assessment/local-attempt-score";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";

type CodeCandidate = {
  code: string;
  completedAt: string;
  kind: "full" | "quick";
};

export async function loadCurrentNuangCode() {
  const [accountCandidates, localCandidates] = await Promise.all([
    loadAccountCodeCandidates(),
    loadLocalCodeCandidates(),
  ]);

  return pickRepresentativeCode([...accountCandidates, ...localCandidates]);
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

async function loadAccountCodeCandidates(): Promise<CodeCandidate[]> {
  try {
    const response = await fetch("/api/account-results", {
      cache: "no-store",
      method: "GET",
    });
    if (!response.ok) return [];

    const payload = (await response.json()) as {
      ok?: boolean;
      results?: AccountResultSummary[];
    };
    if (!payload.ok || !Array.isArray(payload.results)) return [];

    return payload.results.map((result) => ({
      code: result.profileCode,
      completedAt: result.completedAt,
      kind: result.kind,
    }));
  } catch {
    return [];
  }
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
