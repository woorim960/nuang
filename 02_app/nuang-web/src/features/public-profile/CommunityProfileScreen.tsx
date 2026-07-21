"use client";

import {
  Ban,
  Ellipsis,
  Flag,
  Heart,
  MessageCircle,
  Pencil,
  Settings,
  Share2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { CommunityProfileSocialState } from "@/features/feed/community-social-contract";
import type { FeedItem } from "@/features/feed/feed-seed";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
import {
  feedPostTopicCategories,
  feedPostTopicLabels,
} from "@/features/feed/feed-topic";
import type { PublicProfileCardPayload } from "@/features/public-profile/public-profile-card-contract";
import { PublicProfileImageView } from "@/features/public-profile/PublicProfileImageView";
import { profileVisibilityPolicyVersion } from "@/features/together/profile-visibility-policy";
import styles from "./CommunityProfileScreen.module.css";

export function CommunityProfileScreen({
  initialSocialState,
  mode = "other",
  posts,
  profile,
}: {
  initialSocialState: CommunityProfileSocialState;
  mode?: "other" | "preview" | "self";
  posts: FeedItem[];
  profile: PublicProfileCardPayload;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTopic, setActiveTopic] = useState("전체");
  const [following, setFollowing] = useState(initialSocialState.following);
  const [followerCount, setFollowerCount] = useState(
    initialSocialState.followerCount,
  );
  const [followPending, setFollowPending] = useState(false);
  const [comparePending, setComparePending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [safetyPending, setSafetyPending] = useState(false);
  const topics = useMemo(
    () => [
      "전체",
      ...feedPostTopicCategories.map(
        (category) => feedPostTopicLabels[category],
      ),
    ],
    [],
  );
  const visiblePosts =
    activeTopic === "전체"
      ? posts
      : posts.filter((post) => post.topic?.label === activeTopic);
  const isPreview = mode === "preview";
  const isSelf =
    mode === "self" || (mode === "other" && initialSocialState.isOwnProfile);
  const codeIsVisible = profile.display.code !== "-----";
  const comparisonAvailable =
    profile.visibility.includedFields.includes("representative_profile") &&
    profile.visibility.includedFields.includes("core_domain_map") &&
    profile.visibility.includedFields.includes("core_facet_summary");

  async function toggleFollow() {
    if (followPending) return;
    setFollowPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/community/follow", {
        body: JSON.stringify({
          action: following ? "unfollow" : "follow",
          publicSnapshotId: profile.source.publicSnapshotId,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        followerCount?: number;
        following?: boolean;
        message?: string;
      } | null;

      if (response.status === 401) {
        router.push(
          `/login?next=${encodeURIComponent(pathname)}&reason=community`,
        );
        return;
      }

      if (!response.ok) {
        setMessage(payload?.message ?? "팔로우 상태를 저장하지 못했어요.");
        return;
      }

      setFollowing(Boolean(payload?.following));
      setFollowerCount(payload?.followerCount ?? followerCount);
    } catch {
      setMessage("연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setFollowPending(false);
    }
  }

  async function compareWithMe() {
    if (comparePending) return;
    setComparePending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/public-comparisons", {
        body: JSON.stringify({
          policyVersion: profileVisibilityPolicyVersion,
          target: { publicSnapshotId: profile.source.publicSnapshotId },
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        code?: string;
        comparisonReportId?: string;
        message?: string;
      } | null;

      if (response.status === 401) {
        router.push(
          `/login?next=${encodeURIComponent(pathname)}&reason=community`,
        );
        return;
      }

      if (response.ok && payload?.comparisonReportId) {
        router.push(
          `/reports/comparison/${payload.comparisonReportId}?backTo=${encodeURIComponent(pathname)}`,
        );
        return;
      }

      if (payload?.code === "viewer_full_core_missing") {
        setMessage("내 정밀 코어 검사 결과가 있어야 비교할 수 있어요.");
        return;
      }

      setMessage(
        payload?.message
          ? toFriendlyComparisonMessage(payload.message)
          : "비교 리포트를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      );
    } catch {
      setMessage("연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setComparePending(false);
    }
  }

  async function shareProfile() {
    const publicProfileId =
      profile.source.communityProfileId ?? profile.source.publicSnapshotId;
    const url = new URL(
      `/feed/profiles/${publicProfileId}`,
      window.location.origin,
    ).toString();
    const shareData = {
      text: codeIsVisible
        ? `${profile.display.displayName}님의 뉴앙 코드 ${profile.display.code}`
        : `${profile.display.displayName}님의 뉴앙 프로필`,
      title: `${profile.display.displayName}님의 뉴앙 프로필`,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setMessage("프로필 링크를 복사했어요.");
      }
    } catch {
      setMessage("공유를 취소했어요.");
    } finally {
      setMoreOpen(false);
    }
  }

  async function blockProfile() {
    if (safetyPending) return;
    setSafetyPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/community/profile-safety", {
        body: JSON.stringify({
          action: "block",
          publicSnapshotId: profile.source.publicSnapshotId,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (response.status === 401) {
        router.push(
          `/login?next=${encodeURIComponent(pathname)}&reason=community`,
        );
        return;
      }

      if (!response.ok) {
        setMessage(payload?.message ?? "프로필을 차단하지 못했어요.");
        setBlockConfirmOpen(false);
        setMoreOpen(false);
        return;
      }

      router.push("/feed");
      router.refresh();
    } catch {
      setMessage("연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.");
      setBlockConfirmOpen(false);
      setMoreOpen(false);
    } finally {
      setSafetyPending(false);
    }
  }

  return (
    <CommunityScreenShell
      backHref={isSelf ? null : isPreview ? "/my/settings/visibility" : "/feed"}
      backLabel={isPreview ? "공개 정보 설정으로 돌아가기" : undefined}
      title={
        isSelf
          ? "마이"
          : isPreview
            ? "프로필 미리보기"
            : profile.display.displayName
      }
      trailing={
        isSelf ? (
          <Link aria-label="설정 열기" href="/my/settings">
            <Settings aria-hidden="true" size={20} strokeWidth={1.7} />
          </Link>
        ) : isPreview ? null : (
          <button
            aria-label="프로필 더보기"
            onClick={() => setMoreOpen(true)}
            type="button"
          >
            <Ellipsis aria-hidden="true" size={21} strokeWidth={1.7} />
          </button>
        )
      }
    >
      <section className={styles.hero}>
        <div className={styles.profileOverview}>
          <PublicProfileImageView
            className={styles.profileImage}
            image={profile.display.profileImage}
            priority
            size="lg"
          />
          <div className={styles.profileIdentity}>
            <h2>{profile.display.displayName}</h2>
            {profile.display.handle ? (
              <span className={styles.handle}>@{profile.display.handle}</span>
            ) : null}
            {codeIsVisible ? (
              <div className={styles.roleRow}>
                <span>{profile.display.code}</span>
                <strong>{profile.display.profileName}</strong>
              </div>
            ) : (
              <span className={styles.privateCode}>성향 정보 비공개</span>
            )}
          </div>
        </div>

        <p className={styles.bio}>
          {profile.display.profileMessage ||
            (isSelf
              ? "나를 소개하는 한마디를 프로필에 남겨보세요."
              : "아직 프로필 메시지를 작성하지 않았어요.")}
        </p>

        <div className={styles.stats}>
          <span>
            <strong>{posts.length.toLocaleString("ko-KR")}</strong>게시물
          </span>
          <Link
            href={`/feed/profiles/${profile.source.publicSnapshotId}/connections?tab=followers`}
          >
            <strong>{followerCount.toLocaleString("ko-KR")}</strong>팔로워
          </Link>
          <Link
            href={`/feed/profiles/${profile.source.publicSnapshotId}/connections?tab=following`}
          >
            <strong>
              {initialSocialState.followingCount.toLocaleString("ko-KR")}
            </strong>
            팔로잉
          </Link>
        </div>

        {isSelf ? (
          <div className={styles.actions}>
            <Link className={styles.editProfileButton} href="/my/profile/edit">
              <Pencil aria-hidden="true" size={16} strokeWidth={1.7} />
              프로필 편집
            </Link>
            <button
              className={styles.ownProfileButton}
              onClick={shareProfile}
              type="button"
            >
              <Share2 aria-hidden="true" size={16} strokeWidth={1.7} />
              프로필 공유
            </button>
          </div>
        ) : isPreview ? (
          <Link
            className={styles.previewCloseButton}
            href="/my/settings/visibility"
          >
            미리보기 닫기
          </Link>
        ) : (
          <div className={styles.actions}>
            <button
              aria-pressed={following}
              className={styles.followButton}
              data-following={following}
              disabled={followPending}
              onClick={toggleFollow}
              type="button"
            >
              {followPending ? "저장 중" : following ? "팔로잉" : "팔로우"}
            </button>
            <button
              className={styles.compareButton}
              disabled={comparePending || !comparisonAvailable}
              onClick={compareWithMe}
              type="button"
            >
              {comparePending
                ? "비교 중"
                : comparisonAvailable
                  ? "나와 비교"
                  : "비교 비공개"}
            </button>
          </div>
        )}

        {isSelf ? (
          <nav aria-label="내 프로필 바로가기" className={styles.myShortcuts}>
            <Link href="/my/profile">내 성향 상세</Link>
            <Link href="/my/reports">내 리포트</Link>
            <Link href="/feed/perspectives?from=my">놀이터 기록</Link>
          </nav>
        ) : !isPreview && !comparisonAvailable ? (
          <p className={styles.comparisonNotice}>
            이 사용자는 상세 성향 비교를 공개하지 않았어요.
          </p>
        ) : null}

        {message ? (
          <p aria-live="polite" className={styles.message} role="status">
            {message}
          </p>
        ) : null}
      </section>

      <section className={styles.feedToolbar}>
        <div className={styles.feedTitle}>
          <strong>
            {isSelf ? "내 게시물" : `${profile.display.displayName}님의 게시물`}
          </strong>
          <span>{posts.length}개</span>
        </div>
        <span className={styles.filterLabel}>주제별 보기</span>
        <div
          aria-label={`${profile.display.displayName}님의 게시물 주제별 보기`}
          className={styles.topicFilters}
        >
          {topics.map((topic) => (
            <button
              aria-pressed={activeTopic === topic}
              key={topic}
              onClick={() => setActiveTopic(topic)}
              type="button"
            >
              {topic}
            </button>
          ))}
        </div>
      </section>

      {visiblePosts.length > 0 ? (
        <section className={styles.postList}>
          {visiblePosts.map((post) => (
            <article className={styles.postCard} key={post.id}>
              {post.topic ? (
                <div aria-label="게시물 태그" className={styles.postTopics}>
                  {post.topic.label ? (
                    <span className={styles.postTopic}>{post.topic.label}</span>
                  ) : null}
                  {post.topic.tags.map((tag) => (
                    <Link
                      href={`/feed/tags/${encodeURIComponent(tag)}`}
                      key={tag}
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              ) : null}
              <p>{post.body || post.title}</p>
              {post.media?.[0] ? (
                <Link
                  className={styles.postMedia}
                  href={`/feed/posts/${post.id}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={post.media[0].alt} src={post.media[0].url} />
                </Link>
              ) : null}
              {post.reportShare ? (
                <Link
                  className={styles.reportLink}
                  href={post.reportShare.href}
                >
                  <span>
                    <strong>{post.reportShare.profileCode}</strong>
                    {post.reportShare.profileName}
                  </span>
                  리포트 보기
                </Link>
              ) : null}
              <div className={styles.postMeta}>
                <span>
                  <Heart aria-hidden="true" size={16} />
                  {post.likeCount ?? 0}
                </span>
                <span>
                  <MessageCircle aria-hidden="true" size={16} />
                  {post.replyCount ?? 0}
                </span>
                <Link href={`/feed/posts/${post.id}`}>게시물 보기</Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className={styles.emptyPosts}>
          <strong>아직 이 주제의 게시물이 없어요</strong>
          <p>다른 주제를 선택하면 게시물을 계속 볼 수 있어요.</p>
        </div>
      )}

      {moreOpen ? (
        <div className={styles.actionBackdrop}>
          <button
            aria-label="프로필 메뉴 닫기"
            onClick={() => setMoreOpen(false)}
            type="button"
          />
          <section aria-label="프로필 메뉴" className={styles.actionSheet}>
            {blockConfirmOpen ? (
              <>
                <div className={styles.confirmCopy}>
                  <strong>{profile.display.displayName}님을 차단할까요?</strong>
                  <p>
                    이 사용자의 게시물과 프로필이 내 커뮤니티에서 보이지 않아요.
                    차단 사실은 상대에게 알리지 않아요.
                  </p>
                </div>
                <button
                  className={styles.dangerAction}
                  disabled={safetyPending}
                  onClick={blockProfile}
                  type="button"
                >
                  <Ban aria-hidden="true" size={18} />
                  {safetyPending ? "차단 중" : "차단하기"}
                </button>
                <button
                  disabled={safetyPending}
                  onClick={() => setBlockConfirmOpen(false)}
                  type="button"
                >
                  <X aria-hidden="true" size={18} />
                  취소
                </button>
              </>
            ) : (
              <>
                <strong>{profile.display.displayName} 프로필</strong>
                <button onClick={shareProfile} type="button">
                  <Share2 aria-hidden="true" size={18} />
                  프로필 공유하기
                </button>
                {!initialSocialState.isOwnProfile ? (
                  <>
                    <Link
                      href={`${pathname}/report`}
                      onClick={() => setMoreOpen(false)}
                    >
                      <Flag aria-hidden="true" size={18} />
                      신고하기
                    </Link>
                    <button
                      className={styles.dangerAction}
                      onClick={() => setBlockConfirmOpen(true)}
                      type="button"
                    >
                      <Ban aria-hidden="true" size={18} />
                      차단하기
                    </button>
                  </>
                ) : null}
                <button onClick={() => setMoreOpen(false)} type="button">
                  <X aria-hidden="true" size={18} />
                  취소
                </button>
              </>
            )}
          </section>
        </div>
      ) : null}
    </CommunityScreenShell>
  );
}

function toFriendlyComparisonMessage(message: string) {
  if (message.includes("Sign in") || message.includes("required")) {
    return "로그인 후 이용할 수 있어요.";
  }
  if (message.includes("정밀 코어") || message.includes("코어")) {
    return "내 정밀 코어 검사 결과가 있어야 비교할 수 있어요.";
  }
  return message;
}
