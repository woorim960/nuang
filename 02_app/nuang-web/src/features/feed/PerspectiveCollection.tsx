"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
import { FeedPollCard } from "@/features/feed/FeedPollCard";
import type {
  FeedPlaygroundRecord,
  FeedPlaygroundRecordsPayload,
} from "@/features/feed/server-read";
import styles from "./PerspectiveCollection.module.css";

const allTopicsLabel = "전체";

export function PerspectiveCollection({
  backHref = "/feed",
  payload,
}: {
  backHref?: string;
  payload: FeedPlaygroundRecordsPayload;
}) {
  const [topic, setTopic] = useState(allTopicsLabel);
  const topics = useMemo(
    () => [
      allTopicsLabel,
      ...new Set(payload.records.map((record) => record.topicLabel)),
    ],
    [payload.records],
  );
  const visibleRecords =
    topic === allTopicsLabel
      ? payload.records
      : payload.records.filter((record) => record.topicLabel === topic);

  return (
    <CommunityScreenShell backHref={backHref} title="성향 놀이터 기록">
      <div className={styles.body}>
        <section className={styles.intro}>
          <span>MY PLAYGROUND</span>
          <h2>내가 참여한 질문을 다시 볼 수 있어요</h2>
          <p>
            그때 고른 답과 지금의 투표 결과를 한곳에 모았어요. 선택이 달라졌다면
            진행 중인 질문에서 바로 바꿀 수 있어요.
          </p>
          <small>이 기록은 나에게만 보여요.</small>
        </section>

        {payload.state === "unauthenticated" ? (
          <RecordState
            actionHref={`/login?next=${encodeURIComponent("/feed/perspectives")}&reason=community`}
            actionLabel="로그인하고 내 기록 보기"
            description="로그인하면 내가 참여한 질문과 선택을 안전하게 이어서 볼 수 있어요."
            title="내 기록을 보려면 로그인이 필요해요"
          />
        ) : payload.state === "unavailable" ? (
          <RecordState
            actionHref="/feed"
            actionLabel="커뮤니티로 돌아가기"
            description="잠시 뒤 다시 열면 저장된 선택을 그대로 불러올게요."
            title="지금은 기록을 불러오지 못했어요"
          />
        ) : payload.records.length === 0 ? (
          <RecordState
            actionHref="/feed"
            actionLabel="오늘의 질문 보러 가기"
            description="오늘의 성향 놀이터에서 하나를 고르면 첫 기록이 여기에 쌓여요."
            title="아직 참여한 질문이 없어요"
          />
        ) : (
          <>
            <section className={styles.summary}>
              <div>
                <strong>{payload.records.length}</strong>
                <span>참여한 질문</span>
              </div>
              <div>
                <strong>{formatParticipationDate(payload.records[0])}</strong>
                <span>최근 참여</span>
              </div>
            </section>

            {topics.length > 2 ? (
              <nav aria-label="기록 주제" className={styles.topicTabs}>
                {topics.map((item) => (
                  <button
                    aria-pressed={topic === item}
                    key={item}
                    onClick={() => setTopic(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </nav>
            ) : null}

            <section aria-live="polite" className={styles.recordList}>
              {visibleRecords.map((record) => (
                <PlaygroundRecordItem key={record.voteId} record={record} />
              ))}
            </section>

            <p className={styles.trustNote}>
              놀이터 선택은 커뮤니티에서 가볍게 나눈 기록이에요. 공식 뉴앙
              코드와 성향 리포트는 검사 응답으로만 만들어집니다.
            </p>
          </>
        )}
      </div>
    </CommunityScreenShell>
  );
}

function PlaygroundRecordItem({ record }: { record: FeedPlaygroundRecord }) {
  return (
    <article className={styles.record}>
      <div className={styles.recordMeta}>
        <span>{record.topicLabel}</span>
        <span aria-hidden="true">·</span>
        <span>{formatParticipationDate(record)} 참여</span>
        {record.status !== "active" ? (
          <>
            <span aria-hidden="true">·</span>
            <span>종료된 질문</span>
          </>
        ) : null}
      </div>

      {record.poll ? (
        <FeedPollCard
          allowVote={record.canRevote}
          poll={record.poll}
          returnTo="/feed/perspectives"
          variant="playground"
        />
      ) : (
        <div className={styles.unavailableQuestion}>
          <strong>{record.question}</strong>
          <span>내가 고른 답 · {record.selectedOptionLabel}</span>
        </div>
      )}

      <div className={styles.recordContext}>
        <span>참여 당시 코드</span>
        {record.selectedCode ? (
          <strong>
            {record.selectedCode}
            {record.selectedProfileName
              ? ` · ${record.selectedProfileName}`
              : ""}
          </strong>
        ) : (
          <strong>코드 정보 없음</strong>
        )}
      </div>

      <footer className={styles.recordFooter}>
        <span>
          {record.canRevote
            ? "다른 답을 누르면 선택이 바로 바뀌어요."
            : "질문이 끝나 당시 선택만 볼 수 있어요."}
        </span>
        {record.postId ? (
          <Link href={`/feed#community-post-${record.postId}`}>
            원래 질문 보기
          </Link>
        ) : null}
      </footer>
    </article>
  );
}

function RecordState({
  actionHref,
  actionLabel,
  description,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  description: string;
  title: string;
}) {
  return (
    <section className={styles.state}>
      <span aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
      <Link href={actionHref}>{actionLabel}</Link>
    </section>
  );
}

function formatParticipationDate(record: FeedPlaygroundRecord) {
  const date = new Date(record.participatedAt);

  if (!Number.isFinite(date.getTime())) return "최근";

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
  }).format(date);
}
