import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isPublicComparisonBlockedStatus } from "@/features/together/PublicComparisonUnavailable";

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
    return notFound();
  }

  redirect("/my/reports");
}

export function generateStaticParams() {
  return [{ status: "stale" }, { status: "disabled" }, { status: "deleted" }];
}
