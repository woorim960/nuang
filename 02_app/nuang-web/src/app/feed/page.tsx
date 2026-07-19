import { ArrowRight, BadgeCheck, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { FeedActionButtons } from "@/features/feed/FeedActionButtons";
import { FeedComposer } from "@/features/feed/FeedComposer";
import { FeedMoreMenu } from "@/features/feed/FeedMoreMenu";
import { FeedPollCard } from "@/features/feed/FeedPollCard";
import { homeDailyCommunityPollPromptId } from "@/features/feed/feed-prompts";
import type { FeedItem } from "@/features/feed/feed-seed";
import { createServerFeedReadPayload } from "@/features/feed/server-read";
import { PublicProfileButton } from "@/features/public-profile/PublicProfileModal";
import { PublicProfileImageView } from "@/features/public-profile/PublicProfileImageView";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "피드 | NUANG",
};

export default async function FeedPage() {
  const feedPayload = await createServerFeedReadPayload();
  const posts = orderFeedPosts(feedPayload.items);

  return (
    <div className={styles.shell}>
      <main className={styles.page}>
        <header className={styles.header}>
          <div className={styles.wordmark}>
            <span>NUANG</span>
            <h1>피드</h1>
          </div>
          <a
            aria-label="글쓰기 영역으로 이동"
            className={styles.writeLink}
            href="#feed-composer"
          >
            <PenLine aria-hidden="true" size={18} strokeWidth={1.9} />
            <span>글쓰기</span>
          </a>
        </header>

        <FeedComposer />

        <section aria-label="피드 게시물" className={styles.feedSection}>
          {posts.length > 0 ? (
            <div className={styles.postList}>
              {posts.map((post) => (
                <FeedPost post={post} key={post.id} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyFeed}>
              <strong>아직 올라온 이야기가 없어요</strong>
              <p>위의 글쓰기를 눌러 첫 생각을 나눠보세요.</p>
            </div>
          )}
        </section>
      </main>
      <BottomNavigation />
    </div>
  );
}

function FeedPost({ post }: { post: FeedItem }) {
  const isOfficialDailyPoll = isDailyCommunityPoll(post);
  const recentReply = post.replyPreview?.[0];

  return (
    <article
      className={styles.postCard}
      data-official={isOfficialDailyPoll ? "true" : "false"}
    >
      <div className={styles.postHeader}>
        <Avatar
          label={post.avatarLabel}
          profile={post.authorProfile}
          profileLabel={post.authorName}
        />
        <PostAuthor post={post} />
        <FeedMoreMenu postId={post.id} targetType={post.targetType} />
      </div>

      <p
        className={styles.postContext}
        data-official={isOfficialDailyPoll ? "true" : "false"}
      >
        {isOfficialDailyPoll ? "오늘의 성향 질문" : post.title}
        {post.statusLabel ? <small>{post.statusLabel}</small> : null}
      </p>

      <p className={styles.postBody}>{post.body}</p>

      {post.poll ? (
        <div className={styles.pollWrap}>
          <FeedPollCard poll={post.poll} returnTo="/feed" variant="home" />
          <p className={styles.pollNote}>
            이 선택은 성향 검사 결과에 반영되지 않아요.
          </p>
          {post.poll.viewerVoteOptionId ? (
            <Link className={styles.pollDetailLink} href={post.poll.statsHref}>
              뉴앙 코드별 선택과 댓글 보기
              <ArrowRight aria-hidden="true" size={15} strokeWidth={2} />
            </Link>
          ) : null}
        </div>
      ) : null}

      {post.reportShare ? <ReportSharePreview post={post} /> : null}

      <div className={styles.postActions}>
        <FeedActionButtons
          includeBookmark
          includeShare={false}
          initialBookmarked={post.viewerHasBookmarked}
          initialLiked={post.viewerHasLiked}
          postId={post.id}
          targetType={post.targetType}
        />
      </div>

      <EngagementSummary post={post} />

      {recentReply ? (
        <p className={styles.recentReply}>
          <strong>{recentReply.authorName}</strong>
          <span>{recentReply.body}</span>
          {recentReply.statusLabel ? (
            <small>{recentReply.statusLabel}</small>
          ) : null}
        </p>
      ) : null}

      {!post.poll ? (
        <Link
          className={styles.conversationLink}
          href={`/feed/posts/${post.id}`}
        >
          {post.replyCount
            ? `댓글 ${post.replyCount.toLocaleString("ko-KR")}개 보기`
            : "첫 댓글 남기기"}
        </Link>
      ) : null}
    </article>
  );
}

function ReportSharePreview({ post }: { post: FeedItem }) {
  if (!post.reportShare) return null;

  return (
    <Link className={styles.reportCard} href={post.reportShare.href}>
      <div>
        <span>공유된 뉴앙 리포트</span>
        <strong>{post.reportShare.profileCode}</strong>
        <p>{post.reportShare.profileName}</p>
      </div>
      <span>
        리포트 보기
        <ArrowRight aria-hidden="true" size={15} strokeWidth={2} />
      </span>
    </Link>
  );
}

function PostAuthor({ post }: { post: FeedItem }) {
  const authorName = (
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
          {authorName}
        </PublicProfileButton>
      ) : (
        authorName
      )}
      <span>
        {post.authorHandle} · {post.timeLabel}
      </span>
    </div>
  );
}

function Avatar({
  label,
  profile,
  profileLabel,
}: {
  label: string;
  profile?: FeedItem["authorProfile"];
  profileLabel: string;
}) {
  if (profile) {
    return (
      <PublicProfileButton
        ariaLabel={`${profileLabel} 프로필 보기`}
        className={styles.avatarButton}
        profile={profile}
      >
        <PublicProfileImageView
          className={styles.profileImage}
          image={profile.display.profileImage}
          size="sm"
        />
      </PublicProfileButton>
    );
  }

  return <span className={styles.fallbackAvatar}>{label.slice(0, 1)}</span>;
}

function EngagementSummary({ post }: { post: FeedItem }) {
  const likeCount = post.likeCount ?? 0;
  const replyCount = post.replyCount ?? 0;

  if (likeCount === 0 && replyCount === 0) {
    return <p className={styles.emptyEngagement}>첫 반응을 기다리고 있어요</p>;
  }

  return (
    <p className={styles.engagementSummary}>
      {likeCount > 0 ? `좋아요 ${likeCount.toLocaleString("ko-KR")}개` : null}
      {likeCount > 0 && replyCount > 0 ? <span>·</span> : null}
      {replyCount > 0 ? `댓글 ${replyCount.toLocaleString("ko-KR")}개` : null}
    </p>
  );
}

function orderFeedPosts(posts: FeedItem[]) {
  const dailyPoll = posts.find(isDailyCommunityPoll);

  if (!dailyPoll) return posts;

  return [dailyPoll, ...posts.filter((post) => post.id !== dailyPoll.id)];
}

function isDailyCommunityPoll(post: FeedItem) {
  return post.poll?.promptId === homeDailyCommunityPollPromptId;
}
