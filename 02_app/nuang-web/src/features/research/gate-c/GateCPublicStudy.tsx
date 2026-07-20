"use client";

import {
  ArrowRight,
  Check,
  ChevronLeft,
  Copy,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import runnerStyles from "@/features/assessment/AssessmentRunner.module.css";
import {
  gateCAgeBandLabels,
  gateCAgeBands,
  gateCAssessmentExperienceLabels,
  gateCAssessmentExperiences,
  gateCLifeContextLabels,
  gateCLifeContexts,
  gateCPublicConsentVersion,
  type GateCAgeBand,
  type GateCAssessmentExperience,
  type GateCLifeContext,
  type GateCPublicResponseRecord,
  type GateCPublicSessionStart,
} from "@/features/research/gate-c/gate-c-public-contract";
import {
  isGateCFormId,
  type GateCResponseChoice,
  type GateCScaleValue,
  type GateCUnsureReason,
} from "@/features/research/gate-c/gate-c-study-contract";
import {
  gateCParticipantDefinitions,
  getGateCParticipantDefinition,
} from "@/features/research/gate-c/gate-c-study-fixture";
import { cn } from "@/lib/utils/cn";
import styles from "./GateCPublicStudy.module.css";

type Surface = "complete" | "questions" | "setup";
type DeleteState = "confirm" | "deleted" | "deleting" | "error" | "idle";

type NaturalResponse = {
  firstChoice: GateCResponseChoice;
  currentChoice: GateCResponseChoice;
  responseChanged: boolean;
  changeCount: number;
  firstAnsweredElapsedMs: number;
};

type ItemFeedback = {
  confusionFlag: boolean;
  confusionNote: string;
};

type CompletionReceipt = {
  participantCode: string;
  publicReceiptId: string;
  qualityStatus: "excluded" | "included";
};

const responseOptions: Array<{ label: string; value: GateCScaleValue }> = [
  { value: 1, label: "거의 그렇지 않아요" },
  { value: 2, label: "드문 편이에요" },
  { value: 3, label: "반반이에요" },
  { value: 4, label: "자주 그래요" },
  { value: 5, label: "거의 항상 그래요" },
];

const unsureReasons: Array<{ id: GateCUnsureReason; label: string }> = [
  { id: "NO_EXPERIENCE", label: "비슷한 경험이 거의 없어요" },
  { id: "CONTEXT_VARIES", label: "상황에 따라 많이 달라져요" },
  { id: "WORDING_UNCLEAR", label: "질문의 뜻이 분명하지 않아요" },
  { id: "PREFER_NOT_TO_ANSWER", label: "이 질문에는 답하고 싶지 않아요" },
];

export function GateCPublicStudy() {
  const router = useRouter();
  const questionShownAtRef = useRef(0);
  const studyStartedAtRef = useRef(0);
  const [surface, setSurface] = useState<Surface>("setup");
  const [ageBand, setAgeBand] = useState<GateCAgeBand | "">("");
  const [lifeContext, setLifeContext] = useState<GateCLifeContext | "">("");
  const [assessmentExperience, setAssessmentExperience] = useState<
    GateCAssessmentExperience | ""
  >("" as const);
  const [isAdult, setIsAdult] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [website, setWebsite] = useState("");
  const [session, setSession] = useState<GateCPublicSessionStart | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [naturalResponses, setNaturalResponses] = useState<
    Record<string, NaturalResponse>
  >({});
  const [feedback, setFeedback] = useState<Record<string, ItemFeedback>>({});
  const [unsureOpen, setUnsureOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [receipt, setReceipt] = useState<CompletionReceipt | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");
  const [copied, setCopied] = useState(false);

  const definition =
    session && isGateCFormId(session.formId)
      ? getGateCParticipantDefinition(session.formId)
      : gateCParticipantDefinitions.FORM_A;
  const currentQuestion = definition.items[currentQuestionIndex];
  const currentResponse = currentQuestion
    ? naturalResponses[currentQuestion.studyItemId]
    : undefined;
  const currentFeedback = currentQuestion
    ? (feedback[currentQuestion.studyItemId] ?? {
        confusionFlag: false,
        confusionNote: "",
      })
    : { confusionFlag: false, confusionNote: "" };
  const canStart =
    Boolean(ageBand) &&
    Boolean(lifeContext) &&
    Boolean(assessmentExperience) &&
    isAdult &&
    consentAccepted;
  const progress = Math.round(
    ((currentQuestionIndex + 1) / definition.items.length) * 100,
  );

  async function startStudy() {
    if (!canStart || starting) return;
    setStarting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/research/gate-c/sessions", {
        body: JSON.stringify({
          ageBand,
          assessmentExperience,
          consentAccepted: true,
          consentVersion: gateCPublicConsentVersion,
          isAdult: true,
          lifeContext,
          website,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        (GateCPublicSessionStart & { ok: true }) | null;
      if (!response.ok || !body?.ok || !isGateCFormId(body.formId)) {
        throw new Error("start_failed");
      }

      setSession(body);
      studyStartedAtRef.current = readClock();
      questionShownAtRef.current = readClock();
      setSurface("questions");
    } catch {
      setErrorMessage(
        "지금은 문항을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      );
    } finally {
      setStarting(false);
    }
  }

  function choose(choice: GateCResponseChoice) {
    if (!currentQuestion) return;
    setUnsureOpen(false);
    setNaturalResponses((current) => {
      const existing = current[currentQuestion.studyItemId];
      const answeredAt = readClock();
      const nextResponse: NaturalResponse = existing
        ? {
            ...existing,
            changeCount:
              existing.changeCount +
              (isSameChoice(existing.currentChoice, choice) ? 0 : 1),
            currentChoice: choice,
            responseChanged:
              existing.responseChanged ||
              !isSameChoice(existing.firstChoice, choice),
          }
        : {
            changeCount: 0,
            currentChoice: choice,
            firstAnsweredElapsedMs: Math.max(
              0,
              answeredAt - (questionShownAtRef.current || answeredAt),
            ),
            firstChoice: choice,
            responseChanged: false,
          };

      return { ...current, [currentQuestion.studyItemId]: nextResponse };
    });
  }

  function updateFeedback(patch: Partial<ItemFeedback>) {
    if (!currentQuestion) return;
    setFeedback((current) => ({
      ...current,
      [currentQuestion.studyItemId]: {
        ...(current[currentQuestion.studyItemId] ?? {
          confusionFlag: false,
          confusionNote: "",
        }),
        ...patch,
      },
    }));
  }

  function goPrevious() {
    if (currentQuestionIndex === 0) return;
    setCurrentQuestionIndex((current) => current - 1);
    questionShownAtRef.current = readClock();
    setUnsureOpen(false);
  }

  function goNext() {
    if (!currentResponse || submitting) return;
    if (currentQuestionIndex < definition.items.length - 1) {
      setCurrentQuestionIndex((current) => current + 1);
      questionShownAtRef.current = readClock();
      setUnsureOpen(false);
      return;
    }
    const clientDurationMs = Math.max(
      0,
      readClock() - studyStartedAtRef.current,
    );
    void submitStudy(clientDurationMs);
  }

  async function submitStudy(clientDurationMs: number) {
    if (!session) return;
    const responses = buildSubmissionResponses();
    if (responses.length !== definition.items.length) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/research/gate-c/sessions/${session.sessionId}/complete`,
        {
          body: JSON.stringify({
            clientDurationMs,
            responses,
            sessionToken: session.sessionToken,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const body = (await response.json().catch(() => null)) as
        (CompletionReceipt & { ok: true }) | null;
      if (!response.ok || !body?.ok) throw new Error("submit_failed");

      setReceipt(body);
      setSurface("complete");
    } catch {
      setErrorMessage(
        "응답을 저장하지 못했어요. 답은 그대로 남아 있으니 다시 눌러 주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function buildSubmissionResponses(): GateCPublicResponseRecord[] {
    return definition.items.flatMap((item) => {
      const naturalResponse = naturalResponses[item.studyItemId];
      if (!naturalResponse) return [];
      const itemFeedback = feedback[item.studyItemId] ?? {
        confusionFlag: false,
        confusionNote: "",
      };
      return [
        {
          changeCount: naturalResponse.changeCount,
          confusionFlag: itemFeedback.confusionFlag,
          confusionNote: itemFeedback.confusionNote.trim(),
          finalChoice: naturalResponse.currentChoice,
          firstAnswerElapsedMs: naturalResponse.firstAnsweredElapsedMs,
          firstChoice: naturalResponse.firstChoice,
          orderIndex: item.orderIndex,
          responseChanged: naturalResponse.responseChanged,
          studyItemId: item.studyItemId,
          unsureReason:
            naturalResponse.currentChoice.kind === "unsure"
              ? naturalResponse.currentChoice.reason
              : null,
        },
      ];
    });
  }

  async function copyDeletionInfo() {
    if (!session || !receipt) return;
    const text = [
      `뉴앙 문항 확인 참여번호: ${receipt.participantCode}`,
      `보관 번호: ${receipt.publicReceiptId}`,
      `삭제 코드: ${session.withdrawalCode}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  async function deleteSubmission() {
    if (!session || !receipt || deleteState === "deleting") return;
    setDeleteState("deleting");
    const response = await fetch("/api/research/gate-c/submissions", {
      body: JSON.stringify({
        publicReceiptId: receipt.publicReceiptId,
        withdrawalCode: session.withdrawalCode,
      }),
      headers: { "content-type": "application/json" },
      method: "DELETE",
    });
    setDeleteState(response.ok ? "deleted" : "error");
  }

  if (surface === "setup") {
    return (
      <main className={styles.publicPage}>
        <section className={styles.intro}>
          <div className={styles.brandRow}>
            <span>NUANG RESEARCH</span>
            <span>약 4분 · 12개 질문</span>
          </div>
          <h1>뉴앙의 질문을 더 분명하게 만드는 데 함께해 주세요</h1>
          <p className={styles.introCopy}>
            질문을 읽고 평소 모습에 가까운 답을 골라 주세요. 어떤 질문이
            헷갈리는지 확인해 뉴앙의 성향 검사를 개선합니다.
          </p>

          <div className={styles.privacyPanel}>
            <ShieldCheck aria-hidden="true" size={21} strokeWidth={1.7} />
            <div>
              <strong>이름과 연락처는 받지 않아요</strong>
              <p>
                참여번호는 자동으로 만들어집니다. 아래 정보는 질문이 다양한 생활
                모습에서도 자연스럽게 읽히는지 통계로 확인할 때만 사용해요.
              </p>
            </div>
          </div>

          <div className={styles.formFields}>
            <StudySelect
              label="연령대"
              onChange={(value) => setAgeBand(value as GateCAgeBand)}
              options={gateCAgeBands.map((value) => ({
                label: gateCAgeBandLabels[value],
                value,
              }))}
              placeholder="연령대를 선택해 주세요"
              value={ageBand}
            />
            <StudySelect
              label="요즘의 생활 모습"
              onChange={(value) => setLifeContext(value as GateCLifeContext)}
              options={gateCLifeContexts.map((value) => ({
                label: gateCLifeContextLabels[value],
                value,
              }))}
              placeholder="가장 가까운 모습을 선택해 주세요"
              value={lifeContext}
            />
            <StudySelect
              label="성향검사 경험"
              onChange={(value) =>
                setAssessmentExperience(value as GateCAssessmentExperience)
              }
              options={gateCAssessmentExperiences.map((value) => ({
                label: gateCAssessmentExperienceLabels[value],
                value,
              }))}
              placeholder="경험 정도를 선택해 주세요"
              value={assessmentExperience}
            />
            <label aria-hidden="true" className={styles.honeypot}>
              웹사이트
              <input
                autoComplete="off"
                onChange={(event) => setWebsite(event.target.value)}
                tabIndex={-1}
                value={website}
              />
            </label>
          </div>

          <div className={styles.consentList}>
            <label>
              <input
                checked={isAdult}
                onChange={(event) => setIsAdult(event.target.checked)}
                type="checkbox"
              />
              <span>만 18세 이상이에요.</span>
            </label>
            <label>
              <input
                checked={consentAccepted}
                onChange={(event) => setConsentAccepted(event.target.checked)}
                type="checkbox"
              />
              <span>
                참여는 자발적이며 제출 전 언제든 그만둘 수 있어요. 제출한 익명
                기록은 최대 1년 보관된 뒤 삭제되는 것에 동의해요.
              </span>
            </label>
          </div>

          {errorMessage ? (
            <p aria-live="polite" className={styles.errorMessage}>
              {errorMessage}
            </p>
          ) : null}
          <button
            className={styles.startButton}
            disabled={!canStart || starting}
            onClick={startStudy}
            type="button"
          >
            {starting ? "질문을 준비하고 있어요" : "질문 확인 시작하기"}
            {!starting ? (
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
            ) : null}
          </button>
          <p className={styles.boundaryCopy}>
            이 참여 화면은 성향 결과를 제공하지 않으며, 고객용 검사 점수를
            만들지 않아요.
          </p>
        </section>
      </main>
    );
  }

  if (surface === "complete" && receipt && session) {
    return (
      <main className={runnerStyles.runner}>
        <section className={styles.completeStage}>
          <span aria-hidden="true" className={styles.successMark}>
            <Check size={27} strokeWidth={1.8} />
          </span>
          <p className={styles.completeEyebrow}>참여 완료</p>
          <h1>뉴앙의 질문이 한층 더 분명해졌어요</h1>
          <p className={styles.completeCopy}>
            응답은 문항별 혼란, 답 변경, 소요 시간 통계에 자동 반영됐어요.
            충분한 기록과 검수를 거친 개선안만 실제 검사에 반영합니다.
          </p>
          <div className={styles.participantCode}>
            <span>내 참여번호</span>
            <strong>{receipt.participantCode}</strong>
          </div>

          <button
            className={styles.homeButton}
            onClick={() => router.push("/")}
            type="button"
          >
            뉴앙 둘러보기
            <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
          </button>

          <details className={styles.storageDetails}>
            <summary>응답 보관·삭제 안내</summary>
            <div className={styles.storageBody}>
              <p>
                익명 기록은 최대 1년 보관됩니다. 지금 삭제하거나, 아래 정보를
                복사해 고객 문의 시 삭제를 요청할 수 있어요.
              </p>
              {deleteState === "deleted" ? (
                <p className={styles.deletedMessage}>
                  응답과 문항별 기록을 모두 삭제했어요.
                </p>
              ) : (
                <>
                  <button onClick={copyDeletionInfo} type="button">
                    <Copy aria-hidden="true" size={16} strokeWidth={1.7} />
                    {copied ? "삭제 정보를 복사했어요" : "삭제 정보 복사"}
                  </button>
                  {deleteState === "confirm" ? (
                    <div className={styles.deleteConfirm}>
                      <p>제출한 응답을 바로 삭제할까요?</p>
                      <button
                        onClick={() => setDeleteState("idle")}
                        type="button"
                      >
                        취소
                      </button>
                      <button onClick={deleteSubmission} type="button">
                        삭제하기
                      </button>
                    </div>
                  ) : (
                    <button
                      className={styles.deleteButton}
                      disabled={deleteState === "deleting"}
                      onClick={() => setDeleteState("confirm")}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={16} strokeWidth={1.7} />
                      {deleteState === "deleting"
                        ? "삭제하고 있어요"
                        : "내 응답 삭제"}
                    </button>
                  )}
                  {deleteState === "error" ? (
                    <p className={styles.errorMessage}>
                      삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </details>
        </section>
      </main>
    );
  }

  return (
    <main className={runnerStyles.runner}>
      <header className={runnerStyles.appBar}>
        <button
          aria-label="참여 그만하기"
          className={runnerStyles.closeButton}
          onClick={() => router.push("/")}
          type="button"
        >
          <X aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
        <p className={runnerStyles.title}>뉴앙 질문 확인</p>
        <p className={runnerStyles.count}>
          {currentQuestionIndex + 1} / {definition.items.length}
        </p>
      </header>
      <div className={runnerStyles.progressWrap}>
        <div
          aria-label="질문 확인 진행률"
          aria-valuemax={definition.items.length}
          aria-valuemin={1}
          aria-valuenow={currentQuestionIndex + 1}
          className={runnerStyles.progress}
          role="progressbar"
        >
          <span
            className={runnerStyles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <section className={runnerStyles.mainContent}>
        <p className={styles.answerGuide}>
          최근 6개월의 평소 모습을 떠올려 답해 주세요.
        </p>
        <div
          className={runnerStyles.questionRegion}
          key={currentQuestion.studyItemId}
        >
          <p className={runnerStyles.context}>{currentQuestion.contextLabel}</p>
          <h1 className={runnerStyles.question}>
            {currentQuestion.promptText}
          </h1>
        </div>

        <fieldset className={runnerStyles.responses}>
          <legend className={runnerStyles.legend}>이럴 때 내 모습은?</legend>
          <div className={runnerStyles.options}>
            {responseOptions.map((option) => {
              const selected =
                currentResponse?.currentChoice.kind === "scale" &&
                currentResponse.currentChoice.value === option.value;
              return (
                <label
                  className={cn(
                    runnerStyles.option,
                    selected && runnerStyles.optionSelected,
                  )}
                  key={option.value}
                >
                  <input
                    checked={selected}
                    className={runnerStyles.radio}
                    name={`response-${currentQuestion.studyItemId}`}
                    onChange={() =>
                      choose({ kind: "scale", value: option.value })
                    }
                    type="radio"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className={styles.unsureArea}>
          <button
            aria-expanded={unsureOpen}
            className={styles.quietButton}
            onClick={() => setUnsureOpen((current) => !current)}
            type="button"
          >
            {currentResponse?.currentChoice.kind === "unsure"
              ? responseChoiceLabel(currentResponse.currentChoice)
              : "이 상황은 답하기 어려워요"}
          </button>
          {unsureOpen ? (
            <div className={styles.unsureReasons}>
              {unsureReasons.map((reason) => (
                <button
                  aria-pressed={
                    currentResponse?.currentChoice.kind === "unsure" &&
                    currentResponse.currentChoice.reason === reason.id
                  }
                  key={reason.id}
                  onClick={() => choose({ kind: "unsure", reason: reason.id })}
                  type="button"
                >
                  {reason.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.feedbackArea}>
          <button
            aria-expanded={currentFeedback.confusionFlag}
            aria-pressed={currentFeedback.confusionFlag}
            className={styles.feedbackToggle}
            onClick={() =>
              updateFeedback({
                confusionFlag: !currentFeedback.confusionFlag,
                confusionNote: currentFeedback.confusionFlag
                  ? ""
                  : currentFeedback.confusionNote,
              })
            }
            type="button"
          >
            {currentFeedback.confusionFlag
              ? "헷갈림 표시됨"
              : "이 질문이 헷갈렸어요"}
          </button>
          {currentFeedback.confusionFlag ? (
            <label>
              <span>어떤 부분이 헷갈렸나요? · 선택</span>
              <textarea
                maxLength={300}
                onChange={(event) =>
                  updateFeedback({ confusionNote: event.target.value })
                }
                placeholder="짧게 알려주면 문장을 개선하는 데 도움이 돼요."
                rows={3}
                value={currentFeedback.confusionNote}
              />
            </label>
          ) : null}
        </div>

        {errorMessage ? (
          <p aria-live="polite" className={styles.errorMessage}>
            {errorMessage}
          </p>
        ) : null}
      </section>

      <footer className={runnerStyles.dock}>
        <button
          aria-label="이전 질문"
          className={runnerStyles.previousButton}
          disabled={currentQuestionIndex === 0 || submitting}
          onClick={goPrevious}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
        <button
          className={runnerStyles.nextButton}
          disabled={!currentResponse || submitting}
          onClick={goNext}
          type="button"
        >
          {submitting
            ? "안전하게 저장하고 있어요"
            : currentQuestionIndex === definition.items.length - 1
              ? "응답 제출하기"
              : "다음"}
          {!submitting ? (
            <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
          ) : null}
        </button>
      </footer>
    </main>
  );
}

function StudySelect({
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  value: string;
}) {
  return (
    <label className={styles.selectField}>
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        <option disabled value="">
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function isSameChoice(a: GateCResponseChoice, b: GateCResponseChoice) {
  if (a.kind !== b.kind) return false;
  return a.kind === "scale"
    ? a.value === (b as Extract<GateCResponseChoice, { kind: "scale" }>).value
    : a.reason ===
        (b as Extract<GateCResponseChoice, { kind: "unsure" }>).reason;
}

function responseChoiceLabel(choice: GateCResponseChoice) {
  if (choice.kind === "scale") {
    return responseOptions.find((option) => option.value === choice.value)
      ?.label;
  }
  return unsureReasons.find((reason) => reason.id === choice.reason)?.label;
}

function readClock() {
  return Date.now();
}
