"use client";

import {
  ArrowRight,
  BookOpenCheck,
  ChevronRight,
  HeartHandshake,
  LockKeyhole,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { AssessmentHomeCoreSection } from "@/features/assessment/AssessmentHomeCoreSection";
import {
  assessmentCatalog,
  assessmentHubFilters,
  type AssessmentCatalogItem,
  type AssessmentHubFilter,
  labAssessmentCatalog,
  recommendedAssessmentCatalog,
  togetherAssessmentCatalog,
  topicAssessmentCatalog,
} from "@/features/assessment/assessment-catalog";
import styles from "./AssessmentHub.module.css";

const relationshipRecommendationIds = [
  "topic:conversation-temperature",
  "topic:distance-rhythm",
  "topic:conflict-repair",
];

const selfRecommendationIds = [
  "topic:focus-switch",
  "topic:organizing-style",
  "topic:mood-shift",
];

export function AssessmentHub() {
  const [activeFilter, setActiveFilter] =
    useState<AssessmentHubFilter>("recommended");

  const filteredItems = useMemo(
    () =>
      activeFilter === "recommended"
        ? []
        : assessmentCatalog.filter((assessment) =>
            assessment.themes.includes(activeFilter),
          ),
    [activeFilter],
  );

  return (
    <div className={styles.hub}>
      <header className={styles.header}>
        <div className={styles.wordmark}>
          <span>NUANG</span>
          <h1>검사</h1>
        </div>
        <Link
          aria-label="내 검사 기록 보기"
          className={styles.recordLink}
          href="/my/reports"
        >
          <BookOpenCheck aria-hidden="true" size={19} strokeWidth={1.7} />
          <span>내 기록</span>
        </Link>
      </header>

      <nav
        aria-label="검사 주제"
        className={styles.categoryDock}
        role="tablist"
      >
        <div className={styles.categoryScroller}>
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
                onClick={() => setActiveFilter(filter.id)}
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
          <RecommendedDiscovery />
        ) : (
          <FilteredDiscovery filter={activeFilter} items={filteredItems} />
        )}
      </section>

      <section className={styles.coreSection}>
        <div className={styles.sectionHeading}>
          <h2>뉴앙 코드 여정</h2>
        </div>
        <AssessmentHomeCoreSection />
      </section>

      <section className={styles.utilitySection}>
        <Link
          aria-label="뉴앙 검사 질문 리뷰에 참여하기, 약 4분, 리뷰 이벤트 진행"
          className={styles.utilityRow}
          href="/research?from=assessments"
        >
          <span className={styles.utilityIcon} data-tone="teal">
            <MessageCircle aria-hidden="true" size={18} strokeWidth={1.7} />
          </span>
          <span className={styles.utilityCopy}>
            <strong>검사 질문 리뷰하기</strong>
            <small>약 4분 · 리뷰 참여자 중 10명 커피 쿠폰 추첨</small>
          </span>
          <ChevronRight aria-hidden="true" size={18} strokeWidth={1.7} />
        </Link>

        <Link
          aria-label="마음이 많이 힘들 때 도움 정보 보기"
          className={styles.utilityRow}
          href="/help"
        >
          <span className={styles.utilityIcon} data-tone="rose">
            <LockKeyhole aria-hidden="true" size={18} strokeWidth={1.7} />
          </span>
          <span className={styles.utilityCopy}>
            <strong>마음이 많이 힘든가요?</strong>
            <small>검사가 아닌 안전한 도움 정보를 확인할 수 있어요.</small>
          </span>
          <ChevronRight aria-hidden="true" size={18} strokeWidth={1.7} />
        </Link>
      </section>
    </div>
  );
}

function RecommendedDiscovery() {
  return (
    <>
      <section className={styles.featuredSection}>
        <div className={styles.sectionHeading}>
          <h2>지금 알아보면 재밌는 나</h2>
        </div>
        <FeaturedRail items={recommendedAssessmentCatalog} />
      </section>

      <AssessmentSection
        items={selectItems(relationshipRecommendationIds)}
        title="관계 속 내 모습"
      />

      <AssessmentSection
        items={selectItems(selfRecommendationIds)}
        title="혼자일 때의 나"
      />

      <TogetherSpotlight item={togetherAssessmentCatalog[0]} />
    </>
  );
}

function FilteredDiscovery({
  filter,
  items,
}: {
  filter: AssessmentHubFilter;
  items: AssessmentCatalogItem[];
}) {
  if (filter === "lab") {
    return <LabDiscovery items={labAssessmentCatalog} />;
  }

  if (filter === "together") {
    return <TogetherSpotlight item={togetherAssessmentCatalog[0]} compact />;
  }

  const copy = getFilterCopy(filter);

  return <AssessmentSection items={items} title={copy.title} />;
}

function FeaturedRail({ items }: { items: AssessmentCatalogItem[] }) {
  return (
    <div className={styles.featuredRail}>
      {items.map((item, index) => (
        <Link
          aria-label={`${item.title}, 약 ${item.estimatedMinutes}분, 바로 알아보기`}
          className={styles.featuredCard}
          data-accent={item.accent}
          href={item.href}
          key={item.id}
        >
          <div className={styles.featuredCopy}>
            <h3>{item.title}</h3>
            <p>{item.caption}</p>
            <div className={styles.featuredMeta}>
              <strong>약 {item.estimatedMinutes}분</strong>
              <span>
                바로 알아보기
                <ArrowRight aria-hidden="true" size={15} strokeWidth={1.8} />
              </span>
            </div>
          </div>
          {index === 0 ? (
            <div className={styles.featuredCharacter}>
              <span />
              <NuangCharacter
                className={styles.character}
                motif="purple"
                size="md"
              />
            </div>
          ) : (
            <Sparkles
              aria-hidden="true"
              className={styles.featuredMark}
              size={28}
              strokeWidth={1.35}
            />
          )}
        </Link>
      ))}
    </div>
  );
}

function AssessmentSection({
  items,
  title,
}: {
  items: AssessmentCatalogItem[];
  title: string;
}) {
  return (
    <section className={styles.listSection}>
      <div className={styles.sectionHeading}>
        <h2>{title}</h2>
      </div>
      <div className={styles.assessmentList}>
        {items.map((item) => (
          <AssessmentRow item={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}

function AssessmentRow({ item }: { item: AssessmentCatalogItem }) {
  return (
    <Link
      aria-label={`${item.title}: ${item.caption}, 약 ${item.estimatedMinutes}분`}
      className={styles.assessmentRow}
      href={item.href}
    >
      <span className={styles.rowMarker} data-accent={item.accent} />
      <span className={styles.rowCopy}>
        <strong>{item.title}</strong>
        <small>{item.caption}</small>
        <em>약 {item.estimatedMinutes}분</em>
      </span>
      <ChevronRight aria-hidden="true" size={18} strokeWidth={1.7} />
    </Link>
  );
}

function TogetherSpotlight({
  compact = false,
  item,
}: {
  compact?: boolean;
  item: AssessmentCatalogItem;
}) {
  return (
    <section
      className={compact ? styles.togetherCompact : styles.togetherSection}
    >
      {!compact ? (
        <div className={styles.sectionHeading}>
          <h2>친구 성향 맞히기</h2>
        </div>
      ) : null}
      <Link className={styles.togetherRow} href={item.href}>
        <span className={styles.togetherIcon}>
          <HeartHandshake aria-hidden="true" size={23} strokeWidth={1.55} />
        </span>
        <span className={styles.togetherCopy}>
          <strong>{item.title}</strong>
          <small>{item.caption}</small>
          <em>함께 하기 · 약 {item.estimatedMinutes}분</em>
        </span>
        <ChevronRight aria-hidden="true" size={19} strokeWidth={1.7} />
      </Link>
    </section>
  );
}

function LabDiscovery({ items }: { items: AssessmentCatalogItem[] }) {
  return (
    <section className={styles.labSection}>
      <div className={styles.sectionHeading}>
        <h2>별난 성향 연구소</h2>
      </div>
      <div className={styles.labRail}>
        {items.map((item) => (
          <Link className={styles.labCard} href={item.href} key={item.id}>
            <span>2분 선택 놀이</span>
            <h3>{item.title}</h3>
            <p>{item.caption}</p>
            <strong>가볍게 시작하기</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}

function selectItems(ids: string[]) {
  return ids
    .map((id) =>
      topicAssessmentCatalog.find((assessment) => assessment.id === id),
    )
    .filter((assessment): assessment is AssessmentCatalogItem =>
      Boolean(assessment),
    );
}

function getFilterCopy(filter: AssessmentHubFilter) {
  if (filter === "relationship") {
    return {
      title: "관계 속 내 모습",
    };
  }

  if (filter === "emotion") {
    return {
      title: "감정과 회복의 방식",
    };
  }

  return {
    title: "나를 더 자세히 알아보기",
  };
}
