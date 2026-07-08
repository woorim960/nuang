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
  title: "로컬 결과 확인 | NUANG",
};

export default async function LocalResultPage({ params }: LocalResultPageProps) {
  const { localResultId } = await params;

  return <LocalResultView localResultId={localResultId} />;
}
