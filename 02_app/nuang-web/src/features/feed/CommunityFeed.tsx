"use client";

import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  ListFilter,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FeedActionButtons } from "@/features/feed/FeedActionButtons";
import { FeedComposer } from "@/features/feed/FeedComposer";
import { FeedMediaCarousel } from "@/features/feed/FeedMediaCarousel";
import { FeedMoreMenu } from "@/features/feed/FeedMoreMenu";
import { FeedPollCard } from "@/features/feed/FeedPollCard";
import { PersonalityPlaygroundPost } from "@/features/feed/PersonalityPlaygroundPost";
import { homeDailyCommunityPollPromptId } from "@/features/feed/feed-prompts";
import type { FeedItem } from "@/features/feed/feed-seed";
import { candidateRoleNames } from "@/features/nuang-code/candidate-profile-names";
import { PublicProfileImageView } from "@/features/public-profile/PublicProfileImageView";
import styles from "@/app/feed/page.module.css";

type FeedMode = "decal" | "recommended";
type CommunityPanel = "filter" | null;

const profileOptions = Object.entries(candidateRoleNames)
  .map(([code, name]) => ({ code, name }))
  .sort((left, right) => left.code.localeCompare(right.code));

export function CommunityFeed({
  highlightedPostId = null,
  posts,
  viewerCode: suppliedViewerCode,
}: {
  highlightedPostId?: string | null;
  posts: FeedItem[];
  viewerCode?: string | null;
}) {
  const viewerCode = suppliedViewerCode ?? getViewerCode(posts);
  const orderedPosts = useMemo(
    () => orderFeedPosts(posts, viewerCode),
    [posts, viewerCode],
  );
  const [mode, setMode] = useState<FeedMode>("recommended");
  const [panel, setPanel] = useState<CommunityPanel>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [draftCodes, setDraftCodes] = useState<string[]>([]);
  const [filterQuery, setFilterQuery] = useState("");

  useEffect(() => {
    if (!panel) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [panel]);

  useEffect(() => {
    if (!highlightedPostId || highlightedPostId === "complete") return;
    const postElement = document.getElementById(
      `community-post-${highlightedPostId}`,
    );
    postElement?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }, [highlightedPostId]);

  const decalPosts = viewerCode
    ? orderedPosts.filter((post) => {
        if (isNuangQuestionPost(post)) return false;
        const code = getPostCode(post);
        return code && getCodeMatchCount(viewerCode, code) >= 2;
      })
    : [];
  const filterActive = mode === "recommended" && selectedCodes.length > 0;
  const visiblePosts = filterActive
    ? orderedPosts.filter((post) => {
        const code = getPostCode(post);
        return code ? selectedCodes.includes(code) : false;
      })
    : mode === "recommended"
      ? orderedPosts
      : decalPosts;
  const filteredProfileOptions = profileOptions.filter(({ code, name }) => {
    const normalizedQuery = filterQuery.trim().toLocaleLowerCase("ko-KR");
    if (!normalizedQuery) return true;
    return `${code} ${name}`
      .toLocaleLowerCase("ko-KR")
      .includes(normalizedQuery);
  });
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.wordmark}>
          <span>NUANG</span>
          <h1>커뮤니티</h1>
        </div>
        <div className={styles.headerActions}>
          <Link
            aria-label="게시물, 사람, 성향 검색"
            className={styles.headerIconButton}
            href="/feed/search"
          >
            <Search aria-hidden="true" size={22} strokeWidth={1.7} />
          </Link>
          <Link
            aria-label="커뮤니티 활동 알림"
            className={styles.headerIconButton}
            href="/feed/notifications"
          >
            <Bell aria-hidden="true" size={22} strokeWidth={1.7} />
          </Link>
        </div>
      </header>

      <nav aria-label="커뮤니티 피드 보기" className={styles.modeDock}>
        <div className={styles.modeTabs} data-mode={mode}>
          <button
            aria-current={mode === "recommended" ? "page" : undefined}
            onClick={() => setMode("recommended")}
            type="button"
          >
            추천
          </button>
          <button
            aria-current={mode === "decal" ? "page" : undefined}
            onClick={() => setMode("decal")}
            type="button"
          >
            데칼코마니
          </button>
          <span aria-hidden="true" className={styles.modeIndicator} />
        </div>
        <span className={styles.filterSlot}>
          {mode === "recommended" ? (
            <button
              aria-label="여러 성향을 골라 게시물 모아보기"
              className={styles.filterButton}
              data-active={filterActive}
              onClick={openFilter}
              type="button"
            >
              <ListFilter aria-hidden="true" size={16} strokeWidth={1.7} />
              <span>필터</span>
              {selectedCodes.length > 0 ? <b>{selectedCodes.length}</b> : null}
            </button>
          ) : (
            <span aria-hidden="true" className={styles.filterPlaceholder} />
          )}
        </span>
      </nav>

      {filterActive ? (
        <div className={styles.filterBanner}>
          <span>{selectedCodes.length}개 성향의 게시물만 보는 중</span>
          <button onClick={openFilter} type="button">
            변경
          </button>
        </div>
      ) : null}

      <FeedComposer />

      {highlightedPostId ? (
        <div aria-live="polite" className={styles.uploadSuccessBanner}>
          <Check aria-hidden="true" size={17} strokeWidth={2.2} />
          <span>
            <strong>게시물이 업로드됐어요</strong>
            추천 피드에서 방금 올린 글을 확인해 보세요.
          </span>
        </div>
      ) : null}

      <section className={styles.feedIntro}>
        <strong>
          {mode === "recommended" ? "추천 피드" : "데칼코마니 피드"}
        </strong>
        <p>
          {mode === "recommended"
            ? "최근 올라온 이야기와 지금 참여할 수 있는 질문을 함께 보여드려요."
            : "같은 코드뿐 아니라, 뉴앙 코드 여러 자리가 가까운 사람들의 글을 모아요."}
        </p>
      </section>

      <section aria-label="커뮤니티 게시물" className={styles.feedSection}>
        {visiblePosts.length > 0 ? (
          <div className={styles.postList}>
            {visiblePosts.map((post) => (
              <CommunityPost
                filterActive={filterActive}
                highlighted={highlightedPostId === post.id}
                mode={mode}
                post={post}
                viewerCode={viewerCode}
                key={post.id}
              />
            ))}
          </div>
        ) : (
          <FeedEmptyState
            filterActive={filterActive}
            mode={mode}
            onChangeFilter={openFilter}
            viewerCode={viewerCode}
          />
        )}
      </section>

      {panel === "filter" ? (
        <CommunityPanelFrame label="성향 필터" onClose={() => setPanel(null)}>
          <div className={styles.panelIntro}>
            <strong>여러 성향을 함께 고를 수 있어요</strong>
            <p>
              선택한 성향들의 공개 게시물만 한곳에 모아요. 궁금한 상대와 비슷한
              성향도 함께 살펴볼 수 있어요.
            </p>
          </div>
          <label className={styles.panelSearchField}>
            <Search aria-hidden="true" size={18} />
            <span className="sr-only">코드 또는 성향 이름 검색</span>
            <input
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="코드 또는 성향 이름 검색"
              type="search"
              value={filterQuery}
            />
            {filterQuery ? (
              <button
                aria-label="필터 검색어 지우기"
                onClick={() => setFilterQuery("")}
                type="button"
              >
                <X aria-hidden="true" size={16} />
              </button>
            ) : null}
          </label>
          <div className={styles.filterGrid}>
            {filteredProfileOptions.map(({ code, name }) => {
              const active = draftCodes.includes(code);
              return (
                <button
                  aria-label={`${code}, ${name}`}
                  aria-pressed={active}
                  key={code}
                  onClick={() => toggleDraftCode(code)}
                  type="button"
                >
                  <span>
                    <strong>{code}</strong>
                    <small>{name}</small>
                  </span>
                  {active ? <Check aria-hidden="true" size={17} /> : null}
                </button>
              );
            })}
          </div>
          <div className={styles.panelStickyActions}>
            <button
              className={styles.secondaryPanelButton}
              disabled={draftCodes.length === 0}
              onClick={() => setDraftCodes([])}
              type="button"
            >
              모두 해제
            </button>
            <button
              className={styles.primaryPanelButton}
              onClick={() => {
                setSelectedCodes(draftCodes);
                setPanel(null);
              }}
              type="button"
            >
              {draftCodes.length > 0
                ? `${draftCodes.length}개 성향의 글 보기`
                : "전체 게시물 보기"}
            </button>
          </div>
        </CommunityPanelFrame>
      ) : null}
    </main>
  );

  function openFilter() {
    setDraftCodes(selectedCodes);
    setFilterQuery("");
    setPanel("filter");
  }

  function toggleDraftCode(code: string) {
    setDraftCodes((codes) =>
      codes.includes(code)
        ? codes.filter((candidate) => candidate !== code)
        : [...codes, code],
    );
  }
}

function CommunityPost({
  filterActive,
  highlighted,
  mode,
  post,
  viewerCode,
}: {
  filterActive: boolean;
  highlighted: boolean;
  mode: FeedMode;
  post: FeedItem;
  viewerCode: string | null;
}) {
  const isOfficialDailyPoll = isDailyCommunityPoll(post);
  const isNuangQuestion = isNuangQuestionPost(post);
  const code = getPostCode(post);
  const canAnswerQuestion = canViewerAnswerQuestion(
    post.questionAudience,
    viewerCode,
    code,
  );
  const recentReply = post.replyPreview?.[0];
  const recommendationReason = getRecommendationReason({
    code,
    filterActive,
    mode,
    post,
    viewerCode,
  });

  if (isOfficialDailyPoll && post.poll) {
    return <PersonalityPlaygroundPost highlighted={highlighted} post={post} />;
  }

  return (
    <article
      className={styles.postCard}
      data-highlighted={highlighted ? "true" : "false"}
      data-official={isOfficialDailyPoll ? "true" : "false"}
      id={`community-post-${post.id}`}
    >
      <div className={styles.postHeader}>
        <ProfileIdentity post={post} />
        <FeedMoreMenu postId={post.id} targetType={post.targetType} />
      </div>

      <div className={styles.recommendationReason}>
        <span aria-hidden="true" />
        <p>
          <strong>추천한 이유</strong>
          <small>{recommendationReason}</small>
        </p>
      </div>

      {isNuangQuestion ? (
        <div className={styles.questionSourceBar}>
          <div>
            <strong>뉴앙에게 물어봐</strong>
            <span>오늘의 질문에 경험과 생각을 나눠보세요</span>
          </div>
          <Link href="/feed/questions/new">
            나도 질문하기
            <ChevronRight aria-hidden="true" size={15} strokeWidth={2} />
          </Link>
        </div>
      ) : null}

      {isNuangQuestion && post.questionAudience ? (
        <p
          className={styles.questionAudienceNote}
          data-matched={canAnswerQuestion ? "true" : "false"}
        >
          {getQuestionAudienceNotice(
            post.questionAudience,
            viewerCode,
            canAnswerQuestion,
          )}
        </p>
      ) : null}

      {post.topic && (!isNuangQuestion || post.topic.tags.length > 0) ? (
        <div aria-label="게시물 주제" className={styles.postTopics}>
          {!isNuangQuestion && post.topic.label ? (
            <strong>{post.topic.label}</strong>
          ) : null}
          {post.topic.tags.map((tag) => (
            <Link href={`/feed/tags/${encodeURIComponent(tag)}`} key={tag}>
              #{tag}
            </Link>
          ))}
        </div>
      ) : null}

      {post.body ? <p className={styles.postBody}>{post.body}</p> : null}
      {post.media?.length ? <FeedMediaCarousel media={post.media} /> : null}

      {post.poll ? (
        <div className={styles.pollWrap}>
          <FeedPollCard poll={post.poll} returnTo="/feed" variant="home" />
          <p className={styles.pollNote}>
            이 선택은 성향 검사 결과에 반영되지 않아요.
          </p>
          {post.poll.viewerVoteOptionId ? (
            <Link className={styles.pollDetailLink} href={post.poll.statsHref}>
              뉴앙 코드별 선택과 댓글 보기
            </Link>
          ) : null}
        </div>
      ) : null}

      {post.reportShare ? <ReportSharePreview post={post} /> : null}

      <div className={styles.postActions}>
        <FeedActionButtons
          allowComment={!isNuangQuestion || canAnswerQuestion}
          commentPlaceholder={
            isNuangQuestion ? "내 경험으로 답변하기" : "댓글 달기"
          }
          includeBookmark
          includeShare
          initialBookmarked={post.viewerHasBookmarked}
          initialLiked={post.viewerHasLiked}
          likeCount={post.likeCount}
          postId={post.id}
          questionMode={isNuangQuestion}
          replyCount={post.replyCount}
          replyPreview={isNuangQuestion ? post.replyPreview : undefined}
          targetType={post.targetType}
        />
      </div>

      {!isNuangQuestion && recentReply ? (
        <p className={styles.recentReply}>
          <strong>{recentReply.authorName}</strong>
          <span>{recentReply.body}</span>
        </p>
      ) : null}

      {!post.poll && !isNuangQuestion ? (
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

function ProfileIdentity({ post }: { post: FeedItem }) {
  const identity = (
    <span className={styles.profileIdentity}>
      <Avatar label={post.avatarLabel} post={post} />
      <span className={styles.authorCopy}>
        <span className={styles.authorName}>
          {post.authorName}
          {getPostCode(post) ? (
            <b className={styles.codeBadge}>{getPostCode(post)}</b>
          ) : null}
        </span>
        <small>
          {post.topic?.label ?? post.title} · {post.timeLabel}
        </small>
      </span>
    </span>
  );

  if (!post.authorProfile) return identity;

  return (
    <Link
      aria-label={`${post.authorName} 프로필 보기`}
      className={styles.profileButton}
      href={`/feed/profiles/${post.authorProfile.source.publicSnapshotId}`}
    >
      {identity}
    </Link>
  );
}

function Avatar({ label, post }: { label: string; post: FeedItem }) {
  if (post.authorProfile) {
    return (
      <PublicProfileImageView
        className={styles.profileImage}
        image={post.authorProfile.display.profileImage}
        size="sm"
      />
    );
  }

  return <span className={styles.fallbackAvatar}>{label.slice(0, 1)}</span>;
}

function CommunityPanelFrame({
  action,
  children,
  label,
  onClose,
}: {
  action?: ReactNode;
  children: ReactNode;
  label: string;
  onClose: () => void;
}) {
  return (
    <div className={styles.panelBackdrop}>
      <section
        aria-label={label}
        aria-modal="true"
        className={styles.communityPanel}
        role="dialog"
      >
        <header className={styles.panelHeader}>
          <button
            aria-label="커뮤니티로 돌아가기"
            onClick={onClose}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={21} />
          </button>
          <strong>{label}</strong>
          <span className={styles.panelHeaderAction}>{action}</span>
        </header>
        <div className={styles.panelBody}>{children}</div>
      </section>
    </div>
  );
}

function FeedEmptyState({
  filterActive,
  mode,
  onChangeFilter,
  viewerCode,
}: {
  filterActive: boolean;
  mode: FeedMode;
  onChangeFilter: () => void;
  viewerCode: string | null;
}) {
  if (filterActive) {
    return (
      <div className={styles.emptyFeed}>
        <strong>선택한 성향의 공개 게시물이 아직 없어요</strong>
        <p>다른 성향을 더 선택하거나 필터를 바꿔보세요.</p>
        <button onClick={onChangeFilter} type="button">
          필터 다시 선택하기
        </button>
      </div>
    );
  }

  if (mode === "decal" && !viewerCode) {
    return (
      <div className={styles.emptyFeed}>
        <strong>내 뉴앙 코드를 연결하면 데칼코마니가 열려요</strong>
        <p>나와 여러 성향 자리가 가까운 사람들의 이야기를 모아드려요.</p>
        <Link href="/assessments">내 코드 확인하기</Link>
      </div>
    );
  }

  if (mode === "decal") {
    return (
      <div className={styles.emptyFeed}>
        <strong>나와 코드가 가까운 새 게시물을 기다리고 있어요</strong>
        <p>공개 게시물이 올라오면 가까운 성향부터 이곳에 모아드려요.</p>
      </div>
    );
  }

  return (
    <div className={styles.emptyFeed}>
      <strong>아직 올라온 이야기가 없어요</strong>
      <p>위의 글쓰기를 눌러 첫 생각을 나눠보세요.</p>
    </div>
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
      <span>리포트 보기</span>
    </Link>
  );
}

function getRecommendationReason({
  code,
  filterActive,
  mode,
  post,
  viewerCode,
}: {
  code: string | null;
  filterActive: boolean;
  mode: FeedMode;
  post: FeedItem;
  viewerCode: string | null;
}) {
  if (filterActive && code) return `${code} 성향을 선택해 모아본 글이에요`;
  if (mode === "decal" && code && viewerCode) {
    return `내 코드와 ${getCodeMatchCount(viewerCode, code)}자리가 가까워요`;
  }
  if (
    post.questionAudience &&
    canViewerAnswerQuestion(post.questionAudience, viewerCode, code)
  ) {
    if (post.questionAudience.mode === "exact") {
      return "내 뉴앙 코드에 답변 요청이 온 질문이에요";
    }
    if (post.questionAudience.mode === "trait") {
      const matchingTraits = post.questionAudience.codes.filter((symbol) =>
        viewerCode?.includes(symbol),
      );
      return `내 ${matchingTraits.join("·")} 성향에 답변 요청이 온 질문이에요`;
    }
    return "내 성향에서 들려줄 답이 궁금한 질문이에요";
  }
  if (post.questionAudience) {
    return "답변할 성향을 따로 지정한 공개 질문이에요";
  }
  if (post.topic?.label) return `${post.topic.label} 주제를 바탕으로 골랐어요`;
  if (isDailyCommunityPoll(post))
    return "오늘 함께 참여할 수 있는 성향 질문이에요";
  if (post.reportShare) return "성향 리포트에 관한 새로운 이야기예요";
  return "최근 커뮤니티에 올라온 이야기예요";
}

function getViewerCode(posts: FeedItem[]) {
  return (
    posts.find((post) => post.authorHandle === "me")?.authorProfile?.display
      .code ?? null
  );
}

function getPostCode(post: FeedItem) {
  const code = post.authorProfile?.display.code;
  return code && candidateRoleNames[code] ? code : null;
}

function getCodeMatchCount(left: string, right: string) {
  return left.split("").filter((symbol, index) => symbol === right[index])
    .length;
}

function orderFeedPosts(posts: FeedItem[], viewerCode: string | null) {
  const dailyPoll = posts.find(isDailyCommunityPoll);
  const remainingPosts = dailyPoll
    ? posts.filter((post) => post.id !== dailyPoll.id)
    : posts;
  const nuangQuestions = remainingPosts.filter(isNuangQuestionPost);
  const matchedQuestions = nuangQuestions.filter(
    (post) =>
      post.questionAudience &&
      canViewerAnswerQuestion(
        post.questionAudience,
        viewerCode,
        getPostCode(post),
      ),
  );
  const regularPosts = remainingPosts.filter(
    (post) => !isNuangQuestionPost(post),
  );
  const unmatchedQuestions = nuangQuestions.filter(
    (post) => !matchedQuestions.some((matched) => matched.id === post.id),
  );

  return [
    ...(dailyPoll ? [dailyPoll] : []),
    ...matchedQuestions,
    ...regularPosts,
    ...unmatchedQuestions,
  ];
}

function canViewerAnswerQuestion(
  audience: FeedItem["questionAudience"],
  viewerCode: string | null,
  askerCode: string | null,
) {
  if (!audience || audience.mode === "all") return true;
  if (!viewerCode) return false;
  if (audience.mode === "exact") return audience.codes.includes(viewerCode);
  if (audience.mode === "trait") {
    return audience.codes.some((symbol) => viewerCode.includes(symbol));
  }

  if (!askerCode) return false;
  const matchCount = getCodeMatchCount(askerCode, viewerCode);
  return audience.mode === "similar" ? matchCount >= 3 : matchCount <= 2;
}

function getQuestionAudienceNotice(
  audience: NonNullable<FeedItem["questionAudience"]>,
  viewerCode: string | null,
  matched: boolean,
) {
  if (audience.mode === "exact") {
    const target = audience.codes[0] ?? "지정된 코드";
    return matched
      ? `${target}인 나에게 도착한 질문이에요.`
      : `${target}의 답변을 기다리는 질문이에요.`;
  }
  if (audience.mode === "trait") {
    const target = audience.codes.join(" · ");
    return matched
      ? `내 ${target} 성향으로 답해주면 좋은 질문이에요.`
      : `${target} 성향의 답변을 기다리는 질문이에요.`;
  }
  if (!viewerCode) return "내 뉴앙 코드를 확인하면 답변 대상인지 알려드려요.";
  return matched
    ? "내 성향에서 들려줄 답을 기다리는 질문이에요."
    : "다른 관점의 답변을 기다리는 질문이에요.";
}

function isDailyCommunityPoll(post: FeedItem) {
  return post.poll?.promptId === homeDailyCommunityPollPromptId;
}

function isNuangQuestionPost(post: FeedItem) {
  return Boolean(post.questionAudience);
}
