import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FreeTopicResultView } from "@/features/assessment/FreeTopicResultView";
import { readBlockedCommunityAccountIds } from "@/features/feed/server-community-social";
import { LabResultView } from "@/features/lab/LabResultView";
import {
  readOriginalProfileReport,
  resolveProfileOwnerAccountId,
} from "@/features/public-profile/server-profile-reports";
import { CoreResultReportTemplate } from "@/features/result/unified-core-report/CoreResultReportTemplate";
import { adaptPublicCoreResult } from "@/features/result/unified-core-report/core-result-report-adapter";
import { buildAccountCoreResultHref } from "@/features/result/unified-core-report/core-result-route-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "검사 결과 | NUANG",
};

export default async function ProfileOriginalReportPage({
  params,
}: {
  params: Promise<{ publicSnapshotId: string; reportKey: string }>;
}) {
  const { publicSnapshotId, reportKey } = await params;
  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) notFound();

  const [ownerAccountId, viewerAccountId] = await Promise.all([
    resolveProfileOwnerAccountId({
      client: serviceClient,
      profileId: publicSnapshotId,
    }),
    resolveViewerAccountId(),
  ]);
  if (!ownerAccountId) notFound();
  if (viewerAccountId && viewerAccountId !== ownerAccountId) {
    const blockedAccountIdsResult = await readBlockedCommunityAccountIds({
      accountId: viewerAccountId,
      client: serviceClient,
    });
    if (
      blockedAccountIdsResult.state === "unavailable" ||
      blockedAccountIdsResult.blockedAccountIds.has(ownerAccountId)
    ) {
      notFound();
    }
  }

  const original = await readOriginalProfileReport({
    client: serviceClient,
    ownerAccountId,
    reportKey,
    viewerAccountId,
  });
  if (!original) notFound();

  const backHref = `/feed/profiles/${publicSnapshotId}?tab=reports`;
  const canonicalShareUrl = `/feed/profiles/${publicSnapshotId}/reports/${reportKey}`;

  if (original.kind === "core") {
    if (viewerAccountId === ownerAccountId) {
      redirect(
        buildAccountCoreResultHref({
          backHref: "/my?tab=reports",
          resultReportId: original.result.resultReportId,
        }),
      );
    }
    const publicModel = adaptPublicCoreResult({
      completedAt: original.result.completedAt,
      kind: original.result.kind,
      profileCode: original.result.profileCode,
      profileName: original.result.profileName,
      resultReportId: original.result.resultReportId,
    });
    if (!publicModel) notFound();

    return (
      <CoreResultReportTemplate
        backHref={backHref}
        canonicalShareUrl={canonicalShareUrl}
        model={publicModel}
        originalReportKey={reportKey}
        shareEnabled={original.summary.visibility === "profile_public"}
        surface="profile"
      />
    );
  }

  if (original.kind === "topic") {
    return (
      <FreeTopicResultView
        backHref={backHref}
        canonicalShareUrl={canonicalShareUrl}
        initialResult={original.result}
        localResultId={original.result.localResultId}
        readOnly
        shareEnabled={original.summary.visibility === "profile_public"}
        slug={original.result.assessment.slug}
      />
    );
  }

  const assessment = original.assessment;

  return (
    <LabResultView
      answeredCountOverride={original.answeredCount}
      assessment={assessment}
      backHref={backHref}
      canonicalShareUrl={canonicalShareUrl}
      initialResult={{
        assessmentSnapshot: assessment,
        answers: {},
        completedAt: original.summary.completedAt,
        contentVersion: assessment.contentVersion,
        localResultId: original.localResultId,
        result: original.result,
        serverResultId: reportKey.slice(reportKey.indexOf("_") + 1),
        slug: assessment.slug,
        sync: { status: "synced" },
      }}
      readOnly
      shareEnabled={original.summary.visibility === "profile_public"}
    />
  );
}

async function resolveViewerAccountId() {
  const [serverClient, serviceClient] = await Promise.all([
    createServerSupabaseClient(),
    Promise.resolve(createSupabaseServiceClient()),
  ]);
  if (!serverClient || !serviceClient) return null;

  const auth = await serverClient.auth.getUser();
  if (!auth.data.user) return null;

  const identity = await serviceClient
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", auth.data.user.id)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return identity.data?.account_id ? String(identity.data.account_id) : null;
}
