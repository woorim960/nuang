import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "성향지도 피드백 분석 | NUANG",
  robots: { follow: false, index: false },
};

export const dynamic = "force-dynamic";

export default async function TraitMapFeedbackAnalysisPage() {
  redirect("/admin/research?section=trait-map");
}
