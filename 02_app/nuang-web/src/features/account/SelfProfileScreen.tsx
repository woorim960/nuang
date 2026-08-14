"use client";

import {
  ChevronRight,
  Compass,
  Pencil,
  RefreshCw,
  Settings,
  Share2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type KeyboardEvent } from "react";
import type {
  SelfAssessmentJourney,
  SelfProfilePayload,
} from "@/features/account/self-profile-contract";
import {
  CommunityPostCard,
  getFeedPostFormat,
  type FeedPostFormat,
} from "@/features/feed/CommunityFeed";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
import {
  feedPostTopicCategories,
  feedPostTopicLabels,
} from "@/features/feed/feed-topic";
import { ProfileIdentitySurface } from "@/features/public-profile/ProfileIdentitySurface";
import { ProfileReportCollection } from "@/features/public-profile/ProfileReportCollection";
import styles from "./SelfProfileScreen.module.css";

type ContentTab = "posts" | "reports";
type PostFormatFilter = "all" | FeedPostFormat;
type PostTopicFilter = "all" | (typeof feedPostTopicCategories)[number];

export function SelfProfileScreen({
  initialContent = "posts",
  payload,
}: {
  initialContent?: ContentTab;
  payload: SelfProfilePayload;
}) {
  const pathname = usePathname();
  const [activeContent, setActiveContent] =
    useState<ContentTab>(initialContent);
  const [activePostFormat, setActivePostFormat] =
    useState<PostFormatFilter>("all");
  const [activePostTopic, setActivePostTopic] =
    useState<PostTopicFilter>("all");
  const [message, setMessage] = useState<string | null>(null);
  const visiblePosts = useMemo(
    () =>
      payload.posts.filter((post) => {
        const formatMatches =
          activePostFormat === "all" ||
          getFeedPostFormat(post) === activePostFormat;
        const topicMatches =
          activePostTopic === "all" || post.topic?.category === activePostTopic;
        return formatMatches && topicMatches;
      }),
    [activePostFormat, activePostTopic, payload.posts],
  );
  const trait = payload.trait
    ? {
        code: payload.trait.code,
        label: payload.trait.profileName,
        type: "code" as const,
      }
    : {
        label:
          payload.contentState.trait === "unavailable"
            ? "성향 정보를 불러오지 못했어요"
            : "첫 검사 전",
        type: "status" as const,
      };
  const connectionsHrefBase = payload.profile.publicSnapshotId
    ? `/feed/profiles/${payload.profile.publicSnapshotId}/connections`
    : null;

  async function shareProfile() {
    if (!payload.capabilities.canShare) return;

    const url = new URL(
      `/feed/profiles/${payload.profile.publicId}`,
      window.location.origin,
    ).toString();
    const shareData = {
      text: `${payload.profile.displayName}님의 뉴앙 코드 ${payload.trait?.code}`,
      title: `${payload.profile.displayName}님의 뉴앙 프로필`,
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
    }
  }

  function moveTabWithKeyboard(
    event: KeyboardEvent<HTMLButtonElement>,
    current: ContentTab,
  ) {
    let next: ContentTab | null = null;
    if (event.key === "Home") next = "posts";
    if (event.key === "End") next = "reports";
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      next = current === "posts" ? "reports" : "posts";
    }
    if (!next) return;

    event.preventDefault();
    setActiveContent(next);
    document.getElementById(`my-${next}-tab`)?.focus();
  }

  return (
    <CommunityScreenShell
      backHref={null}
      title="마이"
      trailing={
        <Link aria-label="설정 열기" href="/my/settings">
          <Settings aria-hidden="true" size={20} strokeWidth={1.7} />
        </Link>
      }
    >
      <section className={styles.hero}>
        <ProfileIdentitySurface
          actions={
            <div
              className={styles.actions}
              data-single={!payload.capabilities.canShare}
            >
              <Link
                className={styles.editProfileButton}
                href="/my/profile/edit"
              >
                <Pencil aria-hidden="true" size={16} strokeWidth={1.7} />
                프로필 편집
              </Link>
              {payload.capabilities.canShare ? (
                <button onClick={() => void shareProfile()} type="button">
                  <Share2 aria-hidden="true" size={16} strokeWidth={1.7} />
                  프로필 공유
                </button>
              ) : null}
            </div>
          }
          bio={payload.profile.bio}
          connectionsHrefBase={connectionsHrefBase}
          displayName={payload.profile.displayName}
          emptyBio="나를 소개하는 한마디를 프로필에 남겨보세요."
          followerCount={payload.stats.followers}
          followingCount={payload.stats.following}
          handle={payload.profile.handle}
          image={payload.profile.image}
          operator={payload.capabilities.showAdminEntry}
          postCount={payload.stats.posts}
          trait={trait}
        />

        <AssessmentNextAction journey={payload.assessmentJourney} />

        <nav aria-label="내 프로필 바로가기" className={styles.shortcuts}>
          <Link href="/my/reports">내 성향 상세</Link>
          <Link href="/my/events">참여한 이벤트</Link>
          <Link href="/my/feedback?from=%2Fmy">의견 보내기</Link>
        </nav>

        {payload.capabilities.showAdminEntry ? (
          <Link className={styles.adminEntry} href="/admin">
            <span>
              <ShieldCheck aria-hidden="true" size={18} strokeWidth={1.65} />
            </span>
            <strong>관리자 운영 센터</strong>
            <ChevronRight aria-hidden="true" size={17} strokeWidth={1.65} />
          </Link>
        ) : null}

        {message ? (
          <p aria-live="polite" className={styles.message} role="status">
            {message}
          </p>
        ) : null}
      </section>

      <div
        aria-label="프로필 콘텐츠"
        className={styles.contentTabs}
        role="tablist"
      >
        <button
          aria-controls="my-posts-panel"
          aria-selected={activeContent === "posts"}
          id="my-posts-tab"
          onClick={() => setActiveContent("posts")}
          onKeyDown={(event) => moveTabWithKeyboard(event, "posts")}
          role="tab"
          tabIndex={activeContent === "posts" ? 0 : -1}
          type="button"
        >
          게시물
          <span>{formatTabCount(payload.stats.posts)}</span>
        </button>
        <button
          aria-controls="my-reports-panel"
          aria-selected={activeContent === "reports"}
          id="my-reports-tab"
          onClick={() => setActiveContent("reports")}
          onKeyDown={(event) => moveTabWithKeyboard(event, "reports")}
          role="tab"
          tabIndex={activeContent === "reports" ? 0 : -1}
          type="button"
        >
          검사 결과
          <span>{formatTabCount(payload.stats.reports)}</span>
        </button>
      </div>

      <section
        aria-labelledby={`${activeContent === "posts" ? "my-posts" : "my-reports"}-tab`}
        id={`${activeContent === "posts" ? "my-posts" : "my-reports"}-panel`}
        role="tabpanel"
      >
        {activeContent === "posts" ? (
          <PostCollection
            activeFormat={activePostFormat}
            activeTopic={activePostTopic}
            onFormatChange={setActivePostFormat}
            onTopicChange={setActivePostTopic}
            pathname={pathname}
            payload={payload}
            posts={visiblePosts}
          />
        ) : (
          <ReportCollection payload={payload} />
        )}
      </section>
    </CommunityScreenShell>
  );
}

export function SelfProfileUnavailable() {
  return (
    <CommunityScreenShell
      backHref={null}
      title="마이"
      trailing={
        <Link aria-label="설정 열기" href="/my/settings">
          <Settings aria-hidden="true" size={20} strokeWidth={1.7} />
        </Link>
      }
    >
      <section className={styles.recovery}>
        <span aria-hidden="true">
          <RefreshCw size={23} strokeWidth={1.65} />
        </span>
        <strong>내 프로필을 불러오지 못했어요</strong>
        <p>로그인은 유지되고 있어요. 잠시 뒤 다시 불러와 주세요.</p>
        <Link href="/my">다시 불러오기</Link>
      </section>
    </CommunityScreenShell>
  );
}

function AssessmentNextAction({ journey }: { journey: SelfAssessmentJourney }) {
  const view = getAssessmentActionView(journey);

  return (
    <section className={styles.assessmentAction}>
      <div className={styles.assessmentCopy}>
        <small>{view.eyebrow}</small>
        <strong>{view.title}</strong>
        {view.description ? <p>{view.description}</p> : null}
      </div>
      {view.href ? (
        <Link className={styles.assessmentButton} href={view.href}>
          {view.label}
          <ChevronRight aria-hidden="true" size={18} strokeWidth={1.8} />
        </Link>
      ) : null}
      {journey.state === "quick_completed" ? (
        <Link
          className={styles.secondaryAssessmentLink}
          href={journey.reportHref}
        >
          지금 결과 보기
        </Link>
      ) : null}
      {journey.state === "in_progress" ? (
        <div className={styles.progressBlock}>
          <div
            aria-label={`${journey.totalCount}개 중 ${journey.answeredCount}개 답변 완료, ${journey.resumeOrdinal}번부터 이어서 진행`}
            aria-valuemax={journey.totalCount}
            aria-valuemin={0}
            aria-valuenow={journey.answeredCount}
            className={styles.progressTrack}
            role="progressbar"
          >
            <span
              style={{
                width: `${Math.round((journey.answeredCount / Math.max(1, journey.totalCount)) * 100)}%`,
              }}
            />
          </div>
          <span>
            {journey.totalCount}개 중 {journey.answeredCount}개 답변 완료 ·{" "}
            {journey.resumeOrdinal}번부터 이어서 진행
          </span>
        </div>
      ) : null}
    </section>
  );
}

function getAssessmentActionView(journey: SelfAssessmentJourney) {
  if (journey.state === "in_progress") {
    return {
      description: "답한 내용은 그대로 남아 있어요.",
      eyebrow:
        journey.assessmentKind === "full"
          ? "정밀 성향 검사 · 이어서"
          : "첫 성향 검사 · 이어서",
      href: journey.href,
      label: `${journey.resumeOrdinal}번부터 이어하기`,
      title: "하던 검사를 이어서 마쳐볼까요?",
    };
  }

  if (journey.state === "quick_completed") {
    return {
      description: "여러 상황에서 보이는 내 모습을 더 자세히 살펴봐요.",
      eyebrow: "첫 성향 검사 완료",
      href: journey.fullStartHref,
      label: "정밀 검사 시작하기",
      title: "내 성향을 더 깊이 알아볼 차례예요",
    };
  }

  if (journey.state === "full_completed") {
    return {
      description: "내 뉴앙 코드와 자세한 성향 해석을 다시 볼 수 있어요.",
      eyebrow: "정밀 성향 검사 완료",
      href: journey.reportHref,
      label: "내 결과 보기",
      title: "나를 설명하는 성향 리포트가 준비됐어요",
    };
  }

  if (journey.state === "unavailable") {
    return {
      description:
        "프로필은 그대로 사용할 수 있어요. 잠시 뒤 다시 확인해 주세요.",
      eyebrow: "검사 상태 확인 중",
      href: null,
      label: null,
      title: "검사 진행 상태를 불러오지 못했어요",
    };
  }

  return {
    description: "3~5분이면 나를 설명하는 첫 뉴앙 코드를 만날 수 있어요.",
    eyebrow: "첫 검사 전",
    href: "/assessments/nu-core-quick?returnTo=%2Fmy%3Ftab%3Dreports",
    label: "첫 성향 검사 시작하기",
    title: "첫 성향 검사로 내 뉴앙 코드를 만나보세요",
  };
}

function PostCollection({
  activeFormat,
  activeTopic,
  onFormatChange,
  onTopicChange,
  pathname,
  payload,
  posts,
}: {
  activeFormat: PostFormatFilter;
  activeTopic: PostTopicFilter;
  onFormatChange: (value: PostFormatFilter) => void;
  onTopicChange: (value: PostTopicFilter) => void;
  pathname: string;
  payload: SelfProfilePayload;
  posts: SelfProfilePayload["posts"];
}) {
  if (payload.contentState.posts === "unavailable") {
    return <ContentUnavailable label="게시물을" />;
  }

  if (payload.stats.posts === 0) {
    return (
      <section className={styles.empty}>
        <strong>아직 작성한 게시물이 없어요</strong>
        <Link href="/feed/new">첫 게시물 작성하기</Link>
      </section>
    );
  }

  const formatFilters: ReadonlyArray<{
    id: PostFormatFilter;
    label: string;
  }> = [
    { id: "all", label: "전체" },
    { id: "everyday", label: "일상" },
    { id: "report", label: "리포트" },
    { id: "playground", label: "놀이터" },
  ];
  const topicFilters = [
    { id: "all" as const, label: "전체" },
    ...feedPostTopicCategories.map((category) => ({
      id: category,
      label: feedPostTopicLabels[category],
    })),
  ];
  const prioritizedMediaPostId =
    posts.slice(0, 3).find((post) => (post.media?.length ?? 0) > 0)?.id ?? null;

  return (
    <>
      <section className={styles.feedToolbar}>
        <div className={styles.feedTitle}>
          <strong>내 게시물</strong>
          <span>{posts.length}개</span>
        </div>
        <div className={styles.filters}>
          <div className={styles.filterRow}>
            <span>게시물</span>
            <div aria-label="내 게시물 종류" className={styles.filterScroll}>
              {formatFilters.map((filter) => (
                <button
                  aria-pressed={activeFormat === filter.id}
                  key={filter.id}
                  onClick={() => onFormatChange(filter.id)}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.filterRow}>
            <span>주제</span>
            <div aria-label="내 게시물 주제" className={styles.filterScroll}>
              {topicFilters.map((filter) => (
                <button
                  aria-pressed={activeTopic === filter.id}
                  key={filter.id}
                  onClick={() => onTopicChange(filter.id)}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {posts.length > 0 ? (
        <section className={styles.postList}>
          {posts.map((post) => (
            <CommunityPostCard
              filterActive={false}
              highlighted={false}
              key={post.id}
              mode="recommended"
              post={post}
              prioritizeMedia={post.id === prioritizedMediaPostId}
              returnTo={pathname}
              viewerCode={payload.viewerCode}
            />
          ))}
        </section>
      ) : (
        <section className={styles.empty}>
          <strong>이 조건에 맞는 게시물이 없어요</strong>
          <button
            onClick={() => {
              onFormatChange("all");
              onTopicChange("all");
            }}
            type="button"
          >
            전체 보기
          </button>
        </section>
      )}
    </>
  );
}

function ReportCollection({ payload }: { payload: SelfProfilePayload }) {
  if (payload.contentState.reports === "unavailable") {
    return <ContentUnavailable label="검사 결과를" />;
  }

  if (payload.stats.reports === 0) {
    return (
      <section className={styles.empty}>
        <span aria-hidden="true">
          <Compass size={23} strokeWidth={1.65} />
        </span>
        <strong>아직 완료한 검사 결과가 없어요</strong>
        <Link href="/assessments/nu-core-quick?returnTo=%2Fmy%3Ftab%3Dreports">
          첫 검사 시작하기
        </Link>
      </section>
    );
  }

  return (
    <ProfileReportCollection
      isSelf
      profileId={payload.profile.publicId}
      reports={payload.reports}
    />
  );
}

function ContentUnavailable({ label }: { label: string }) {
  return (
    <section className={styles.empty}>
      <span aria-hidden="true">
        <RefreshCw size={23} strokeWidth={1.65} />
      </span>
      <strong>{label} 불러오지 못했어요</strong>
      <Link href="/my">다시 불러오기</Link>
    </section>
  );
}

function formatTabCount(count: number | null) {
  return count === null ? "—" : count.toLocaleString("ko-KR");
}
