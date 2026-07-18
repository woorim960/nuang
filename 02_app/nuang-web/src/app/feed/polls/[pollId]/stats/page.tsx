import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createServerFeedPollStatsPayload,
  type FeedPollStatsPayload,
} from "@/features/feed/server-read";

type FeedPollStatsPageProps = {
  params: Promise<{
    pollId: string;
  }>;
};

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "뉴앙 코드별 통계 | NUANG",
};

export default async function FeedPollStatsPage({ params }: FeedPollStatsPageProps) {
  const { pollId } = await params;
  const payload = await createServerFeedPollStatsPayload(pollId);

  if (!payload) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[470px] border-x border-[#ececec] bg-white pb-10 text-[#111111]">
      <header className="sticky top-0 z-10 flex h-[58px] items-center gap-2 border-b border-[#ececec] bg-white/90 px-4 backdrop-blur-xl">
        <Link
          aria-label="피드로 돌아가기"
          className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-[#f5f5f5]"
          href="/feed"
        >
          <ArrowLeft aria-hidden="true" size={22} strokeWidth={1.9} />
        </Link>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#737373]">밸런스 게임</p>
          <h1 className="truncate text-base font-black">뉴앙 코드별 통계</h1>
        </div>
      </header>

      <section className="border-b border-[#ececec] px-4 py-6">
        <p className="text-sm font-semibold text-[#737373]">질문</p>
        <h2 className="mt-2 text-[24px] font-black leading-8 tracking-normal">
          {payload.poll.question}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#737373]">
          누가 어떤 선택을 했는지는 보여주지 않고, 뉴앙 코드별 익명 통계만
          보여줘요.
        </p>
      </section>

      <StatsSection payload={payload} />
    </main>
  );
}

function StatsSection({ payload }: { payload: FeedPollStatsPayload }) {
  return (
    <>
      <section className="border-b border-[#ececec] px-4 py-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-base font-black">전체 결과</h2>
          <p className="text-sm font-bold text-[#737373]">
            {payload.totalVotes.toLocaleString("ko-KR")}명 참여
          </p>
        </div>
        <div className="mt-4 space-y-4">
          {payload.options.map((option) => (
            <RatioRow
              key={option.id}
              label={option.label}
              ratio={option.ratio}
              voteCount={option.voteCount}
            />
          ))}
        </div>
      </section>

      <section className="px-4 py-6">
        <h2 className="text-base font-black">뉴앙 코드별 선택</h2>
        <p className="mt-2 text-sm leading-6 text-[#737373]">
          한 명 이상 투표한 뉴앙 코드만 표시돼요. 0명인 코드는 숨겨요.
        </p>
        {payload.codeRows.length > 0 ? (
          <div className="mt-5 divide-y divide-[#ececec] border-y border-[#ececec]">
            {payload.codeRows.map((row) => (
              <div className="py-5" key={row.code}>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[22px] font-black leading-none tracking-normal">
                      {row.code}
                    </p>
                    <p className="mt-2 text-sm font-bold text-[#737373]">
                      {row.name}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[#737373]">
                    {row.totalVotes.toLocaleString("ko-KR")}명
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  {row.options.map((option) => (
                    <RatioRow
                      key={`${row.code}_${option.label}`}
                      label={option.label}
                      ratio={option.ratio}
                      voteCount={option.voteCount}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 border-y border-[#ececec] py-5 text-sm font-semibold leading-6 text-[#737373]">
            아직 뉴앙 코드가 있는 투표가 없어요.
          </p>
        )}
      </section>
    </>
  );
}

function RatioRow({
  label,
  ratio,
  voteCount,
}: {
  label: string;
  ratio: number;
  voteCount: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-extrabold text-[#111111]">{label}</p>
        <p className="text-sm font-black tabular-nums text-[#111111]">
          {ratio}% · {voteCount.toLocaleString("ko-KR")}명
        </p>
      </div>
      <div className="mt-2 h-[3px] bg-[#eeeeee]">
        <div className="h-full bg-[#111111]" style={{ width: `${ratio}%` }} />
      </div>
    </div>
  );
}
