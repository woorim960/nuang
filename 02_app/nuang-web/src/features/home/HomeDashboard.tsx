"use client";

import { ArrowRight, LockKeyhole, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { FeedPollCard } from "@/features/feed/FeedPollCard";
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
import styles from "./HomeDashboard.module.css";

type HomeDashboardProps = {
  feedPreviewItems?: FeedItem[];
};

export function HomeDashboard({
  feedPreviewItems = listHomeFeedPreviewItems(),
}: HomeDashboardProps = {}) {
  const [attempts, setAttempts] = useState<LocalAssessmentAttempt[]>([]);
  const [loaded, setLoaded] = useState(false);

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
  const dailyPlay = selectDailyPlay(feedPreviewItems);
  const conversations = selectConversations(feedPreviewItems, dailyPlay?.id);

  return (
    <div className={styles.home}>
      <header className={styles.brandBar}>
        <p className={styles.brand}>NUANG</p>
        <p className={styles.brandDescription}>
          나를 이해하고, 서로를 이해하는 곳
        </p>
      </header>

      {loaded ? <HomeHero hero={model.hero} /> : <HomeHeroSkeleton />}

      {dailyPlay ? <HomeDailyPlay item={dailyPlay} /> : null}

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

function HomeDailyPlay({ item }: { item: FeedItem }) {
  return (
    <section className={styles.section}>
      <SectionHeading
        description="가볍게 고르고 다른 사람들의 생각도 만나보세요."
        title={item.poll ? "오늘의 성향 게임" : "오늘의 성향 질문"}
      />
      <div className={styles.playCard}>
        {item.poll ? (
          <FeedPollCard poll={item.poll} returnTo="/home" />
        ) : (
          <Link className={styles.playLink} href="/feed">
            <p className={styles.playLabel}>{getFeedKindLabel(item.kind)}</p>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            <span className={styles.playAction}>
              다른 사람들의 답 보기
              <ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
            </span>
          </Link>
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
        actionLabel="피드에서 더 보기"
        description="다른 사람들은 어떤 생각을 나누고 있는지 둘러보세요."
        title="지금 나누는 이야기"
      />
      {items.length > 0 ? (
        <div className={styles.conversationList}>
          {items.map((item) => (
            <Link className={styles.conversation} href="/feed" key={item.id}>
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

function selectDailyPlay(items: FeedItem[]) {
  return (
    items.find((item) => item.kind === "balance_game" && item.poll) ??
    items.find((item) => item.kind === "daily_question") ??
    items.find((item) => item.kind === "daily_mood")
  );
}

function selectConversations(items: FeedItem[], dailyPlayId?: string) {
  return items
    .filter((item) => item.id !== dailyPlayId && isCurrentCodeContent(item))
    .slice(0, 2);
}

function isCurrentCodeContent(item: FeedItem) {
  if (!item.reportShare) return true;
  return /^[EI][RN][GA][KM][CQ]$/.test(item.reportShare.profileCode);
}

function getFeedKindLabel(kind: FeedItem["kind"]) {
  if (kind === "balance_game") return "둘 중 하나를 골라보세요";
  if (kind === "daily_mood") return "지금 내 모습은 어느 쪽인가요?";
  return "한 문장으로 생각해 봐요";
}
