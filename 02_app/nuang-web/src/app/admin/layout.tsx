import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/features/admin/AdminShell";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "운영센터",
});

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await resolveAdminContext();
  if (!context.ok) notFound();

  return <AdminShell adminEmail={context.email}>{children}</AdminShell>;
}
