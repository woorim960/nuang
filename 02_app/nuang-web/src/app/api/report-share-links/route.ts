import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { readCoreResultPublicationDecision } from "@/features/assessment/server-core-result-publication-policy";
import {
  readOriginalProfileReport,
} from "@/features/public-profile/server-profile-reports";
import {
  createOriginalReportShareLinkRequestSchema,
} from "@/features/share/report-share-contract";
import { getAppOrigin } from "@/lib/supabase/env";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const originalRequest =
    createOriginalReportShareLinkRequestSchema.safeParse(body);
  if (originalRequest.success) {
    return createOriginalReportLink(originalRequest.data.reportKey);
  }

  return NextResponse.json(
    {
      error: "original_report_required",
      message: "결과 저장이 끝난 뒤 원본 리포트를 공유할 수 있어요.",
      ok: false,
    },
    { status: 422 },
  );
}

async function createOriginalReportLink(reportKey: string) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const client = createSupabaseServiceClient();
  if (!client) {
    return NextResponse.json(
      { error: "share_service_unavailable", ok: false },
      { status: 503 },
    );
  }

  const identity = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", auth.user.id)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const accountId = identity.data?.account_id
    ? String(identity.data.account_id)
    : null;
  if (!accountId) {
    return NextResponse.json(
      { error: "account_not_found", ok: false },
      { status: 404 },
    );
  }

  const report = await readOriginalProfileReport({
    client,
    ownerAccountId: accountId,
    reportKey,
    viewerAccountId: accountId,
  });
  if (!report) {
    return NextResponse.json(
      { error: "report_not_found", ok: false },
      { status: 404 },
    );
  }
  if (report.kind === "core") {
    const publication = await readCoreResultPublicationDecision({
      client,
      ownerAccountId: accountId,
      resultReportId: report.result.resultReportId,
    });
    if (!publication.eligible) {
      return NextResponse.json(
        {
          error: "result_release_not_publicable",
          message: "검토가 끝난 코어 결과만 링크로 공유할 수 있어요.",
          ok: false,
        },
        { status: 409 },
      );
    }
  }
  if (report.summary.visibility !== "profile_public") {
    return NextResponse.json(
      {
        error: "report_private",
        message: "프로필에 공개한 결과만 링크로 공유할 수 있어요.",
        ok: false,
      },
      { status: 409 },
    );
  }

  const communityProfile = await client
    .schema("profile")
    .from("community_profile")
    .select("id")
    .eq("account_id", accountId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  const snapshot = communityProfile.data?.id
    ? null
    : await client
        .schema("profile")
        .from("profile_public_snapshot")
        .select("id")
        .eq("account_id", accountId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
  const profileId = communityProfile.data?.id ?? snapshot?.data?.id;
  if (!profileId) {
    return NextResponse.json(
      { error: "public_profile_not_found", ok: false },
      { status: 409 },
    );
  }

  return NextResponse.json({
    expiresAt: null,
    ok: true,
    persistent: true,
    url: new URL(
      `/feed/profiles/${String(profileId)}/reports/${reportKey}`,
      getAppOrigin(),
    ).toString(),
  });
}
