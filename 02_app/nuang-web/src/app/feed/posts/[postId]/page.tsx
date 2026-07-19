import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  LockKeyhole,
  MessageCircle,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedActionButtons } from "@/features/feed/FeedActionButtons";
import type { FeedItem, FeedReplyPreview } from "@/features/feed/feed-seed";
import {
  createServerFeedPostDetailPayload,
  type FeedPostDetailPayload,
} from "@/features/feed/server-read";
import { PublicProfileButton } from "@/features/public-profile/PublicProfileModal";
import { PublicProfileImageView } from "@/features/public-profile/PublicProfileImageView";
import styles from "./page.module.css";

type FeedPostDetailPageProps = {
  params: Promise<{
    postId: string;
  }>;
};

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "피드 이야기 | NUANG",
};

export default async function FeedPostDetailPage({
  params,
}: FeedPostDetailPageProps) {
  const { postId } = await params;
  const payload = await createServerFeedPostDetailPayload(postId);

  if (!payload) {
    notFound();
  }

  const returnTo = `/feed/posts/${postId}`;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link
          aria-label="피드로 돌아가기"
          className={styles.backButton}
          href="/feed"
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={2} />
        </Link>
        <div>
          <p>피드</p>
          <h1>이야기</h1>
        </div>
      </header>

      <div className={styles.content}>
        <PostCard post={payload.post} />
        <CommentSection payload={payload} returnTo={returnTo} />
      </div>
    </main>
  );
}

function PostCard({ post }: { post: FeedItem }) {
  return (
    <article className={styles.postCard}>
      <div className={styles.postHeader}>
        <PostAvatar post={post} />
        <PostAuthor post={post} />
      </div>

      <div className={styles.postMeta}>
        <span>{post.title}</span>
        {post.statusLabel ? <small>{post.statusLabel}</small> : null}
      </div>
      <p className={styles.postBody}>{post.body}</p>

      {post.reportShare ? (
        <Link className={styles.reportLink} href={post.reportShare.href}>
          <div>
            <small>공유된 뉴앙 리포트</small>
            <strong>{post.reportShare.profileCode}</strong>
            <span>{post.reportShare.profileName}</span>
          </div>
          <span>
            리포트 보기
            <ArrowRight aria-hidden="true" size={15} strokeWidth={2} />
          </span>
        </Link>
      ) : null}

      {post.poll ? (
        <Link className={styles.pollLink} href={post.poll.statsHref}>
          <div>
            <small>오늘의 성향 질문</small>
            <strong>{post.poll.question}</strong>
          </div>
          <ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
        </Link>
      ) : null}

      <div className={styles.actionRow}>
        <FeedActionButtons
          includeBookmark
          includeComment={false}
          includeShare={false}
          initialBookmarked={post.viewerHasBookmarked}
          initialLiked={post.viewerHasLiked}
          postId={post.id}
          returnTo={`/feed/posts/${post.id}`}
          targetType="feed_post"
        />
        <p>
          좋아요 {(post.likeCount ?? 0).toLocaleString("ko-KR")}개<span>·</span>
          댓글 {(post.replyCount ?? 0).toLocaleString("ko-KR")}개
        </p>
      </div>
    </article>
  );
}

function CommentSection({
  payload,
  returnTo,
}: {
  payload: FeedPostDetailPayload;
  returnTo: string;
}) {
  return (
    <section className={styles.commentSection}>
      <div className={styles.sectionHeading}>
        <div>
          <span aria-hidden="true">
            <MessageCircle size={18} strokeWidth={1.9} />
          </span>
          <h2>댓글</h2>
        </div>
        <span>{payload.comments.length.toLocaleString("ko-KR")}개</span>
      </div>

      <aside className={styles.communityNote}>
        <LockKeyhole aria-hidden="true" size={16} strokeWidth={1.9} />
        <p>검사 답변이나 점수 대신, 이 이야기에 대한 생각만 나눠요.</p>
      </aside>

      {payload.comments.length > 0 ? (
        <div aria-label="댓글 목록" className={styles.commentList}>
          {payload.comments.map((comment) => (
            <Comment comment={comment} key={comment.id} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyComments}>
          <span aria-hidden="true">
            <MessageCircle size={19} strokeWidth={1.8} />
          </span>
          <strong>아직 댓글이 없어요</strong>
          <p>이 이야기를 보고 든 생각을 가장 먼저 남겨보세요.</p>
        </div>
      )}

      <div className={styles.composer}>
        <FeedActionButtons
          commentComposer
          commentPlaceholder="생각을 이어서 남겨보세요."
          postId={payload.post.id}
          returnTo={returnTo}
          targetType="feed_post"
        />
        <p>
          {payload.viewer.isAuthenticated
            ? "등록한 댓글은 바로 확인할 수 있고, 운영 기준에 따라 공개돼요."
            : "작성한 내용은 로그인 후에도 사라지지 않고 그대로 이어져요."}
        </p>
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
        </div>
        <p>{comment.body}</p>
      </div>
    </article>
  );
}

function PostAvatar({ post }: { post: FeedItem }) {
  if (post.authorProfile) {
    return (
      <PublicProfileButton
        ariaLabel={`${post.authorName} 프로필 보기`}
        className={styles.avatarButton}
        profile={post.authorProfile}
      >
        <PublicProfileImageView
          className={styles.profileImage}
          image={post.authorProfile.display.profileImage}
          size="sm"
        />
      </PublicProfileButton>
    );
  }

  return (
    <span aria-hidden="true" className={styles.fallbackAvatar}>
      {post.avatarLabel.slice(0, 1)}
    </span>
  );
}

function PostAuthor({ post }: { post: FeedItem }) {
  const author = (
    <span className={styles.authorName}>
      {post.authorName}
      {post.verified ? (
        <BadgeCheck
          aria-label="인증됨"
          fill="currentColor"
          size={14}
          strokeWidth={2.2}
        />
      ) : null}
    </span>
  );

  return (
    <div className={styles.authorCopy}>
      {post.authorProfile ? (
        <PublicProfileButton
          ariaLabel={`${post.authorName} 프로필 보기`}
          className={styles.authorButton}
          profile={post.authorProfile}
        >
          {author}
        </PublicProfileButton>
      ) : (
        author
      )}
      <span>
        {post.authorHandle} · {post.timeLabel}
      </span>
    </div>
  );
}
