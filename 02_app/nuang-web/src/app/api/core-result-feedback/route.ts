import { NextResponse } from "next/server";
import { ensureAccountForUser } from "@/features/account/server-writes";
import { parseStoredAccountResultSummary } from "@/features/account/account-result-contract";
import { sendAdminReviewNotification } from "@/features/admin/server-admin-review-notification";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { coreResultFeedbackWriteSchema } from "@/features/result/unified-core-report/core-result-feedback-contract";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return failure(
      "요청 출처를 확인하지 못했어요. 앱에서 다시 시도해 주세요.",
      403,
    );
  }
  const payload = await readValidatedJson(
    request,
    coreResultFeedbackWriteSchema,
  );
  if (!payload.ok) {
    return failure("의견을 저장할 문장 정보를 확인하지 못했어요.", 422);
  }
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;
  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) {
    return failure("의견 저장소를 준비하지 못했어요.", 503);
  }
  const account = await ensureAccountForUser(serviceClient, auth.user);
  if (!account.ok) {
    return failure("계정 정보를 확인하지 못했어요.", 503);
  }

  const reportResponse = await serviceClient
    .schema("report")
    .from("result_report")
    .select("id,account_id,profile_code,report_kind,summary")
    .eq("id", payload.data.resultReportId)
    .eq("account_id", account.accountId)
    .is("deleted_at", null)
    .maybeSingle();
  if (reportResponse.error) {
    return failure("결과 리포트를 확인하지 못했어요.", 503);
  }
  if (!reportResponse.data) {
    return failure("내가 소유한 결과 리포트에서만 의견을 남길 수 있어요.", 403);
  }

  const report = reportResponse.data as {
    account_id: string;
    id: string;
    profile_code: string;
    report_kind: "full" | "quick";
    summary: unknown;
  };
  const parsedSummary = parseStoredAccountResultSummary(report.summary);
  const snapshot = parsedSummary.success
    ? (parsedSummary.data.reportContentSnapshot ?? null)
    : null;
  const exactSection = snapshot?.sections.find(
    (section) =>
      section.sectionId === payload.data.sectionId &&
      section.contentKey === payload.data.contentKey &&
      section.contentVersion === payload.data.contentVersion &&
      section.privacyScope === "owner_only",
  );
  if (!snapshot || !exactSection) {
    return failure(
      "완료 당시 실제로 표시된 문장인지 확인하지 못했어요. 리포트를 새로고침해 주세요.",
      409,
    );
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString();
  const daily = await serviceClient
    .schema("report")
    .from("core_result_feedback")
    .select("id", { count: "exact", head: true })
    .eq("account_id", account.accountId)
    .gte("updated_at", oneDayAgo);
  if (daily.error) {
    return unavailable(daily.error.code);
  }
  if ((daily.count ?? 0) >= 50) {
    return failure(
      "의견을 연속으로 많이 보내고 있어요. 내일 다시 참여해 주세요.",
      429,
    );
  }

  const upserted = await serviceClient
    .schema("report")
    .from("core_result_feedback")
    .upsert(
      {
        account_id: account.accountId,
        content_key: exactSection.contentKey,
        content_version: exactSection.contentVersion,
        manifest_digest: snapshot.manifestDigest,
        profile_code: report.profile_code,
        reason: payload.data.reason,
        report_kind: report.report_kind,
        result_report_id: report.id,
        section_id: exactSection.sectionId,
        sentiment: payload.data.sentiment,
        status: "received",
        surface: payload.data.surface,
        trait_map_baseline_id: snapshot.traitMapBaselineId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "account_id,result_report_id,section_id",
      },
    )
    .select("id,status,updated_at")
    .single();
  if (upserted.error || !upserted.data) {
    return unavailable(upserted.error?.code);
  }

  await sendAdminReviewNotification({
    id: String(upserted.data.id),
    kind: "core_result_feedback",
    occurredAt: String(upserted.data.updated_at),
  });

  return NextResponse.json(
    {
      feedbackId: upserted.data.id,
      ok: true,
      status: upserted.data.status,
      updatedAt: upserted.data.updated_at,
    },
    {
      headers: { "cache-control": "private, no-store" },
      status: 201,
    },
  );
}

function unavailable(code?: string) {
  const migrationMissing = ["42P01", "PGRST205"].includes(code ?? "");
  return failure(
    migrationMissing
      ? "결과 의견 기능을 준비하고 있어요. 잠시 뒤 다시 시도해 주세요."
      : "의견을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    503,
  );
}

function failure(message: string, status: number) {
  return NextResponse.json(
    { message, ok: false },
    { headers: { "cache-control": "private, no-store" }, status },
  );
}
