"use client";

import { ArrowLeft, Check, ChevronDown, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { LegacyCoreBetaNotice } from "@/features/assessment/LegacyCoreBetaNotice";
import { candidateAxisCopy } from "@/features/nuang-code/candidate-profile-names";
import type {
  TraitMapCustomerGuide,
  TraitMapCustomerGuideChapter,
} from "@/features/nuang-code/trait-map-customer-guide-contract";
import { applyTraitMapGuideTextOverrides } from "@/features/nuang-code/trait-map-guide-text-overrides";
import {
  createTraitMapGuideReviewUnits,
  createTraitMapGuideUnitKey,
  splitKoreanSentences,
  type TraitMapGuideReviewUnit,
} from "@/features/nuang-code/trait-map-guide-review";
import { traitMapBetaInterpretationNotice } from "@/features/nuang-code/trait-map-guide-review-contract";
import styles from "@/features/map/EnakqTraitMapTemplate.module.css";

export function TraitMapDetailTemplate({
  editor,
  embedded = false,
  guide,
  showLegacyBetaNotice = false,
}: {
  editor?: Readonly<{
    activeRevisionCount: number;
    activeUnitKeys?: readonly string[];
    initialChapterId?: string;
    releaseId: string;
  }>;
  embedded?: boolean;
  guide: TraitMapCustomerGuide;
  showLegacyBetaNotice?: boolean;
}) {
  const [renderedGuide, setRenderedGuide] = useState(guide);
  const [sessionEditedUnitKeys, setSessionEditedUnitKeys] = useState<
    readonly string[]
  >([]);
  const [activeChapter, setActiveChapter] = useState(1);
  const [tableOfContentsOpen, setTableOfContentsOpen] = useState(false);
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<
    Record<string, SectionFeedbackValue>
  >({});
  const chapterSelectionLocked = useRef(false);
  const chapterSelectionTimer = useRef<number | null>(null);
  const chapterNavigatorButtonRef = useRef<HTMLButtonElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  const syncActiveChapterRef = useRef<(() => void) | null>(null);
  const editableUnits = useMemo(
    () =>
      new Map(
        createTraitMapGuideReviewUnits(renderedGuide).map((unit) => [
          unit.unitKey,
          unit,
        ]),
      ),
    [renderedGuide],
  );

  useEffect(() => {
    if (!editor?.initialChapterId) return;
    const chapter = renderedGuide.chapters.find(
      (item) => item.id === editor.initialChapterId,
    );
    const page = pageRef.current;
    const target = page?.querySelector<HTMLElement>(
      `[id="${editor.initialChapterId}"]`,
    );
    if (!chapter || !page || !target) return;
    setActiveChapter(chapter.number);
    const scrollContainer = page.parentElement;
    window.requestAnimationFrame(() => {
      if (typeof scrollContainer?.scrollTo === "function") {
        scrollContainer.scrollTo({
          behavior: "auto",
          top: Math.max(0, target.offsetTop - 58),
        });
      }
    });
  }, [editor?.initialChapterId, renderedGuide.chapters]);

  useEffect(() => {
    let frameId: number | null = null;

    const updateActiveChapter = () => {
      frameId = null;
      if (chapterSelectionLocked.current) return;

      const navigatorBottom =
        chapterNavigatorButtonRef.current?.getBoundingClientRect().bottom ??
        114;
      const activationLine = navigatorBottom + 10;
      let nextChapterNumber = renderedGuide.chapters[0]?.number ?? 1;

      for (const chapter of renderedGuide.chapters) {
        const chapterElement = pageRef.current?.querySelector<HTMLElement>(
          `[id="${chapter.id}"]`,
        );
        if (!chapterElement) continue;
        if (chapterElement.getBoundingClientRect().top > activationLine) break;
        nextChapterNumber = chapter.number;
      }

      const scrollContainer = embedded ? pageRef.current?.parentElement : null;
      const documentHeight = scrollContainer
        ? scrollContainer.scrollHeight
        : document.documentElement.scrollHeight;
      const viewportHeight =
        scrollContainer?.clientHeight ?? window.innerHeight;
      const scrollTop = scrollContainer?.scrollTop ?? window.scrollY;
      const reachedDocumentEnd =
        documentHeight > viewportHeight &&
        scrollTop + viewportHeight >= documentHeight - 2;
      if (reachedDocumentEnd) {
        nextChapterNumber =
          renderedGuide.chapters.at(-1)?.number ?? nextChapterNumber;
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
    const scrollTarget = embedded ? pageRef.current?.parentElement : window;
    scrollTarget?.addEventListener("scroll", scheduleActiveChapterSync, {
      passive: true,
    });
    window.addEventListener("resize", scheduleActiveChapterSync);

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      syncActiveChapterRef.current = null;
      scrollTarget?.removeEventListener("scroll", scheduleActiveChapterSync);
      window.removeEventListener("resize", scheduleActiveChapterSync);
    };
  }, [embedded, renderedGuide.chapters]);

  useEffect(
    () => () => {
      if (chapterSelectionTimer.current !== null) {
        window.clearTimeout(chapterSelectionTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (editor) return;
    let mounted = true;

    async function loadFeedback() {
      try {
        const response = await fetch(
          `/api/research/trait-map-feedback?code=${encodeURIComponent(renderedGuide.code)}`,
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
  }, [editor, renderedGuide.code]);

  const currentChapter =
    renderedGuide.chapters.find(
      (chapter) => chapter.number === activeChapter,
    ) ?? renderedGuide.chapters[0];

  function editableText(unitKey: string, text: string) {
    const unit = editableUnits.get(unitKey);
    if (!editor || !unit) return text;
    return (
      <InlineEditableGuideText
        editor={{
          ...editor,
          activeUnitKeys: [
            ...(editor.activeUnitKeys ?? []),
            ...sessionEditedUnitKeys,
          ],
        }}
        key={`${unit.unitKey}:${unit.contentHash}`}
        onSaved={(nextText) => {
          setRenderedGuide((current) =>
            applyTraitMapGuideTextOverrides(current, [
              { text: nextText, unitKey: unit.unitKey },
            ]),
          );
          setSessionEditedUnitKeys((current) =>
            current.includes(unit.unitKey)
              ? current
              : [...current, unit.unitKey],
          );
        }}
        unit={unit}
      />
    );
  }

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
        const target = pageRef.current?.querySelector<HTMLElement>(
          `[id="${chapterId}"]`,
        );
        if (embedded && target) {
          pageRef.current?.parentElement?.scrollTo({
            behavior: "smooth",
            top: Math.max(0, target.offsetTop - 58),
          });
          return;
        }
        const reduceMotion =
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      });
    });
  }

  return (
    <article
      className={`${styles.page} ${embedded ? styles.embeddedPage : ""}`}
      data-editor-mode={editor ? "true" : undefined}
      ref={pageRef}
    >
      {editor ? (
        <aside className={styles.editorModeBar} role="status">
          <span>실제 고객 화면 · 편집 모드</span>
          <strong>고칠 문장을 바로 눌러 주세요</strong>
          <small>
            저장하면 7역할 검수를 다시 거쳐 베타 화면에 즉시 반영돼요 · 현재
            수정본 {countActiveEditedUnits(editor, sessionEditedUnitKeys)}개
          </small>
        </aside>
      ) : null}
      <header className={styles.header}>
        <Link
          aria-label="성향지도로 돌아가기"
          href="/map"
          target={editor ? "_blank" : undefined}
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.65} />
        </Link>
        <span>성향지도 상세</span>
        <span aria-hidden="true" className={styles.headerSpacer} />
      </header>

      {showLegacyBetaNotice ? (
        <LegacyCoreBetaNotice
          className={styles.legacyBetaNotice}
          context="map"
        />
      ) : null}

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>5글자 뉴앙 코드</p>
          <CodeLetters code={renderedGuide.code} />
          <h1>{renderedGuide.profileName}</h1>
          <p>
            {editableText(
              createTraitMapGuideUnitKey({
                guideVersion: renderedGuide.version,
                kind: "hero_summary",
                profileCode: renderedGuide.code,
              }),
              renderedGuide.heroSummary,
            )}
          </p>
        </div>
        <div className={styles.characterWrap}>
          <span aria-hidden="true" />
          <NuangCharacter motif="purple" size="lg" />
        </div>
      </section>

      <section
        aria-label={`${renderedGuide.code} 뉴앙 코드의 성향 이름`}
        className={styles.codeLanguage}
      >
        {renderedGuide.code.split("").map((symbol, index) => {
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

      <aside className={styles.interpretationNotice}>
        <strong>{traitMapBetaInterpretationNotice.title}</strong>
        <p>{traitMapBetaInterpretationNotice.description}</p>
      </aside>

      <nav
        className={styles.chapterNavigator}
        aria-label={`${renderedGuide.code} 상세 목차`}
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
              {activeChapter} / {renderedGuide.chapters.length} · 읽는 중
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
              width: `${(activeChapter / renderedGuide.chapters.length) * 100}%`,
            }}
          />
        </span>
        {tableOfContentsOpen ? (
          <div className={styles.tableOfContents}>
            <ol>
              {renderedGuide.chapters.map((chapter) => (
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
        {renderedGuide.chapters.map((chapter) => (
          <GuideChapter
            chapter={chapter}
            code={renderedGuide.code}
            editableText={editableText}
            editingEnabled={Boolean(editor)}
            feedbackEnabled={feedbackEnabled}
            guideVersion={renderedGuide.version}
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
  editableText,
  editingEnabled,
  feedbackEnabled,
  guideVersion,
  onFeedbackSaved,
  savedFeedback,
}: {
  chapter: GuideChapterDocument;
  code: string;
  editableText: (unitKey: string, text: string) => React.ReactNode;
  editingEnabled: boolean;
  feedbackEnabled: boolean;
  guideVersion: string;
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
        <h2>
          {editableText(
            createTraitMapGuideUnitKey({
              chapterId: chapter.id,
              guideVersion,
              kind: "chapter_title",
              profileCode: code,
            }),
            chapter.title,
          )}
        </h2>
        <strong>
          {editableText(
            createTraitMapGuideUnitKey({
              chapterId: chapter.id,
              guideVersion,
              kind: "chapter_summary",
              profileCode: code,
            }),
            chapter.summary,
          )}
        </strong>
      </header>

      <div className={styles.chapterContent}>
        {chapter.sections.map((section, sectionIndex) => (
          <section
            className={styles.chapterSection}
            key={`${chapter.id}-${section.title ?? sectionIndex}`}
          >
            {section.title ? (
              <h3>
                {editableText(
                  createTraitMapGuideUnitKey({
                    chapterId: chapter.id,
                    guideVersion,
                    kind: "section_title",
                    profileCode: code,
                    sectionIndex,
                  }),
                  section.title,
                )}
              </h3>
            ) : null}
            <div className={styles.narrativeBlocks}>
              {chunkParagraphs(section.paragraphs, 3).map(
                (paragraphs, blockIndex) => (
                  <div
                    className={styles.narrativeBlock}
                    key={`${chapter.id}-${sectionIndex}-${blockIndex}`}
                  >
                    {paragraphs.map((paragraph, localParagraphIndex) => {
                      const paragraphIndex =
                        blockIndex * 3 + localParagraphIndex;
                      return (
                        <p
                          key={`${chapter.id}-${sectionIndex}-${paragraphIndex}`}
                        >
                          {splitKoreanSentences(paragraph).map(
                            (sentence, sentenceIndex) => (
                              <span
                                className={styles.editableSentence}
                                key={`${paragraphIndex}-${sentenceIndex}`}
                              >
                                {editableText(
                                  createTraitMapGuideUnitKey({
                                    chapterId: chapter.id,
                                    guideVersion,
                                    kind: "paragraph_sentence",
                                    paragraphIndex,
                                    profileCode: code,
                                    sectionIndex,
                                    sentenceIndex,
                                  }),
                                  sentence,
                                )}{" "}
                              </span>
                            ),
                          )}
                        </p>
                      );
                    })}
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
            {chapter.references.map((reference, referenceIndex) => {
              const referenceContent = (
                <>
                  <span>
                    <strong>
                      {editableText(
                        createTraitMapGuideUnitKey({
                          chapterId: chapter.id,
                          guideVersion,
                          kind: "reference_title",
                          paragraphIndex: referenceIndex,
                          profileCode: code,
                        }),
                        reference.title,
                      )}
                    </strong>
                    <small>
                      {editableText(
                        createTraitMapGuideUnitKey({
                          chapterId: chapter.id,
                          guideVersion,
                          kind: "reference_description",
                          paragraphIndex: referenceIndex,
                          profileCode: code,
                        }),
                        reference.description,
                      )}
                    </small>
                  </span>
                  <ExternalLink
                    aria-hidden="true"
                    size={16}
                    strokeWidth={1.6}
                  />
                </>
              );
              return (
                <li key={reference.href}>
                  {editingEnabled ? (
                    <div className={styles.editorReference}>
                      {referenceContent}
                    </div>
                  ) : (
                    <a href={reference.href} rel="noreferrer" target="_blank">
                      {referenceContent}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className={styles.selfCheck}>
        <span>내 모습과 비교해 보기</span>
        <p>
          {editableText(
            createTraitMapGuideUnitKey({
              chapterId: chapter.id,
              guideVersion,
              kind: "check_question",
              profileCode: code,
            }),
            chapter.checkQuestion,
          )}
        </p>
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

function InlineEditableGuideText({
  editor,
  onSaved,
  unit,
}: {
  editor: Readonly<{
    activeRevisionCount: number;
    activeUnitKeys?: readonly string[];
    releaseId: string;
  }>;
  onSaved: (text: string) => void;
  unit: Omit<TraitMapGuideReviewUnit, "reviewDecisions">;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(unit.text);
  const [message, setMessage] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving || draft.trim() === unit.text) return;
    setSaving(true);
    setMessage("");
    setIssues([]);
    try {
      const response = await fetch("/api/admin/trait-map-guide-content", {
        body: JSON.stringify({
          expectedContentHash: unit.contentHash,
          profileCode: unit.profileCode,
          releaseId: editor.releaseId,
          text: draft,
          unitKey: unit.unitKey,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        issues?: Array<{ rationale?: string; role?: string }>;
        message?: string;
        ok?: boolean;
        text?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.text) {
        setMessage(payload?.message ?? "수정본을 저장하지 못했습니다.");
        setIssues(
          [...new Set((payload?.issues ?? []).map((issue) => issue.rationale))]
            .filter((value): value is string => Boolean(value))
            .slice(0, 4),
        );
        return;
      }
      onSaved(payload.text);
      setEditing(false);
    } catch {
      setMessage("연결이 원활하지 않습니다. 잠시 뒤 다시 저장해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        aria-label={`${unitKindEditorLabel(unit.kind)} 편집: ${unit.text}`}
        className={styles.inlineEditableText}
        data-revised={
          editor.activeUnitKeys?.includes(unit.unitKey) || undefined
        }
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setEditing(true);
        }}
        title={
          editor.activeUnitKeys?.includes(unit.unitKey)
            ? "현재 베타에 반영된 수정 문장 · 눌러서 다시 수정"
            : "눌러서 바로 수정"
        }
        type="button"
      >
        {unit.text}
      </button>
    );
  }

  return (
    <span
      className={styles.inlineEditor}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <span className={styles.inlineEditorMeta}>
        <strong>{unitKindEditorLabel(unit.kind)}</strong>
        <small>{Array.from(draft).length}자</small>
      </span>
      <textarea
        aria-label={`${unitKindEditorLabel(unit.kind)} 수정 내용`}
        autoFocus
        maxLength={2_000}
        onChange={(event) => {
          setDraft(event.target.value);
          setMessage("");
          setIssues([]);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setDraft(unit.text);
            setEditing(false);
          }
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void save();
          }
        }}
        rows={unit.kind === "paragraph_sentence" ? 3 : 2}
        value={draft}
      />
      <span className={styles.inlineEditorHelp}>
        저장 즉시 7역할 재검수 후 베타에 반영되고, 이 문장의 사람 승인은 다시
        받아야 해요.
      </span>
      {message ? (
        <span className={styles.inlineEditorError}>{message}</span>
      ) : null}
      {issues.length ? (
        <ul className={styles.inlineEditorIssues}>
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
      <span className={styles.inlineEditorActions}>
        <button
          disabled={saving}
          onClick={() => {
            setDraft(unit.text);
            setEditing(false);
          }}
          type="button"
        >
          취소
        </button>
        <button
          disabled={saving || draft.trim() === unit.text}
          onClick={() => void save()}
          type="button"
        >
          <Check aria-hidden="true" size={14} strokeWidth={1.9} />
          {saving ? "검수하고 있어요" : "저장하고 베타 반영"}
        </button>
      </span>
    </span>
  );
}

function unitKindEditorLabel(kind: TraitMapGuideReviewUnit["kind"]) {
  return (
    {
      chapter_summary: "장 요약",
      chapter_title: "장 제목",
      check_question: "확인 질문",
      hero_summary: "상단 소개",
      paragraph_sentence: "본문 문장",
      reference_description: "근거 설명",
      reference_title: "근거 제목",
      section_title: "섹션 제목",
    }[kind] ?? "문장"
  );
}

function countActiveEditedUnits(
  editor: Readonly<{
    activeRevisionCount: number;
    activeUnitKeys?: readonly string[];
  }>,
  sessionEditedUnitKeys: readonly string[],
) {
  const initiallyActive = new Set(editor.activeUnitKeys ?? []);
  return (
    editor.activeRevisionCount +
    sessionEditedUnitKeys.filter((unitKey) => !initiallyActive.has(unitKey))
      .length
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
