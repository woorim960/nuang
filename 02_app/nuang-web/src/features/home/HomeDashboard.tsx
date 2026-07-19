"use client";

import { ArrowRight, Check, LockKeyhole, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { FeedPollCard } from "@/features/feed/FeedPollCard";
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
  const [loaded, setLoaded] = useState(false);
  const featuredProfile = useSyncExternalStore(
    subscribeToFeaturedProfile,
    getFeaturedProfileSnapshot,
    getServerFeaturedProfileSnapshot,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadAttempts() {
      try {
        const nextAttempts = await listLocalAttempts();
        if (isMounted) setAttempts(nextAttempts);
      } catch {
        if (isMounted) setAttempts([]);
      } finally {
        if (isMounted) setLoaded(true);
      }
    }

    void loadAttempts();

    return () => {
      isMounted = false;
    };
  }, []);

  const model = useMemo(() => buildHomeDashboardModel(attempts), [attempts]);
  const communityPollItem = feedPreviewItems.find(
    (item) => item.poll?.promptId === homeDailyCommunityPollPromptId,
  );
  const conversations = selectConversations(
    feedPreviewItems,
    communityPollItem?.id,
  );

  return (
    <div className={styles.home}>
      <header className={styles.brandBar}>
        <p className={styles.brand}>NUANG</p>
        <p className={styles.brandDescription}>
          나를 이해하고, 서로를 이해하는 곳
        </p>
      </header>

      {loaded ? <HomeHero hero={model.hero} /> : <HomeHeroSkeleton />}

      {communityPollItem?.poll ? (
        <HomeCommunityPoll item={communityPollItem} />
      ) : (
        <HomeDailyChoice />
      )}

      <HomeProfileDiscovery profile={featuredProfile} />

      <HomeConversations items={conversations} />

      <aside className={styles.privacyNote}>
        <LockKeyhole aria-hidden="true" size={19} strokeWidth={1.9} />
        <div>
          <h2>내 답변은 나만 볼 수 있어요</h2>
          <p>공유할 때도 뉴앙 코드와 공개 가능한 요약만 보여줘요.</p>
        </div>
      </aside>
    </div>
  );
}

function HomeHero({ hero }: { hero: HomeHeroModel }) {
  if (hero.kind === "in_progress") {
    const isFresh = hero.answered === 0 && !hero.adaptive;

    return (
      <section className={styles.hero}>
        <HeroCharacter />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{hero.assessmentLabel}</p>
          <h1>
            {hero.adaptive
              ? "마지막 확인 질문을 이어가요"
              : isFresh
                ? "내 모습을 더 자세히 알아볼까요?"
                : "답하던 곳부터 계속해요"}
          </h1>
          <p className={styles.heroBody}>
            {hero.adaptive
              ? "비슷하게 나온 코드 한 자리만 확인하면 결과를 볼 수 있어요."
              : isFresh
                ? "첫 결과를 바탕으로 더 다양한 상황 속 내 모습을 살펴봐요."
                : "답한 내용은 잘 보관되어 있어요. 다음 질문부터 바로 이어갈 수 있어요."}
          </p>

          {!isFresh ? (
            <div className={styles.progressBlock}>
              <div className={styles.progressMeta}>
                <span>
                  {hero.adaptive ? "코드 확인 중" : "현재까지 저장됨"}
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

          <HeroPrimaryLink href={hero.href}>
            {isFresh
              ? `${hero.assessmentLabel} 시작`
              : `${hero.assessmentLabel} 이어가기`}
          </HeroPrimaryLink>
          {hero.latestResult ? (
            <HeroTextLink href={hero.latestResult.href}>
              저장된 내 결과 다시 보기
            </HeroTextLink>
          ) : null}
        </div>
      </section>
    );
  }

  if (hero.kind === "quick_complete") {
    return (
      <ResultHero
        eyebrow="나의 첫 뉴앙 코드"
        primaryHref={hero.result.href}
        primaryLabel="첫 결과 다시 보기"
        result={hero.result}
        secondaryHref={hero.precisionHref}
        secondaryLabel="정밀 성향 검사로 더 자세히 보기"
      />
    );
  }

  if (hero.kind === "full_complete") {
    return (
      <ResultHero
        eyebrow="내 대표 코드"
        primaryHref={hero.result.href}
        primaryLabel="내 성향 자세히 보기"
        result={hero.result}
        secondaryHref="/map"
        secondaryLabel="성향지도에서 다섯 자리 살펴보기"
      />
    );
  }

  return (
    <section className={styles.hero}>
      <HeroCharacter />
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>처음이라면 여기부터</p>
        <h1>3분이면 첫 뉴앙 코드를 만나요</h1>
        <p className={styles.heroBody}>
          부담 없는 질문에 답하고, 지금 내 모습과 가까운 5글자 코드와 특징을
          확인해 보세요.
        </p>
        <div className={styles.heroFacts} aria-label="첫 성향 검사 특징">
          <span>로그인 없이</span>
          <span>중단해도 이어서</span>
        </div>
        <HeroPrimaryLink href={hero.href}>첫 성향 검사 시작</HeroPrimaryLink>
      </div>
    </section>
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
    <section className={styles.hero}>
      <HeroCharacter />
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <p aria-label={`뉴앙 코드 ${result.code}`} className={styles.code}>
          {result.code.split("").map((letter, index) => (
            <span aria-hidden="true" key={`${letter}-${index}`}>
              {letter}
            </span>
          ))}
        </p>
        <h1>{result.profileName}</h1>
        <p className={styles.heroBody}>{result.summary}</p>
        <HeroPrimaryLink href={primaryHref}>{primaryLabel}</HeroPrimaryLink>
        <HeroTextLink href={secondaryHref}>{secondaryLabel}</HeroTextLink>
      </div>
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
        size="lg"
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

function HomeProfileDiscovery({
  profile,
}: {
  profile: CandidateProfileDefinition | null;
}) {
  return (
    <section className={styles.section}>
      <SectionHeading
        description="32가지 성향 중 하나를 가볍게 둘러보세요."
        title="오늘 만나는 성향"
      />
      {profile ? (
        <Link
          aria-label={`${profile.accessibleName} 성향지도에서 더 알아보기`}
          className={styles.profileDiscovery}
          href={`/map?code=${profile.code}&from=home`}
        >
          <div className={styles.profileDiscoveryTop}>
            <span className={styles.profilePreviewLabel}>성향 미리보기</span>
            <p
              aria-label={`뉴앙 코드 ${profile.code}`}
              className={styles.profileCode}
            >
              {profile.code.split("").map((letter, index) => (
                <span aria-hidden="true" key={`${letter}-${index}`}>
                  {letter}
                </span>
              ))}
            </p>
          </div>
          <h3>{profile.displayName}</h3>
          <p className={styles.profileSummary}>{profile.overview[0].text}</p>
          <div aria-label="성향 핵심 키워드" className={styles.profileTokens}>
            {profile.codeTokens.map((token) => (
              <span key={token}>{token}</span>
            ))}
          </div>
          <span className={styles.profileDiscoveryAction}>
            성향지도에서 더 알아보기
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

function HomeDailyChoice() {
  const selectedOptionId = useSyncExternalStore(
    subscribeToHomeDailyChoice,
    getHomeDailyChoiceSnapshot,
    getServerHomeDailyChoiceSnapshot,
  );
  const selectedOption = homeDailyChoice.options.find(
    (option) => option.id === selectedOptionId,
  );

  return (
    <section className={styles.section}>
      <SectionHeading
        description="지금 더 끌리는 쪽을 가볍게 골라보세요."
        title="오늘의 성향 질문"
      />
      <div className={styles.dailyChoiceCard}>
        <div className={styles.dailyChoiceMeta}>
          <span>오늘의 가벼운 선택</span>
          <span>검사 결과에는 반영되지 않아요</span>
        </div>
        <h3>{homeDailyChoice.question}</h3>
        <div
          aria-label="오늘의 선택지"
          className={styles.dailyChoiceOptions}
          role="group"
        >
          {homeDailyChoice.options.map((option) => {
            const selected = option.id === selectedOptionId;

            return (
              <button
                aria-pressed={selected}
                className={styles.dailyChoiceOption}
                data-selected={selected ? "true" : "false"}
                key={option.id}
                onClick={() => saveHomeDailyChoice(option.id)}
                type="button"
              >
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.detail}</small>
                </span>
                {selected ? (
                  <span aria-hidden="true" className={styles.choiceCheck}>
                    <Check size={16} strokeWidth={2.4} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {selectedOption ? (
          <div className={styles.dailyChoiceResult}>
            <p aria-live="polite" role="status">
              {selectedOption.resultTitle}
            </p>
            <p>{selectedOption.resultBody}</p>
            <Link href="/feed">
              다른 사람들의 생각도 보기
              <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
            </Link>
          </div>
        ) : (
          <p className={styles.dailyChoiceHint}>
            하나를 고르면 선택에 맞는 설명을 바로 보여드려요.
          </p>
        )}
      </div>
    </section>
  );
}

function HomeCommunityPoll({ item }: { item: FeedItem }) {
  if (!item.poll) return null;

  const statsHref = `${item.poll.statsHref}?from=home`;
  const hasVoted = Boolean(item.poll.viewerVoteOptionId);
  const latestReply = hasVoted ? item.replyPreview?.[0] : undefined;
  const replyCount = item.replyCount ?? item.replyPreview?.length ?? 0;

  return (
    <section className={styles.section}>
      <SectionHeading
        description="선택하면 전체 결과와 뉴앙 코드별 차이를 볼 수 있어요."
        title="오늘의 성향 질문"
      />
      <div className={styles.dailyChoiceCard}>
        <div className={styles.dailyChoiceMeta}>
          <span>실시간 커뮤니티 투표</span>
          <span>{item.poll.totalVotes.toLocaleString("ko-KR")}명 참여</span>
        </div>
        <FeedPollCard poll={item.poll} returnTo="/home" variant="home" />
        {hasVoted ? (
          <div className={styles.communityMomentum}>
            <span aria-hidden="true" className={styles.communityMomentumDot} />
            <div>
              <strong>
                {item.poll.canViewCodeStats
                  ? "뉴앙 코드별 선택 차이가 열렸어요"
                  : "사람들의 선택이 모이기 시작했어요"}
              </strong>
              <p>
                {item.poll.canViewCodeStats
                  ? "나와 다른 코드는 무엇을 골랐는지 비교해보세요."
                  : "참여가 더 모이면 뉴앙 코드별 선택 차이도 볼 수 있어요."}
              </p>
              {item.poll.canViewCodeStats ? (
                <Link
                  className={styles.communityMomentumAction}
                  href={statsHref}
                >
                  코드별 결과 비교하기
                  <ArrowRight aria-hidden="true" size={14} strokeWidth={2} />
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {hasVoted ? (
          <Link className={styles.communityDiscussion} href={statsHref}>
            <span aria-hidden="true" className={styles.communityDiscussionIcon}>
              <MessageCircle size={17} strokeWidth={2} />
            </span>
            <span className={styles.communityDiscussionCopy}>
              {latestReply ? (
                <>
                  <small>최근 댓글 · {latestReply.authorName}</small>
                  <strong>{latestReply.body}</strong>
                  <span>
                    {replyCount.toLocaleString("ko-KR")}개 댓글 모두 보기
                  </span>
                </>
              ) : (
                <>
                  <small>아직 댓글이 없어요</small>
                  <strong>내가 고른 이유를 먼저 남겨보세요.</strong>
                  <span>첫 댓글 남기기</span>
                </>
              )}
            </span>
            <ArrowRight
              aria-hidden="true"
              className={styles.communityDiscussionArrow}
              size={17}
              strokeWidth={2}
            />
          </Link>
        ) : (
          <div className={styles.communityDiscussion} data-disabled="true">
            <span aria-hidden="true" className={styles.communityDiscussionIcon}>
              <MessageCircle size={17} strokeWidth={2} />
            </span>
            <span className={styles.communityDiscussionCopy}>
              <small>투표 후에 열려요</small>
              <strong>하나를 고르면 서로의 선택 이유도 볼 수 있어요.</strong>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function HomeConversations({ items }: { items: FeedItem[] }) {
  return (
    <section className={styles.section}>
      <SectionHeading
        actionHref="/feed"
        actionLabel="더 보기"
        description="나와 다른 관점과 오늘의 이야기를 만나보세요."
        title="다른 사람들은 이렇게 생각해요"
      />
      {items.length > 0 ? (
        <div className={styles.conversationList}>
          {items.map((item) => (
            <Link
              className={styles.conversation}
              href={item.reportShare?.href ?? "/feed"}
              key={item.id}
            >
              <div className={styles.conversationMeta}>
                <span>{item.authorName}</span>
                <span aria-hidden="true">·</span>
                <span>{item.timeLabel}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <span className={styles.replyLabel}>
                <MessageCircle aria-hidden="true" size={14} strokeWidth={1.9} />
                {item.replyLabel}
              </span>
            </Link>
          ))}
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

const homeDailyChoice = {
  id: "free-day-choice-v1",
  question: "갑자기 하루 여유가 생겼다면, 지금 더 끌리는 쪽은?",
  options: [
    {
      detail: "대화하거나 함께 무언가 하기",
      id: "together",
      label: "사람을 만나 함께 보낸다",
      resultBody:
        "그날의 상황에 따라 선택은 달라질 수 있어요. 한 번의 선택만으로 성향을 판단하지 않아요.",
      resultTitle: "오늘은 누군가와 시간을 나누는 쪽이 더 끌렸네요.",
    },
    {
      detail: "쉬거나 좋아하는 것에 집중하기",
      id: "solo",
      label: "혼자 여유롭게 보낸다",
      resultBody:
        "그날의 상황에 따라 선택은 달라질 수 있어요. 한 번의 선택만으로 성향을 판단하지 않아요.",
      resultTitle: "오늘은 혼자 내 시간을 채우는 쪽이 더 끌렸네요.",
    },
  ],
} as const;

const homeDailyChoiceStorageKeyPrefix = `nuang:home:daily-choice:${homeDailyChoice.id}`;
const homeDailyChoiceListeners = new Set<() => void>();
let homeDailyChoiceMemory: string | null = null;

function subscribeToHomeDailyChoice(listener: () => void) {
  homeDailyChoiceListeners.add(listener);

  function handleStorage(event: StorageEvent) {
    if (event.key === getHomeDailyChoiceStorageKey()) listener();
  }

  window.addEventListener("storage", handleStorage);

  return () => {
    homeDailyChoiceListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getHomeDailyChoiceSnapshot() {
  try {
    homeDailyChoiceMemory = window.localStorage.getItem(
      getHomeDailyChoiceStorageKey(),
    );
  } catch {
    // Use the in-memory choice when browser storage is unavailable.
  }

  return homeDailyChoice.options.some(
    (option) => option.id === homeDailyChoiceMemory,
  )
    ? homeDailyChoiceMemory
    : null;
}

function getServerHomeDailyChoiceSnapshot() {
  return null;
}

function saveHomeDailyChoice(optionId: string) {
  homeDailyChoiceMemory = optionId;

  try {
    window.localStorage.setItem(getHomeDailyChoiceStorageKey(), optionId);
  } catch {
    // The current visit still keeps the choice in memory.
  }

  homeDailyChoiceListeners.forEach((listener) => listener());
}

function getHomeDailyChoiceStorageKey() {
  return `${homeDailyChoiceStorageKeyPrefix}:${new Date().toISOString().slice(0, 10)}`;
}

function selectFeaturedProfile() {
  const profiles = Object.values(candidateProfileDefinitions);
  const dateKey = new Date().toISOString().slice(0, 10);
  const storageKey = `nuang:home:featured-profile:${dateKey}`;

  try {
    const storedCode = window.sessionStorage.getItem(storageKey);
    if (storedCode && candidateProfileDefinitions[storedCode]) {
      return candidateProfileDefinitions[storedCode];
    }
  } catch {
    // Storage can be unavailable in privacy-restricted browsers.
  }

  const index = getRandomIndex(profiles.length);
  const profile = profiles[index] ?? profiles[0];

  if (!profile) return null;

  try {
    window.sessionStorage.setItem(storageKey, profile.code);
  } catch {
    // The preview still works when storage cannot be written.
  }

  return profile;
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

function getRandomIndex(length: number) {
  if (length <= 1) return 0;

  if (typeof window.crypto?.getRandomValues === "function") {
    const value = new Uint32Array(1);
    window.crypto.getRandomValues(value);
    return value[0] % length;
  }

  return Math.floor(Math.random() * length);
}
