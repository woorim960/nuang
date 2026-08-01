import type { Metadata } from "next";
import { ProductFeedbackForm } from "@/features/feedback/ProductFeedbackForm";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";

export const metadata: Metadata = {
  title: "의견 보내기 | NUANG",
};

export default async function ProductFeedbackPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  const requestedFrom = Array.isArray(params.from) ? params.from[0] : params.from;
  const sourcePath =
    requestedFrom?.startsWith("/") && !requestedFrom.startsWith("//")
      ? requestedFrom
      : "/my";

  return (
    <CommunityScreenShell
      backHref="/my"
      backLabel="마이로 돌아가기"
      title="의견 보내기"
    >
      <ProductFeedbackForm initialSourcePath={sourcePath} />
    </CommunityScreenShell>
  );
}
