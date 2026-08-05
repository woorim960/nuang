"use client";

import {
  ArrowRight,
  Check,
  Copy,
  Gift,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  type PrivateContactPayload,
  privateContactConsentVersion,
  privateEmailRegistrationVersion,
} from "@/features/account/private-contact-contract";
import {
  AssessmentBottomSheet,
  AssessmentQuestionContent,
  AssessmentQuestionDock,
  AssessmentQuestionHeader,
  AssessmentQuestionPrompt,
  AssessmentQuestionScreen,
  AssessmentScaleResponseOptions,
  AssessmentSheetAction,
  AssessmentSheetActions,
  AssessmentUnsureControl,
  AssessmentUnsureSheet,
  useAssessmentQuestionScroll,
} from "@/features/assessment/AssessmentQuestionControls";
import runnerStyles from "@/features/assessment/AssessmentQuestionSurface.module.css";
import {
  gateCAgeBandLabels,
  gateCAgeBands,
  gateCAssessmentExperienceLabels,
  gateCAssessmentExperiences,
  gateCLifeContextLabels,
  gateCLifeContexts,
  gateCPublicConsentVersion,
  gateCReviewRewardCampaign,
  type GateCReviewRewardCampaign,
  type GateCAgeBand,
  type GateCAssessmentExperience,
  type GateCLifeContext,
  type GateCPublicResponseRecord,
  type GateCPublicSessionStart,
} from "@/features/research/gate-c/gate-c-public-contract";
import {
  gateCRewardEntryConsentVersion,
  type GateCRewardContactMethod,
} from "@/features/research/gate-c/gate-c-reward-entry-contract";
import {
  isGateCFormId,
  type GateCResponseChoice,
} from "@/features/research/gate-c/gate-c-study-contract";
import { gateCParticipantDefinitions } from "@/features/research/gate-c/gate-c-study-fixture";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
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

export function GateCPublicStudy({
  rewardCampaign = gateCReviewRewardCampaign,
}: {
  rewardCampaign?: GateCReviewRewardCampaign;
}) {
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
  const [exitOpen, setExitOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [receipt, setReceipt] = useState<CompletionReceipt | null>(null);
  const [restoredWithdrawalCode, setRestoredWithdrawalCode] = useState<
    string | null
  >(null);
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");
  const [copied, setCopied] = useState(false);

  const definition =
    session?.items.length === 12
      ? { items: session.items }
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

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("reward") !== "resume") return;

    let restoreTimer: number | undefined;
    try {
      const value = window.sessionStorage.getItem(gateCRewardResumeStorageKey);
      const restored = value
        ? (JSON.parse(value) as {
            receipt?: CompletionReceipt;
            withdrawalCode?: string;
          })
        : null;
      if (
        !restored?.receipt?.participantCode ||
        !restored.receipt.publicReceiptId ||
        !restored.withdrawalCode
      ) {
        return;
      }
      restoreTimer = window.setTimeout(() => {
        setReceipt(restored.receipt ?? null);
        setRestoredWithdrawalCode(restored.withdrawalCode ?? null);
        setSurface("complete");
      }, 0);
    } catch {
      window.sessionStorage.removeItem(gateCRewardResumeStorageKey);
    }

    return () => {
      if (restoreTimer !== undefined) window.clearTimeout(restoreTimer);
    };
  }, []);

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
      if (
        !response.ok ||
        !body?.ok ||
        !isGateCFormId(body.formId) ||
        body.items.length !== 12
      ) {
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
            assignmentProof: session.assignmentProof,
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
      setRestoredWithdrawalCode(session.withdrawalCode);
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
    const withdrawalCode = session?.withdrawalCode ?? restoredWithdrawalCode;
    if (!withdrawalCode || !receipt) return;
    const text = [
      `뉴앙 문항 확인 참여번호: ${receipt.participantCode}`,
      `보관 번호: ${receipt.publicReceiptId}`,
      `삭제 코드: ${withdrawalCode}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  async function deleteSubmission() {
    const withdrawalCode = session?.withdrawalCode ?? restoredWithdrawalCode;
    if (!withdrawalCode || !receipt || deleteState === "deleting") return;
    setDeleteState("deleting");
    const response = await fetch("/api/research/gate-c/submissions", {
      body: JSON.stringify({
        publicReceiptId: receipt.publicReceiptId,
        withdrawalCode,
      }),
      headers: { "content-type": "application/json" },
      method: "DELETE",
    });
    setDeleteState(response.ok ? "deleted" : "error");
  }

  if (surface === "setup") {
    return (
      <CommunityScreenShell
        backHref="/home"
        backLabel="뉴앙 홈으로 돌아가기"
        title="검사 질문 리뷰"
      >
        <form
          className={styles.publicPage}
          onSubmit={(event) => {
            event.preventDefault();
            void startStudy();
          }}
        >
          <section className={styles.intro}>
            <div className={styles.brandRow}>
              <strong>뉴앙 연구소</strong>
              <span>약 4분 · 12개 질문</span>
            </div>
            <h2>뉴앙의 질문을 더 분명하게 만드는 데 함께해 주세요</h2>
            <p className={styles.introCopy}>
              질문을 읽고 평소 모습에 가까운 답을 골라 주세요. 어떤 질문이
              헷갈리는지 확인해 뉴앙의 성향 검사를 개선합니다.
            </p>

            <div className={styles.privacyPanel}>
              <span aria-hidden="true" className={styles.noteIcon}>
                <ShieldCheck size={19} strokeWidth={1.7} />
              </span>
              <div>
                <strong>질문 리뷰에는 이름과 연락처가 필요 없어요</strong>
                <p>
                  이벤트 응모는 참여 완료 후 뉴앙 회원의 비공개 프로필 연락처로
                  진행해요.
                </p>
              </div>
            </div>

            <div className={styles.rewardPanel}>
              <span aria-hidden="true" className={styles.noteIcon}>
                <Gift size={19} strokeWidth={1.65} />
              </span>
              <div>
                <strong>리뷰 이벤트</strong>
                <p>
                  참여 후 리뷰를 남긴 분 중 {rewardCampaign.winnerCount}명을
                  추첨해 {rewardCampaign.prize}을 드려요.
                </p>
                <RewardCampaignStatus campaign={rewardCampaign} />
              </div>
            </div>
          </section>

          <section
            aria-labelledby="research-participant-heading"
            className={styles.setupSection}
          >
            <header className={styles.sectionHeading}>
              <small>참여 정보</small>
              <h2 id="research-participant-heading">
                참여 전 간단히 알려주세요
              </h2>
              <p>개인을 알아볼 수 없는 범위에서 문항 분석에만 사용해요.</p>
            </header>
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
          </section>

          <section
            aria-labelledby="research-consent-heading"
            className={styles.consentSection}
          >
            <header className={styles.sectionHeading}>
              <small>참여 동의</small>
              <h2 id="research-consent-heading">마지막으로 확인해 주세요</h2>
              <p>두 항목을 확인하면 질문 리뷰를 시작할 수 있어요.</p>
            </header>
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
          </section>

          <footer className={styles.actionBar}>
            <p className={styles.boundaryCopy}>
              성향 결과나 검사 점수를 만드는 참여가 아니에요.
            </p>
            <button
              className={styles.startButton}
              disabled={!canStart || starting}
              type="submit"
            >
              {starting ? "질문을 준비하고 있어요" : "질문 확인 시작하기"}
              {!starting ? (
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
              ) : null}
            </button>
          </footer>
        </form>
      </CommunityScreenShell>
    );
  }

  if (surface === "complete" && receipt) {
    return (
      <main className={runnerStyles.runner}>
        <section className={styles.completeStage}>
          <span aria-hidden="true" className={styles.successMark}>
            <Check size={27} strokeWidth={1.8} />
          </span>
          <h1>참여가 완료됐어요</h1>
          <p className={styles.impactCopy}>
            남겨주신 답변과 리뷰는 문항을 더 분명하게 다듬고, 앞으로 뉴앙코드
            성향 분석의 정밀도와 정확도를 높이는 데 반영됩니다.
          </p>
          <div className={styles.participantCode}>
            <span>내 참여번호</span>
            <strong>{receipt.participantCode}</strong>
          </div>

          <ResultAnnouncementGuide campaign={rewardCampaign} />

          <RewardEntryPanel
            campaign={rewardCampaign}
            onLogin={() => {
              const withdrawalCode =
                session?.withdrawalCode ?? restoredWithdrawalCode;
              if (!withdrawalCode) return;
              window.sessionStorage.setItem(
                gateCRewardResumeStorageKey,
                JSON.stringify({ receipt, withdrawalCode }),
              );
              router.push(
                `/login?next=${encodeURIComponent("/research?reward=resume")}&reason=event`,
              );
            }}
            receipt={receipt}
          />

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
    <AssessmentQuestionScreen>
      <AssessmentQuestionHeader
        closeLabel="참여 그만하기"
        countLabel={`전체 ${definition.items.length}개 중 ${currentQuestionIndex + 1}번째 질문`}
        current={currentQuestionIndex + 1}
        onClose={() => setExitOpen(true)}
        progressLabel="질문 확인 진행률"
        title="뉴앙 질문 확인"
        total={definition.items.length}
      />

      <AssessmentQuestionContent>
        <AssessmentQuestionPrompt
          contextLabel={currentQuestion.contextLabel}
          key={currentQuestion.studyItemId}
          text={currentQuestion.promptText}
        />

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
              <span>헷갈린 부분 (선택)</span>
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
      </AssessmentQuestionContent>

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
          copy="지금 나가면 이번 참여는 제출되지 않고 뉴앙 홈으로 이동해요."
          onClose={() => setExitOpen(false)}
          title="참여를 그만둘까요?"
        >
          <AssessmentSheetActions>
            <AssessmentSheetAction onClick={() => setExitOpen(false)}>
              계속 참여하기
            </AssessmentSheetAction>
            <AssessmentSheetAction
              onClick={() => router.push("/home")}
              variant="secondary"
            >
              홈으로 나가기
            </AssessmentSheetAction>
          </AssessmentSheetActions>
        </AssessmentBottomSheet>
      ) : null}
    </AssessmentQuestionScreen>
  );
}

function RewardCampaignStatus({
  campaign,
}: {
  campaign: GateCReviewRewardCampaign;
}) {
  if (campaign.status === "details_pending") {
    return (
      <small>
        응모 기간과 당첨 안내 방법은 운영 확정 후 이 화면에서 안내합니다.
      </small>
    );
  }

  if (campaign.status === "upcoming") {
    return <small>{campaign.periodLabel}에 진행합니다.</small>;
  }

  if (campaign.status === "closed") {
    return (
      <small>
        응모가 마감되었습니다. 당첨 안내일은 {campaign.announcementLabel}입니다.
      </small>
    );
  }

  return (
    <small>
      {campaign.periodLabel} · 참여를 마친 뒤 별도로 응모할 수 있습니다.
    </small>
  );
}

function ResultAnnouncementGuide({
  campaign,
}: {
  campaign: GateCReviewRewardCampaign;
}) {
  const announcement = campaign.announcementLabel ?? "운영 일정 확정 후 안내";

  return (
    <section
      aria-labelledby="result-announcement-heading"
      className={styles.resultAnnouncementGuide}
    >
      <div className={styles.resultAnnouncementHeading}>
        <span aria-hidden="true">
          <Gift size={18} strokeWidth={1.7} />
        </span>
        <div>
          <h2 id="result-announcement-heading">이벤트 결과 안내</h2>
          <p>응모했다면 아래 일정과 연락 방법으로 결과를 확인할 수 있어요.</p>
        </div>
      </div>
      <dl className={styles.resultAnnouncementList}>
        <div>
          <dt>결과 발표</dt>
          <dd>{announcement}</dd>
        </div>
        <div>
          <dt>안내받을 곳</dt>
          <dd>응모할 때 선택한 이메일 또는 휴대전화</dd>
        </div>
        <div>
          <dt>안내 대상</dt>
          <dd>당첨자에게만 개별 안내</dd>
        </div>
      </dl>
      <p className={styles.resultAnnouncementNotice}>
        휴대전화번호 인증은 아직 준비 중이에요. 휴대전화를 선택하면 입력한
        번호를 그대로 사용하니 오타가 없는지 꼭 확인해 주세요.
      </p>
    </section>
  );
}

function RewardEntryPanel({
  campaign,
  onLogin,
  receipt,
}: {
  campaign: GateCReviewRewardCampaign;
  onLogin: () => void;
  receipt: CompletionReceipt;
}) {
  const [email, setEmail] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [selectedMethod, setSelectedMethod] =
    useState<GateCRewardContactMethod>("email");
  const [entryContactMethod, setEntryContactMethod] =
    useState<GateCRewardContactMethod | null>(null);
  const [state, setState] = useState<
    | "editing"
    | "entering"
    | "error"
    | "idle"
    | "loading"
    | "saving_contact"
    | "success"
    | "unauthenticated"
    | "withdrawing"
    | "withdrawn"
  >("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [profileContact, setProfileContact] =
    useState<PrivateContactPayload | null>(null);

  useEffect(() => {
    if (!campaign.entryEnabled) return;
    let active = true;
    void fetch("/api/research/gate-c/reward-entries", {
      cache: "no-store",
    })
      .then(async (response) => ({
        body: (await response.json().catch(() => null)) as {
          contact?: PrivateContactPayload;
          entry?: {
            contactMethod?: GateCRewardContactMethod;
            status?: string;
          } | null;
        } | null,
        response,
      }))
      .then(({ body, response }) => {
        if (!active) return;
        if (response.status === 401) {
          setState("unauthenticated");
          return;
        }
        if (!response.ok || !body?.contact) {
          setErrorMessage(
            "이벤트 응모 정보를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.",
          );
          setState("error");
          return;
        }
        setProfileContact(body.contact);
        const preferredMethod = choosePreferredContactMethod(
          body.contact,
          body.entry?.contactMethod,
        );
        setSelectedMethod(preferredMethod);
        setEntryContactMethod(body.entry?.contactMethod ?? null);
        setState(
          body.entry &&
            ["contacted", "entered", "winner"].includes(body.entry.status ?? "")
            ? "success"
            : "idle",
        );
      })
      .catch(() => {
        if (!active) return;
        setErrorMessage(
          "이벤트 응모 정보를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        );
        setState("error");
      });
    return () => {
      active = false;
    };
  }, [campaign.entryEnabled]);

  if (!campaign.entryEnabled) {
    return null;
  }

  const contactIsSaved =
    selectedMethod === "email"
      ? Boolean(profileContact?.hasEmail)
      : Boolean(profileContact?.hasMobilePhone);
  const needsContact = !contactIsSaved || state === "editing";
  const mobileDigits = mobilePhone.replace(/\D/g, "");
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canEnter =
    (needsContact
      ? selectedMethod === "email"
        ? emailIsValid
        : mobileDigits.length === 11
      : contactIsSaved) &&
    state !== "entering" &&
    state !== "saving_contact";

  async function enterCampaign() {
    if (!canEnter) return;
    setState("entering");
    setErrorMessage("");

    if (needsContact) {
      setState("saving_contact");
      const contactResponse = await fetch("/api/me/contact", {
        body: JSON.stringify(
          selectedMethod === "email"
            ? {
                consentVersion: privateEmailRegistrationVersion,
                email: email.trim(),
                source: "event_entry",
              }
            : {
                consentVersion: privateContactConsentVersion,
                mobilePhone,
                source: "event_entry",
              },
        ),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const contactBody = (await contactResponse.json().catch(() => null)) as {
        contact?: PrivateContactPayload;
        code?: string;
        message?: string;
        ok?: boolean;
      } | null;
      if (!contactResponse.ok || !contactBody?.contact) {
        setErrorMessage(
          contactBody?.message ??
            (selectedMethod === "email"
              ? "이메일을 저장하지 못했어요. 주소를 다시 확인해 주세요."
              : "휴대전화번호를 저장하지 못했어요. 번호를 다시 확인해 주세요."),
        );
        setState("error");
        return;
      }
      setProfileContact(contactBody.contact);
      setState("entering");
    }

    const response = await fetch("/api/research/gate-c/reward-entries", {
      body: JSON.stringify({
        consentAccepted: true,
        consentVersion: gateCRewardEntryConsentVersion,
        contactMethod: selectedMethod,
        participantCode: receipt.participantCode,
        publicReceiptId: receipt.publicReceiptId,
        website: "",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const body = (await response.json().catch(() => null)) as {
      contact?: PrivateContactPayload;
      contactMethod?: GateCRewardContactMethod;
      entryId?: string;
      error?: string;
    } | null;

    if (response.ok && body?.entryId) {
      if (body.contact) setProfileContact(body.contact);
      setEntryContactMethod(body.contactMethod ?? selectedMethod);
      window.sessionStorage.removeItem(gateCRewardResumeStorageKey);
      setState("success");
      return;
    }

    setErrorMessage(
      body?.error === "reward_entry_duplicate"
        ? "이미 이 계정이나 연락처로 응모했어요."
        : body?.error === "profile_email_required"
          ? "당첨 안내를 받을 이메일을 등록해 주세요."
          : body?.error === "profile_mobile_phone_required"
            ? "응모 안내를 받을 휴대전화번호를 등록해 주세요."
            : "지금은 응모를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    );
    setState("error");
  }

  async function withdrawEntry() {
    if (state === "withdrawing") return;
    setState("withdrawing");

    const response = await fetch("/api/research/gate-c/reward-entries", {
      headers: { "content-type": "application/json" },
      method: "DELETE",
    });

    if (response.ok) {
      setState("withdrawn");
      return;
    }

    setErrorMessage("응모를 취소하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    setState("error");
  }

  if (state === "loading") {
    return (
      <section aria-live="polite" className={styles.rewardEntryPanel}>
        <p className={styles.rewardEntryLoading}>
          응모 정보를 확인하고 있어요.
        </p>
      </section>
    );
  }

  if (state === "unauthenticated") {
    return (
      <section className={styles.rewardEntryPanel}>
        <div className={styles.rewardEntryHeading}>
          <Gift aria-hidden="true" size={19} strokeWidth={1.65} />
          <div>
            <strong>리뷰 이벤트 응모</strong>
            <span>로그인하면 응모 내역과 안내 번호를 관리할 수 있어요.</span>
          </div>
        </div>
        <button
          className={styles.rewardEntryButton}
          onClick={onLogin}
          type="button"
        >
          로그인하고 응모하기
        </button>
      </section>
    );
  }

  if (state === "success" || state === "withdrawing") {
    const method = entryContactMethod ?? selectedMethod;
    const maskedContact = getMaskedContact(profileContact, method);
    return (
      <section aria-live="polite" className={styles.rewardEntrySuccess}>
        <Check aria-hidden="true" size={21} strokeWidth={1.8} />
        <div>
          <strong>이벤트 응모가 완료됐어요</strong>
          <p>
            {campaign.announcementLabel} 당첨자에게{" "}
            {maskedContact ?? "선택한 연락처"}로 안내할게요.
          </p>
          <small className={styles.rewardContactStatus}>
            {getContactStatusCopy(profileContact, method)}
          </small>
          <button
            disabled={state === "withdrawing"}
            onClick={() => {
              setEmail("");
              setMobilePhone("");
              setSelectedMethod(method);
              setState("editing");
            }}
            type="button"
          >
            연락처 변경
          </button>
          <button
            disabled={state === "withdrawing"}
            onClick={withdrawEntry}
            type="button"
          >
            {state === "withdrawing" ? "취소하고 있어요" : "응모 취소"}
          </button>
        </div>
      </section>
    );
  }

  if (state === "withdrawn") {
    return (
      <section aria-live="polite" className={styles.rewardEntryWithdrawn}>
        <p>이벤트 응모를 취소했어요. 프로필 연락처는 그대로 유지됩니다.</p>
        <button onClick={() => setState("idle")} type="button">
          다시 응모하기
        </button>
      </section>
    );
  }

  return (
    <section className={styles.rewardEntryPanel}>
      <div className={styles.rewardEntryHeading}>
        <Gift aria-hidden="true" size={19} strokeWidth={1.65} />
        <div>
          <strong>리뷰 이벤트 응모</strong>
          <span>
            {campaign.periodLabel} · 이메일 또는 휴대전화 중 하나를 선택해요
          </span>
        </div>
      </div>
      <fieldset className={styles.rewardContactMethods}>
        <legend>당첨 안내를 받을 곳</legend>
        <div>
          <button
            aria-pressed={selectedMethod === "email"}
            className={selectedMethod === "email" ? styles.isSelected : ""}
            onClick={() => {
              setSelectedMethod("email");
              setErrorMessage("");
              if (state === "editing" && profileContact?.hasEmail) {
                setState("idle");
              }
            }}
            type="button"
          >
            이메일
            {profileContact?.hasEmail ? <small>저장됨</small> : null}
          </button>
          <button
            aria-pressed={selectedMethod === "mobile_phone"}
            className={
              selectedMethod === "mobile_phone" ? styles.isSelected : ""
            }
            onClick={() => {
              setSelectedMethod("mobile_phone");
              setErrorMessage("");
              if (state === "editing" && profileContact?.hasMobilePhone) {
                setState("idle");
              }
            }}
            type="button"
          >
            휴대전화
            {profileContact?.hasMobilePhone ? <small>저장됨</small> : null}
          </button>
        </div>
      </fieldset>
      {needsContact ? (
        <>
          <label className={styles.rewardContactField}>
            <span>
              {selectedMethod === "email"
                ? profileContact?.hasEmail
                  ? "새 이메일"
                  : "당첨 안내를 받을 이메일"
                : profileContact?.hasMobilePhone
                  ? "새 휴대전화번호"
                  : "당첨 안내를 받을 휴대전화번호"}
            </span>
            <input
              autoComplete={selectedMethod === "email" ? "email" : "tel"}
              inputMode={selectedMethod === "email" ? "email" : "tel"}
              maxLength={selectedMethod === "email" ? 254 : 13}
              onChange={(event) => {
                if (selectedMethod === "email") setEmail(event.target.value);
                else setMobilePhone(formatKoreanMobile(event.target.value));
              }}
              placeholder={
                selectedMethod === "email"
                  ? "name@example.com"
                  : "010-0000-0000"
              }
              type={selectedMethod === "email" ? "email" : "tel"}
              value={selectedMethod === "email" ? email : mobilePhone}
            />
          </label>
          <p className={styles.rewardConsent}>
            연락처는 다른 사람에게 공개되지 않으며 이벤트 당첨 안내에만
            사용해요.
          </p>
          {selectedMethod === "mobile_phone" ? (
            <p className={styles.rewardVerificationNotice}>
              휴대전화번호 인증은 아직 준비 중이에요. 베타에서는 입력한 번호를
              그대로 사용하니 정확히 확인해 주세요.
            </p>
          ) : null}
        </>
      ) : (
        <div className={styles.rewardSavedContact}>
          <span>
            안내받을 {selectedMethod === "email" ? "이메일" : "휴대전화"}
          </span>
          <strong>{getMaskedContact(profileContact, selectedMethod)}</strong>
          <button
            onClick={() => {
              setEmail("");
              setMobilePhone("");
              setState("editing");
            }}
            type="button"
          >
            변경
          </button>
          <small>{getContactStatusCopy(profileContact, selectedMethod)}</small>
        </div>
      )}
      {errorMessage ? (
        <p aria-live="polite" className={styles.rewardEntryError}>
          {errorMessage}
        </p>
      ) : null}
      <button
        className={styles.rewardEntryButton}
        disabled={!canEnter}
        onClick={enterCampaign}
        type="button"
      >
        {state === "entering" || state === "saving_contact"
          ? "응모하고 있어요"
          : contactIsSaved && state !== "editing"
            ? `이 ${selectedMethod === "email" ? "이메일" : "번호"}로 응모하기`
            : `${selectedMethod === "email" ? "이메일" : "번호"} 저장하고 응모하기`}
      </button>
      {state === "editing" ? (
        <button
          className={styles.rewardEntryCancel}
          onClick={() => {
            setEmail("");
            setMobilePhone("");
            setState("idle");
          }}
          type="button"
        >
          변경 취소
        </button>
      ) : null}
    </section>
  );
}

function choosePreferredContactMethod(
  contact: PrivateContactPayload,
  entryMethod?: GateCRewardContactMethod,
): GateCRewardContactMethod {
  if (entryMethod) return entryMethod;
  if (contact.emailStatus === "verified") return "email";
  if (contact.hasMobilePhone) return "mobile_phone";
  return "email";
}

function getMaskedContact(
  contact: PrivateContactPayload | null,
  method: GateCRewardContactMethod,
) {
  return method === "email" ? contact?.emailMasked : contact?.mobilePhoneMasked;
}

function getContactStatusCopy(
  contact: PrivateContactPayload | null,
  method: GateCRewardContactMethod,
) {
  if (method === "email") {
    return contact?.emailStatus === "verified"
      ? "인증된 이메일이에요."
      : "아직 인증 전인 이메일이에요. 주소를 다시 확인해 주세요.";
  }
  return contact?.mobilePhoneStatus === "verified"
    ? "인증된 휴대전화번호예요."
    : "휴대전화 인증 준비 전이라 입력한 번호로 안내해요.";
}

const gateCRewardResumeStorageKey = "nuang-gate-c-reward-resume-v1";

function formatKoreanMobile(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
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
