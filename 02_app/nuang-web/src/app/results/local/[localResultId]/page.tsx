import type { Metadata } from "next";
import { LocalResultView } from "@/features/result/LocalResultView";
import { sanitizeCoreResultBackHref } from "@/features/result/unified-core-report/core-result-route-contract";

type LocalResultPageProps = {
  params: Promise<{ localResultId: string }>;
  searchParams: Promise<{
    backTo?: string | string[];
    share?: string | string[];
  }>;
};

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "결과 리포트 | NUANG",
};

export default async function LocalResultPage({
  params,
  searchParams,
}: LocalResultPageProps) {
  const { localResultId } = await params;
  const query = await searchParams;
  const backHref = query.backTo
    ? sanitizeCoreResultBackHref(query.backTo)
    : undefined;

  const share = Array.isArray(query.share) ? query.share[0] : query.share;

  return (
    <LocalResultView
      backHref={backHref}
      localResultId={localResultId}
      openShareOnMount={share === "1"}
    />
  );
}
