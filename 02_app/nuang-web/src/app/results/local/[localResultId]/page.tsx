import type { Metadata } from "next";
import { LocalResultView } from "@/features/result/LocalResultView";

type LocalResultPageProps = {
  params: Promise<{ localResultId: string }>;
};

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "결과 리포트 | NUANG",
};

export default async function LocalResultPage({ params }: LocalResultPageProps) {
  const { localResultId } = await params;

  return <LocalResultView localResultId={localResultId} />;
}
