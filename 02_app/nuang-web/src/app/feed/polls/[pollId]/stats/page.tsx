import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CodePerspectiveExplorer } from "./CodePerspectiveExplorer";
import {
  feedCodeStatsDisplayThreshold,
  feedCodeStatsEnabled,
} from "@/features/feed/feed-privacy";
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
  const codeRows = feedCodeStatsEnabled ? payload.codeRows : [];
  const codeCount = codeRows.length;

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
              <h2>
                {codeCount > 0
                  ? `${codeCount.toLocaleString("ko-KR")}개 코드가 참여했어요`
                  : "코드별 관점을 모으고 있어요"}
              </h2>
              <p>{payload.poll.question}</p>
            </section>

            {codeCount > 0 ? (
              <CodePerspectiveExplorer rows={codeRows} />
            ) : (
              <section className={styles.codeLocked}>
                <span aria-hidden="true">
                  <LockKeyhole size={18} strokeWidth={1.9} />
                </span>
                <div>
                  <strong>아직 공개할 수 있는 코드별 결과가 없어요</strong>
                </div>
              </section>
            )}

            {feedCodeStatsDisplayThreshold > 1 ? (
              <p className={styles.privacyThreshold}>
                <ShieldCheck aria-hidden="true" size={16} strokeWidth={1.8} />
                <span>
                  {feedCodeStatsDisplayThreshold}명부터 코드별 선택을 보여줘요.
                </span>
              </p>
            ) : null}
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
      <Link className={styles.primaryAction} href={backHref}>
        투표하러 가기
        <ArrowRight aria-hidden="true" size={16} strokeWidth={1.9} />
      </Link>
    </section>
  );
}
