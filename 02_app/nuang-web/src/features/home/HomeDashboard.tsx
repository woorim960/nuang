"use client";

import {
  ArrowRight,
  Bell,
  LockKeyhole,
  MessageCircle,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { PersonalityPlaygroundPost } from "@/features/feed/PersonalityPlaygroundPost";
import { homeDailyCommunityPollPromptId } from "@/features/feed/feed-prompts";
import {
  type FeedItem,
  listHomeFeedPreviewItems,
} from "@/features/feed/feed-seed";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import {
  buildHomeDashboardModel,
  type HomeHeroModel,
  type HomeResultModel,
} from "@/features/home/home-dashboard-model";
import {
  type CandidateProfileDefinition,
  candidateProfileDefinitions,
} from "@/features/nuang-code/candidate-profile-names";
import styles from "./HomeDashboard.module.css";

type HomeDashboardProps = {
  feedPreviewItems?: FeedItem[];
};

export function HomeDashboard({
  feedPreviewItems = listHomeFeedPreviewItems(),
}: HomeDashboardProps = {}) {
  const [attempts, setAttempts] = useState<LocalAssessmentAttempt[]>([]);
  const [accountResults, setAccountResults] = useState<AccountResultSummary[]>(
    [],
  );
  const [loaded, setLoaded] = useState(false);
  const featuredProfile = useSyncExternalStore(
    subscribeToFeaturedProfile,
    getFeaturedProfileSnapshot,
    getServerFeaturedProfileSnapshot,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadLocalState() {
      try {
        const nextAttempts = await listLocalAttempts();
        if (isMounted) setAttempts(nextAttempts);
      } catch {
        if (isMounted) setAttempts([]);
      } finally {
        if (isMounted) setLoaded(true);
      }
    }

    async function loadAccountState() {
      const nextResults = await listAccountResults();
      if (isMounted) setAccountResults(nextResults);
    }

    void loadLocalState();
    void loadAccountState();

    return () => {
      isMounted = false;
    };
  }, []);

  const model = useMemo(
    () => buildHomeDashboardModel(attempts, accountResults),
    [accountResults, attempts],
  );
  const communityPollItem = feedPreviewItems.find(
    (item) => item.poll?.promptId === homeDailyCommunityPollPromptId,
  );
  const conversations = selectConversations(
    feedPreviewItems,
    communityPollItem?.id,
  );
  const viewerCode = getHeroResultCode(model.hero);

  return (
    <div className={styles.home}>
      <header className={styles.brandBar}>
        <div className={styles.wordmark}>
          <p className={styles.brand}>NUANG</p>
          <h1>홈</h1>
        </div>
        <Link
          aria-label="커뮤니티 활동 알림"
          className={styles.headerIconButton}
          href="/feed/notifications"
        >
          <Bell aria-hidden="true" size={22} strokeWidth={1.7} />
        </Link>
      </header>

      {loaded ? <HomeHero hero={model.hero} /> : <HomeHeroSkeleton />}

      {model.hero.kind === "full_complete" ? <HomeRelationshipPrompt /> : null}

      {communityPollItem?.poll ? (
        <PersonalityPlaygroundPost
          continueHref={`/feed?posted=${communityPollItem.id}`}
          post={communityPollItem}
          recordHref="/feed/perspectives?from=home"
          returnTo="/home"
        />
      ) : (
        <HomePlaygroundUnavailable />
      )}

      <HomeProfileDiscovery profile={featuredProfile} />

      <HomeConversations items={conversations} viewerCode={viewerCode} />
    </div>
  );
}

function HomeHero({ hero }: { hero: HomeHeroModel }) {
  if (hero.kind === "in_progress") {
    const isFresh = hero.answered === 0 && !hero.adaptive;

    return (
      <HeroLayout
        actions={
          <>
            <HeroPrimaryLink href={hero.href}>
              {isFresh
                ? `${hero.assessmentLabel} 시작하기`
                : hero.adaptive
                  ? "확인 질문 이어가기"
                  : "검사 이어가기"}
            </HeroPrimaryLink>
            {hero.latestResult ? (
              <HeroTextLink href={hero.latestResult.href}>
                저장된 내 결과 다시 보기
              </HeroTextLink>
            ) : null}
          </>
        }
      >
        <p className={styles.eyebrow}>{hero.assessmentLabel}</p>
        <h1>
          {hero.adaptive
            ? "한 자리만 더 확인하면 결과가 완성돼요"
            : isFresh
              ? "내 모습을 더 자세히 알아볼까요?"
              : "답하던 곳부터 이어가요"}
        </h1>
        <p className={styles.heroBody}>
          {hero.adaptive
            ? "비슷하게 나온 코드 한 자리를 몇 가지 질문으로 확인해요."
            : isFresh
              ? "첫 결과를 바탕으로 더 다양한 상황 속 내 모습을 살펴봐요."
              : "지금까지 답한 내용은 그대로 남아 있어요."}
        </p>

        {!isFresh ? (
          <div className={styles.progressBlock}>
            <div className={styles.progressMeta}>
              <span>
                {hero.adaptive ? "마지막 코드 확인 중" : "검사 진행률"}
              </span>
              <strong>
                {hero.adaptive ? "거의 완료" : `${hero.progress}%`}
              </strong>
            </div>
            <div
              aria-label={`${hero.assessmentLabel} 진행률`}
              aria-valuemax={hero.total}
              aria-valuemin={0}
              aria-valuenow={hero.answered}
              aria-valuetext={`${hero.total}개 중 ${hero.answered}개 응답 저장`}
              className={styles.progressTrack}
              role="progressbar"
            >
              <span
                className={styles.progressValue}
                style={{ width: `${hero.adaptive ? 96 : hero.progress}%` }}
              />
            </div>
          </div>
        ) : null}
      </HeroLayout>
    );
  }

  if (hero.kind === "quick_complete") {
    return (
      <ResultHero
        eyebrow="나의 첫 뉴앙 코드"
        primaryHref={hero.precisionHref}
        primaryLabel="정밀 검사로 더 자세히 보기"
        result={hero.result}
        secondaryHref={hero.result.href}
        secondaryLabel="첫 결과 다시 보기"
      />
    );
  }

  if (hero.kind === "full_complete") {
    return (
      <ResultHero
        eyebrow="나의 뉴앙 코드"
        primaryHref={hero.result.href}
        primaryLabel="내 성향 자세히 보기"
        result={hero.result}
        secondaryHref="/map"
        secondaryLabel="성향지도에서 다섯 자리 살펴보기"
      />
    );
  }

  return (
    <HeroLayout
      actions={
        <>
          <HeroPrimaryLink href={hero.href}>
            첫 성향 검사 시작하기
          </HeroPrimaryLink>
          <p className={styles.heroTrustNote}>
            <LockKeyhole aria-hidden="true" size={13} strokeWidth={1.9} />
            로그인 없이 시작할 수 있고, 답변은 공개되지 않아요.
          </p>
        </>
      }
    >
      <p className={styles.eyebrow}>나를 알아보는 첫걸음</p>
      <h1>3분이면 내 성향의 첫 단서를 만나요</h1>
      <p className={styles.heroBody}>
        간단한 질문에 답하면, 지금 내 모습과 가까운 5글자 뉴앙 코드를
        알려드려요.
      </p>
    </HeroLayout>
  );
}

function ResultHero({
  eyebrow,
  primaryHref,
  primaryLabel,
  result,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  primaryHref: string;
  primaryLabel: string;
  result: HomeResultModel;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <HeroLayout
      actions={
        <>
          <HeroPrimaryLink href={primaryHref}>{primaryLabel}</HeroPrimaryLink>
          <HeroTextLink href={secondaryHref}>{secondaryLabel}</HeroTextLink>
        </>
      }
    >
      <p className={styles.eyebrow}>{eyebrow}</p>
      <p aria-label={`뉴앙 코드 ${result.code}`} className={styles.code}>
        {result.code}
      </p>
      <h1>{result.profileName}</h1>
      <p className={styles.heroBody}>{result.summary}</p>
    </HeroLayout>
  );
}

function HeroLayout({
  actions,
  children,
}: {
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroProfileRow}>
        <HeroCharacter />
        <div className={styles.heroCopy}>{children}</div>
      </div>
      <div className={styles.heroActions}>{actions}</div>
    </section>
  );
}

function HeroCharacter() {
  return (
    <div className={styles.characterStage}>
      <span aria-hidden="true" className={styles.characterGlow} />
      <NuangCharacter
        className={styles.character}
        motif="purple"
        priority
        size="md"
      />
    </div>
  );
}

function HeroPrimaryLink({
  children,
  href,
}: {
  children: string;
  href: string;
}) {
  return (
    <Link className={styles.primaryAction} href={href}>
      <span>{children}</span>
      <ArrowRight aria-hidden="true" size={18} strokeWidth={2} />
    </Link>
  );
}

function HeroTextLink({ children, href }: { children: string; href: string }) {
  return (
    <Link className={styles.textAction} href={href}>
      {children}
      <ArrowRight aria-hidden="true" size={15} strokeWidth={2} />
    </Link>
  );
}

function HomeHeroSkeleton() {
  return (
    <section aria-busy="true" className={`${styles.hero} ${styles.skeleton}`}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>내 홈을 준비하는 중</p>
        <h1>오늘 이어갈 내용을 확인하고 있어요</h1>
        <p className={styles.heroBody}>잠시만 기다려 주세요.</p>
        <span className={styles.skeletonAction} />
      </div>
    </section>
  );
}

function HomeRelationshipPrompt() {
  return (
    <section className={styles.relationshipPrompt}>
      <span aria-hidden="true" className={styles.relationshipIcon}>
        <UsersRound size={20} strokeWidth={1.8} />
      </span>
      <div>
        <p className={styles.eyebrow}>서로를 이해하는 다음 단계</p>
        <h2>궁금한 사람과 나는 어디가 닮았을까요?</h2>
        <p>
          가족·친구·좋아하는 사람과 잘 맞는 점, 대화할 때 다른 점을 비교해
          보세요.
        </p>
        <Link href="/feed/search?from=home">
          궁금한 사람 찾아보기
          <ArrowRight aria-hidden="true" size={15} strokeWidth={1.9} />
        </Link>
      </div>
    </section>
  );
}

function HomeProfileDiscovery({
  profile,
}: {
  profile: CandidateProfileDefinition | null;
}) {
  return (
    <section className={styles.section}>
      <SectionHeading
        description="하루에 한 가지 성향을 가볍게 알아보세요."
        title="오늘 발견할 성향"
      />
      {profile ? (
        <Link
          aria-label={`${profile.accessibleName} 성향 자세히 보기`}
          className={styles.profileDiscovery}
          href={`/map/${profile.code}?from=home`}
        >
          <div className={styles.profileDiscoveryTop}>
            <span className={styles.profilePreviewLabel}>오늘의 성향</span>
            <p
              aria-label={`뉴앙 코드 ${profile.code}`}
              className={styles.profileCode}
            >
              {profile.code}
            </p>
          </div>
          <h3>{profile.displayName}</h3>
          <p className={styles.profileSummary}>{profile.overview[0].text}</p>
          <div aria-label="성향 핵심 키워드" className={styles.profileTokens}>
            {profile.codeTokens.slice(0, 3).map((token) => (
              <span key={token}>{token}</span>
            ))}
          </div>
          <span className={styles.profileDiscoveryAction}>
            이 성향 자세히 보기
            <ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
          </span>
        </Link>
      ) : (
        <div
          aria-busy="true"
          aria-label="오늘의 성향을 고르는 중"
          className={`${styles.profileDiscovery} ${styles.profileDiscoverySkeleton}`}
        />
      )}
    </section>
  );
}

function HomePlaygroundUnavailable() {
  return (
    <section className={styles.playgroundUnavailable}>
      <strong>오늘의 질문을 준비하고 있어요</strong>
      <p>커뮤니티의 다른 이야기부터 가볍게 둘러보세요.</p>
      <Link href="/feed">
        커뮤니티 보기
        <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
      </Link>
    </section>
  );
}

function HomeConversations({
  items,
  viewerCode,
}: {
  items: FeedItem[];
  viewerCode: string | null;
}) {
  return (
    <section className={styles.section}>
      <SectionHeading
        actionHref="/feed"
        actionLabel="커뮤니티 더 보기"
        description="비슷한 성향과 다른 관점의 이야기를 함께 골랐어요."
        title="지금 많이 이야기하는 것"
      />
      {items.length > 0 ? (
        <div className={styles.conversationList}>
          {items.map((item) => {
            const itemCode = item.authorProfile?.display.code ?? null;
            const reason = getConversationReason(
              viewerCode,
              itemCode,
              item.replyCount ?? 0,
            );

            return (
              <Link
                className={styles.conversation}
                href={
                  item.targetType === "feed_post"
                    ? `/feed/posts/${item.id}`
                    : "/feed"
                }
                key={item.id}
              >
                <span aria-hidden="true" className={styles.conversationAvatar}>
                  {item.authorName.slice(0, 1)}
                </span>
                <span className={styles.conversationCopy}>
                  <span className={styles.conversationMeta}>
                    <strong>{item.authorName}</strong>
                    {itemCode ? <b>{itemCode}</b> : null}
                    <span aria-hidden="true">·</span>
                    <span>{item.timeLabel}</span>
                  </span>
                  {reason ? (
                    <small className={styles.conversationReason}>
                      {reason}
                    </small>
                  ) : null}
                  <strong className={styles.conversationTitle}>
                    {item.title}
                  </strong>
                  <span className={styles.conversationBody}>{item.body}</span>
                  <span className={styles.replyLabel}>
                    <span>{item.likeLabel}</span>
                    <MessageCircle
                      aria-hidden="true"
                      size={13}
                      strokeWidth={1.7}
                    />
                    {item.replyLabel}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <Link className={styles.emptyConversation} href="/feed">
          새로운 이야기를 먼저 만나보세요
          <ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
        </Link>
      )}
    </section>
  );
}

function getConversationReason(
  viewerCode: string | null,
  itemCode: string | null,
  replyCount: number,
) {
  if (viewerCode && itemCode) {
    const matchCount = viewerCode
      .split("")
      .filter((letter, index) => letter === itemCode[index]).length;
    return matchCount >= 3
      ? `내 코드와 ${matchCount}자리가 가까워요`
      : "나와 다른 관점을 볼 수 있어요";
  }

  return replyCount > 0 ? "지금 댓글이 이어지고 있어요" : null;
}

function SectionHeading({
  actionHref,
  actionLabel,
  description,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  title: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref}>{actionLabel}</Link>
      ) : null}
    </div>
  );
}

function selectConversations(items: FeedItem[], excludedItemId?: string) {
  return items
    .filter(
      (item) =>
        item.id !== excludedItemId &&
        item.kind !== "daily_question" &&
        isCurrentCodeContent(item) &&
        isUsefulHomeConversation(item),
    )
    .slice(0, 2);
}

function isCurrentCodeContent(item: FeedItem) {
  if (!item.reportShare) return true;
  return /^[EI][RN][GA][KM][CQ]$/.test(item.reportShare.profileCode);
}

function isUsefulHomeConversation(item: FeedItem) {
  if (item.reportShare) return true;
  if (item.poll || item.kind === "balance_game") return false;

  const readableCharacterCount = `${item.title} ${item.body}`.match(
    /[가-힣A-Za-z0-9]/g,
  )?.length;

  return (readableCharacterCount ?? 0) >= 12;
}

function getHeroResultCode(hero: HomeHeroModel) {
  if (hero.kind === "quick_complete" || hero.kind === "full_complete") {
    return hero.result.code;
  }

  return hero.kind === "in_progress" ? (hero.latestResult?.code ?? null) : null;
}

function selectFeaturedProfile() {
  const profiles = Object.values(candidateProfileDefinitions);
  const dateKey = new Date().toISOString().slice(0, 10);
  const index = hashDateKey(dateKey) % Math.max(profiles.length, 1);
  const profile = profiles[index] ?? profiles[0];
  return profile ?? null;
}

let cachedFeaturedProfile: CandidateProfileDefinition | null | undefined;

function subscribeToFeaturedProfile() {
  return () => undefined;
}

function getFeaturedProfileSnapshot() {
  if (cachedFeaturedProfile === undefined) {
    cachedFeaturedProfile = selectFeaturedProfile();
  }

  return cachedFeaturedProfile;
}

function getServerFeaturedProfileSnapshot() {
  return null;
}

function hashDateKey(value: string) {
  return value.split("").reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0;
  }, 17);
}

async function listAccountResults(): Promise<AccountResultSummary[]> {
  try {
    const response = await fetch("/api/account-results", {
      cache: "no-store",
      method: "GET",
    });
    if (!response.ok) return [];

    const body = (await response.json()) as {
      ok?: boolean;
      results?: AccountResultSummary[];
    };
    return body.ok && Array.isArray(body.results) ? body.results : [];
  } catch {
    return [];
  }
}
