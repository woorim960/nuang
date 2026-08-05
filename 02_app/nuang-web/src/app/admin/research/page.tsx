import type { Metadata } from "next";
import { AdminResearchDashboard } from "@/features/admin/AdminResearchDashboard";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { readAdminResearchDecisions } from "@/features/admin/server-admin-research-decisions";
import { readGateCAnalysisDashboard } from "@/features/research/gate-c/gate-c-analysis-dashboard";
import { readTraitMapFeedbackAnalysis } from "@/features/research/trait-map/trait-map-feedback-analysis";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "연구 운영 | NUANG",
};

export const dynamic = "force-dynamic";

export default async function AdminResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const context = await resolveAdminContext();
  if (!context.ok) return null;
  const requestedSection = (await searchParams).section;
  const section =
    requestedSection === "trait-map"
      ? "trait-map"
      : requestedSection === "items"
        ? "items"
        : "validation";
  const [decisions, gateC, traitMap] = await Promise.all([
    readAdminResearchDecisions(context.client).catch(() => ({
      available: false,
      gateC: [],
      traitMap: [],
    })),
    readGateCAnalysisDashboard(context.client).catch(() => null),
    readTraitMapFeedbackAnalysis(context.client).catch(() => null),
  ]);

  return (
    <AdminResearchDashboard
      decisions={decisions}
      gateC={gateC}
      section={section}
      traitMap={traitMap}
    />
  );
}
