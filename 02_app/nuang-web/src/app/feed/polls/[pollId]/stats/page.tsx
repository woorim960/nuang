import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedActionButtons } from "@/features/feed/FeedActionButtons";
import {
  createServerFeedPollStatsPayload,
  type FeedPollStatsPayload,
} from "@/features/feed/server-read";

type FeedPollStatsPageProps = {
  params: Promise<{
    pollId: string;
  }>;
  searchParams?: Promise<{
    from?: string | string[];
  }>;
};

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "뉴앙 코드별 통계 | NUANG",
};

export default async function FeedPollStatsPage({
  params,
  searchParams,
}: FeedPollStatsPageProps) {
  const { pollId } = await params;
  const query = searchParams ? await searchParams : {};
  const from = Array.isArray(query.from) ? query.from[0] : query.from;
  const backHref = from === "home" ? "/home" : "/feed";
  const returnTo =
    from === "home"
      ? `/feed/polls/${pollId}/stats?from=home`
      : `/feed/polls/${pollId}/stats`;
  const payload = await createServerFeedPollStatsPayload(pollId);

  if (!payload) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[470px] border-x border-[#ececec] bg-white pb-10 text-[#111111]">
      <header className="sticky top-0 z-10 flex h-[58px] items-center gap-2 border-b border-[#ececec] bg-white/90 px-4 backdrop-blur-xl">
        <Link
          aria-label={from === "home" ? "홈으로 돌아가기" : "피드로 돌아가기"}
          className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-[#f5f5f5]"
          href={backHref}
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

      <StatsSection payload={payload} returnTo={returnTo} />
    </main>
  );
}

function StatsSection({
  payload,
  returnTo,
}: {
  payload: FeedPollStatsPayload;
  returnTo: string;
}) {
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
          개인 선택이 드러나지 않도록 같은 뉴앙 코드에서 3명 이상 참여한 경우만
          표시해요.
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
            아직 공개 기준을 충족한 뉴앙 코드 통계가 없어요.
          </p>
        )}
      </section>

      <section className="border-t border-[#ececec] px-4 py-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-base font-black">댓글로 이어서 이야기해요</h2>
          <p className="text-sm font-bold text-[#737373]">
            {payload.post.replyCount.toLocaleString("ko-KR")}개
          </p>
        </div>
        <p className="mt-2 text-sm leading-6 text-[#737373]">
          왜 그쪽을 골랐는지 나누면 서로의 선택을 더 쉽게 이해할 수 있어요.
        </p>
        {payload.post.replyPreview.length > 0 ? (
          <div className="mt-4 space-y-3 rounded-xl bg-[#f7f7f7] p-4">
            {payload.post.replyPreview.map((reply) => (
              <p className="text-sm leading-6 text-[#2a2a2a]" key={reply.id}>
                <span className="font-extrabold text-[#111111]">
                  {reply.authorName}
                </span>{" "}
                {reply.body}
                {reply.statusLabel ? (
                  <span className="ml-1 text-[#737373]">
                    · {reply.statusLabel}
                  </span>
                ) : null}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-[#f7f7f7] p-4 text-sm font-semibold leading-6 text-[#737373]">
            아직 공개된 댓글이 없어요. 첫 의견을 남겨보세요.
          </p>
        )}
        <div className="mt-4 border-t border-[#ececec] pt-4">
          <FeedActionButtons
            postId={payload.post.id}
            returnTo={returnTo}
            targetType="feed_post"
          />
          <p className="mt-2 text-xs font-semibold leading-5 text-[#737373]">
            댓글 작성은 안전한 커뮤니티 운영을 위해 로그인 후 사용할 수 있어요.
          </p>
        </div>
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
