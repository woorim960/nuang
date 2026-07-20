import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CodePerspectiveExplorer } from "./CodePerspectiveExplorer";
import { feedCodeStatsDisplayThreshold } from "@/features/feed/feed-privacy";
import { createServerFeedPollStatsPayload } from "@/features/feed/server-read";
import styles from "./page.module.css";

type FeedPollStatsPageProps = {
  params: Promise<{ pollId: string }>;
  searchParams?: Promise<{ from?: string | string[] }>;
};

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "코드별 관점 | NUANG",
};

export default async function FeedPollStatsPage({
  params,
  searchParams,
}: FeedPollStatsPageProps) {
  const { pollId } = await params;
  const query = searchParams ? await searchParams : {};
  const from = Array.isArray(query.from) ? query.from[0] : query.from;
  const backHref = from === "home" ? "/home" : "/feed";
  const payload = await createServerFeedPollStatsPayload(pollId);

  if (!payload) notFound();

  const hasVoted = Boolean(payload.viewer.voteOptionId);
  const codeCount = payload.codeRows.length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link
          aria-label={from === "home" ? "홈으로 돌아가기" : "피드로 돌아가기"}
          className={styles.backButton}
          href={backHref}
        >
          <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.9} />
        </Link>
        <h1>코드별 관점</h1>
        <span aria-hidden="true" />
      </header>

      <div className={styles.content}>
        {hasVoted ? (
          <>
            <section className={styles.codePerspectiveIntro}>
              <span className={styles.playKicker}>오늘의 밸런스 게임</span>
              <h2>
                {codeCount > 0
                  ? `${codeCount.toLocaleString("ko-KR")}개 코드가 참여했어요`
                  : "코드별 관점을 모으고 있어요"}
              </h2>
              <p>
                {payload.poll.question} 실제 투표가 모인 코드별로 선택의 차이를
                살펴봐요.
              </p>
            </section>

            {codeCount > 0 ? (
              <CodePerspectiveExplorer rows={payload.codeRows} />
            ) : (
              <section className={styles.codeLocked}>
                <span aria-hidden="true">
                  <LockKeyhole size={18} strokeWidth={1.9} />
                </span>
                <div>
                  <strong>아직 공개할 수 있는 코드별 결과가 없어요</strong>
                  <p>
                    해당 코드의 첫 투표가 생기면 선택 비율을 바로 보여드려요.
                  </p>
                </div>
              </section>
            )}

            <p className={styles.privacyThreshold}>
              <ShieldCheck aria-hidden="true" size={16} strokeWidth={1.8} />
              <span>
                {feedCodeStatsDisplayThreshold}명부터 코드별 선택을 보여줘요.
                적은 응답은 한 사람의 경험이며 코드 전체의 특징으로 단정하지
                않아요.
              </span>
            </p>
          </>
        ) : (
          <ParticipationGate backHref={backHref} />
        )}
      </div>
    </main>
  );
}

function ParticipationGate({ backHref }: { backHref: string }) {
  return (
    <section className={styles.gateCard}>
      <span aria-hidden="true" className={styles.gateIcon}>
        <LockKeyhole size={20} strokeWidth={1.9} />
      </span>
      <h2>먼저 오늘의 선택을 골라주세요</h2>
      <p>하나를 고르면 참여한 뉴앙 코드별 관점을 확인할 수 있어요.</p>
      <Link className={styles.primaryAction} href={backHref}>
        투표하고 관점 보기
        <ArrowRight aria-hidden="true" size={16} strokeWidth={1.9} />
      </Link>
    </section>
  );
}
