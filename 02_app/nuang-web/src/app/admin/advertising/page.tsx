import { RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminAdvertisingConsole } from "@/features/admin/AdminAdvertisingConsole";
import { AdminAdvertisingQuickStart } from "@/features/admin/AdminAdvertisingQuickStart";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { readAdminAdvertising } from "@/features/admin/server-admin-advertising";
import shared from "@/features/admin/AdminShared.module.css";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "광고·제휴 | NUANG 운영 센터",
};

export const dynamic = "force-dynamic";

export default async function AdminAdvertisingPage() {
  const context = await resolveAdminContext();
  if (!context.ok) return null;
  const data = await readAdminAdvertising({
    adminAccountId: context.accountId,
    client: context.client,
  });

  return (
    <main className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <p>BUSINESS OPERATIONS</p>
          <h1>광고·제휴</h1>
        </div>
        <Link className={shared.headerAction} href="/admin/advertising">
          <RefreshCw aria-hidden="true" size={16} strokeWidth={1.7} />
          다시 확인
        </Link>
      </header>
      <AdminAdvertisingQuickStart />
      <AdminAdvertisingConsole data={data} />
    </main>
  );
}
