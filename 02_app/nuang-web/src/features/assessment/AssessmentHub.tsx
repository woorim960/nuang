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

      <section className={styles.intro}>
        <p className={styles.eyebrow}>나를 이해하는 작은 발견</p>
        <h2>어떤 나를 알아보고 싶나요?</h2>
        <p>
          관계와 감정, 일상 속 내 모습을
          <br />
          지금 궁금한 것부터 골라보세요.
        </p>
      </section>

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
          <div>
            <p className={styles.sectionEyebrow}>내 기본 코드</p>
            <h2>뉴앙 코드 여정</h2>
          </div>
          <p>다섯 글자는 나를 설명하는 출발점이에요.</p>
        </div>
        <AssessmentHomeCoreSection />
      </section>

      <section className={styles.utilitySection}>
        <Link
          aria-label="뉴앙 검사 질문 다듬기에 참여하기, 익명 참여 약 4분"
          className={styles.utilityRow}
          href="/research/gate-c?from=assessments"
        >
          <span className={styles.utilityIcon} data-tone="teal">
            <MessageCircle aria-hidden="true" size={18} strokeWidth={1.7} />
          </span>
          <span className={styles.utilityCopy}>
            <strong>뉴앙 검사 함께 다듬기</strong>
            <small>질문을 더 이해하기 쉽게 만드는 익명 참여 · 약 4분</small>
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
          <div>
            <p className={styles.sectionEyebrow}>오늘의 추천</p>
            <h2>지금 알아보면 재밌는 나</h2>
          </div>
          <p>짧게 답하고 바로 결과를 확인해요.</p>
        </div>
        <FeaturedRail items={recommendedAssessmentCatalog} />
      </section>

      <AssessmentSection
        description="가까운 사람과 자주 마주치는 순간에서 내 모습을 알아봐요."
        items={selectItems(relationshipRecommendationIds)}
        title="관계 속 내 모습"
      />

      <AssessmentSection
        description="코드 다섯 글자에 다 담기 어려운 생활 속 모습을 살펴봐요."
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
    return (
      <section className={styles.filteredSection}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>둘이 함께</p>
            <h2>서로를 얼마나 알고 있을까요?</h2>
          </div>
          <p>내가 먼저 답한 뒤 친구를 초대해 함께 비교해요.</p>
        </div>
        <TogetherSpotlight item={togetherAssessmentCatalog[0]} compact />
      </section>
    );
  }

  const copy = getFilterCopy(filter);

  return (
    <AssessmentSection
      description={copy.description}
      items={items}
      title={copy.title}
    />
  );
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
            <span>
              {index === 0 ? "관계에서 자주 궁금한 모습" : "오늘의 작은 발견"}
            </span>
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
  description,
  items,
  title,
}: {
  description: string;
  items: AssessmentCatalogItem[];
  title: string;
}) {
  return (
    <section className={styles.listSection}>
      <div className={styles.sectionHeading}>
        <div>
          <h2>{title}</h2>
        </div>
        <p>{description}</p>
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
          <div>
            <p className={styles.sectionEyebrow}>친구와 함께</p>
            <h2>내가 보는 친구와 실제 모습은 얼마나 닮았을까요?</h2>
          </div>
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
        <div>
          <p className={styles.sectionEyebrow} data-tone="sand">
            가볍게 즐기기
          </p>
          <h2>별난 성향 연구소</h2>
        </div>
        <p>
          일상 속 작은 취향과 습관을 2분 선택 놀이로 살펴봐요. 결과는 내 기본
          코드와 따로 보여드려요.
        </p>
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
      description:
        "가까운 사람과 이야기하고, 서운해하고, 다시 맞추는 순간의 나를 알아봐요.",
      title: "관계 속 내 모습",
    };
  }

  if (filter === "emotion") {
    return {
      description: "마음이 흔들리거나 힘들 때 내가 편해지는 방식을 알아봐요.",
      title: "감정과 회복의 방식",
    };
  }

  return {
    description: "생각하고 쉬고 움직이는 일상 속 내 모습을 하나씩 알아봐요.",
    title: "나를 더 자세히 알아보기",
  };
}
