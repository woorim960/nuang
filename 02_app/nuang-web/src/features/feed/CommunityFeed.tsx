"use client";

import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  FileText,
  FlaskConical,
  ListFilter,
  MessagesSquare,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  Fragment,
  useId,
  useMemo,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { CoupangAffiliateCard } from "@/features/advertising/delivery/CoupangAffiliateCard";
import type { CoupangAffiliateCreative } from "@/features/advertising/delivery/advertising-delivery-contract";
import { NuangOperatorBadge } from "@/components/identity/NuangOperatorBadge";
import { FeedActionButtons } from "@/features/feed/FeedActionButtons";
import { FeedComposer } from "@/features/feed/FeedComposer";
import { FeedMediaCarousel } from "@/features/feed/FeedMediaCarousel";
import { FeedMoreMenu } from "@/features/feed/FeedMoreMenu";
import { FeedPollCard } from "@/features/feed/FeedPollCard";
import { PersonalityPlaygroundPost } from "@/features/feed/PersonalityPlaygroundPost";
import { SafeLinkedText } from "@/features/feed/SafeLinkedText";
import type { FeedItem } from "@/features/feed/feed-seed";
import { candidateRoleNames } from "@/features/nuang-code/candidate-profile-names";
import { PublicProfileImageView } from "@/features/public-profile/PublicProfileImageView";
import { useModalDialog } from "@/hooks/useModalDialog";
import styles from "@/app/feed/page.module.css";

export type FeedMode = "decal" | "playground" | "recommended";
export type FeedPostFormat = "everyday" | "playground" | "report";
type CommunityPanel = "filter" | null;

const profileOptions = Object.entries(candidateRoleNames)
  .map(([code, name]) => ({ code, name }))
  .sort((left, right) => left.code.localeCompare(right.code));

export function CommunityFeed({
  commerceAd = null,
  highlightedPostId = null,
  initialMode = "recommended",
  pendingReviewNotice = false,
  posts,
  viewerCode: suppliedViewerCode,
}: {
  commerceAd?: CoupangAffiliateCreative | null;
  highlightedPostId?: string | null;
  initialMode?: FeedMode;
  pendingReviewNotice?: boolean;
  posts: FeedItem[];
  viewerCode?: string | null;
}) {
  const viewerCode = suppliedViewerCode ?? getViewerCode(posts);
  const orderedPosts = useMemo(
    () => orderFeedPosts(posts, viewerCode),
    [posts, viewerCode],
  );
  const [mode, setMode] = useState<FeedMode>(initialMode);
  const [panel, setPanel] = useState<CommunityPanel>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [draftCodes, setDraftCodes] = useState<string[]>([]);
  const [filterQuery, setFilterQuery] = useState("");
  const filterDialogRef = useModalDialog<HTMLElement>({
    onClose: () => setPanel(null),
    open: panel === "filter",
  });

  useEffect(() => {
    if (!highlightedPostId || highlightedPostId === "complete") return;
    const postElement = document.getElementById(
      `community-post-${highlightedPostId}`,
    );
    postElement?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }, [highlightedPostId]);

  useEffect(() => {
    const syncModeWithHistory = () => {
      const view = new URLSearchParams(window.location.search).get("view");
      setMode(view === "decal" || view === "playground" ? view : "recommended");
    };

    window.addEventListener("popstate", syncModeWithHistory);
    return () => window.removeEventListener("popstate", syncModeWithHistory);
  }, []);

  const decalPosts = viewerCode
    ? orderedPosts.filter((post) => {
        if (isNuangQuestionPost(post)) return false;
        const code = getPostCode(post);
        return code && getCodeMatchCount(viewerCode, code) >= 2;
      })
    : [];
  const playgroundPosts = orderedPosts.filter(isPlaygroundPost);
  const filterActive = mode === "recommended" && selectedCodes.length > 0;
  const visiblePosts =
    mode === "playground"
      ? playgroundPosts
      : filterActive
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
            onClick={() => selectMode("recommended")}
            type="button"
          >
            추천
          </button>
          <button
            aria-current={mode === "decal" ? "page" : undefined}
            onClick={() => selectMode("decal")}
            type="button"
          >
            데칼코마니
          </button>
          <button
            aria-label="성향 놀이터"
            aria-current={mode === "playground" ? "page" : undefined}
            onClick={() => selectMode("playground")}
            type="button"
          >
            놀이터
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

      {pendingReviewNotice ? (
        <div aria-live="polite" className={styles.uploadSuccessBanner}>
          <Check aria-hidden="true" size={17} strokeWidth={2.2} />
          <strong>링크를 확인하고 있어요. 확인되면 자동으로 공개됩니다.</strong>
        </div>
      ) : highlightedPostId ? (
        <div aria-live="polite" className={styles.uploadSuccessBanner}>
          <Check aria-hidden="true" size={17} strokeWidth={2.2} />
          <strong>게시물이 업로드됐어요</strong>
        </div>
      ) : null}

      <section aria-label="커뮤니티 게시물" className={styles.feedSection}>
        {visiblePosts.length > 0 ? (
          <div className={styles.postList}>
            {visiblePosts.map((post, index) => (
              <Fragment key={post.id}>
                <CommunityPostCard
                  filterActive={filterActive}
                  highlighted={highlightedPostId === post.id}
                  mode={mode}
                  post={post}
                  viewerCode={viewerCode}
                />
                {index === 7 &&
                mode === "recommended" &&
                !filterActive &&
                !highlightedPostId ? (
                  <CoupangAffiliateCard creative={commerceAd} />
                ) : null}
              </Fragment>
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
        <CommunityPanelFrame
          dialogRef={filterDialogRef}
          label="성향 필터"
          onClose={() => setPanel(null)}
        >
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

  function selectMode(nextMode: FeedMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setPanel(null);

    const params = new URLSearchParams(window.location.search);
    if (nextMode === "recommended") params.delete("view");
    else params.set("view", nextMode);
    const query = params.toString();
    window.history.pushState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }

  function toggleDraftCode(code: string) {
    setDraftCodes((codes) =>
      codes.includes(code)
        ? codes.filter((candidate) => candidate !== code)
        : [...codes, code],
    );
  }
}

export function CommunityPostCard({
  filterActive,
  highlighted,
  mode,
  post,
  returnTo = "/feed",
  showConversationLink = true,
  viewerCode,
}: {
  filterActive: boolean;
  highlighted: boolean;
  mode: FeedMode;
  post: FeedItem;
  returnTo?: string;
  showConversationLink?: boolean;
  viewerCode: string | null;
}) {
  const isOfficialDailyPoll = isDailyCommunityPoll(post);
  const isNuangQuestion = isNuangQuestionPost(post);
  const code = getPostCode(post);
  const canAnswerQuestion =
    !post.viewerIsAuthor &&
    canViewerAnswerQuestion(post.questionAudience, viewerCode, code);
  const recentReply = post.replyPreview?.[0];
  const recommendationReason = getRecommendationReason({
    code,
    filterActive,
    mode,
    post,
    viewerCode,
  });
  const showRecommendationReason =
    !post.viewerIsAuthor &&
    !isNuangQuestion &&
    (filterActive || mode === "decal");
  const responsesClosed = post.responseStatus === "closed";

  if (isOfficialDailyPoll && post.poll) {
    return (
      <PersonalityPlaygroundPost
        highlighted={highlighted}
        post={post}
        returnTo={returnTo}
        viewKey={mode}
      />
    );
  }

  return (
    <article
      className={styles.postCard}
      data-highlighted={highlighted ? "true" : "false"}
      data-official={isOfficialDailyPoll ? "true" : "false"}
      data-own={post.viewerIsAuthor ? "true" : "false"}
      data-poll={post.poll ? "true" : "false"}
      id={`community-post-${post.id}`}
    >
      <div className={styles.postHeader}>
        <ProfileIdentity post={post} />
        <FeedMoreMenu
          canManage={post.viewerCanManage}
          editHref={
            post.poll
              ? `/feed/balance/${post.id}/edit?returnTo=${encodeURIComponent(returnTo)}`
              : post.questionAudience
                ? `/feed/questions/${post.id}/edit?returnTo=${encodeURIComponent(returnTo)}`
                : undefined
          }
          postId={post.id}
          returnTo={returnTo}
          targetType={post.targetType}
        />
      </div>

      {showRecommendationReason ? (
        <p className={styles.recommendationReason}>{recommendationReason}</p>
      ) : null}

      {getFeedPostDisplayLabel(post) || post.topic?.tags.length ? (
        <div aria-label="게시물 주제" className={styles.postTopics}>
          {getFeedPostDisplayLabel(post) ? (
            <strong>{getFeedPostDisplayLabel(post)}</strong>
          ) : null}
          {(post.topic?.tags ?? []).map((tag) => (
            <Link href={`/feed/tags/${encodeURIComponent(tag)}`} key={tag}>
              #{tag}
            </Link>
          ))}
        </div>
      ) : null}

      {responsesClosed ? (
        <p className={styles.responseClosed}>
          응답 마감 · 기존 답변은 계속 볼 수 있어요
        </p>
      ) : null}

      {isNuangQuestion && post.questionAudience ? (
        <div
          className={styles.questionAudienceBar}
          data-own={post.viewerIsAuthor ? "true" : "false"}
        >
          <p
            className={styles.questionAudienceNote}
            data-matched={canAnswerQuestion ? "true" : "false"}
          >
            {getQuestionAudienceNotice(
              post.questionAudience,
              viewerCode,
              canAnswerQuestion,
              Boolean(post.viewerIsAuthor),
            )}
          </p>
          <Link href="/feed/questions/new">
            나도 질문하기
            <ChevronRight aria-hidden="true" size={15} strokeWidth={2} />
          </Link>
        </div>
      ) : null}

      {post.body && !post.togetherBalanceRoom && !post.togetherBalanceResult ? (
        <SafeLinkedText
          className={styles.postBody}
          links={post.links}
          text={post.body}
        />
      ) : null}
      {post.media?.length ? <FeedMediaCarousel media={post.media} /> : null}

      {post.poll ? (
        <div
          className={styles.pollWrap}
          data-closed={post.poll.status === "closed" ? "true" : "false"}
        >
          <FeedPollCard
            key={`${post.id}:${mode}`}
            poll={post.poll}
            returnTo={returnTo}
            variant="playground"
          />
        </div>
      ) : null}

      {post.reportShare ? <ReportSharePreview post={post} /> : null}
      {post.togetherBalanceRoom ? (
        <TogetherBalanceRoomPreview post={post} />
      ) : null}
      {post.togetherBalanceResult ? (
        <TogetherBalanceResultPreview post={post} />
      ) : null}

      <div className={styles.postActions}>
        <FeedActionButtons
          allowComment={
            !responsesClosed && (!isNuangQuestion || canAnswerQuestion)
          }
          commentDisabledMessage={
            responsesClosed
              ? "응답이 마감됐어요. 기존 답변은 계속 볼 수 있어요."
              : post.viewerIsAuthor && isNuangQuestion
                ? "내가 보낸 질문이에요. 다른 사람의 답변을 기다려 보세요."
                : undefined
          }
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
          returnTo={returnTo}
          targetType={post.targetType}
        />
      </div>

      {!isNuangQuestion && recentReply ? (
        <p className={styles.recentReply}>
          <strong>{recentReply.authorName}</strong>
          <span>{recentReply.body}</span>
        </p>
      ) : null}

      {showConversationLink && !post.poll && !isNuangQuestion ? (
        <Link
          className={styles.conversationLink}
          href={`/feed/posts/${post.id}?backTo=${encodeURIComponent(returnTo)}`}
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
          <span className={styles.authorNameText}>{post.authorName}</span>
          {post.authorProfile?.operator ? <NuangOperatorBadge compact /> : null}
          {post.viewerIsAuthor ? (
            <b className={styles.ownPostBadge}>내 글</b>
          ) : null}
          {getPostCode(post) ? (
            <b className={styles.codeBadge}>{getPostCode(post)}</b>
          ) : null}
        </span>
        <small>
          {getFeedPostDisplayLabel(post) ?? post.title} · {post.timeLabel}
        </small>
      </span>
    </span>
  );

  if (!post.authorProfile) return identity;

  return (
    <Link
      aria-label={`${post.authorName} 프로필 보기`}
      className={styles.profileButton}
      href={`/feed/profiles/${post.authorProfile.source.communityProfileId ?? post.authorProfile.source.publicSnapshotId}`}
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
  dialogRef,
  label,
  onClose,
}: {
  action?: ReactNode;
  children: ReactNode;
  dialogRef: RefObject<HTMLElement | null>;
  label: string;
  onClose: () => void;
}) {
  const titleId = useId();

  return (
    <div className={styles.panelBackdrop} data-modal-layer="true">
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.communityPanel}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className={styles.panelHeader}>
          <button
            aria-label="커뮤니티로 돌아가기"
            data-modal-initial-focus="true"
            onClick={onClose}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={21} />
          </button>
          <strong id={titleId}>{label}</strong>
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
        <Link href="/home">내 코드 확인하기</Link>
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

  if (mode === "playground") {
    return (
      <div className={styles.emptyFeed}>
        <strong>새로운 성향놀이를 준비하고 있어요</strong>
        <p>투표를 만들면 이곳에서 가볍게 의견을 나눌 수 있어요.</p>
        <Link href="/feed/balance/new">투표 만들기</Link>
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
  const reportType = post.reportShare.reportType ?? "core";
  const Icon =
    reportType === "core"
      ? FileText
      : reportType === "topic"
        ? MessagesSquare
        : FlaskConical;
  const typeLabel =
    reportType === "core"
      ? post.reportShare.assessmentKind === "full"
        ? "정밀 코어 검사"
        : "빠른 코어 검사"
      : reportType === "topic"
        ? `주제 검사${post.reportShare.assessmentTitle ? ` · ${post.reportShare.assessmentTitle}` : ""}`
        : `별난 연구소${post.reportShare.assessmentTitle ? ` · ${post.reportShare.assessmentTitle}` : ""}`;

  return (
    <Link
      className={styles.reportCard}
      data-report-type={reportType}
      href={post.reportShare.href}
    >
      <span className={styles.reportTypeMark}>
        <Icon aria-hidden="true" size={20} strokeWidth={1.65} />
      </span>
      <div className={styles.reportCardCopy}>
        <span>{typeLabel}</span>
        <p className={styles.reportIdentity}>
          {post.reportShare.profileCode ? (
            <strong>{post.reportShare.profileCode}</strong>
          ) : null}
          <b>{post.reportShare.profileName}</b>
        </p>
        {post.reportShare.summary ? (
          <p className={styles.reportSummary}>{post.reportShare.summary}</p>
        ) : null}
      </div>
      <ChevronRight
        aria-hidden="true"
        className={styles.reportChevron}
        size={19}
        strokeWidth={1.65}
      />
      <span className="sr-only">리포트 보기</span>
    </Link>
  );
}

function TogetherBalanceRoomPreview({ post }: { post: FeedItem }) {
  const room = post.togetherBalanceRoom;
  if (!room) return null;
  const open = room.recruitmentStatus === "open";
  const remaining = Math.max(0, room.capacity - room.occupancy);
  const href = open
    ? room.href
    : `/assessments/together/balance-game?pack=${encodeURIComponent(
        room.packSlug,
      )}`;

  return (
    <Link className={styles.togetherRoomCard} href={href}>
      <div>
        <span>{room.capacity}인 밸런스 게임</span>
        <strong>{room.packTitle}</strong>
        <p>
          {room.occupancy}/{room.capacity}명 참여 중 · {room.questionCount}문항
          · 약 {getTogetherBalanceMinutes(room.questionCount)}분
        </p>
      </div>
      <span data-open={open}>
        {open
          ? remaining === 0
            ? "모집 완료"
            : `${remaining}자리 남음`
          : "모집 마감"}
      </span>
      <b>
        {open ? "함께 고르기" : "같은 팩으로 방 만들기"}
        <ChevronRight aria-hidden="true" size={17} strokeWidth={1.8} />
      </b>
    </Link>
  );
}

function TogetherBalanceResultPreview({ post }: { post: FeedItem }) {
  const result = post.togetherBalanceResult;
  if (!result) return null;

  return (
    <Link className={styles.togetherResultCard} href={result.href}>
      <div>
        <span>
          {result.resultStatus === "final" ? "최종 결과" : "현재 결과"} ·{" "}
          {result.completedCount}명
        </span>
        <strong>{result.packTitle}</strong>
        <p>{result.roomName}</p>
      </div>
      <strong>
        {result.score}
        <small>점</small>
      </strong>
      <p>{result.scoreLabel}</p>
      {result.highlight ? (
        <blockquote>“{result.highlight}”에서 모두 통했어요</blockquote>
      ) : null}
      <b>
        이 주제로 우리도 해보기
        <ChevronRight aria-hidden="true" size={17} strokeWidth={1.8} />
      </b>
    </Link>
  );
}

function getTogetherBalanceMinutes(questionCount: number) {
  if (questionCount <= 8) return 1;
  if (questionCount <= 16) return 2;
  if (questionCount <= 20) return 3;
  return 4;
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

export function getPostCode(post: FeedItem) {
  const code = post.authorProfile?.display.code;
  return code && candidateRoleNames[code] ? code : null;
}

function getCodeMatchCount(left: string, right: string) {
  return left.split("").filter((symbol, index) => symbol === right[index])
    .length;
}

function orderFeedPosts(posts: FeedItem[], viewerCode: string | null) {
  const activeDailyPolls = posts.filter(
    (post) => isDailyCommunityPoll(post) && post.poll?.status !== "closed",
  );
  const dailyPoll =
    activeDailyPolls.find((post) => post.officialFeatured) ??
    activeDailyPolls[0];
  const remainingPosts = dailyPoll
    ? posts.filter((post) => post.id !== dailyPoll.id)
    : posts;
  const nuangQuestions = remainingPosts.filter(isNuangQuestionPost);
  const featuredOfficialQuestions = remainingPosts.filter(
    (post) =>
      post.kind === "daily_question" &&
      post.officialFeatured === true &&
      post.responseStatus !== "closed",
  );
  const matchedQuestions = nuangQuestions.filter(
    (post) =>
      !post.viewerIsAuthor &&
      post.questionAudience &&
      canViewerAnswerQuestion(
        post.questionAudience,
        viewerCode,
        getPostCode(post),
      ),
  );
  const regularPosts = remainingPosts.filter(
    (post) =>
      (!isNuangQuestionPost(post) || post.viewerIsAuthor) &&
      !featuredOfficialQuestions.some((featured) => featured.id === post.id),
  );
  const unmatchedQuestions = nuangQuestions.filter(
    (post) =>
      !post.viewerIsAuthor &&
      !matchedQuestions.some((matched) => matched.id === post.id),
  );

  return [
    ...(dailyPoll ? [dailyPoll] : []),
    ...featuredOfficialQuestions,
    ...matchedQuestions,
    ...regularPosts,
    ...unmatchedQuestions,
  ];
}

export function canViewerAnswerQuestion(
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
  isOwnPost: boolean,
) {
  if (audience.mode === "exact") {
    const target = audience.codes[0] ?? "지정된 코드";
    if (isOwnPost) return `${target}에게 보낸 질문`;
    return matched ? `${target}에게 온 질문` : `${target}에게 묻는 질문`;
  }
  if (audience.mode === "trait") {
    const target = audience.codes.join(" · ");
    if (isOwnPost) return `${target} 성향에게 보낸 질문`;
    return matched
      ? `${target} 성향에게 온 질문`
      : `${target} 성향에게 묻는 질문`;
  }
  if (audience.mode === "all") {
    return isOwnPost
      ? "모든 뉴앙 코드에게 보낸 질문"
      : "모든 뉴앙 코드에게 온 질문";
  }
  if (audience.mode === "similar") {
    return isOwnPost
      ? "나와 비슷한 뉴앙 코드에게 보낸 질문"
      : "비슷한 뉴앙 코드에게 온 질문";
  }
  if (audience.mode === "different") {
    return isOwnPost
      ? "나와 다른 뉴앙 코드에게 보낸 질문"
      : "다른 뉴앙 코드에게 온 질문";
  }
  if (!viewerCode) return "답변 대상을 지정한 질문";
  return matched ? "내 뉴앙 코드에게 온 질문" : "다른 뉴앙 코드에게 온 질문";
}

export function isDailyCommunityPoll(post: FeedItem) {
  return (
    post.kind === "balance_game" &&
    post.authorHandle === "nuang.official" &&
    Boolean(post.poll)
  );
}

export function isNuangQuestionPost(post: FeedItem) {
  return Boolean(post.questionAudience);
}

export function isPlaygroundPost(post: FeedItem) {
  return (
    Boolean(post.poll) ||
    Boolean(post.questionAudience) ||
    Boolean(post.togetherBalanceRoom) ||
    post.kind === "daily_question" ||
    post.kind === "daily_mood"
  );
}

export function getFeedPostFormat(post: FeedItem): FeedPostFormat {
  if (post.kind === "report_share" || post.reportShare) return "report";
  if (isPlaygroundPost(post)) return "playground";
  return "everyday";
}

export function getFeedPostDisplayLabel(post: FeedItem) {
  const format = getFeedPostFormat(post);
  if (format === "report") return "리포트";
  if (format === "playground") return "놀이터";
  return post.topic?.label ?? null;
}
