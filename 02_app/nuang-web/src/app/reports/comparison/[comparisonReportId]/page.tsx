import type { Metadata } from "next";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
import { PublicComparisonReportRouteView } from "@/features/together/PublicComparisonReportRouteView";
import {
  publicComparisonLookupRequestSchema,
  type PublicComparisonLookupFailureCode,
} from "@/features/together/public-comparison-lookup-contract";
import { readPublicComparisonForUser } from "@/features/together/server-public-comparisons";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type PublicComparisonReportPageProps = {
  params: Promise<{ comparisonReportId: string }>;
  searchParams?: Promise<{ backTo?: string }>;
};

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "1:1 비교 리포트 확인 | NUANG",
};

export default async function PublicComparisonReportPage({
  params,
  searchParams,
}: PublicComparisonReportPageProps) {
  const { comparisonReportId } = await params;
  const { backTo } = searchParams ? await searchParams : {};
  const parsed = publicComparisonLookupRequestSchema.safeParse({
    comparisonReportId,
  });

  const state = await resolveComparisonReportState(
    parsed.success ? parsed.data.comparisonReportId : null,
  );

  return (
    <CommunityScreenShell
      backHref={getSafeBackHref(backTo)}
      title="나와 비교하기"
    >
      <div className="px-4 py-5">
        <PublicComparisonReportRouteView state={state} />
      </div>
    </CommunityScreenShell>
  );
}

function getSafeBackHref(backTo: string | undefined) {
  return backTo?.startsWith("/feed/profiles/") ? backTo : "/feed";
}

async function resolveComparisonReportState(comparisonReportId: string | null) {
  if (!comparisonReportId) {
    return {
      comparisonReportId,
      kind: "pending" as const,
    };
  }

  const [serverClient, serviceClient] = await Promise.all([
    createServerSupabaseClient(),
    Promise.resolve(createSupabaseServiceClient()),
  ]);

  if (!serverClient || !serviceClient) {
    return {
      comparisonReportId,
      kind: "pending" as const,
    };
  }

  const { data, error } = await serverClient.auth.getUser();

  if (error || !data.user) {
    return {
      comparisonReportId,
      kind: "pending" as const,
    };
  }

  const result = await readPublicComparisonForUser({
    client: serviceClient,
    comparisonReportId,
    user: data.user,
  });

  if (result.ok) {
    return {
      kind: "active" as const,
      report: result.data,
    };
  }

  const status = lookupFailureToUnavailableStatus(result.code);

  if (status) {
    return {
      kind: "unavailable" as const,
      status,
    };
  }

  return {
    comparisonReportId,
    kind: "pending" as const,
  };
}

function lookupFailureToUnavailableStatus(
  code: PublicComparisonLookupFailureCode,
) {
  if (code === "comparison_report_stale") return "stale" as const;
  if (code === "comparison_report_disabled") return "disabled" as const;
  if (code === "comparison_report_deleted") return "deleted" as const;

  return null;
}
