import type { Metadata } from "next";
import { PublicComparisonReportPreview } from "@/features/together/PublicComparisonReportPreview";

export const metadata: Metadata = {
  title: "1:1 비교 리포트 미리보기 | NUANG",
};

export default function PublicComparisonPreviewPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-8">
      <PublicComparisonReportPreview />
    </main>
  );
}
