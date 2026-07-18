import { redirect } from "next/navigation";

type LegacyComparisonReportPageProps = {
  params: Promise<{ comparisonReportId: string }>;
};

export default async function LegacyComparisonReportPage({
  params,
}: LegacyComparisonReportPageProps) {
  const { comparisonReportId } = await params;

  redirect(`/reports/comparison/${comparisonReportId}`);
}
