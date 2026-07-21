"use client";

import Image from "next/image";
import Link from "next/link";
import { FeedActionButtons } from "@/features/feed/FeedActionButtons";
import { FeedPollCard } from "@/features/feed/FeedPollCard";
import type { FeedItem } from "@/features/feed/feed-seed";
import styles from "./PersonalityPlaygroundPost.module.css";

export function PersonalityPlaygroundPost({
  continueHref,
  highlighted = false,
  post,
  recordHref = "/feed/perspectives",
  returnTo = "/feed",
}: {
  continueHref?: string;
  highlighted?: boolean;
  post: FeedItem;
  recordHref?: string;
  returnTo?: string;
}) {
  if (!post.poll) return null;

  return (
    <article
      className={styles.post}
      data-highlighted={highlighted ? "true" : "false"}
      data-official="true"
      id={`community-post-${post.id}`}
    >
      <header className={styles.header}>
        <Image
          alt="뉴앙 캐릭터"
          className={styles.avatar}
          height={48}
          priority
          src="/assets/characters/nuang-character-purple.webp"
          width={48}
        />
        <div className={styles.identity}>
          <strong>오늘의 성향 놀이터</strong>
          <small>뉴앙이 고른 오늘의 질문 · 관계</small>
        </div>
        <Link className={styles.recordLink} href={recordHref}>
          내 기록
        </Link>
      </header>

      <h3 className={styles.title}>오늘의 밸런스 게임</h3>

      <div className={styles.poll}>
        <FeedPollCard
          poll={post.poll}
          returnTo={returnTo}
          variant="playground"
        />
      </div>

      <div className={styles.footnote}>
        <p>가볍게 고른 선택은 공식 검사 결과를 바꾸지 않아요.</p>
        {continueHref ? (
          <Link href={continueHref}>커뮤니티에서 이어보기</Link>
        ) : null}
      </div>

      <div className={styles.actions}>
        <FeedActionButtons
          includeBookmark
          includeShare
          initialBookmarked={post.viewerHasBookmarked}
          initialLiked={post.viewerHasLiked}
          likeCount={post.likeCount}
          postId={post.id}
          replyCount={post.replyCount}
          replyPreview={post.replyPreview}
          returnTo={returnTo}
          targetType={post.targetType}
        />
      </div>
    </article>
  );
}
