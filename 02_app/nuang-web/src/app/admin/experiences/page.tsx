import type { Metadata } from "next";

import { AdminAssessmentStudio } from "@/features/admin/AdminAssessmentStudio";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { readAdminAssessmentStudioDashboard } from "@/features/admin/server-admin-assessment-studio";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "검사 스튜디오 | NUANG",
};

export const dynamic = "force-dynamic";

export default async function AdminExperiencesPage() {
  const context = await resolveAdminContext();
  if (!context.ok) return null;
  const dashboard = await readAdminAssessmentStudioDashboard(context.client);

  return <AdminAssessmentStudio initialDashboard={dashboard} />;
}
