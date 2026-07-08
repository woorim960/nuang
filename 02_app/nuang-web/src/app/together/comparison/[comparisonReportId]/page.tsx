import type { Metadata } from "next";
import { PublicComparisonReportRouteView } from "@/features/together/PublicComparisonReportRouteView";
import { publicComparisonLookupRequestSchema } from "@/features/together/public-comparison-lookup-contract";

type PublicComparisonReportPageProps = {
  params: Promise<{ comparisonReportId: string }>;
};

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "1:1 비교 리포트 확인 | NUANG",
};

export default async function PublicComparisonReportPage({
  params,
}: PublicComparisonReportPageProps) {
  const { comparisonReportId } = await params;
  const parsed = publicComparisonLookupRequestSchema.safeParse({
    comparisonReportId,
  });

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-8">
      <PublicComparisonReportRouteView
        state={{
          comparisonReportId: parsed.success ? parsed.data.comparisonReportId : null,
          kind: "pending",
        }}
      />
    </main>
  );
}
