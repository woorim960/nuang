import type {
  AccountComparisonReportSummary,
  AccountResultSummary,
} from "@/features/account/account-result-contract";
import type { AccountTraitProfile } from "@/features/assessment/account-trait-profile-contract";
import { readJsonResponse } from "@/features/account/response-json";
import {
  readCurrentSupabaseUserId,
  verifyStableResultAuthScope,
} from "@/features/result-persistence/client-result-scope";

export type ClientAccountResultsRead = {
  comparisonReports: AccountComparisonReportSummary[];
  currentTraitProfile: AccountTraitProfile | null;
  responseStatus?: number;
  results: AccountResultSummary[];
  state: "error" | "not_requested" | "ready";
};

export async function listClientAccountResults(): Promise<
  AccountResultSummary[]
> {
  return (await readClientAccountResults()).results;
}

export async function readClientAccountResults({
  resultReportId,
}: {
  resultReportId?: string;
} = {}): Promise<ClientAccountResultsRead> {
  const emptyRead = (
    state: ClientAccountResultsRead["state"],
    responseStatus?: number,
  ): ClientAccountResultsRead => ({
    comparisonReports: [],
    currentTraitProfile: null,
    ...(responseStatus === undefined ? {} : { responseStatus }),
    results: [],
    state,
  });

  try {
    const requestUserId = await readCurrentSupabaseUserId();
    if (!requestUserId) return emptyRead("not_requested");

    const endpoint = resultReportId
      ? `/api/account-results?resultReportId=${encodeURIComponent(resultReportId)}`
      : "/api/account-results";
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        "x-nuang-auth-user-id": requestUserId,
      },
      method: "GET",
    });

    if (response.status === 401) {
      return emptyRead("not_requested", response.status);
    }
    if (!response.ok) {
      return emptyRead("error", response.status);
    }

    const body = await readJsonResponse<{
      authUserId?: string;
      comparisonReports?: AccountComparisonReportSummary[];
      ok?: boolean;
      currentTraitProfile?: AccountTraitProfile | null;
      results?: AccountResultSummary[];
    }>(response);
    const stableUserId = await verifyStableResultAuthScope({
      requestUserId,
      responseUserId: body?.authUserId,
    });

    return body?.ok && Array.isArray(body.results) && stableUserId
      ? {
          comparisonReports: Array.isArray(body.comparisonReports)
            ? body.comparisonReports
            : [],
          currentTraitProfile: body.currentTraitProfile ?? null,
          responseStatus: response.status,
          results: body.results,
          state: "ready",
        }
      : emptyRead("error", response.status);
  } catch {
    return emptyRead("error");
  }
}
