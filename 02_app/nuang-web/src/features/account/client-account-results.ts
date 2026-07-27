import type { AccountResultSummary } from "@/features/account/account-result-contract";
import { readJsonResponse } from "@/features/account/response-json";

export async function listClientAccountResults(): Promise<
  AccountResultSummary[]
> {
  try {
    const response = await fetch("/api/account-results", {
      cache: "no-store",
      method: "GET",
    });

    if (!response.ok) return [];

    const body = await readJsonResponse<{
      ok?: boolean;
      results?: AccountResultSummary[];
    }>(response);

    return body?.ok && Array.isArray(body.results) ? body.results : [];
  } catch {
    return [];
  }
}
