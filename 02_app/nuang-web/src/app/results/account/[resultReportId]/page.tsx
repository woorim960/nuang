import type { Metadata } from "next";
import { AccountResultView } from "@/features/result/AccountResultView";
import { sanitizeCoreResultBackHref } from "@/features/result/unified-core-report/core-result-route-contract";

type AccountResultPageProps = {
  params: Promise<{ resultReportId: string }>;
  searchParams: Promise<{ backTo?: string | string[] }>;
};

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "결과 리포트 | NUANG",
};

export default async function AccountResultPage({
  params,
  searchParams,
}: AccountResultPageProps) {
  const { resultReportId } = await params;
  const query = await searchParams;
  const backHref = sanitizeCoreResultBackHref(query.backTo);

  return (
    <AccountResultView
      backHref={backHref}
      resultReportId={resultReportId}
    />
  );
}
