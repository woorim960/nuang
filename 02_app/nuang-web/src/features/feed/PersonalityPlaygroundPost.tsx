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
  const isClosed =
    post.poll.status === "closed" || post.responseStatus === "closed";
  const isFeatured = post.officialFeatured !== false && !isClosed;

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
          <strong>{isFeatured ? "오늘의 성향 놀이터" : "성향 놀이터"}</strong>
        </div>
        <Link className={styles.recordLink} href={recordHref}>
          내 기록
        </Link>
      </header>

      <h3 className={styles.title}>
        {isFeatured ? "오늘의 밸런스 게임" : "밸런스 게임"}
      </h3>

      <div className={styles.poll}>
        <FeedPollCard
          poll={post.poll}
          returnTo={returnTo}
          variant="playground"
        />
      </div>

      {continueHref ? (
        <div className={styles.footnote}>
          <Link href={continueHref}>커뮤니티에서 이어보기</Link>
        </div>
      ) : null}

      <div className={styles.actions}>
        <FeedActionButtons
          allowComment={!isClosed}
          commentDisabledMessage={
            isClosed
              ? "투표와 새 댓글이 마감됐어요. 최종 결과와 기존 댓글은 계속 볼 수 있어요."
              : undefined
          }
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
