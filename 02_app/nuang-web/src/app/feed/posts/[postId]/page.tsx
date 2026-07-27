import { ArrowLeft, ArrowRight, BadgeCheck, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedActionButtons } from "@/features/feed/FeedActionButtons";
import { FeedMoreMenu } from "@/features/feed/FeedMoreMenu";
import { SafeLinkedText } from "@/features/feed/SafeLinkedText";
import type { FeedItem, FeedReplyPreview } from "@/features/feed/feed-seed";
import {
  createServerFeedPostDetailPayload,
  type FeedPostDetailPayload,
} from "@/features/feed/server-read";
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
      {post.topic ? (
        <div aria-label="게시물 태그" className={styles.postTopics}>
          {post.topic.label ? <strong>{post.topic.label}</strong> : null}
          {post.topic.tags.map((tag) => (
            <Link href={`/feed/tags/${encodeURIComponent(tag)}`} key={tag}>
              #{tag}
            </Link>
          ))}
        </div>
      ) : null}
      <SafeLinkedText
        className={styles.postBody}
        links={post.links}
        text={post.body}
      />

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
  const responsesClosed = payload.post.responseStatus === "closed";

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
        </div>
      )}

      <div className={styles.composer}>
        {responsesClosed ? (
          <p>응답이 마감됐어요. 기존 댓글은 계속 볼 수 있어요.</p>
        ) : (
          <FeedActionButtons
            commentComposer
            commentPlaceholder="생각을 이어서 남겨보세요."
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

function PostAvatar({ post }: { post: FeedItem }) {
  if (post.authorProfile) {
    return (
      <Link
        aria-label={`${post.authorName} 프로필 사진 보기`}
        className={styles.avatarButton}
        href={`/feed/profiles/${post.authorProfile.source.communityProfileId ?? post.authorProfile.source.publicSnapshotId}`}
      >
        <PublicProfileImageView
          className={styles.profileImage}
          image={post.authorProfile.display.profileImage}
          size="sm"
        />
      </Link>
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
        <Link
          aria-label={`${post.authorName} 프로필 보기`}
          className={styles.authorButton}
          href={`/feed/profiles/${post.authorProfile.source.communityProfileId ?? post.authorProfile.source.publicSnapshotId}`}
        >
          {author}
        </Link>
      ) : (
        author
      )}
      <span>
        {post.authorHandle} · {post.timeLabel}
      </span>
    </div>
  );
}
