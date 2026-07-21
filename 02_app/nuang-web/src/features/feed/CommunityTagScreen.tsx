import { MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import type { FeedItem } from "@/features/feed/feed-seed";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
import { PublicProfileImageView } from "@/features/public-profile/PublicProfileImageView";
import styles from "./CommunityTagScreen.module.css";

export function CommunityTagScreen({
  posts,
  tag,
}: {
  posts: FeedItem[];
  tag: string;
}) {
  return (
    <CommunityScreenShell
      title={`#${tag}`}
      trailing={
        <Link aria-label="커뮤니티 검색" href="/feed/search">
          <Search aria-hidden="true" size={20} />
        </Link>
      }
    >
      <section className={styles.intro}>
        <span>태그 모아보기</span>
        <h2>#{tag}</h2>
        <p>
          같은 태그를 사용한 공개 게시물 {posts.length.toLocaleString("ko-KR")}
          개를 모았어요.
        </p>
      </section>

      {posts.length > 0 ? (
        <section aria-label={`#${tag} 게시물`} className={styles.postList}>
          {posts.map((post) => (
            <article className={styles.postCard} key={post.id}>
              <header>
                {post.authorProfile ? (
                  <Link
                    aria-label={`${post.authorName} 프로필 보기`}
                    className={styles.profileLink}
                    href={`/feed/profiles/${post.authorProfile.source.communityProfileId ?? post.authorProfile.source.publicSnapshotId}`}
                  >
                    <PublicProfileImageView
                      className={styles.profileImage}
                      image={post.authorProfile.display.profileImage}
                      size="sm"
                    />
                    <span>
                      <strong>{post.authorName}</strong>
                      <small>
                        {post.authorProfile.display.code} · {post.timeLabel}
                      </small>
                    </span>
                  </Link>
                ) : (
                  <span className={styles.profileLink}>
                    <span className={styles.fallbackAvatar}>
                      {post.avatarLabel.slice(0, 1)}
                    </span>
                    <span>
                      <strong>{post.authorName}</strong>
                      <small>{post.timeLabel}</small>
                    </span>
                  </span>
                )}
                {post.topic?.label ? (
                  <span className={styles.category}>{post.topic.label}</span>
                ) : null}
              </header>

              <Link
                className={styles.postContent}
                href={`/feed/posts/${post.id}`}
              >
                <p>{post.body || post.title}</p>
                {post.media?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={post.media[0].alt} src={post.media[0].url} />
                ) : null}
              </Link>

              {post.topic?.tags.length ? (
                <div aria-label="게시물 태그" className={styles.tags}>
                  {post.topic.tags.map((postTag) => (
                    <Link
                      aria-current={postTag === tag ? "page" : undefined}
                      href={`/feed/tags/${encodeURIComponent(postTag)}`}
                      key={postTag}
                    >
                      #{postTag}
                    </Link>
                  ))}
                </div>
              ) : null}

              <footer>
                <span>
                  좋아요 {(post.likeCount ?? 0).toLocaleString("ko-KR")}
                </span>
                <Link href={`/feed/posts/${post.id}`}>
                  <MessageCircle aria-hidden="true" size={15} />
                  댓글 {(post.replyCount ?? 0).toLocaleString("ko-KR")}
                </Link>
              </footer>
            </article>
          ))}
        </section>
      ) : (
        <div className={styles.empty}>
          <strong>아직 이 태그의 공개 게시물이 없어요</strong>
          <p>검색에서 비슷한 태그를 찾아보거나 새로운 이야기를 남겨보세요.</p>
          <Link href="/feed/search">다른 태그 검색하기</Link>
        </div>
      )}
    </CommunityScreenShell>
  );
}
