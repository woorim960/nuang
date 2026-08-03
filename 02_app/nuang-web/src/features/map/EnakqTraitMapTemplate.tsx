"use client";

import { ArrowLeft, Check, ChevronDown, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { candidateAxisCopy } from "@/features/nuang-code/candidate-profile-names";
import type {
  TraitMapCustomerGuide,
  TraitMapCustomerGuideChapter,
} from "@/features/nuang-code/trait-map-customer-guide-contract";
import styles from "@/features/map/EnakqTraitMapTemplate.module.css";

export function TraitMapDetailTemplate({
  guide,
}: {
  guide: TraitMapCustomerGuide;
}) {
  const [activeChapter, setActiveChapter] = useState(1);
  const [tableOfContentsOpen, setTableOfContentsOpen] = useState(false);
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<
    Record<string, SectionFeedbackValue>
  >({});
  const chapterSelectionLocked = useRef(false);
  const chapterSelectionTimer = useRef<number | null>(null);
  const chapterNavigatorButtonRef = useRef<HTMLButtonElement>(null);
  const syncActiveChapterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let frameId: number | null = null;

    const updateActiveChapter = () => {
      frameId = null;
      if (chapterSelectionLocked.current) return;

      const navigatorBottom =
        chapterNavigatorButtonRef.current?.getBoundingClientRect().bottom ??
        114;
      const activationLine = navigatorBottom + 10;
      let nextChapterNumber = guide.chapters[0]?.number ?? 1;

      for (const chapter of guide.chapters) {
        const chapterElement = document.getElementById(chapter.id);
        if (!chapterElement) continue;
        if (chapterElement.getBoundingClientRect().top > activationLine) break;
        nextChapterNumber = chapter.number;
      }

      const documentHeight = document.documentElement.scrollHeight;
      const reachedDocumentEnd =
        documentHeight > window.innerHeight &&
        window.scrollY + window.innerHeight >= documentHeight - 2;
      if (reachedDocumentEnd) {
        nextChapterNumber = guide.chapters.at(-1)?.number ?? nextChapterNumber;
      }

      setActiveChapter((current) =>
        current === nextChapterNumber ? current : nextChapterNumber,
      );
    };

    const scheduleActiveChapterSync = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateActiveChapter);
    };

    syncActiveChapterRef.current = scheduleActiveChapterSync;
    scheduleActiveChapterSync();
    window.addEventListener("scroll", scheduleActiveChapterSync, {
      passive: true,
    });
    window.addEventListener("resize", scheduleActiveChapterSync);

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      syncActiveChapterRef.current = null;
      window.removeEventListener("scroll", scheduleActiveChapterSync);
      window.removeEventListener("resize", scheduleActiveChapterSync);
    };
  }, [guide.chapters]);

  useEffect(
    () => () => {
      if (chapterSelectionTimer.current !== null) {
        window.clearTimeout(chapterSelectionTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    let mounted = true;

    async function loadFeedback() {
      try {
        const response = await fetch(
          `/api/research/trait-map-feedback?code=${encodeURIComponent(guide.code)}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const body = (await response.json()) as {
          eligible?: boolean;
          feedback?: Array<
            SectionFeedbackValue & {
              chapterId: string;
              sectionKey: string;
            }
          >;
        };
        if (!mounted || !body.eligible) return;

        setFeedbackEnabled(true);
        setSavedFeedback(
          Object.fromEntries(
            (body.feedback ?? []).map((entry) => [
              createSectionFeedbackKey(entry.chapterId, entry.sectionKey),
              {
                fitRating: entry.fitRating,
                note: entry.note,
              },
            ]),
          ),
        );
      } catch {
        // Feedback remains hidden when account eligibility cannot be confirmed.
      }
    }

    void loadFeedback();
    return () => {
      mounted = false;
    };
  }, [guide.code]);

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
      syncActiveChapterRef.current?.();
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
          <CodeLetters code={guide.code} />
          <h1>{guide.profileName}</h1>
          <p>{guide.heroSummary}</p>
        </div>
        <div className={styles.characterWrap}>
          <span aria-hidden="true" />
          <NuangCharacter motif="purple" size="lg" />
        </div>
      </section>

      <section
        aria-label={`${guide.code} 뉴앙 코드의 성향 이름`}
        className={styles.codeLanguage}
      >
        {guide.code.split("").map((symbol, index) => {
          const direction = candidateAxisCopy[index]?.directions[symbol];
          if (!direction) return null;
          return (
            <span key={`${symbol}-${index}`}>
              <b>{symbol}</b>
              <em>{direction.publicTypeName}</em>
            </span>
          );
        })}
      </section>

      <nav
        className={styles.chapterNavigator}
        aria-label={`${guide.code} 상세 목차`}
      >
        <button
          aria-expanded={tableOfContentsOpen}
          className={styles.chapterNavigatorButton}
          ref={chapterNavigatorButtonRef}
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
          <GuideChapter
            chapter={chapter}
            code={guide.code}
            feedbackEnabled={feedbackEnabled}
            key={chapter.id}
            onFeedbackSaved={(chapterId, sectionKey, value) => {
              setSavedFeedback((current) => ({
                ...current,
                [createSectionFeedbackKey(chapterId, sectionKey)]: value,
              }));
            }}
            savedFeedback={savedFeedback}
          />
        ))}
      </div>

      <section className={styles.nextStep} aria-labelledby="next-step-title">
        <h2 id="next-step-title">다른 코드와 나란히 살펴봐요</h2>
        <Link href="/map">다른 뉴앙 코드 둘러보기</Link>
      </section>
    </article>
  );
}

function GuideChapter({
  chapter,
  code,
  feedbackEnabled,
  onFeedbackSaved,
  savedFeedback,
}: {
  chapter: GuideChapterDocument;
  code: string;
  feedbackEnabled: boolean;
  onFeedbackSaved: (
    chapterId: string,
    sectionKey: string,
    value: SectionFeedbackValue,
  ) => void;
  savedFeedback: Record<string, SectionFeedbackValue>;
}) {
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
            {feedbackEnabled ? (
              <SectionFitFeedback
                chapterId={chapter.id}
                code={code}
                onSaved={(value) =>
                  onFeedbackSaved(
                    chapter.id,
                    createSectionKey(sectionIndex),
                    value,
                  )
                }
                savedValue={
                  savedFeedback[
                  createSectionFeedbackKey(
                    chapter.id,
                    createSectionKey(sectionIndex),
                  )
                  ]
                }
                sectionKey={createSectionKey(sectionIndex)}
              />
            ) : null}
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

function SectionFitFeedback({
  chapterId,
  code,
  onSaved,
  savedValue,
  sectionKey,
}: {
  chapterId: string;
  code: string;
  onSaved: (value: SectionFeedbackValue) => void;
  savedValue?: SectionFeedbackValue;
  sectionKey: string;
}) {
  const [open, setOpen] = useState(false);
  const [fitRating, setFitRating] = useState<SectionFitRating | "">(
    savedValue?.fitRating ?? "",
  );
  const [note, setNote] = useState(savedValue?.note ?? "");
  const [status, setStatus] = useState<"error" | "idle" | "saving" | "saved">(
    savedValue ? "saved" : "idle",
  );

  async function save() {
    if (!fitRating || status === "saving") return;
    setStatus("saving");

    try {
      const response = await fetch("/api/research/trait-map-feedback", {
        body: JSON.stringify({
          chapterId,
          code,
          fitRating,
          note,
          sectionKey,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) throw new Error("save_failed");

      const value = { fitRating, note: note.trim() };
      onSaved(value);
      setStatus("saved");
      setOpen(false);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={styles.sectionFeedback} data-open={open}>
      <button
        className={styles.sectionFeedbackLink}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {savedValue ? (
          <>
            <Check aria-hidden="true" size={14} strokeWidth={1.8} />내 느낌
            수정하기
          </>
        ) : (
          "이 설명은 나와 얼마나 비슷한가요?"
        )}
      </button>

      {open ? (
        <div className={styles.sectionFeedbackForm}>
          <div className={styles.sectionFeedbackHeading}>
            <strong>내 실제 모습과 비교해 주세요</strong>
            <button
              aria-label="의견 남기기 닫기"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X aria-hidden="true" size={17} strokeWidth={1.7} />
            </button>
          </div>
          <div className={styles.fitOptions}>
            {sectionFitOptions.map((option) => (
              <button
                aria-pressed={fitRating === option.value}
                key={option.value}
                onClick={() => {
                  setFitRating(option.value);
                  setStatus("idle");
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          <label>
            <span>덧붙이고 싶은 내용 (선택)</span>
            <textarea
              maxLength={500}
              onChange={(event) => {
                setNote(event.target.value);
                setStatus("idle");
              }}
              placeholder="어떤 점이 비슷하거나 달랐는지 알려주세요."
              rows={3}
              value={note}
            />
          </label>
          {status === "error" ? (
            <p className={styles.feedbackError}>
              저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.
            </p>
          ) : null}
          <button
            className={styles.feedbackSave}
            disabled={!fitRating || status === "saving"}
            onClick={save}
            type="button"
          >
            {status === "saving" ? "저장하고 있어요" : "의견 보내기"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CodeLetters({ code }: { code: string }) {
  return (
    <p aria-label={`뉴앙 코드 ${code}`} className={styles.codeLetters}>
      {code.split("").map((letter, index) => (
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

type GuideChapterDocument = TraitMapCustomerGuideChapter;

type SectionFitRating =
  "very_close" | "mostly_close" | "partly_different" | "very_different";

type SectionFeedbackValue = {
  fitRating: SectionFitRating;
  note: string;
};

const sectionFitOptions: ReadonlyArray<{
  label: string;
  value: SectionFitRating;
}> = [
    { label: "매우 비슷해요", value: "very_close" },
    { label: "대체로 비슷해요", value: "mostly_close" },
    { label: "조금 달라요", value: "partly_different" },
    { label: "많이 달라요", value: "very_different" },
  ];

function createSectionKey(sectionIndex: number) {
  return `section-${String(sectionIndex + 1).padStart(2, "0")}`;
}

function createSectionFeedbackKey(chapterId: string, sectionKey: string) {
  return `${chapterId}:${sectionKey}`;
}
