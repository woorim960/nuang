"use client";

import {
  ArrowLeft,
  Check,
  Globe2,
  ImageIcon,
  Lock,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type {
  FeedItem,
  FeedPostTopicSummary,
} from "@/features/feed/feed-seed";
import {
  extractCompletedFeedTags,
  feedPostTopicCategories,
  feedPostTopicLabels,
  maxFeedTagCount,
  type FeedPostTopicCategory,
} from "@/features/feed/feed-topic";
import styles from "./FeedPostEditForm.module.css";

type Visibility = "private_draft" | "profile_public" | "public";

type EditStatus =
  | { status: "idle" }
  | { status: "pending" }
  | { message: string; status: "error" | "notice" };

const visibilityOptions: Array<{
  description: string;
  icon: typeof Globe2;
  label: string;
  value: Visibility;
}> = [
  {
    description: "커뮤니티 피드와 내 프로필",
    icon: Globe2,
    label: "전체 공개",
    value: "public",
  },
  {
    description: "내 프로필과 게시물 링크",
    icon: UserRound,
    label: "프로필에만 공개",
    value: "profile_public",
  },
  {
    description: "내 계정에서만",
    icon: Lock,
    label: "나만 보기",
    value: "private_draft",
  },
];

export function FeedPostEditForm({
  post,
  returnTo,
}: {
  post: FeedItem;
  returnTo: string;
}) {
  const router = useRouter();
  const initialTopic = normalizeTopic(post.topic);
  const [body, setBody] = useState(post.body);
  const [category, setCategory] = useState<FeedPostTopicCategory | null>(
    initialTopic.category,
  );
  const [tags, setTags] = useState(initialTopic.tags);
  const [visibility, setVisibility] = useState<Visibility>(
    readInitialVisibility(post),
  );
  const [status, setStatus] = useState<EditStatus>({ status: "idle" });
  const trimmedBody = body.trim();
  const hasExistingMedia = Boolean(post.media?.length);
  const canSave = useMemo(
    () =>
      status.status !== "pending" &&
      (trimmedBody.length > 0 || hasExistingMedia),
    [hasExistingMedia, status.status, trimmedBody.length],
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button
          aria-label="수정 취소"
          className={styles.backButton}
          onClick={() => router.push(returnTo)}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.8} />
        </button>
        <h1>게시물 수정</h1>
        <button
          className={styles.saveButton}
          disabled={!canSave}
          onClick={() => void savePost()}
          type="button"
        >
          {status.status === "pending" ? "저장 중" : "저장"}
        </button>
      </header>

      <div className={styles.content}>
        <section className={styles.bodySection}>
          <textarea
            aria-label="게시글 내용"
            autoFocus
            maxLength={800}
            onChange={(event) => handleBodyChange(event.target.value)}
            placeholder="지금 나누고 싶은 이야기를 적어보세요."
            value={body}
          />
          <span className={styles.characterCount}>{body.length}/800</span>
        </section>

        {post.media && post.media.length > 0 ? (
          <section className={styles.mediaSection}>
            <div className={styles.sectionHeading}>
              <span className={styles.headingIcon}>
                <ImageIcon aria-hidden="true" size={17} strokeWidth={1.8} />
              </span>
              <div>
                <strong>사진 {post.media.length}장</strong>
                <small>사진은 그대로 유지돼요.</small>
              </div>
            </div>
            <div aria-label="현재 게시물 사진" className={styles.mediaStrip}>
              {post.media.map((media) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={media.alt} key={media.id} src={media.url} />
              ))}
            </div>
          </section>
        ) : null}

        {post.poll ? (
          <section className={styles.lockedContent}>
            <small>투표 질문</small>
            <strong>{post.poll.question}</strong>
            <p>질문과 선택지는 투표 기록을 보호하기 위해 그대로 유지돼요.</p>
          </section>
        ) : null}

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <strong>주제</strong>
              <small>게시물을 찾기 쉽게 분류해요.</small>
            </div>
          </div>
          <div aria-label="게시물 주제" className={styles.chipScroller}>
            {feedPostTopicCategories.map((value) => (
              <button
                aria-pressed={category === value}
                key={value}
                onClick={() =>
                  setCategory((current) => (current === value ? null : value))
                }
                type="button"
              >
                {category === value ? (
                  <Check aria-hidden="true" size={14} strokeWidth={2} />
                ) : null}
                {feedPostTopicLabels[value]}
              </button>
            ))}
          </div>
        </section>

        {tags.length > 0 ? (
          <section aria-label="게시물 태그" className={styles.tagSection}>
            {tags.map((tag) => (
              <button
                aria-label={`${tag} 태그 삭제`}
                key={tag}
                onClick={() =>
                  setTags((current) => current.filter((item) => item !== tag))
                }
                type="button"
              >
                #{tag}
                <span aria-hidden="true">×</span>
              </button>
            ))}
          </section>
        ) : null}

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <strong>공개 범위</strong>
            </div>
          </div>
          <div className={styles.visibilityOptions}>
            {visibilityOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  aria-label={option.label}
                  aria-pressed={visibility === option.value}
                  key={option.value}
                  onClick={() => setVisibility(option.value)}
                  type="button"
                >
                  <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
                  <span className={styles.visibilityCopy}>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                  {visibility === option.value ? (
                    <Check
                      aria-hidden="true"
                      className={styles.optionCheck}
                      size={16}
                      strokeWidth={2.2}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        {status.status === "error" || status.status === "notice" ? (
          <p
            aria-live="polite"
            className={styles[status.status]}
            role="status"
          >
            {status.message}
          </p>
        ) : null}
      </div>
    </main>
  );

  function handleBodyChange(value: string) {
    const extracted = extractCompletedFeedTags(value, tags);
    setBody(extracted.body);
    setTags(extracted.tags);

    if (extracted.limitReached) {
      setStatus({
        message: `태그는 최대 ${maxFeedTagCount}개까지 추가할 수 있어요.`,
        status: "error",
      });
    } else if (status.status === "error") {
      setStatus({ status: "idle" });
    }
  }

  async function savePost() {
    if (!canSave) return;
    setStatus({ status: "pending" });

    try {
      const response = await fetch("/api/feed", {
        body: JSON.stringify({
          action: "update_post",
          body: trimmedBody,
          postId: post.id,
          topic: {
            category,
            source: "manual",
            tags,
          },
          visibility,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        setStatus({
          message: payload?.message ?? "수정 내용을 저장하지 못했어요.",
          status: "error",
        });
        return;
      }

      router.push(returnTo);
      router.refresh();
    } catch {
      setStatus({
        message: "연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.",
        status: "error",
      });
    }
  }
}

function normalizeTopic(topic?: FeedPostTopicSummary) {
  const category =
    topic?.category &&
    feedPostTopicCategories.includes(
      topic.category as FeedPostTopicCategory,
    )
      ? (topic.category as FeedPostTopicCategory)
      : null;

  return {
    category,
    tags: topic?.tags ?? [],
  };
}

function readInitialVisibility(post: FeedItem): Visibility {
  const visibility = post.visibility;
  return visibility === "profile_public" || visibility === "private_draft"
    ? visibility
    : "public";
}
