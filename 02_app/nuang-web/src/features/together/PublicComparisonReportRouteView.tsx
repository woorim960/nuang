import { PublicComparisonReportShell } from "@/features/together/PublicComparisonReportShell";
import { PublicComparisonReportView } from "@/features/together/PublicComparisonReportView";
import { PublicComparisonUnavailable } from "@/features/together/PublicComparisonUnavailable";
import type { PublicComparisonReportPayload } from "@/features/together/public-comparison-contract";
import type { PublicComparisonAccessStatus } from "@/features/together/public-comparison-lookup-contract";

export type PublicComparisonReportRouteState =
  | {
      comparisonReportId: string | null;
      kind: "pending";
    }
  | {
      kind: "active";
      report: PublicComparisonReportPayload;
    }
  | {
      kind: "unavailable";
      status: Exclude<PublicComparisonAccessStatus, "active">;
    };

export function PublicComparisonReportRouteView({
  state,
}: {
  state: PublicComparisonReportRouteState;
}) {
  if (state.kind === "active") {
    return <PublicComparisonReportView report={state.report} />;
  }

  if (state.kind === "unavailable") {
    return <PublicComparisonUnavailable status={state.status} />;
  }

  return <PublicComparisonReportShell comparisonReportId={state.comparisonReportId} />;
}
