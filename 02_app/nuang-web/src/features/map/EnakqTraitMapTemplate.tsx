"use client";

import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Clock3,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { enakqCustomerGuideV2 } from "@/features/nuang-code/enakq-customer-guide-v2";
import { enakqTraitMapTemplateV1 } from "@/features/nuang-code/enakq-trait-map-template-v1";
import styles from "@/features/map/EnakqTraitMapTemplate.module.css";

const template = enakqTraitMapTemplateV1;
const guide = enakqCustomerGuideV2;

export function EnakqTraitMapTemplate() {
  const [activeChapter, setActiveChapter] = useState(1);
  const [tableOfContentsOpen, setTableOfContentsOpen] = useState(false);
  const chapterSelectionLocked = useRef(false);
  const chapterSelectionTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (chapterSelectionLocked.current) return;

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) => right.intersectionRatio - left.intersectionRatio,
          )[0];
        const chapterNumber = Number(
          visible?.target.getAttribute("data-chapter-number"),
        );
        if (chapterNumber) setActiveChapter(chapterNumber);
      },
      { rootMargin: "-112px 0px -58%", threshold: [0, 0.15, 0.35] },
    );

    for (const chapter of guide.chapters) {
      const element = document.getElementById(chapter.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (chapterSelectionTimer.current !== null) {
        window.clearTimeout(chapterSelectionTimer.current);
      }
    },
    [],
  );

  const currentChapter =
    guide.chapters.find((chapter) => chapter.number === activeChapter) ??
    guide.chapters[0];

  function moveToChapter(chapterId: string, chapterNumber: number) {
    chapterSelectionLocked.current = true;
    if (chapterSelectionTimer.current !== null) {
      window.clearTimeout(chapterSelectionTimer.current);
    }
    chapterSelectionTimer.current = window.setTimeout(() => {
      chapterSelectionLocked.current = false;
      chapterSelectionTimer.current = null;
    }, 900);
    setActiveChapter(chapterNumber);
    setTableOfContentsOpen(false);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const reduceMotion =
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        document.getElementById(chapterId)?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      });
    });
  }

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="성향지도로 돌아가기" href="/map">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.65} />
        </Link>
        <span>성향지도 상세</span>
        <span aria-hidden="true" className={styles.headerSpacer} />
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>5글자 뉴앙 코드</p>
          <CodeLetters />
          <h1>{template.profileName}</h1>
          <p>
            사람과 함께할 때 활력이 오르고, 새로운 가능성을 찾으며, 관계에서는
            상대의 마음을 세심하게 살펴요. 사람과 생각을 연결한 뒤 다음 행동까지
            꾸준히 이어가는 편이고, 중요한 관계가 불확실할 때는 걱정과 감정이
            빠르게 커져요.
          </p>
        </div>
        <div className={styles.characterWrap}>
          <span aria-hidden="true" />
          <NuangCharacter motif="purple" size="lg" />
        </div>
      </section>

      <section
        className={styles.guideIntro}
        aria-labelledby="guide-intro-title"
      >
        <div className={styles.guideIntroHeading}>
          <span className={styles.guideIcon}>
            <BookOpen aria-hidden="true" size={18} strokeWidth={1.7} />
          </span>
          <div>
            <p>ENAKQ를 깊이 이해하는 안내서</p>
            <h2 id="guide-intro-title">
              생각의 이유와 행동까지 자세히 살펴봐요
            </h2>
          </div>
        </div>
        <p>
          이 안내서는 {guide.chapters.length}개 장에서 ENAKQ가 중요하게 여기는
          가치와 생각의 흐름, 관계별 행동, 부담이 커지는 순간과 회복 방법까지
          구체적으로 설명해요. 나를 이해할 때도, 궁금한 사람을 알아갈 때도
          원하는 장부터 골라 읽을 수 있어요.
        </p>
        <div className={styles.guideStats}>
          <span>
            <BookOpen aria-hidden="true" size={14} strokeWidth={1.7} />
            {guide.chapters.length}개 장
          </span>
          <span>
            <Clock3 aria-hidden="true" size={14} strokeWidth={1.7} />
            천천히 약 {guide.readingMinutes}분
          </span>
        </div>
      </section>

      <section
        className={styles.readingGuide}
        aria-labelledby="reading-guide-title"
      >
        <div>
          <span>이렇게 읽어보세요</span>
          <h2 id="reading-guide-title">핵심부터 관계별 모습까지 이어져요</h2>
        </div>
        <ol>
          {[
            "먼저 다섯 글자와 ENAKQ의 중심 가치를 이해해요.",
            "가족·친구·연인·마음 가는 사람과의 행동을 살펴봐요.",
            "마지막에는 강점, 대화법, 뉴앙의 신뢰 근거를 확인해요.",
          ].map((item, index) => (
            <li key={item}>
              <span>{index + 1}</span>
              {item}
            </li>
          ))}
        </ol>
        <p>
          본문은 ENAKQ에서 대체로 반복되는 경향을 중심으로 설명해요. 각 행동이
          나타나는 이유까지 함께 읽으면 단순한 특징 목록보다 이 성향을 훨씬
          구체적으로 이해할 수 있어요.
        </p>
      </section>

      <nav className={styles.chapterNavigator} aria-label="ENAKQ 상세 목차">
        <button
          aria-expanded={tableOfContentsOpen}
          className={styles.chapterNavigatorButton}
          onClick={() => setTableOfContentsOpen((open) => !open)}
          type="button"
        >
          <span className={styles.navigatorIndex}>
            {String(activeChapter).padStart(2, "0")}
          </span>
          <span className={styles.navigatorCopy}>
            <small>
              {activeChapter} / {guide.chapters.length} · 읽는 중
            </small>
            <strong>{currentChapter.label}</strong>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={tableOfContentsOpen ? styles.chevronOpen : undefined}
            size={18}
            strokeWidth={1.65}
          />
        </button>
        <span className={styles.progressTrack} aria-hidden="true">
          <span
            style={{
              width: `${(activeChapter / guide.chapters.length) * 100}%`,
            }}
          />
        </span>
        {tableOfContentsOpen ? (
          <div className={styles.tableOfContents}>
            <p>궁금한 내용을 바로 골라 보세요</p>
            <ol>
              {guide.chapters.map((chapter) => (
                <li key={chapter.id}>
                  <button
                    aria-current={
                      chapter.number === activeChapter ? "location" : undefined
                    }
                    onClick={() => moveToChapter(chapter.id, chapter.number)}
                    type="button"
                  >
                    <span>{String(chapter.number).padStart(2, "0")}</span>
                    {chapter.label}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </nav>

      <div className={styles.chapterList}>
        {guide.chapters.map((chapter) => (
          <GuideChapter chapter={chapter} key={chapter.id} />
        ))}
      </div>

      <section className={styles.nextStep} aria-labelledby="next-step-title">
        <span>다 읽은 뒤</span>
        <h2 id="next-step-title">다른 코드와 나란히 살펴봐요</h2>
        <p>
          다른 코드를 함께 보면 두 사람이 대화를 시작하는 방식, 상대의 마음을
          살피는 순서, 계획과 걱정을 다루는 차이를 더 분명하게 이해할 수 있어요.
        </p>
        <Link href="/map">다른 뉴앙 코드 둘러보기</Link>
        {process.env.NODE_ENV === "development" ? (
          <Link href="/research/trait-map/enakq">내부 콘텐츠 검토 현황</Link>
        ) : null}
      </section>
    </article>
  );
}

function GuideChapter({ chapter }: { chapter: GuideChapterDocument }) {
  return (
    <section
      className={styles.chapter}
      data-chapter-number={chapter.number}
      data-tone={getChapterTone(chapter.number)}
      id={chapter.id}
    >
      <header className={styles.chapterHeading}>
        <span>{String(chapter.number).padStart(2, "0")}</span>
        <p>{chapter.label}</p>
        <h2>{chapter.title}</h2>
        <strong>{chapter.summary}</strong>
      </header>

      <div className={styles.chapterContent}>
        {chapter.sections.map((section, sectionIndex) => (
          <section
            className={styles.chapterSection}
            key={`${chapter.id}-${section.title ?? sectionIndex}`}
          >
            {section.title ? <h3>{section.title}</h3> : null}
            <div className={styles.narrativeBlocks}>
              {chunkParagraphs(section.paragraphs, 3).map(
                (paragraphs, blockIndex) => (
                  <div
                    className={styles.narrativeBlock}
                    key={`${chapter.id}-${sectionIndex}-${blockIndex}`}
                  >
                    {paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                ),
              )}
            </div>
          </section>
        ))}
      </div>

      {chapter.references?.length ? (
        <section className={styles.references} aria-label="참고한 전문 자료">
          <div>
            <span>신뢰를 더 자세히 확인하고 싶다면</span>
            <h3>참고한 전문 자료</h3>
          </div>
          <ul>
            {chapter.references.map((reference) => (
              <li key={reference.href}>
                <a href={reference.href} rel="noreferrer" target="_blank">
                  <span>
                    <strong>{reference.title}</strong>
                    <small>{reference.description}</small>
                  </span>
                  <ExternalLink
                    aria-hidden="true"
                    size={16}
                    strokeWidth={1.6}
                  />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className={styles.selfCheck}>
        <span>내 모습과 비교해 보기</span>
        <p>{chapter.checkQuestion}</p>
      </div>
    </section>
  );
}

function CodeLetters() {
  return (
    <p aria-label={`뉴앙 코드 ${template.code}`} className={styles.codeLetters}>
      {template.code.split("").map((letter, index) => (
        <span data-position={index + 1} key={`${letter}-${index}`}>
          {letter}
        </span>
      ))}
    </p>
  );
}

function chunkParagraphs(paragraphs: string[], size: number) {
  const chunks: string[][] = [];
  for (let index = 0; index < paragraphs.length; index += size) {
    chunks.push(paragraphs.slice(index, index + size));
  }
  return chunks;
}

function getChapterTone(chapterNumber: number) {
  if (chapterNumber >= 7 && chapterNumber <= 10) return "relationship";
  if (chapterNumber === 11) return "work";
  if (chapterNumber === 12) return "stress";
  if (chapterNumber >= 13) return "reflection";
  return "identity";
}

type GuideChapterDocument = (typeof guide.chapters)[number];
