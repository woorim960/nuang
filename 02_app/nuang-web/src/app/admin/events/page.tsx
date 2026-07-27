import { Gift } from "lucide-react";
import type { Metadata } from "next";
import { RewardOperationsDashboard } from "@/features/admin/RewardOperationsDashboard";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import shared from "@/features/admin/AdminShared.module.css";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "이벤트 운영 | NUANG",
};

export default async function AdminEventsPage() {
  const context = await resolveAdminContext();
  if (!context.ok) return null;

  return (
    <main className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <p>응모부터 당첨 안내까지</p>
          <h1>이벤트</h1>
        </div>
        <span className={shared.headerAction}>
          <Gift aria-hidden="true" size={17} strokeWidth={1.7} />
          운영 중
        </span>
      </header>
      <RewardOperationsDashboard />
    </main>
  );
}
