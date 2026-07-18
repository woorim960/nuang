import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  parseStoredAccountResultSummary,
  type AccountResultReadFailureCode,
  type AccountResultSummary,
} from "@/features/account/account-result-contract";
import type {
  ResultAccountStatus,
  ResultAccountStatusReadFailureCode,
} from "@/features/account/result-account-status";

type ServiceClient = SupabaseClient;

export type AccountResultsReadResult =
  | { data: AccountResultSummary[]; ok: true }
  | { code: AccountResultReadFailureCode; ok: false };

export type ResultAccountStatusReadResult =
  | { data: ResultAccountStatus | null; ok: true }
  | { code: ResultAccountStatusReadFailureCode; ok: false };

export async function readResultAccountStatus({
  client,
  localResultId,
  user,
}: {
  client: ServiceClient;
  localResultId: string;
  user: User;
}): Promise<ResultAccountStatusReadResult> {
  const accountResponse = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", user.id)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (accountResponse.error) {
    return { code: "account_status_read_failed", ok: false };
  }

  if (!accountResponse.data) {
    return { data: null, ok: true };
  }

  const accountId = (accountResponse.data as { account_id: string }).account_id;
  const attemptResponse = await client
    .schema("assessment")
    .from("assessment_attempt")
    .select("id, claimed_at")
    .eq("account_id", accountId)
    .eq("local_result_id", localResultId)
    .maybeSingle();

  if (attemptResponse.error) {
    return { code: "account_status_read_failed", ok: false };
  }

  if (!attemptResponse.data) {
    return { data: null, ok: true };
  }

  const attempt = attemptResponse.data as { claimed_at: string; id: string };
  const reportResponse = await client
    .schema("report")
    .from("result_report")
    .select("id, profile_code, profile_name")
    .eq("account_id", accountId)
    .eq("attempt_id", attempt.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (reportResponse.error || !reportResponse.data) {
    return { code: "result_report_status_read_failed", ok: false };
  }

  const report = reportResponse.data as {
    id: string;
    profile_code: string;
    profile_name: string;
  };
  const shareLinksResponse = await client
    .schema("sharing")
    .from("share_link")
    .select("id, expires_at")
    .eq("account_id", accountId)
    .eq("result_report_id", report.id)
    .eq("status", "active")
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false });

  if (shareLinksResponse.error) {
    return { code: "share_link_status_read_failed", ok: false };
  }

  const shareLinks = (shareLinksResponse.data ?? []) as Array<{
    expires_at: string;
    id: string;
  }>;

  return {
    data: {
      activeShareLinkCount: shareLinks.length,
      activeShareLinks: shareLinks.map((shareLink) => ({
        expiresAt: shareLink.expires_at,
        id: shareLink.id,
      })),
      assessmentAttemptId: attempt.id,
      claimedAt: attempt.claimed_at,
      latestShareExpiresAt: shareLinks[0]?.expires_at ?? null,
      profileCode: report.profile_code,
      profileName: report.profile_name,
      resultReportId: report.id,
    },
    ok: true,
  };
}

export async function readAccountResults({
  client,
  resultReportId,
  user,
}: {
  client: ServiceClient;
  resultReportId?: string;
  user: User;
}): Promise<AccountResultsReadResult> {
  const account = await readAccountId(client, user);

  if (!account.ok) {
    return { code: "account_results_read_failed", ok: false };
  }

  if (!account.accountId) {
    return { data: [], ok: true };
  }

  let reportQuery = client
    .schema("report")
    .from("result_report")
    .select(
      "id, attempt_id, report_kind, profile_code, profile_name, summary, created_at",
    )
    .eq("account_id", account.accountId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (resultReportId) {
    reportQuery = reportQuery.eq("id", resultReportId);
  }

  const reportResponse = await reportQuery;

  if (reportResponse.error) {
    return { code: "account_results_read_failed", ok: false };
  }

  const reports = (reportResponse.data ?? []) as AccountResultReportRow[];

  if (reports.length === 0) {
    return { data: [], ok: true };
  }

  const attemptResponse = await client
    .schema("assessment")
    .from("assessment_attempt")
    .select("id, local_result_id, completed_at, claimed_at")
    .eq("account_id", account.accountId)
    .in(
      "id",
      reports.map((report) => report.attempt_id),
    );

  if (attemptResponse.error) {
    return { code: "account_result_attempts_read_failed", ok: false };
  }

  const attempts = new Map(
    (
      (attemptResponse.data ?? []) as Array<{
        claimed_at: string;
        completed_at: string | null;
        id: string;
        local_result_id: string | null;
      }>
    ).map((attempt) => [attempt.id, attempt]),
  );
  const results = reports.flatMap((report): AccountResultSummary[] => {
    const attempt = attempts.get(report.attempt_id);
    const parsedSummary = parseStoredAccountResultSummary(report.summary);

    if (!attempt || !parsedSummary.success) return [];

    return [
      {
        assessmentAttemptId: attempt.id,
        completedAt:
          parsedSummary.data.completedAt ??
          attempt.completed_at ??
          attempt.claimed_at,
        createdAt: report.created_at,
        domains: parsedSummary.data.domains,
        facets: parsedSummary.data.facets,
        kind: report.report_kind,
        localResultId: attempt.local_result_id,
        profileCode: report.profile_code,
        profileName: report.profile_name,
        resultLabel:
          parsedSummary.data.resultLabel ??
          (report.report_kind === "full" ? "현재 대표 성향" : "예비 성향"),
        resultReportId: report.id,
      },
    ];
  });

  return { data: results, ok: true };
}

type AccountResultReportRow = {
  attempt_id: string;
  created_at: string;
  id: string;
  profile_code: string;
  profile_name: string;
  report_kind: "full" | "quick";
  summary: unknown;
};

async function readAccountId(client: ServiceClient, user: User) {
  const accountResponse = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", user.id)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (accountResponse.error) {
    return { accountId: null, ok: false as const };
  }

  return {
    accountId: accountResponse.data
      ? (accountResponse.data as { account_id: string }).account_id
      : null,
    ok: true as const,
  };
}
