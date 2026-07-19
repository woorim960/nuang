import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedActionButtons } from "@/features/feed/FeedActionButtons";
import {
  createServerFeedPollStatsPayload,
  type FeedPollStatsPayload,
} from "@/features/feed/server-read";
import styles from "./page.module.css";

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
  title: "오늘의 선택 결과 | NUANG",
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

  const hasVoted = Boolean(payload.viewer.voteOptionId);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link
          aria-label={from === "home" ? "홈으로 돌아가기" : "피드로 돌아가기"}
          className={styles.backButton}
          href={backHref}
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={2} />
        </Link>
        <div>
          <p>오늘의 성향 질문</p>
          <h1>투표 결과</h1>
        </div>
      </header>

      <div className={styles.content}>
        <QuestionCard payload={payload} />

        {hasVoted ? (
          <>
            <OverallResults payload={payload} />
            <CodeResults payload={payload} />
            <Discussion payload={payload} returnTo={returnTo} />
          </>
        ) : (
          <ParticipationGate backHref={backHref} />
        )}
      </div>
    </main>
  );
}

function QuestionCard({ payload }: { payload: FeedPollStatsPayload }) {
  return (
    <section className={styles.questionCard}>
      <span className={styles.questionLabel}>오늘의 가벼운 선택</span>
      <h2>{payload.poll.question}</h2>
      <p className={styles.questionNote}>
        이 선택은 성향 검사 결과에 반영되지 않아요.
      </p>
      {payload.viewer.voteOptionLabel ? (
        <div className={styles.myChoice}>
          <span aria-hidden="true">
            <Check size={15} strokeWidth={2.5} />
          </span>
          <div>
            <small>내가 고른 선택</small>
            <strong>{payload.viewer.voteOptionLabel}</strong>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ParticipationGate({ backHref }: { backHref: string }) {
  return (
    <section className={styles.gateCard}>
      <span aria-hidden="true" className={styles.gateIcon}>
        <LockKeyhole size={21} strokeWidth={1.9} />
      </span>
      <h2>먼저 오늘의 선택을 골라주세요</h2>
      <p>하나를 고르면 전체 결과와 사람들의 선택 이유를 바로 볼 수 있어요.</p>
      <Link className={styles.primaryAction} href={backHref}>
        투표하고 결과 보기
        <ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
      </Link>
    </section>
  );
}

function OverallResults({ payload }: { payload: FeedPollStatsPayload }) {
  return (
    <section className={styles.sectionCard}>
      <SectionTitle
        icon={<UsersRound size={18} strokeWidth={1.9} />}
        meta={`${payload.totalVotes.toLocaleString("ko-KR")}명 참여`}
        title="전체 선택 결과"
      />
      <div className={styles.ratioList}>
        {payload.options.map((option) => (
          <RatioRow
            key={option.id}
            label={option.label}
            ratio={option.ratio}
            selected={option.id === payload.viewer.voteOptionId}
            voteCount={option.voteCount}
          />
        ))}
      </div>
      {payload.totalVotes < 3 ? (
        <p className={styles.lowDataNote}>
          지금은 {payload.totalVotes.toLocaleString("ko-KR")}명의 선택을
          보여주고 있어요. 참여가 늘면 비율은 달라질 수 있어요.
        </p>
      ) : null}
    </section>
  );
}

function CodeResults({ payload }: { payload: FeedPollStatsPayload }) {
  return (
    <section className={styles.sectionCard}>
      <SectionTitle
        icon={<ShieldCheck size={18} strokeWidth={1.9} />}
        title="뉴앙 코드별 선택"
      />
      <p className={styles.sectionDescription}>
        개인의 선택이 드러나지 않도록 같은 뉴앙 코드가 3명 이상 모였을 때만 비교
        결과를 열어요.
      </p>
      {payload.codeRows.length > 0 ? (
        <div className={styles.codeList}>
          {payload.codeRows.map((row) => (
            <article className={styles.codeCard} key={row.code}>
              <div className={styles.codeHeader}>
                <div>
                  <span>{row.code}</span>
                  <strong>{row.name}</strong>
                </div>
                <small>{row.totalVotes.toLocaleString("ko-KR")}명</small>
              </div>
              <div className={styles.codeRatios}>
                {row.options.map((option) => (
                  <RatioRow
                    compact
                    key={`${row.code}_${option.label}`}
                    label={option.label}
                    ratio={option.ratio}
                    voteCount={option.voteCount}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.codeLocked}>
          <span aria-hidden="true">
            <LockKeyhole size={18} strokeWidth={1.9} />
          </span>
          <div>
            <strong>아직 코드별 비교가 열리지 않았어요</strong>
            <p>
              {payload.viewer.nuangCode
                ? `${payload.viewer.nuangCode} 참여자가 3명 이상 모이면 선택 차이를 볼 수 있어요.`
                : "같은 코드의 참여자가 3명 이상 모이면 선택 차이를 볼 수 있어요."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function Discussion({
  payload,
  returnTo,
}: {
  payload: FeedPollStatsPayload;
  returnTo: string;
}) {
  return (
    <section className={styles.sectionCard}>
      <SectionTitle
        icon={<MessageCircle size={18} strokeWidth={1.9} />}
        meta={`${payload.post.replyCount.toLocaleString("ko-KR")}개`}
        title="선택한 이유 나누기"
      />
      <p className={styles.sectionDescription}>
        왜 그쪽을 골랐는지 나누면 서로의 생각을 더 쉽게 이해할 수 있어요.
      </p>

      {payload.post.replyPreview.length > 0 ? (
        <div aria-label="댓글 목록" className={styles.commentList}>
          {payload.post.replyPreview.map((reply) => (
            <article className={styles.comment} key={reply.id}>
              <span aria-hidden="true" className={styles.commentAvatar}>
                {reply.authorName.slice(0, 1)}
              </span>
              <div>
                <div className={styles.commentMeta}>
                  <strong>{reply.authorName}</strong>
                  {reply.statusLabel ? (
                    <small>{reply.statusLabel}</small>
                  ) : null}
                </div>
                <p>{reply.body}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyComments}>
          <span aria-hidden="true">
            <MessageCircle size={18} strokeWidth={1.9} />
          </span>
          <p>아직 댓글이 없어요. 내가 고른 이유를 먼저 남겨보세요.</p>
        </div>
      )}

      <div className={styles.composer}>
        <FeedActionButtons
          commentComposer
          commentPlaceholder="왜 이쪽을 골랐나요?"
          postId={payload.post.id}
          returnTo={returnTo}
          targetType="feed_post"
        />
        <p>
          {payload.viewer.isAuthenticated
            ? "등록한 댓글은 안전한 커뮤니티 운영을 위해 확인 후 공개될 수 있어요."
            : "작성한 내용은 로그인 후에도 사라지지 않고 그대로 이어져요."}
        </p>
      </div>
    </section>
  );
}

function SectionTitle({
  icon,
  meta,
  title,
}: {
  icon: React.ReactNode;
  meta?: string;
  title: string;
}) {
  return (
    <div className={styles.sectionTitle}>
      <div>
        <span aria-hidden="true">{icon}</span>
        <h2>{title}</h2>
      </div>
      {meta ? <p>{meta}</p> : null}
    </div>
  );
}

function RatioRow({
  compact = false,
  label,
  ratio,
  selected = false,
  voteCount,
}: {
  compact?: boolean;
  label: string;
  ratio: number;
  selected?: boolean;
  voteCount: number;
}) {
  return (
    <div
      className={compact ? styles.ratioRowCompact : styles.ratioRow}
      data-selected={selected ? "true" : "false"}
    >
      <div className={styles.ratioHeading}>
        <p>
          {selected ? (
            <span className={styles.selectedBadge}>내 선택</span>
          ) : null}
          <strong>{label}</strong>
        </p>
        <p>
          <strong>{ratio}%</strong>
          <small>{voteCount.toLocaleString("ko-KR")}명</small>
        </p>
      </div>
      <div className={styles.ratioTrack}>
        <span
          className={styles.ratioFill}
          style={{ "--ratio": `${ratio}%` } as CSSProperties}
        />
      </div>
    </div>
  );
}
