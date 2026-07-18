import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TraitRadarChart } from "@/components/ui/TraitRadarChart";
import { createServerFeedReportSharePayload } from "@/features/feed/server-read";

type FeedReportSharePageProps = {
  params: Promise<{
    postId: string;
  }>;
};

const domainShortLabel: Record<string, string> = {
  ER: "마음",
  OE: "감각",
  RO: "관계",
  SE: "사람",
  SM: "일상",
};

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "피드 공유 리포트 | NUANG",
};

export default async function FeedReportSharePage({
  params,
}: FeedReportSharePageProps) {
  const { postId } = await params;
  const payload = await createServerFeedReportSharePayload(postId);

  if (!payload) {
    notFound();
  }

  const axes = payload.reportShare.domains.map((domain) => ({
    id: domain.domainId,
    label: domain.label,
    shortLabel: domainShortLabel[domain.domainId] ?? domain.label,
    value: domain.score,
  }));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[520px] bg-white px-5 pb-10 text-[#111111]">
      <header className="sticky top-0 z-10 -mx-5 flex h-[58px] items-center gap-2 border-b border-[#ececec] bg-white/90 px-4 backdrop-blur-xl">
        <Link
          aria-label="피드로 돌아가기"
          className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-[#f5f5f5]"
          href="/feed"
        >
          <ArrowLeft aria-hidden="true" size={22} strokeWidth={1.9} />
        </Link>
        <div>
          <p className="text-xs font-semibold text-[#737373]">피드 공유</p>
          <h1 className="text-base font-black">공유 리포트</h1>
        </div>
      </header>

      <section className="border-b border-[#ececec] pb-6 pt-7">
        <p className="text-sm font-semibold text-[#737373]">
          {payload.reportShare.resultLabel}
        </p>
        <p className="mt-3 text-[40px] font-black leading-none tracking-normal">
          {payload.reportShare.profileCode}
        </p>
        <h2 className="mt-3 text-2xl font-black leading-8">
          {payload.reportShare.profileName}
        </h2>
        {payload.body ? (
          <p className="mt-5 text-[15px] leading-6 text-[#171717]">{payload.body}</p>
        ) : null}
        <p className="mt-5 text-sm leading-6 text-[#737373]">
          이 화면은 피드에 공유된 공개 요약만 보여줘요. 문항별 답변, 원점수,
          계정 정보는 포함하지 않습니다.
        </p>
      </section>

      <section className="border-b border-[#ececec] py-6">
        <h2 className="text-base font-black">코드 지도 요약</h2>
        {axes.length > 0 ? (
          <TraitRadarChart
            ariaLabel="피드 공유 리포트 코드 지도"
            axes={axes}
            centerLabel="코드 지도"
          />
        ) : (
          <p className="mt-4 border-y border-[#ececec] py-4 text-sm leading-6 text-[#737373]">
            이 리포트에는 코드 지도 요약이 포함되지 않았어요.
          </p>
        )}
      </section>

      <section className="py-6">
        <Link
          className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#111111] px-4 text-sm font-bold text-white hover:bg-[#2a2a2a]"
          href="/assessments/nu-core-quick"
        >
          나도 같은 검사 해보기
        </Link>
      </section>
    </main>
  );
}
