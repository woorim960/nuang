"use client";

import {
  ArrowRight,
  Check,
  ChevronLeft,
  CircleHelp,
  Download,
  ShieldCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import runnerStyles from "@/features/assessment/AssessmentRunner.module.css";
import {
  canExportGateCSession,
  createEmptyGateCProbeRecord,
  hasMandatoryGateCProbeEvidence,
  type GateCIssueCode,
  type GateCNaturalResponseRecord,
  type GateCParticipantDefinition,
  type GateCProbeRecord,
  type GateCResponseChoice,
  type GateCScaleValue,
  type GateCSeverity,
  type GateCStudySession,
  type GateCUnsureReason,
} from "@/features/research/gate-c/gate-c-study-contract";
import { cn } from "@/lib/utils/cn";
import styles from "./GateCStudyRunner.module.css";

type RunnerSurface = "complete" | "handoff" | "probes" | "questions" | "setup";
type SheetType = "exit" | "help" | "unsure" | null;

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

const issueOptions: Array<{ id: GateCIssueCode; label: string }> = [
  { id: "CONTEXT_MISREAD", label: "상황을 다르게 이해함" },
  { id: "CONTEXT_PROMPT_DUPLICATION", label: "상황과 질문이 반복됨" },
  { id: "PROMPT_MISREAD", label: "질문 뜻을 다르게 이해함" },
  { id: "DOUBLE_RESPONSE", label: "두 반응을 한꺼번에 물음" },
  { id: "TARGET_SEAM", label: "다른 성향을 묻는 것으로 이해함" },
  { id: "RESPONSE_LAYER_CONFUSION", label: "생각과 실제 반응을 혼동함" },
  { id: "ABILITY_INFERENCE", label: "능력 질문으로 이해함" },
  { id: "VALUE_INFERENCE", label: "좋고 나쁨의 질문으로 이해함" },
  { id: "CLINICAL_INFERENCE", label: "진단처럼 느껴짐" },
  { id: "RELATIONSHIP_DETERMINISM", label: "관계 결과를 단정하는 느낌" },
  { id: "RECALL_WINDOW", label: "평소보다 한 사건으로 답함" },
  { id: "EXPERIENCE_GAP", label: "관련 경험이 부족함" },
  { id: "RESPONSE_SCALE", label: "응답 단계가 구분되지 않음" },
  { id: "NEGATION_DIRECTION", label: "부정 표현으로 방향을 헷갈림" },
  { id: "SOCIAL_DESIRABILITY", label: "좋아 보이는 답에 영향받음" },
  { id: "ACCESS_CONSTRAINT", label: "환경·접근 조건이 답을 좌우함" },
  { id: "UI_CONTEXT_LOSS", label: "화면에서 상황과 질문 연결을 놓침" },
  { id: "PRIVACY_DISCOMFORT", label: "답하기에 불필요하게 민감함" },
  { id: "OTHER", label: "그 밖의 문제" },
];

export function GateCStudyRunner({
  definition,
  onComplete,
}: {
  definition: GateCParticipantDefinition;
  onComplete?: (session: GateCStudySession) => void;
}) {
  const router = useRouter();
  const questionShownAtRef = useRef(0);
  const [surface, setSurface] = useState<RunnerSurface>("setup");
  const [sheet, setSheet] = useState<SheetType>(null);
  const [participantId, setParticipantId] = useState("");
  const [sessionSlotId, setSessionSlotId] = useState("");
  const [consentRecordId, setConsentRecordId] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [startedAt, setStartedAt] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentProbeIndex, setCurrentProbeIndex] = useState(0);
  const [naturalResponses, setNaturalResponses] = useState<
    Record<string, GateCNaturalResponseRecord>
  >({});
  const [probeRecords, setProbeRecords] = useState<
    Record<string, GateCProbeRecord>
  >({});
  const [completedSession, setCompletedSession] =
    useState<GateCStudySession | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const currentQuestion = definition.items[currentQuestionIndex];
  const currentResponse = currentQuestion
    ? naturalResponses[currentQuestion.studyItemId]
    : undefined;
  const currentProbeItem = definition.items[currentProbeIndex];
  const currentProbeRecord = currentProbeItem
    ? (probeRecords[currentProbeItem.studyItemId] ??
      createEmptyGateCProbeRecord())
    : createEmptyGateCProbeRecord();
  const progress = Math.round(
    ((currentQuestionIndex + 1) / definition.items.length) * 100,
  );
  const probeProgress = Math.round(
    ((currentProbeIndex + 1) / definition.items.length) * 100,
  );

  useEffect(() => {
    questionShownAtRef.current = Date.now();
  }, [currentQuestionIndex]);

  function startSession() {
    if (
      !participantId.trim() ||
      !sessionSlotId.trim() ||
      !consentRecordId.trim() ||
      !consentConfirmed
    ) {
      return;
    }
    setStartedAt(new Date().toISOString());
    setSurface("questions");
  }

  function choose(choice: GateCResponseChoice) {
    if (!currentQuestion) return;

    setNaturalResponses((current) => {
      const existing = current[currentQuestion.studyItemId];
      const answeredAt = Date.now();
      const shownAt = questionShownAtRef.current || answeredAt;
      const nextRecord: GateCNaturalResponseRecord = existing
        ? {
            ...existing,
            currentChoice: choice,
            responseChanged:
              existing.responseChanged ||
              !isSameChoice(existing.firstChoice, choice),
          }
        : {
            firstChoice: choice,
            currentChoice: choice,
            responseChanged: false,
            firstAnsweredElapsedMs: Math.max(0, answeredAt - shownAt),
          };

      return { ...current, [currentQuestion.studyItemId]: nextRecord };
    });
  }

  function goNextQuestion() {
    if (!currentResponse) return;
    if (currentQuestionIndex < definition.items.length - 1) {
      setCurrentQuestionIndex((current) => current + 1);
      return;
    }
    setSurface("handoff");
  }

  function updateProbe(patch: Partial<GateCProbeRecord>) {
    if (!currentProbeItem) return;
    setProbeRecords((current) => ({
      ...current,
      [currentProbeItem.studyItemId]: {
        ...(current[currentProbeItem.studyItemId] ??
          createEmptyGateCProbeRecord()),
        ...patch,
      },
    }));
  }

  function toggleIssue(issueCode: GateCIssueCode) {
    const selected = currentProbeRecord.issueCodes.includes(issueCode);
    updateProbe({
      issueCodes: selected
        ? currentProbeRecord.issueCodes.filter((code) => code !== issueCode)
        : [...currentProbeRecord.issueCodes, issueCode],
    });
  }

  function goNextProbe() {
    if (!hasMandatoryGateCProbeEvidence(currentProbeRecord)) return;
    if (currentProbeIndex < definition.items.length - 1) {
      setCurrentProbeIndex((current) => current + 1);
      return;
    }
    if (!canExportGateCSession(definition, naturalResponses, probeRecords)) {
      return;
    }

    const session: GateCStudySession = {
      protocolVersion: definition.protocolVersion,
      candidateSetId: definition.candidateSetId,
      sessionId: createSessionId(),
      sessionSlotId: sessionSlotId.trim(),
      participantIdPseudonymous: participantId.trim(),
      consentRecordId: consentRecordId.trim(),
      formId: definition.formId,
      consentConfirmed: true,
      startedAt,
      completedAt: new Date().toISOString(),
      storageStatus: "LOCAL_EXPORT_NOT_UPLOADED",
      naturalResponses,
      probeRecords,
    };
    setCompletedSession(session);
    setSurface("complete");
    onComplete?.(session);
  }

  function leaveStudy() {
    router.push("/research/gate-c");
  }

  function downloadSession() {
    if (!completedSession) return;
    const blob = new Blob([`${JSON.stringify(completedSession, null, 2)}\n`], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${definition.formId}_${safeFilePart(participantId)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  }

  if (surface === "setup") {
    const canStart =
      participantId.trim().length > 0 &&
      sessionSlotId.trim().length > 0 &&
      consentRecordId.trim().length > 0 &&
      consentConfirmed;

    return (
      <main className={runnerStyles.runner}>
        <header className={runnerStyles.appBar}>
          <button
            aria-label="연구 홈으로"
            className={runnerStyles.closeButton}
            onClick={leaveStudy}
            type="button"
          >
            <X aria-hidden="true" size={20} strokeWidth={1.8} />
          </button>
          <p className={runnerStyles.title}>문항 확인 세션</p>
          <p className={runnerStyles.count}>
            {definition.formId.replace("FORM_", "폼 ")}
          </p>
        </header>

        <section className={styles.setup}>
          <p className={styles.eyebrow}>Gate C · 12문항</p>
          <h1 className={styles.setupTitle}>먼저 세션 정보를 확인해 주세요</h1>
          <p className={styles.setupCopy}>
            이 화면은 성향 결과를 제공하는 검사가 아니라 질문이 같은 뜻으로
            읽히는지 확인하는 연구 도구예요.
          </p>

          <div className={styles.privacyNotice}>
            <ShieldCheck aria-hidden="true" size={20} strokeWidth={1.7} />
            <p>
              실명이나 연락처는 입력하지 않아요. 응답은 자동 업로드되지 않고
              완료 뒤 가명 파일로만 내려받아요.
            </p>
          </div>

          <div className={styles.setupFields}>
            <label className={styles.fieldLabel}>
              <span>가명 참여자 ID</span>
              <input
                autoComplete="off"
                className={styles.textInput}
                onChange={(event) => setParticipantId(event.target.value)}
                placeholder="예: GC-R1-A-01"
                value={participantId}
              />
            </label>
            <label className={styles.fieldLabel}>
              <span>세션 슬롯 ID</span>
              <input
                autoComplete="off"
                className={styles.textInput}
                onChange={(event) => setSessionSlotId(event.target.value)}
                placeholder="예: R1-FORM_A-01"
                value={sessionSlotId}
              />
            </label>
            <label className={styles.fieldLabel}>
              <span>동의 기록 ID</span>
              <input
                autoComplete="off"
                className={styles.textInput}
                onChange={(event) => setConsentRecordId(event.target.value)}
                placeholder="예: CONSENT-R1-A-01"
                value={consentRecordId}
              />
            </label>
            <label className={styles.consentRow}>
              <input
                checked={consentConfirmed}
                onChange={(event) => setConsentConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>별도 안내에 따라 참여 동의와 중단 권리를 확인했어요.</span>
            </label>
          </div>

          <button
            className={styles.primaryAction}
            disabled={!canStart}
            onClick={startSession}
            type="button"
          >
            첫 응답 시작하기
            <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
          </button>
        </section>
      </main>
    );
  }

  if (surface === "handoff") {
    return (
      <main className={runnerStyles.runner}>
        <section className={styles.centerStage}>
          <span aria-hidden="true" className={styles.successMark}>
            <Check size={26} strokeWidth={1.9} />
          </span>
          <p className={styles.eyebrow}>첫 응답 완료</p>
          <h1 className={styles.centerTitle}>이제 진행자와 문장을 확인해요</h1>
          <p className={styles.centerCopy}>
            선택한 답을 고치려는 시간이 아니에요. 어떤 뜻으로 읽었고 어떤 경험을
            떠올렸는지 편하게 말해 주세요.
          </p>
          <div className={styles.handoffNote}>
            지금부터는 진행자가 화면을 보며 참여자의 말을 요약해 기록합니다.
          </div>
          <button
            className={styles.primaryAction}
            onClick={() => setSurface("probes")}
            type="button"
          >
            진행자 기록 시작
            <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
          </button>
        </section>
      </main>
    );
  }

  if (surface === "probes") {
    const naturalChoice = naturalResponses[currentProbeItem.studyItemId];
    const mandatoryComplete =
      hasMandatoryGateCProbeEvidence(currentProbeRecord);

    return (
      <main className={runnerStyles.runner}>
        <header className={runnerStyles.appBar}>
          <button
            aria-label="세션 닫기"
            className={runnerStyles.closeButton}
            onClick={() => setSheet("exit")}
            type="button"
          >
            <X aria-hidden="true" size={20} strokeWidth={1.8} />
          </button>
          <p className={runnerStyles.title}>진행자 기록</p>
          <p className={runnerStyles.count}>
            {currentProbeIndex + 1} / {definition.items.length}
          </p>
        </header>
        <div className={runnerStyles.progressWrap}>
          <div
            aria-label="진행자 기록 진행률"
            aria-valuemax={definition.items.length}
            aria-valuemin={1}
            aria-valuenow={currentProbeIndex + 1}
            className={runnerStyles.progress}
            role="progressbar"
          >
            <span
              className={runnerStyles.progressFill}
              style={{ width: `${probeProgress}%` }}
            />
          </div>
        </div>

        <section className={styles.probeContent}>
          <div className={styles.itemRecall}>
            <p>{currentProbeItem.contextLabel}</p>
            <h1>{currentProbeItem.promptText}</h1>
            <span>
              첫 응답 · {responseChoiceLabel(naturalChoice.currentChoice)}
            </span>
          </div>

          <p className={styles.probeGuide}>
            참여자의 말을 평가하거나 다듬지 말고, 사용한 표현에 가깝게 요약해
            주세요.
          </p>

          <div className={styles.probeFields}>
            <ProbeField
              label="문장을 어떻게 이해했나요?"
              onChange={(value) => updateProbe({ comprehensionSummary: value })}
              probe={currentProbeItem.probes.comprehension}
              value={currentProbeRecord.comprehensionSummary}
            />
            <ProbeField
              label="어떤 경험을 떠올렸나요?"
              onChange={(value) => updateProbe({ recallSummary: value })}
              probe={currentProbeItem.probes.recall}
              value={currentProbeRecord.recallSummary}
            />
            <ProbeField
              label="무엇을 기준으로 판단했나요?"
              onChange={(value) => updateProbe({ judgmentSummary: value })}
              probe={currentProbeItem.probes.judgment}
              value={currentProbeRecord.judgmentSummary}
            />
            <ProbeField
              label="응답을 고를 때 어려움이 있었나요?"
              onChange={(value) =>
                updateProbe({ responseSelectionSummary: value })
              }
              probe={currentProbeItem.probes.responseSelection}
              value={currentProbeRecord.responseSelectionSummary}
            />
          </div>

          <details className={styles.detailPanel}>
            <summary>필요할 때 더 확인</summary>
            <div className={styles.detailBody}>
              <ProbeField
                label="좋아 보이는 답의 영향"
                onChange={(value) =>
                  updateProbe({ desirabilitySummary: value })
                }
                optional
                probe={currentProbeItem.probes.desirability}
                value={currentProbeRecord.desirabilitySummary}
              />
              <ProbeField
                label="환경과 접근 조건의 영향"
                onChange={(value) => updateProbe({ accessSummary: value })}
                optional
                probe={currentProbeItem.probes.access}
                value={currentProbeRecord.accessSummary}
              />
              <ProbeField
                label="상황과 질문의 연결"
                onChange={(value) => updateProbe({ seamSummary: value })}
                optional
                probe={currentProbeItem.probes.seam}
                value={currentProbeRecord.seamSummary}
              />
            </div>
          </details>

          <details className={styles.detailPanel}>
            <summary>
              관찰된 문제 표시
              {currentProbeRecord.issueCodes.length > 0
                ? ` · ${currentProbeRecord.issueCodes.length}개`
                : ""}
            </summary>
            <div className={styles.issueBody}>
              <div className={styles.issueGrid}>
                {issueOptions.map((option) => (
                  <label className={styles.issueOption} key={option.id}>
                    <input
                      checked={currentProbeRecord.issueCodes.includes(
                        option.id,
                      )}
                      onChange={() => toggleIssue(option.id)}
                      type="checkbox"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              <label className={styles.fieldLabel}>
                <span>가장 높은 심각도</span>
                <select
                  className={styles.selectInput}
                  onChange={(event) =>
                    updateProbe({
                      highestSeverity: event.target.value as GateCSeverity | "",
                    })
                  }
                  value={currentProbeRecord.highestSeverity}
                >
                  <option value="">문제 없음</option>
                  <option value="S0">S0 · 관찰 메모</option>
                  <option value="S1">S1 · 경미한 마찰</option>
                  <option value="S2">S2 · 수정·재검증 필요</option>
                  <option value="S3">S3 · 즉시 보류·안전 검토</option>
                </select>
              </label>
              <label className={styles.fieldLabel}>
                <span>진행자 메모 · 선택</span>
                <textarea
                  className={styles.textarea}
                  onChange={(event) =>
                    updateProbe({ moderatorNote: event.target.value })
                  }
                  rows={3}
                  value={currentProbeRecord.moderatorNote}
                />
              </label>
            </div>
          </details>
        </section>

        <footer className={runnerStyles.dock}>
          <button
            aria-label="이전 문항"
            className={runnerStyles.previousButton}
            disabled={currentProbeIndex === 0}
            onClick={() =>
              setCurrentProbeIndex((current) => Math.max(0, current - 1))
            }
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.8} />
          </button>
          <button
            className={runnerStyles.nextButton}
            disabled={!mandatoryComplete}
            onClick={goNextProbe}
            type="button"
          >
            {currentProbeIndex === definition.items.length - 1
              ? "기록 마치기"
              : "다음 문항"}
            <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
          </button>
        </footer>

        {sheet === "exit" ? (
          <BottomSheet
            copy="아직 파일로 내려받지 않은 기록은 이 화면을 나가면 사라져요."
            onClose={() => setSheet(null)}
            title="세션을 그만할까요?"
          >
            <div className={runnerStyles.sheetActions}>
              <button
                className={runnerStyles.sheetAction}
                onClick={() => setSheet(null)}
                type="button"
              >
                계속 기록하기
              </button>
              <button
                className={cn(
                  runnerStyles.sheetAction,
                  runnerStyles.sheetActionSecondary,
                )}
                onClick={leaveStudy}
                type="button"
              >
                저장하지 않고 나가기
              </button>
            </div>
          </BottomSheet>
        ) : null}
      </main>
    );
  }

  if (surface === "complete") {
    return (
      <main className={runnerStyles.runner}>
        <section className={styles.centerStage}>
          <span aria-hidden="true" className={styles.successMark}>
            <Check size={26} strokeWidth={1.9} />
          </span>
          <p className={styles.eyebrow}>세션 기록 완료</p>
          <h1 className={styles.centerTitle}>
            가명 연구 파일을 내려받아 주세요
          </h1>
          <p className={styles.centerCopy}>
            이 기록은 자동 업로드되지 않아요. 파일을 내려받은 뒤 승인된 연구
            보관 위치로 옮겨야 세션이 보존됩니다.
          </p>
          <dl className={styles.sessionSummary}>
            <div>
              <dt>폼</dt>
              <dd>{definition.formId}</dd>
            </div>
            <div>
              <dt>가명 ID</dt>
              <dd>{participantId}</dd>
            </div>
            <div>
              <dt>완료 문항</dt>
              <dd>{definition.items.length}개</dd>
            </div>
          </dl>
          <button
            className={styles.primaryAction}
            onClick={downloadSession}
            type="button"
          >
            <Download aria-hidden="true" size={18} strokeWidth={1.8} />
            세션 파일 내려받기
          </button>
          <p aria-live="polite" className={styles.downloadStatus}>
            {downloaded
              ? "파일을 내려받았어요. 안전한 보관 위치를 확인해 주세요."
              : ""}
          </p>
          <button
            className={styles.secondaryAction}
            onClick={leaveStudy}
            type="button"
          >
            연구 홈으로
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={runnerStyles.runner}>
      <header className={runnerStyles.appBar}>
        <button
          aria-label="세션 닫기"
          className={runnerStyles.closeButton}
          onClick={() => setSheet("exit")}
          type="button"
        >
          <X aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
        <p className={runnerStyles.title}>성향 질문 확인</p>
        <p
          aria-label={`전체 ${definition.items.length}개 중 ${currentQuestionIndex + 1}번째 문항`}
          className={runnerStyles.count}
        >
          {currentQuestionIndex + 1} / {definition.items.length}
        </p>
      </header>

      <div className={runnerStyles.progressWrap}>
        <div
          aria-label="첫 응답 진행률"
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
        <button
          className={runnerStyles.helpButton}
          onClick={() => setSheet("help")}
          type="button"
        >
          <CircleHelp aria-hidden="true" size={16} strokeWidth={1.8} />
          답하는 기준 · 최근 6개월의 평소 모습
        </button>

        <div
          aria-atomic="true"
          aria-live="polite"
          className={cn(
            runnerStyles.questionRegion,
            runnerStyles.questionForward,
          )}
          key={currentQuestion.studyItemId}
        >
          <p className={runnerStyles.context}>{currentQuestion.contextLabel}</p>
          <h1 className={runnerStyles.question}>
            {currentQuestion.promptText}
          </h1>
        </div>

        <fieldset
          aria-label="응답 선택"
          className={runnerStyles.responses}
          role="radiogroup"
        >
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
                    value={option.value}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className={runnerStyles.unsureSlot}>
          {currentResponse?.currentChoice.kind === "unsure" ? (
            <div className={runnerStyles.unsureSummary}>
              <p>
                <strong>답하기 어려움</strong> ·{" "}
                {responseChoiceLabel(currentResponse.currentChoice)}
              </p>
              <button
                className={runnerStyles.changeButton}
                onClick={() => setSheet("unsure")}
                type="button"
              >
                변경
              </button>
            </div>
          ) : (
            <button
              className={runnerStyles.unsureButton}
              onClick={() => setSheet("unsure")}
              type="button"
            >
              이 상황은 답하기 어려워요
            </button>
          )}
        </div>
      </section>

      <footer className={runnerStyles.dock}>
        <button
          aria-label="이전 질문"
          className={runnerStyles.previousButton}
          disabled={currentQuestionIndex === 0}
          onClick={() =>
            setCurrentQuestionIndex((current) => Math.max(0, current - 1))
          }
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
        <button
          className={runnerStyles.nextButton}
          disabled={!currentResponse}
          onClick={goNextQuestion}
          type="button"
        >
          {currentQuestionIndex === definition.items.length - 1
            ? "첫 응답 마치기"
            : "다음"}
          <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
        </button>
      </footer>

      {sheet === "help" ? (
        <BottomSheet
          copy="특별히 잘됐거나 힘들었던 한 번보다, 비슷한 상황에서 반복해서 나타난 평소 모습을 기준으로 답해 주세요."
          onClose={() => setSheet(null)}
          title="어떤 모습을 떠올리면 될까요?"
        >
          <p className={runnerStyles.sheetNote}>
            비슷한 경험이 거의 없다면 ‘이 상황은 답하기 어려워요’를 선택해도
            괜찮아요.
          </p>
        </BottomSheet>
      ) : null}

      {sheet === "unsure" ? (
        <BottomSheet
          copy="가장 가까운 이유 하나를 골라주세요."
          onClose={() => setSheet(null)}
          title="왜 답하기 어려운가요?"
        >
          <div className={runnerStyles.sheetReasons}>
            {unsureReasons.map((reason) => (
              <button
                aria-pressed={
                  currentResponse?.currentChoice.kind === "unsure" &&
                  currentResponse.currentChoice.reason === reason.id
                }
                className={cn(
                  runnerStyles.sheetReason,
                  currentResponse?.currentChoice.kind === "unsure" &&
                    currentResponse.currentChoice.reason === reason.id &&
                    runnerStyles.sheetReasonSelected,
                )}
                key={reason.id}
                onClick={() => {
                  choose({ kind: "unsure", reason: reason.id });
                  setSheet(null);
                }}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={runnerStyles.reasonRadio}
                  data-checked={
                    currentResponse?.currentChoice.kind === "unsure" &&
                    currentResponse.currentChoice.reason === reason.id
                  }
                />
                <span>{reason.label}</span>
              </button>
            ))}
          </div>
        </BottomSheet>
      ) : null}

      {sheet === "exit" ? (
        <BottomSheet
          copy="응답은 자동 저장되지 않아 이 화면을 나가면 사라져요."
          onClose={() => setSheet(null)}
          title="세션을 그만할까요?"
        >
          <div className={runnerStyles.sheetActions}>
            <button
              className={runnerStyles.sheetAction}
              onClick={() => setSheet(null)}
              type="button"
            >
              계속 답하기
            </button>
            <button
              className={cn(
                runnerStyles.sheetAction,
                runnerStyles.sheetActionSecondary,
              )}
              onClick={leaveStudy}
              type="button"
            >
              저장하지 않고 나가기
            </button>
          </div>
        </BottomSheet>
      ) : null}
    </main>
  );
}

function ProbeField({
  label,
  onChange,
  optional = false,
  probe,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  optional?: boolean;
  probe: string;
  value: string;
}) {
  return (
    <label className={styles.probeField}>
      <span className={styles.probeLabel}>
        {label}
        {optional ? <small>선택</small> : null}
      </span>
      <span className={styles.probeQuestion}>{probe}</span>
      <textarea
        aria-label={label}
        className={styles.textarea}
        onChange={(event) => onChange(event.target.value)}
        placeholder="참여자의 표현에 가깝게 기록"
        rows={3}
        value={value}
      />
    </label>
  );
}

function BottomSheet({
  children,
  copy,
  onClose,
  title,
}: {
  children: ReactNode;
  copy?: string;
  onClose: () => void;
  title: string;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div className={runnerStyles.layer} role="presentation">
      <button
        aria-label="닫기"
        className={runnerStyles.backdropButton}
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="gate-c-sheet-title"
        aria-modal="true"
        className={runnerStyles.sheet}
        role="dialog"
      >
        <div className={runnerStyles.sheetHeader}>
          <div>
            <h2 className={runnerStyles.sheetTitle} id="gate-c-sheet-title">
              {title}
            </h2>
            {copy ? <p className={runnerStyles.sheetCopy}>{copy}</p> : null}
          </div>
          <button
            aria-label="닫기"
            className={runnerStyles.sheetClose}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" size={19} strokeWidth={1.8} />
          </button>
        </div>
        <div className={runnerStyles.sheetBody}>{children}</div>
      </section>
    </div>
  );
}

function responseChoiceLabel(choice: GateCResponseChoice) {
  if (choice.kind === "scale") {
    return responseOptions.find((option) => option.value === choice.value)
      ?.label;
  }
  return unsureReasons.find((reason) => reason.id === choice.reason)?.label;
}

function isSameChoice(left: GateCResponseChoice, right: GateCResponseChoice) {
  if (left.kind !== right.kind) return false;
  return left.kind === "scale"
    ? left.value ===
        (right as Extract<GateCResponseChoice, { kind: "scale" }>).value
    : left.reason ===
        (right as Extract<GateCResponseChoice, { kind: "unsure" }>).reason;
}

function createSessionId() {
  return globalThis.crypto?.randomUUID?.() ?? `gate-c-${Date.now()}`;
}

function safeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60) || "anonymous";
}
