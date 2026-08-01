import type { AccountResultSummary } from "@/features/account/account-result-contract";
import { readJsonResponse } from "@/features/account/response-json";

export async function listClientAccountResults(): Promise<
  AccountResultSummary[]
> {
  return (await readClientAccountResults()).results;
}

export async function readClientAccountResults(): Promise<{
  results: AccountResultSummary[];
  state: "error" | "not_requested" | "ready";
}> {
  try {
    const response = await fetch("/api/account-results", {
      cache: "no-store",
      method: "GET",
    });

    if (response.status === 401) return { results: [], state: "not_requested" };
    if (!response.ok) return { results: [], state: "error" };

    const body = await readJsonResponse<{
      ok?: boolean;
      results?: AccountResultSummary[];
    }>(response);

    return body?.ok && Array.isArray(body.results)
      ? { results: body.results, state: "ready" }
      : { results: [], state: "error" };
  } catch {
    return { results: [], state: "error" };
  }
}
