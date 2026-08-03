import { RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminMarketingConsole } from "@/features/admin/AdminMarketingConsole";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { readAdminMarketingDashboard } from "@/features/admin/server-admin-marketing";
import shared from "@/features/admin/AdminShared.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "이메일 캠페인 | NUANG 운영 센터",
};

export default async function AdminMarketingPage() {
  const context = await resolveAdminContext();
  if (!context.ok) return null;
  const data = await readAdminMarketingDashboard(context.client);
  return (
    <main className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <p>OWNED CHANNEL OPERATIONS</p>
          <h1>이메일 캠페인</h1>
        </div>
        <Link className={shared.headerAction} href="/admin/marketing">
          <RefreshCw aria-hidden="true" size={16} strokeWidth={1.7} />
          다시 확인
        </Link>
      </header>
      <AdminMarketingConsole adminEmail={context.email} data={data} />
    </main>
  );
}
