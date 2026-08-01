"use client";

import { Search, X } from "lucide-react";
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
const allTagsLabel = "전체 태그";

export function PerspectiveCollection({
  backHref = "/feed",
  payload,
}: {
  backHref?: string;
  payload: FeedPlaygroundRecordsPayload;
}) {
  const [topic, setTopic] = useState(allTopicsLabel);
  const [tag, setTag] = useState(allTagsLabel);
  const [query, setQuery] = useState("");
  const topics = useMemo(
    () => [
      allTopicsLabel,
      ...new Set(payload.records.map((record) => record.topicLabel)),
    ],
    [payload.records],
  );
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of payload.records) {
      for (const recordTag of record.tags) {
        counts.set(recordTag, (counts.get(recordTag) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort(
        ([leftTag, leftCount], [rightTag, rightCount]) =>
          rightCount - leftCount || leftTag.localeCompare(rightTag, "ko-KR"),
      )
      .map(([recordTag]) => recordTag);
  }, [payload.records]);
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const visibleRecords = payload.records.filter((record) => {
    if (topic !== allTopicsLabel && record.topicLabel !== topic) return false;
    if (tag !== allTagsLabel && !record.tags.includes(tag)) return false;
    if (!normalizedQuery) return true;

    return [
      record.question,
      record.selectedOptionLabel,
      record.selectedCode,
      record.selectedProfileName,
      record.topicLabel,
      ...record.tags,
    ]
      .filter((value): value is string => Boolean(value))
      .some((value) =>
        value.toLocaleLowerCase("ko-KR").includes(normalizedQuery),
      );
  });

  return (
    <CommunityScreenShell backHref={backHref} title="성향 놀이터 기록">
      <div className={styles.body}>
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

            <section aria-label="놀이터 기록 검색과 필터" className={styles.filters}>
              <label className={styles.searchField}>
                <Search aria-hidden="true" size={18} strokeWidth={1.8} />
                <input
                  aria-label="놀이터 기록 검색"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="질문이나 태그 검색"
                  type="search"
                  value={query}
                />
                {query ? (
                  <button
                    aria-label="기록 검색어 지우기"
                    onClick={() => setQuery("")}
                    type="button"
                  >
                    <X aria-hidden="true" size={16} strokeWidth={1.8} />
                  </button>
                ) : null}
              </label>
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

            {tags.length > 0 ? (
              <section className={styles.tagFilter}>
                <strong>태그</strong>
                <nav aria-label="기록 태그" className={styles.tagTabs}>
                  <button
                    aria-label="전체 태그"
                    aria-pressed={tag === allTagsLabel}
                    onClick={() => setTag(allTagsLabel)}
                    type="button"
                  >
                    전체
                  </button>
                  {tags.map((recordTag) => (
                    <button
                      aria-label={`${recordTag} 태그로 필터`}
                      aria-pressed={tag === recordTag}
                      key={recordTag}
                      onClick={() => setTag(recordTag)}
                      type="button"
                    >
                      #{recordTag}
                    </button>
                  ))}
                </nav>
              </section>
            ) : null}

            <section aria-live="polite" className={styles.recordList}>
              {visibleRecords.length > 0 ? (
                visibleRecords.map((record) => (
                  <PlaygroundRecordItem
                    key={record.voteId}
                    onTagSelect={setTag}
                    record={record}
                  />
                ))
              ) : (
                <div className={styles.noResults}>
                  <strong>조건에 맞는 기록이 없어요</strong>
                  <button
                    onClick={() => {
                      setQuery("");
                      setTag(allTagsLabel);
                      setTopic(allTopicsLabel);
                    }}
                    type="button"
                  >
                    필터 초기화
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </CommunityScreenShell>
  );
}

function PlaygroundRecordItem({
  onTagSelect,
  record,
}: {
  onTagSelect: (tag: string) => void;
  record: FeedPlaygroundRecord;
}) {
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

      {record.tags.length > 0 ? (
        <div aria-label="기록 태그" className={styles.recordTags}>
          {record.tags.map((recordTag) => (
            <button
              aria-label={`${recordTag} 태그 선택`}
              key={recordTag}
              onClick={() => onTagSelect(recordTag)}
              type="button"
            >
              #{recordTag}
            </button>
          ))}
        </div>
      ) : null}

      {record.postId ? (
        <footer className={styles.recordFooter}>
          <Link href={`/feed#community-post-${record.postId}`}>
            원래 질문 보기
          </Link>
        </footer>
      ) : null}
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
