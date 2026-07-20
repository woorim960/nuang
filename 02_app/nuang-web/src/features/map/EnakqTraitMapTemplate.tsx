"use client";

import { ArrowLeft, BookOpen, ChevronDown, Clock3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import guideDocument from "@/features/nuang-code/fixtures/enakq-longform-guide.generated.json";
import { enakqTraitMapTemplateV1 } from "@/features/nuang-code/enakq-trait-map-template-v1";
import styles from "@/features/map/EnakqTraitMapTemplate.module.css";

const template = enakqTraitMapTemplateV1;
const guide = guideDocument;

export function EnakqTraitMapTemplate() {
  const [activeChapter, setActiveChapter] = useState(1);
  const [tableOfContentsOpen, setTableOfContentsOpen] = useState(false);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
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

  const currentChapter =
    guide.chapters.find((chapter) => chapter.number === activeChapter) ??
    guide.chapters[0];

  function moveToChapter(chapterId: string, chapterNumber: number) {
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
            사람과 함께할 때 활력이 오르고, 새로운 가능성을 살펴보며, 관계에서는
            상대의 마음이 자연스럽게 눈에 들어오는 편이에요. 시작한 일을
            이어가려는 모습과 걱정이 빠르게 커지는 모습도 함께 나타날 수 있어요.
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
            <h2 id="guide-intro-title">요약하지 않고 생활 장면까지 살펴봐요</h2>
          </div>
        </div>
        <p>
          이 안내서는 {guide.chapters.length}개 장으로 나뉘어 있어요. 가족,
          친구, 연인, 마음 가는 사람, 일과 공부, 힘든 순간까지 구체적으로
          다뤄요. 처음부터 모두 읽어도 좋고, 지금 궁금한 장부터 골라도 괜찮아요.
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
          <span>읽기 전에</span>
          <h2 id="reading-guide-title">내 경험과 함께 보면 더 정확해요</h2>
        </div>
        <ol>
          {template.readingGuide.map((item, index) => (
            <li key={item}>
              <span>{index + 1}</span>
              {item}
            </li>
          ))}
        </ol>
        <p>
          모든 문장이 모든 ENAKQ에게 똑같이 맞는 것은 아니에요. 잘 맞는 부분은
          나를 설명하는 말로 쓰고, 낯선 부분은 어떤 상황에서 모습이 달라지는지
          확인하는 질문으로 사용해 보세요.
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
          같은 글자를 가진 사람도 세부 점수와 살아온 경험은 다를 수 있어요. 다른
          코드를 볼 때에는 좋고 나쁨보다 어떤 상황에서 서로 다르게 느끼고 행동할
          수 있는지 살펴보세요.
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
