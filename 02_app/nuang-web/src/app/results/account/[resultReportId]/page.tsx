import type { Metadata } from "next";
import { AccountResultView } from "@/features/result/AccountResultView";

type AccountResultPageProps = {
  params: Promise<{ resultReportId: string }>;
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
}: AccountResultPageProps) {
  const { resultReportId } = await params;

  return <AccountResultView resultReportId={resultReportId} />;
}
