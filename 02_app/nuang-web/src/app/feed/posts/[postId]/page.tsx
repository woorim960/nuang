import { ArrowLeft, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommunityPostCard } from "@/features/feed/CommunityFeed";
import { FeedActionButtons } from "@/features/feed/FeedActionButtons";
import { FeedMoreMenu } from "@/features/feed/FeedMoreMenu";
import { SafeLinkedText } from "@/features/feed/SafeLinkedText";
import type { FeedReplyPreview } from "@/features/feed/feed-seed";
import {
  createServerFeedPostDetailPayload,
  type FeedPostDetailPayload,
} from "@/features/feed/server-read";
import styles from "./page.module.css";

type FeedPostDetailPageProps = {
  params: Promise<{
    postId: string;
  }>;
  searchParams?: Promise<{
    backTo?: string;
  }>;
};

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "게시물 | NUANG",
};

export default async function FeedPostDetailPage({
  params,
  searchParams = Promise.resolve({}),
}: FeedPostDetailPageProps) {
  const [{ postId }, query] = await Promise.all([params, searchParams]);
  const payload = await createServerFeedPostDetailPayload(postId);

  if (!payload) {
    notFound();
  }

  const returnTo = `/feed/posts/${postId}`;
  const backHref = normalizeBackHref(query.backTo);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link
          aria-label="이전 화면으로 돌아가기"
          className={styles.backButton}
          href={backHref}
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.8} />
        </Link>
        <h1>게시물</h1>
      </header>

      <div className={styles.content}>
        <CommunityPostCard
          filterActive={false}
          highlighted={false}
          mode="recommended"
          post={payload.post}
          prioritizeMedia
          returnTo={returnTo}
          showConversationLink={false}
          viewerCode={payload.viewer.nuangCode}
        />
        <CommentSection payload={payload} returnTo={returnTo} />
      </div>
    </main>
  );
}

function CommentSection({
  payload,
  returnTo,
}: {
  payload: FeedPostDetailPayload;
  returnTo: string;
}) {
  const responsesClosed = payload.post.responseStatus === "closed";

  return (
    <section className={styles.commentSection}>
      <div className={styles.sectionHeading}>
        <h2>댓글</h2>
        <span>{payload.comments.length.toLocaleString("ko-KR")}</span>
      </div>

      {payload.comments.length > 0 ? (
        <div aria-label="댓글 목록" className={styles.commentList}>
          {payload.comments.map((comment) => (
            <Comment comment={comment} key={comment.id} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyComments}>
          <MessageCircle aria-hidden="true" size={20} strokeWidth={1.6} />
          <strong>첫 댓글을 남겨보세요</strong>
        </div>
      )}

      <div className={styles.composer}>
        {responsesClosed ? (
          <p>댓글 작성이 마감됐어요.</p>
        ) : (
          <FeedActionButtons
            commentComposer
            commentPlaceholder="댓글을 입력하세요"
            postId={payload.post.id}
            returnTo={returnTo}
            targetType="feed_post"
          />
        )}
      </div>
    </section>
  );
}

function Comment({ comment }: { comment: FeedReplyPreview }) {
  return (
    <article className={styles.comment}>
      <span aria-hidden="true" className={styles.commentAvatar}>
        {comment.authorName.slice(0, 1)}
      </span>
      <div>
        <div className={styles.commentHeader}>
          <strong>{comment.authorName}</strong>
          {comment.timeLabel ? <time>{comment.timeLabel}</time> : null}
          {comment.statusLabel ? <small>{comment.statusLabel}</small> : null}
          {comment.reportable ? (
            <FeedMoreMenu
              compact
              postId={comment.id}
              targetType="feed_comment"
            />
          ) : null}
        </div>
        <SafeLinkedText links={comment.links} text={comment.body} />
      </div>
    </article>
  );
}

function normalizeBackHref(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/feed";
  }

  return value;
}
