import type { AccountResultSummary } from "@/features/account/account-result-contract";
import type { AccountTraitProfile } from "@/features/assessment/account-trait-profile-contract";
import { readJsonResponse } from "@/features/account/response-json";

export async function listClientAccountResults(): Promise<
  AccountResultSummary[]
> {
  return (await readClientAccountResults()).results;
}

export async function readClientAccountResults(): Promise<{
  currentTraitProfile: AccountTraitProfile | null;
  results: AccountResultSummary[];
  state: "error" | "not_requested" | "ready";
}> {
  try {
    const response = await fetch("/api/account-results", {
      cache: "no-store",
      method: "GET",
    });

    if (response.status === 401) {
      return { currentTraitProfile: null, results: [], state: "not_requested" };
    }
    if (!response.ok) {
      return { currentTraitProfile: null, results: [], state: "error" };
    }

    const body = await readJsonResponse<{
      ok?: boolean;
      currentTraitProfile?: AccountTraitProfile | null;
      results?: AccountResultSummary[];
    }>(response);

    return body?.ok && Array.isArray(body.results)
      ? {
          currentTraitProfile: body.currentTraitProfile ?? null,
          results: body.results,
          state: "ready",
        }
      : { currentTraitProfile: null, results: [], state: "error" };
  } catch {
    return { currentTraitProfile: null, results: [], state: "error" };
  }
}
