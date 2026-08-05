import { hashShareToken } from "@/features/account/server-writes";
import { readCoreResultPublicationDecision } from "@/features/assessment/server-core-result-publication-policy";
import { adaptPublicCoreResult } from "@/features/result/unified-core-report/core-result-report-adapter";
import type { CoreResultReportModel } from "@/features/result/unified-core-report/core-result-report-model";
import type { ReportShareContent } from "@/features/share/report-share-contract";
import { resolveRichReportShareContent } from "@/features/share/report-share-rich-projection";
import { readGuestReportShareToken } from "@/features/share/server-guest-report-share-token";
import {
  createSupabaseServiceClient,
  getSupabaseServiceEnv,
} from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PublicShareReadResult =
  | {
      model: CoreResultReportModel;
      shareKind: "account_core";
      status: "active";
    }
  | {
      content: ReportShareContent;
      shareKind: "guest_summary";
      status: "active";
    }
  | {
      status: "closed";
    }
  | {
      status: "blocked" | "expired" | "not_found" | "revoked";
    };

export async function readPublicShareToken(
  token: string,
): Promise<PublicShareReadResult> {
  const guestShare = readGuestReportShareToken(token);
  if (guestShare.status === "active") {
    return {
      content: resolveRichReportShareContent(guestShare.content),
      shareKind: "guest_summary",
      status: "active",
    };
  }
  if (guestShare.status === "expired") return { status: "expired" };
  if (guestShare.status === "invalid") return { status: "not_found" };
  if (guestShare.status === "unavailable") return { status: "closed" };

  const client = createSupabaseServiceClient();
  const env = getSupabaseServiceEnv();

  if (!client || !env) {
    return { status: "closed" };
  }

  const tokenHash = hashShareToken(token, env.shareTokenPepper);
  const shareResponse = await client
    .schema("sharing")
    .from("share_link")
    .select("account_id, id, expires_at, result_report_id, status")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (shareResponse.error || !shareResponse.data) {
    return { status: "not_found" };
  }

  const share = shareResponse.data as {
    account_id: string;
    expires_at: string;
    result_report_id: string;
    status: string;
  };

  const viewerAccess = await readViewerShareAccess({
    client,
    ownerAccountId: share.account_id,
  });
  if (viewerAccess === "error") return { status: "closed" };
  if (viewerAccess === "blocked") return { status: "blocked" };

  if (share.status === "revoked") {
    return { status: "revoked" };
  }

  if (
    share.status === "expired" ||
    new Date(share.expires_at).getTime() < Date.now()
  ) {
    return { status: "expired" };
  }

  const publication = await readCoreResultPublicationDecision({
    client,
    ownerAccountId: share.account_id,
    resultReportId: share.result_report_id,
  });
  if (!publication.eligible) return { status: "not_found" };

  const reportResponse = await client
    .schema("report")
    .from("result_report")
    .select(
      "id, attempt_id, report_kind, profile_code, profile_name, created_at",
    )
    .eq("id", share.result_report_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (reportResponse.error || !reportResponse.data) {
    return { status: "not_found" };
  }

  const report = reportResponse.data as {
    attempt_id: string;
    created_at: string;
    id: string;
    profile_code: string | null;
    profile_name: string | null;
    report_kind: string;
  };
  if (
    (report.report_kind !== "quick" && report.report_kind !== "full") ||
    !report.profile_code
  ) {
    return { status: "not_found" };
  }

  const attemptResponse = await client
    .schema("assessment")
    .from("assessment_attempt")
    .select("completed_at")
    .eq("id", report.attempt_id)
    .eq("account_id", share.account_id)
    .maybeSingle();
  if (attemptResponse.error) return { status: "not_found" };
  const completedAt = attemptResponse.data?.completed_at
    ? String(attemptResponse.data.completed_at)
    : String(report.created_at);
  const model = adaptPublicCoreResult({
    completedAt,
    kind: report.report_kind,
    profileCode: report.profile_code,
    profileName: report.profile_name,
    resultReportId: report.id,
  });
  if (!model) return { status: "not_found" };

  return {
    model,
    shareKind: "account_core",
    status: "active",
  };
}

async function readViewerShareAccess({
  client,
  ownerAccountId,
}: {
  client: NonNullable<ReturnType<typeof createSupabaseServiceClient>>;
  ownerAccountId: string;
}) {
  const serverClient = await createServerSupabaseClient();
  if (!serverClient) return "anonymous" as const;
  const auth = await serverClient.auth.getUser();
  const viewerUserId = auth.data.user?.id;
  if (!viewerUserId) return "anonymous" as const;

  const identity = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", viewerUserId)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (identity.error) return "error" as const;
  const viewerAccountId = identity.data?.account_id
    ? String(identity.data.account_id)
    : null;
  if (!viewerAccountId || viewerAccountId === ownerAccountId) {
    return "allowed" as const;
  }

  const [outgoing, incoming] = await Promise.all([
    client
      .schema("feed")
      .from("profile_block")
      .select("id")
      .eq("blocker_account_id", viewerAccountId)
      .eq("blocked_account_id", ownerAccountId)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle(),
    client
      .schema("feed")
      .from("profile_block")
      .select("id")
      .eq("blocker_account_id", ownerAccountId)
      .eq("blocked_account_id", viewerAccountId)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle(),
  ]);
  if (outgoing.error || incoming.error) return "error" as const;
  return outgoing.data || incoming.data
    ? ("blocked" as const)
    : ("allowed" as const);
}
