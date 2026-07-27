import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Gate C 자동 분석 | NUANG",
  robots: { follow: false, index: false },
};

export const dynamic = "force-dynamic";

export default async function GateCAnalysisPage() {
  redirect("/admin/research?section=items");
}
