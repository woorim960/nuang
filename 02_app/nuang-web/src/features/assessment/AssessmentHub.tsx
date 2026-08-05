"use client";

import {
  BatteryCharging,
  BookOpenCheck,
  ChevronRight,
  HeartHandshake,
  HelpCircle,
  MessageCircle,
  MessagesSquare,
  RotateCcw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ComponentType } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import type { NuangCharacterMotif } from "@/components/character/nuang-character-assets";
import { AssessmentHomeCoreSection } from "@/features/assessment/AssessmentHomeCoreSection";
import { BetaSampleSponsorBanner } from "@/features/advertising/delivery/BetaSampleSponsorBanner";
import {
  assessmentHubFilters,
  type AssessmentCatalogItem,
  type AssessmentHubFilter,
  labAssessmentCatalog,
  topicAssessmentCatalog,
  togetherAssessmentCatalog,
} from "@/features/assessment/assessment-catalog";
import styles from "./AssessmentHub.module.css";

type RuntimeAssessmentCatalog = {
  labs: AssessmentCatalogItem[];
  topics: AssessmentCatalogItem[];
  together: AssessmentCatalogItem[];
};

type IconComponent = ComponentType<{
  "aria-hidden"?: boolean | "true" | "false";
  size?: number | string;
  strokeWidth?: number | string;
}>;

const iconByKey: Record<AssessmentCatalogItem["iconKey"], IconComponent> = {
  battery: BatteryCharging,
  compare: HeartHandshake,
  conversation: MessagesSquare,
  repair: RotateCcw,
};

const motifBySlug: Record<string, NuangCharacterMotif> = {
  "conflict-repair": "water",
  "conversation-temperature": "purple",
  "recharge-ritual": "sun",
};

export function AssessmentHub({
  catalog = {
    labs: labAssessmentCatalog,
    topics: topicAssessmentCatalog.filter(
      (item) => item.publicationStatus === "published",
    ),
    together: togetherAssessmentCatalog,
  },
}: {
  catalog?: RuntimeAssessmentCatalog;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const activeFilter = resolveAssessmentHomeView(requestedView);

  useEffect(() => {
    if (requestedView !== null && !isAssessmentHomeView(requestedView)) {
      router.replace("/home", { scroll: false });
    }
  }, [requestedView, router]);

  function selectFilter(filter: AssessmentHubFilter) {
    router.push(filter === "recommended" ? "/home" : `/home?view=${filter}`, {
      scroll: false,
    });
  }

  return (
    <div className={styles.hub}>
      <header className={styles.header}>
        <div className={styles.wordmark}>
          <span>NUANG</span>
          <span className={styles.pageLabel}>홈</span>
        </div>
        <Link
          aria-label="내 검사 기록 보기"
          className={styles.recordLink}
          href="/my/reports/history"
        >
          <BookOpenCheck aria-hidden="true" size={19} strokeWidth={1.65} />
          <span>내 기록</span>
        </Link>
      </header>

      <section className={styles.brandPromise}>
        <p>성향으로 나와 우리를 발견하는 곳</p>
        <h1>나를 이해하고, 서로를 이해하는 성향 놀이터</h1>
        <span>생활 속 나를 발견하고, 함께 고르며 서로를 알아가요.</span>
      </section>

      <GlobalHomeJourney />

      <nav
        aria-label="홈 콘텐츠 둘러보기"
        className={styles.categoryDock}
        role="tablist"
      >
        <div className={styles.categoryGrid}>
          {assessmentHubFilters.map((filter) => {
            const isActive = activeFilter === filter.id;

            return (
              <button
                aria-controls="assessment-discovery-panel"
                aria-selected={isActive}
                className={styles.categoryTab}
                data-active={isActive}
                id={`assessment-tab-${filter.id}`}
                key={filter.id}
                onClick={() => selectFilter(filter.id)}
                role="tab"
                type="button"
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </nav>

      <section
        aria-labelledby={`assessment-tab-${activeFilter}`}
        className={styles.discoveryPanel}
        id="assessment-discovery-panel"
        role="tabpanel"
      >
        {activeFilter === "recommended" ? (
          <RecommendedDiscovery catalog={catalog} />
        ) : null}
        {activeFilter === "self" ? (
          <SelfDiscovery items={catalog.topics} />
        ) : null}
        {activeFilter === "together" ? (
          <TogetherDiscovery items={catalog.together} />
        ) : null}
        {activeFilter === "lab" ? <LabDiscovery items={catalog.labs} /> : null}
      </section>
    </div>
  );
}

export function AssessmentHubFallback() {
  return (
    <div aria-busy="true" className={styles.hub}>
      <header className={styles.header}>
        <div className={styles.wordmark}>
          <span>NUANG</span>
          <span className={styles.pageLabel}>홈</span>
        </div>
        <span className={styles.recordPlaceholder} />
      </header>
      <section className={styles.brandPromise}>
        <p>성향으로 나와 우리를 발견하는 곳</p>
        <h1>나를 이해하고, 서로를 이해하는 성향 놀이터</h1>
        <span>생활 속 나를 발견하고, 함께 고르며 서로를 알아가요.</span>
      </section>
      <section className={styles.journeySection}>
        <div className={styles.hubJourneySkeleton}>
          <span />
          <span />
          <span />
        </div>
      </section>
      <div className={styles.tabSkeleton} />
    </div>
  );
}

function RecommendedDiscovery({
  catalog,
}: {
  catalog: RuntimeAssessmentCatalog;
}) {
  const releasedTopics = catalog.topics;

  return (
    <>
      {releasedTopics.length > 0 ? (
        <TopicDiscovery items={releasedTopics.slice(0, 3)} />
      ) : null}
      <BetaSampleSponsorBanner />
      <TogetherDiscovery includeFind={false} items={catalog.together} />
      <LabDiscovery items={catalog.labs.slice(0, 2)} />
      <UtilitySection />
    </>
  );
}

function SelfDiscovery({ items }: { items: AssessmentCatalogItem[] }) {
  const releasedTopics = items;

  return (
    <>
      {releasedTopics.length > 0 ? (
        <TopicDiscovery items={releasedTopics} />
      ) : null}
    </>
  );
}

function TopicDiscovery({ items }: { items: AssessmentCatalogItem[] }) {
  return (
    <section className={styles.topicSection}>
      <div className={styles.sectionHeading}>
        <span>생활 속 나를 알아보기</span>
        <h2>지금 궁금한 내 모습을 골라보세요</h2>
      </div>
      <div className={styles.topicList}>
        {items.map((item) => {
          const Icon = iconByKey[item.iconKey];

          return (
            <Link className={styles.topicStory} href={item.href} key={item.id}>
              <span className={styles.topicIcon}>
                <Icon aria-hidden="true" size={22} strokeWidth={1.55} />
              </span>
              <span className={styles.storyCopy}>
                <strong>{item.title}</strong>
                <small>{item.caption}</small>
                <em>
                  {item.questionCount ? `${item.questionCount}개 질문 · ` : ""}
                  약 {item.estimatedMinutes}분
                </em>
              </span>
              <ChevronRight aria-hidden="true" size={18} strokeWidth={1.6} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function GlobalHomeJourney() {
  return (
    <section aria-label="내 성향 여정" className={styles.journeySection}>
      <AssessmentHomeCoreSection />
    </section>
  );
}

function TogetherDiscovery({
  includeFind = true,
  items,
}: {
  includeFind?: boolean;
  items: AssessmentCatalogItem[];
}) {
  const [balanceGame, ...otherTogetherItems] = items;

  return (
    <>
      <TogetherSpotlight item={balanceGame} />
      {otherTogetherItems.length > 0 ? (
        <section className={styles.togetherListSection}>
          <div className={styles.sectionHeading}>
            <span>둘이 더 알아보기</span>
            <h2>서로를 얼마나 잘 알고 있을까요?</h2>
          </div>
          <div className={styles.topicList}>
            {otherTogetherItems.map((item) => (
              <Link
                className={styles.topicStory}
                href={item.href}
                key={item.id}
              >
                <span className={styles.topicIcon}>
                  <HeartHandshake
                    aria-hidden="true"
                    size={22}
                    strokeWidth={1.55}
                  />
                </span>
                <span className={styles.storyCopy}>
                  <strong>{item.title}</strong>
                  <small>{item.caption}</small>
                  <em>초대로 함께하기 · 약 {item.estimatedMinutes}분</em>
                </span>
                <ChevronRight aria-hidden="true" size={18} strokeWidth={1.6} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {includeFind ? (
        <section className={styles.findSection}>
          <Link className={styles.findRow} href="/feed/search?intent=compare">
            <span className={styles.softIcon}>
              <Search aria-hidden="true" size={20} strokeWidth={1.65} />
            </span>
            <span>
              <strong>비교할 사람 찾기</strong>
              <small>궁금한 사람의 프로필에서 나와 비교해요</small>
            </span>
            <ChevronRight aria-hidden="true" size={18} strokeWidth={1.6} />
          </Link>
        </section>
      ) : null}
    </>
  );
}

function TogetherSpotlight({ item }: { item: AssessmentCatalogItem }) {
  const isBalanceGame = item.id === "together:balance-game";

  return (
    <section className={styles.togetherSection}>
      <div className={styles.sectionHeading}>
        <span>{isBalanceGame ? "2~8명이 함께" : "둘이서 더 재밌게"}</span>
        <h2>
          {isBalanceGame
            ? "우리, 얼마나 비슷하게 고를까요?"
            : "서로 보는 모습은 얼마나 같을까요?"}
        </h2>
      </div>
      <Link className={styles.togetherStory} href={item.href}>
        <div className={styles.avatarPair} aria-hidden="true">
          <NuangCharacter motif="purple" size="sm" />
          <NuangCharacter motif="forest" size="sm" />
        </div>
        <span className={styles.storyCopy}>
          <strong>{item.title}</strong>
          <small>{item.caption}</small>
          <em>
            {isBalanceGame
              ? "2~8명 · 1분부터 원하는 만큼"
              : `초대로 함께하기 · 약 ${item.estimatedMinutes}분`}
          </em>
        </span>
        <ChevronRight aria-hidden="true" size={18} strokeWidth={1.6} />
      </Link>
    </section>
  );
}

function LabDiscovery({ items }: { items: AssessmentCatalogItem[] }) {
  return (
    <section className={styles.labSection}>
      <div className={styles.labHero}>
        <div>
          <span>별난 성향 연구소</span>
          <h2>내 안의 의외성을 발견해요</h2>
          <p>진단이 아닌, 2분 선택 놀이예요.</p>
        </div>
        <div className={styles.labHeroCharacter}>
          <NuangCharacter motif="flame" priority size="md" />
        </div>
      </div>

      <div className={styles.labList}>
        {items.map((item) => {
          const Icon = iconByKey[item.iconKey];
          const slug = item.id.replace("lab:", "");

          return (
            <Link className={styles.labRow} href={item.href} key={item.id}>
              <span className={styles.labVisual} data-accent={item.accent}>
                <Icon aria-hidden="true" size={21} strokeWidth={1.6} />
                <NuangCharacter
                  className={styles.labCharacter}
                  motif={motifBySlug[slug] ?? "purple"}
                  size="sm"
                />
              </span>
              <span className={styles.labCopy}>
                <strong>{item.title}</strong>
                <small>{item.caption}</small>
                <em>약 {item.estimatedMinutes}분</em>
              </span>
              <ChevronRight aria-hidden="true" size={18} strokeWidth={1.6} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function UtilitySection() {
  return (
    <section className={styles.utilitySection}>
      <Link className={styles.utilityRow} href="/research?from=assessments">
        <span className={styles.softIcon} data-tone="teal">
          <MessageCircle aria-hidden="true" size={19} strokeWidth={1.65} />
        </span>
        <span>
          <strong>검사 질문 리뷰하기</strong>
          <small>참여자 중 10명 커피 쿠폰 추첨</small>
        </span>
        <ChevronRight aria-hidden="true" size={18} strokeWidth={1.6} />
      </Link>

      <Link className={styles.utilityRow} href="/help">
        <span className={styles.softIcon} data-tone="rose">
          <HelpCircle aria-hidden="true" size={19} strokeWidth={1.65} />
        </span>
        <span>
          <strong>마음이 많이 힘들 때</strong>
          <small>바로 도움받을 수 있는 곳을 확인해요</small>
        </span>
        <ChevronRight aria-hidden="true" size={18} strokeWidth={1.6} />
      </Link>
    </section>
  );
}

export function resolveAssessmentHomeView(
  value: string | null | undefined,
): AssessmentHubFilter {
  return isAssessmentHomeView(value) ? value : "recommended";
}

function isAssessmentHomeView(
  value: string | null | undefined,
): value is AssessmentHubFilter {
  return assessmentHubFilters.some((filter) => filter.id === value);
}
