"use client";

import { ArrowRight, Check, Copy, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  AssessmentBottomSheet,
  AssessmentQuestionDock,
  AssessmentQuestionGuideButton,
  AssessmentQuestionHeader,
  AssessmentScaleResponseOptions,
  AssessmentUnsureControl,
  AssessmentUnsureSheet,
  useAssessmentQuestionScroll,
} from "@/features/assessment/AssessmentQuestionControls";
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
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
  useAssessmentQuestionScroll(
    surface === "questions" ? currentQuestion.studyItemId : null,
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
      <AssessmentQuestionHeader
        closeLabel="참여 그만하기"
        countLabel={`전체 ${definition.items.length}개 중 ${currentQuestionIndex + 1}번째 질문`}
        current={currentQuestionIndex + 1}
        onClose={() => setExitOpen(true)}
        progressLabel="질문 확인 진행률"
        title="뉴앙 질문 확인"
        total={definition.items.length}
      />

      <section className={runnerStyles.mainContent}>
        <AssessmentQuestionGuideButton onClick={() => setHelpOpen(true)}>
          답하는 기준 · 최근 6개월의 평소 모습
        </AssessmentQuestionGuideButton>
        <div
          className={runnerStyles.questionRegion}
          key={currentQuestion.studyItemId}
        >
          <p className={runnerStyles.context}>{currentQuestion.contextLabel}</p>
          <h1 className={runnerStyles.question}>
            {currentQuestion.promptText}
          </h1>
        </div>

        <AssessmentScaleResponseOptions
          guide="최근 6개월의 평소 모습을 떠올리며, 비슷한 상황에서 이 모습이 얼마나 자주 나타나는지 하나 선택해 주세요."
          name={`response-${currentQuestion.studyItemId}`}
          onChange={(value) => choose({ kind: "scale", value })}
          selectedValue={
            currentResponse?.currentChoice.kind === "scale"
              ? currentResponse.currentChoice.value
              : undefined
          }
        />

        <AssessmentUnsureControl
          onOpen={() => setUnsureOpen(true)}
          selectedReason={
            currentResponse?.currentChoice.kind === "unsure"
              ? currentResponse.currentChoice.reason
              : undefined
          }
        />

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

      <AssessmentQuestionDock
        nextDisabled={!currentResponse || submitting}
        nextLabel={
          submitting
            ? "안전하게 저장하고 있어요"
            : currentQuestionIndex === definition.items.length - 1
              ? "응답 제출하기"
              : "다음"
        }
        onNext={goNext}
        onPrevious={goPrevious}
        previousDisabled={currentQuestionIndex === 0 || submitting}
      />

      {helpOpen ? (
        <AssessmentBottomSheet
          copy="특별했던 한 번보다 최근 6개월의 평소 모습을 떠올리며, 비슷한 상황에서 문장 속 모습이 얼마나 자주 나타나는지 답해 주세요."
          onClose={() => setHelpOpen(false)}
          title="어떤 모습을 떠올리면 될까요?"
        >
          <p className={runnerStyles.sheetNote}>
            비슷한 경험이 거의 없다면 ‘이 상황은 답하기 어려워요’를 선택해도
            괜찮아요.
          </p>
          <div className={runnerStyles.sheetActions}>
            <button
              className={runnerStyles.sheetAction}
              onClick={() => setHelpOpen(false)}
              type="button"
            >
              이해했어요
            </button>
          </div>
        </AssessmentBottomSheet>
      ) : null}

      {unsureOpen ? (
        <AssessmentUnsureSheet
          onClose={() => setUnsureOpen(false)}
          onSelect={(reason) => {
            setUnsureOpen(false);
            choose({ kind: "unsure", reason });
          }}
          selectedReason={
            currentResponse?.currentChoice.kind === "unsure"
              ? currentResponse.currentChoice.reason
              : undefined
          }
        />
      ) : null}

      {exitOpen ? (
        <AssessmentBottomSheet
          copy="지금 나가면 이번 참여는 제출되지 않고 뉴앙 앱 홈으로 이동해요. 현재 뉴앙은 개발 중이라 홈에서 아직 완성되지 않은 화면과 기능을 만날 수 있어요."
          onClose={() => setExitOpen(false)}
          title="참여를 그만둘까요?"
        >
          <div className={runnerStyles.sheetActions}>
            <button
              className={runnerStyles.sheetAction}
              onClick={() => setExitOpen(false)}
              type="button"
            >
              계속 참여하기
            </button>
            <button
              className={cn(
                runnerStyles.sheetAction,
                runnerStyles.sheetActionSecondary,
              )}
              onClick={() => router.push("/home")}
              type="button"
            >
              홈으로 나가기
            </button>
          </div>
        </AssessmentBottomSheet>
      ) : null}
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

function readClock() {
  return Date.now();
}
