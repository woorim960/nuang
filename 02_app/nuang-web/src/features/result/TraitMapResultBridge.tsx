import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getPublishedTraitMapCustomerGuide } from "@/features/nuang-code/trait-map-customer-guide-registry";
import type {
  TraitMapCustomerGuide,
  TraitMapCustomerGuideChapter,
} from "@/features/nuang-code/trait-map-customer-guide-contract";
import {
  buildPrecisionFacetInsights,
  type ReportFacetScore,
} from "@/features/result/precision-report-insights";
import styles from "./TraitMapResultBridge.module.css";

type TraitMapResultBridgeProps = {
  code: string;
  depth?: "first-result" | "precision";
  facets?: ReadonlyArray<ReportFacetScore>;
  profileName: string;
};

const resultPreviewSlots: Array<{
  label: string;
  slot: TraitMapCustomerGuideChapter["slot"];
}> = [
  { label: "생각에서 행동까지", slot: "thought_and_response" },
  { label: "평소 생활", slot: "daily_life" },
  { label: "마음 가는 사람 앞에서", slot: "person_of_interest" },
  { label: "연인과 함께할 때", slot: "partner" },
  { label: "가족 안에서", slot: "family" },
  { label: "친구 사이에서", slot: "friend" },
  { label: "일과 공부를 할 때", slot: "work" },
  { label: "지치거나 긴장할 때", slot: "stress_and_recovery" },
];

/** 결과 리포트와 성향지도를 잇는 공통 장문 요약 블록입니다. */
export function TraitMapResultBridge({
  code,
  depth = "precision",
  facets = [],
  profileName,
}: TraitMapResultBridgeProps) {
  const guide = getPublishedTraitMapCustomerGuide(code);
  if (!guide) return null;

  const fiveLetters = guide.chapters.find(
    (chapter) => chapter.slot === "five_letters",
  );
  const previewChapters =
    depth === "precision" ? getTraitMapResultPreviewChapters(guide) : [];
  const facetInsights =
    depth === "precision" ? buildPrecisionFacetInsights(facets) : [];

  return (
    <section
      aria-labelledby="trait-map-bridge-title"
      className={styles.section}
    >
      <div className={styles.heading}>
        <p>성향지도에서 가져온 상세 해석</p>
        <h2 id="trait-map-bridge-title">{profileName}의 관계와 일상</h2>
        <span>{guide.heroSummary}</span>
      </div>

      {fiveLetters ? (
        <article className={styles.letterStory}>
          <p className={styles.topicLabel}>다섯 글자가 함께 말해주는 것</p>
          <p className={styles.topicSummary}>{fiveLetters.summary}</p>
          <div className={styles.letterList}>
            {fiveLetters.sections.slice(0, 5).map((section) => {
              const [letter, meaning = section.title] = section.title.split(
                /\s*[—-]\s*/,
                2,
              );

              return (
                <div key={section.title}>
                  <strong>{letter}</strong>
                  <span>{meaning}</span>
                </div>
              );
            })}
          </div>
        </article>
      ) : null}

      {facetInsights.length > 0 ? (
        <div className={styles.personalSignals}>
          <div className={styles.personalSignalsHeading}>
            <p>이번 답에서 특히 눈에 띈 모습</p>
            <span>세부 응답 방향</span>
          </div>
          <div className={styles.personalSignalList}>
            {facetInsights.map((insight) => (
              <article key={insight.facetId}>
                <div>
                  <h3>{insight.label}</h3>
                  <strong>{insight.score}</strong>
                </div>
                <span aria-hidden="true">
                  <i style={{ width: `${insight.score}%` }} />
                </span>
                <p>{insight.copy}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {previewChapters.length > 0 ? (
        <div className={styles.storyList}>
          {previewChapters.map(({ chapter, label }) => (
          <article className={styles.story} key={chapter.id}>
            <p className={styles.topicLabel}>{label}</p>
            <h3>{chapter.summary}</h3>
            <div className={styles.storyBody}>
              {chapter.sections.slice(0, 2).map((section) => (
                <div className={styles.storySection} key={section.title}>
                  <h4>{section.title}</h4>
                  {section.paragraphs.slice(0, 2).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              ))}
            </div>
          </article>
          ))}
        </div>
      ) : null}

      <div className={styles.detailGuide}>
        <p>
          {depth === "precision"
            ? "더 많은 상황과 관계별 설명은 성향지도에 이어져 있어요."
            : "관계와 일상에서 나타나는 자세한 모습은 정밀 검사 후 더 정확하게 이어서 볼 수 있어요."}
        </p>
        <Link href={`/map/${code}`}>
          {code} 성향지도 자세히 보기
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
        </Link>
      </div>
    </section>
  );
}

export function getTraitMapResultPreviewChapters(
  guide: TraitMapCustomerGuide,
) {
  return resultPreviewSlots.flatMap(({ label, slot }) => {
    const chapter = guide.chapters.find((item) => item.slot === slot);
    return chapter ? [{ chapter, label }] : [];
  });
}

export function countTraitMapResultPreviewCharacters(
  guide: TraitMapCustomerGuide,
) {
  const fiveLetters = guide.chapters.find(
    (chapter) => chapter.slot === "five_letters",
  );
  const fiveLetterText = fiveLetters
    ? [
        fiveLetters.summary,
        ...fiveLetters.sections.slice(0, 5).map((section) => section.title),
      ].join("")
    : "";
  const chapterText = getTraitMapResultPreviewChapters(guide)
    .flatMap(({ chapter }) => [
      chapter.summary,
      ...chapter.sections
        .slice(0, 2)
        .flatMap((section) => [
          section.title,
          ...section.paragraphs.slice(0, 2),
        ]),
    ])
    .join("");

  return `${guide.heroSummary}${fiveLetterText}${chapterText}`.replace(
    /\s/g,
    "",
  ).length;
}
