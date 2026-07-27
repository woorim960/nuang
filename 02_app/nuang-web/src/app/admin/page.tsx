import type { Metadata } from "next";
import { AdminDashboard } from "@/features/admin/AdminDashboard";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { readAdminOverview } from "@/features/admin/server-admin-overview";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "운영 센터 | NUANG",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const context = await resolveAdminContext();
  if (!context.ok) return null;
  const data = await readAdminOverview(context.client);

  return <AdminDashboard data={data} />;
}
