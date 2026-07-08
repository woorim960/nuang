import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  isPublicComparisonBlockedStatus,
  PublicComparisonUnavailable,
} from "@/features/together/PublicComparisonUnavailable";

type PublicComparisonUnavailablePageProps = {
  params: Promise<{ status: string }>;
};

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "비교 리포트 접근 안내 | NUANG",
};

export default async function PublicComparisonUnavailablePage({
  params,
}: PublicComparisonUnavailablePageProps) {
  const { status } = await params;

  if (!isPublicComparisonBlockedStatus(status)) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-8">
      <PublicComparisonUnavailable status={status} />
    </main>
  );
}

export function generateStaticParams() {
  return [{ status: "stale" }, { status: "disabled" }, { status: "deleted" }];
}
