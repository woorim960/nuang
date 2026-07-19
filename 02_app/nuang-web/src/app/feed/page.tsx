import { ArrowRight, BadgeCheck, Sparkles } from "lucide-react";
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
  const posts = feedPayload.items;

  return (
    <div className={styles.shell}>
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p>NUANG</p>
            <h1>피드</h1>
          </div>
          <p>서로의 선택과 생각을 발견하는 곳</p>
        </header>

        <div className={styles.content}>
          <aside className={styles.introCard}>
            <span aria-hidden="true">
              <Sparkles size={18} strokeWidth={1.9} />
            </span>
            <div>
              <strong>오늘은 어떤 생각이 오갈까요?</strong>
              <p>
                검사 답변과 점수는 공개하지 않고, 직접 나눈 이야기만 보여줘요.
              </p>
            </div>
          </aside>

          <FeedComposer />

          <section aria-label="커뮤니티 피드" className={styles.feedSection}>
            <div className={styles.sectionHeading}>
              <div>
                <h2>새로운 이야기</h2>
                <p>최근에 공개된 글부터 보여드려요.</p>
              </div>
              {posts.length > 0 ? <span>{posts.length}개</span> : null}
            </div>

            {posts.length > 0 ? (
              <div className={styles.postList}>
                {posts.map((post) => (
                  <FeedPost post={post} key={post.id} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyFeed}>
                <strong>아직 공개된 이야기가 없어요</strong>
                <p>위에서 첫 이야기를 남기면 이곳에 바로 이어져요.</p>
              </div>
            )}
          </section>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}

function FeedPost({ post }: { post: FeedItem }) {
  const isOfficialDailyPoll =
    post.poll?.promptId === homeDailyCommunityPollPromptId;

  return (
    <article className={styles.postCard}>
      <div className={styles.postHeader}>
        <Avatar
          label={post.avatarLabel}
          profile={post.authorProfile}
          profileLabel={post.authorName}
        />
        <PostAuthor post={post} />
        <FeedMoreMenu postId={post.id} targetType={post.targetType} />
      </div>

      <div className={styles.postTypeRow}>
        <span data-official={isOfficialDailyPoll ? "true" : "false"}>
          {isOfficialDailyPoll ? "오늘의 성향 질문" : post.title}
        </span>
        {post.statusLabel ? <small>{post.statusLabel}</small> : null}
      </div>

      <p className={styles.postBody}>{post.body}</p>

      {post.poll ? (
        <div className={styles.pollWrap}>
          <FeedPollCard poll={post.poll} returnTo="/feed" variant="home" />
          {post.poll.viewerVoteOptionId ? (
            <Link className={styles.pollDetailLink} href={post.poll.statsHref}>
              투표 결과와 댓글 보기
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
          replyPreview={post.replyPreview}
          targetType={post.targetType}
        />
        <EngagementSummary post={post} />
      </div>
    </article>
  );
}

function ReportSharePreview({ post }: { post: FeedItem }) {
  if (!post.reportShare) return null;

  return (
    <Link className={styles.reportCard} href={post.reportShare.href}>
      <div className={styles.reportHeading}>
        <div>
          <span>공유된 뉴앙 리포트</span>
          <strong>{post.reportShare.profileCode}</strong>
          <p>{post.reportShare.profileName}</p>
        </div>
        <span>
          리포트 보기
          <ArrowRight aria-hidden="true" size={14} strokeWidth={2} />
        </span>
      </div>
      {post.reportShare.domains.length > 0 ? (
        <div className={styles.reportDomains}>
          {post.reportShare.domains.slice(0, 3).map((domain) => (
            <div key={domain.domainId}>
              <span>{domain.label}</span>
              <span>
                <span style={{ width: `${domain.score ?? 0}%` }} />
              </span>
              <strong>
                {domain.score === null ? "-" : Math.round(domain.score)}
              </strong>
            </div>
          ))}
        </div>
      ) : null}
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
    return <p className={styles.emptyEngagement}>첫 반응을 남겨보세요</p>;
  }

  return (
    <p className={styles.engagementSummary}>
      {likeCount > 0 ? `좋아요 ${likeCount.toLocaleString("ko-KR")}개` : null}
      {likeCount > 0 && replyCount > 0 ? <span>·</span> : null}
      {replyCount > 0 ? `댓글 ${replyCount.toLocaleString("ko-KR")}개` : null}
    </p>
  );
}
