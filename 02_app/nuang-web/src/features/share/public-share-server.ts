import { createPublicShareSuccessPayload } from "@/features/share/public-share-contract";
import { hashShareToken } from "@/features/account/server-writes";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";
import {
  createSupabaseServiceClient,
  getSupabaseServiceEnv,
} from "@/lib/supabase/service";

type PublicShareReadResult =
  | {
      payload: ReturnType<typeof createPublicShareSuccessPayload>;
      status: "active";
    }
  | {
      status: "closed";
    }
  | {
      status: "expired" | "not_found" | "revoked";
    };

type ShareSummary = {
  assessmentKind?: unknown;
  completedAt?: unknown;
  domains?: unknown;
  profileCode?: unknown;
  profileName?: unknown;
  resultLabel?: unknown;
};

export async function readPublicShareToken(
  token: string,
): Promise<PublicShareReadResult> {
  const client = createSupabaseServiceClient();
  const env = getSupabaseServiceEnv();

  if (!client || !env) {
    return { status: "closed" };
  }

  const tokenHash = hashShareToken(token, env.shareTokenPepper);
  const shareResponse = await client
    .schema("sharing")
    .from("share_link")
    .select("id, expires_at, result_report_id, status")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (shareResponse.error || !shareResponse.data) {
    return { status: "not_found" };
  }

  const share = shareResponse.data as {
    expires_at: string;
    result_report_id: string;
    status: string;
  };

  if (share.status === "revoked") {
    return { status: "revoked" };
  }

  if (share.status === "expired" || new Date(share.expires_at).getTime() < Date.now()) {
    return { status: "expired" };
  }

  const reportResponse = await client
    .schema("report")
    .from("result_report")
    .select("report_kind, share_summary")
    .eq("id", share.result_report_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (reportResponse.error || !reportResponse.data) {
    return { status: "not_found" };
  }

  const report = reportResponse.data as {
    report_kind?: unknown;
    share_summary: ShareSummary;
  };
  const shareSummary = report.share_summary;
  const profileCode = stringOrFallback(shareSummary.profileCode, "-----");
  const profileName =
    getCandidateProfileDefinition(profileCode)?.displayName ??
    stringOrFallback(shareSummary.profileName, "공유 결과");

  return {
    payload: createPublicShareSuccessPayload({
      assessmentKind: normalizeAssessmentKind(
        shareSummary.assessmentKind ?? report.report_kind,
      ),
      completedAt: stringOrFallback(shareSummary.completedAt, ""),
      domains: normalizeDomains(shareSummary.domains),
      profileCode,
      profileName,
      resultLabel: stringOrFallback(
        shareSummary.resultLabel,
        "현재 가장 가까운 대표 성향",
      ),
    }),
    status: "active",
  };
}

function normalizeDomains(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, 5).map((item) => ({
    domainId: stringOrFallback(item?.domainId, ""),
    label: stringOrFallback(item?.label, ""),
    score: numberOrNull(item?.score),
    symbol: stringOrNull(item?.symbol),
  }));
}

function stringOrFallback(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeAssessmentKind(value: unknown) {
  return value === "full" ? "full" : "quick";
}
