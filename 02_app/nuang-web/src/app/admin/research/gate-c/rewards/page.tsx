import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "리뷰 이벤트 운영 | NUANG",
};

export default async function GateCRewardOperationsPage() {
  redirect("/admin/events");
}
