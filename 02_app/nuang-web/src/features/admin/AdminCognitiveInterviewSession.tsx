"use client";

import {
  ArrowLeft,
  ArrowRight,
  Download,
  LockKeyhole,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { M05ParticipantRunner } from "@/features/research/m05/M05ParticipantRunner";
import type { M05ParticipantSession } from "@/features/research/m05/m05-participant-contract";
import { m05FacilitatorDefinition } from "@/features/research/m05/m05-facilitator-fixture";
import styles from "./AdminCognitiveInterviewSession.module.css";

type SessionSurface = "interview" | "participant" | "setup";

type SessionSetup = {
  consentConfirmed: boolean;
  interviewerId: string;
  noDirectIdentifiers: boolean;
  participantCode: string;
  recordingScopeConfirmed: boolean;
  roundId: string;
  samplingCells: string;
  withdrawalExplained: boolean;
};

type InterviewDecision =
  | ""
  | "CONSTRUCT_REWRITE"
  | "COPY_REVISE_RETEST"
  | "EXCLUDE"
  | "HOLD_FOR_SUBGROUP"
  | "KEEP_FOR_PILOT";

type InterviewRecord = {
  accessNotes: string;
  constraintProbeSummary: string;
  decision: InterviewDecision;
  desirabilityDirection: string;
  evidenceSummary: string;
  experienceProbeSummary: string;
  issueCodes: string[];
  paraphraseSummary: string;
  probeChecks: Record<string, boolean>;
  recalledSituationSummary: string;
  responseReasonCode: string;
  seamProbeSummary: string;
  severity: "" | "S0_NOTE" | "S1_MINOR" | "S2_MATERIAL" | "S3_CRITICAL";
  verbatimExcerpt: string;
  wordingPreference: string;
};

type SavedDraft = {
  currentIndex: number;
  interviewRecords: Record<string, InterviewRecord>;
  participantSession: M05ParticipantSession | null;
  setup: SessionSetup;
  surface: SessionSurface;
};

const draftStorageKey = "nuang:m05-facilitator-draft:v1";
const itemProbeKeys = [
  "comprehension",
  "recall",
  "judgment",
  "desirability",
  "access",
] as const;

const initialSetup: SessionSetup = {
  consentConfirmed: false,
  interviewerId: "",
  noDirectIdentifiers: false,
  participantCode: "",
  recordingScopeConfirmed: false,
  roundId: "R1",
  samplingCells: "",
  withdrawalExplained: false,
};

export function AdminCognitiveInterviewSession() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draftReady, setDraftReady] = useState(false);
  const [interviewRecords, setInterviewRecords] = useState<
    Record<string, InterviewRecord>
  >({});
  const [participantSession, setParticipantSession] =
    useState<M05ParticipantSession | null>(null);
  const [setup, setSetup] = useState(initialSetup);
  const [surface, setSurface] = useState<SessionSurface>("setup");

  useEffect(() => {
    const restoreId = window.setTimeout(() => {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (raw) {
        try {
          const draft = JSON.parse(raw) as Partial<SavedDraft>;
          if (draft.setup) setSetup({ ...initialSetup, ...draft.setup });
          if (draft.participantSession) {
            setParticipantSession(draft.participantSession);
          }
          if (draft.interviewRecords)
            setInterviewRecords(draft.interviewRecords);
          if (typeof draft.currentIndex === "number") {
            setCurrentIndex(
              Math.min(
                Math.max(0, draft.currentIndex),
                m05FacilitatorDefinition.items.length - 1,
              ),
            );
          }
          if (
            draft.surface === "setup" ||
            draft.surface === "participant" ||
            draft.surface === "interview"
          ) {
            setSurface(draft.surface);
          }
        } catch {
          window.localStorage.removeItem(draftStorageKey);
        }
      }
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(restoreId);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    const draft: SavedDraft = {
      currentIndex,
      interviewRecords,
      participantSession,
      setup,
      surface,
    };
    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [
    currentIndex,
    draftReady,
    interviewRecords,
    participantSession,
    setup,
    surface,
  ]);

  const setupComplete =
    setup.consentConfirmed &&
    setup.interviewerId.trim().length > 0 &&
    setup.noDirectIdentifiers &&
    setup.participantCode.trim().length > 0 &&
    setup.recordingScopeConfirmed &&
    setup.roundId.trim().length > 0 &&
    setup.withdrawalExplained;
  const completeItemCount = useMemo(
    () =>
      m05FacilitatorDefinition.items.filter((item) =>
        isInterviewRecordComplete(interviewRecords[item.opaqueItemId], item),
      ).length,
    [interviewRecords],
  );
  const currentItem = m05FacilitatorDefinition.items[currentIndex];
  const currentRecord = ensureRecord(
    interviewRecords[currentItem.opaqueItemId],
  );

  function updateSetup<Key extends keyof SessionSetup>(
    key: Key,
    value: SessionSetup[Key],
  ) {
    setSetup((current) => ({ ...current, [key]: value }));
  }

  function updateRecord<Key extends keyof InterviewRecord>(
    key: Key,
    value: InterviewRecord[Key],
  ) {
    setInterviewRecords((current) => ({
      ...current,
      [currentItem.opaqueItemId]: {
        ...ensureRecord(current[currentItem.opaqueItemId]),
        [key]: value,
      },
    }));
  }

  function toggleIssueCode(code: string) {
    const issueCodes = currentRecord.issueCodes.includes(code)
      ? currentRecord.issueCodes.filter((candidate) => candidate !== code)
      : [
          ...currentRecord.issueCodes.filter(
            (candidate) => candidate !== "NONE",
          ),
          code,
        ];
    updateRecord("issueCodes", code === "NONE" ? ["NONE"] : issueCodes);
  }

  function toggleProbe(key: string) {
    updateRecord("probeChecks", {
      ...currentRecord.probeChecks,
      [key]: !currentRecord.probeChecks[key],
    });
  }

  function resetSession() {
    if (
      !window.confirm(
        "현재 기기의 인터뷰 초안이 모두 삭제됩니다. 이미 내보낸 파일은 삭제되지 않습니다.",
      )
    ) {
      return;
    }
    window.localStorage.removeItem(draftStorageKey);
    setCurrentIndex(0);
    setInterviewRecords({});
    setParticipantSession(null);
    setSetup(initialSetup);
    setSurface("setup");
  }

  function buildSessionPayload() {
    if (
      !participantSession ||
      completeItemCount !== m05FacilitatorDefinition.items.length
    ) {
      return null;
    }
    const exportedAt = new Date().toISOString();
    return {
      exportedAt,
      protocolVersion: m05FacilitatorDefinition.protocolVersion,
      participantSession,
      setup: {
        interviewerId: setup.interviewerId.trim(),
        participantCode: setup.participantCode.trim(),
        roundId: setup.roundId.trim(),
        samplingCells: setup.samplingCells.trim(),
      },
      interviews: m05FacilitatorDefinition.items.map((item) => ({
        itemRevisionId: item.itemRevisionId,
        opaqueItemId: item.opaqueItemId,
        ...interviewRecords[item.opaqueItemId],
      })),
      status: "SESSION_COMPLETE_PENDING_CROSS_PARTICIPANT_ADJUDICATION",
    };
  }

  function exportSessionJson() {
    const payload = buildSessionPayload();
    if (!payload) return;
    downloadTextFile({
      content: JSON.stringify(payload, null, 2),
      fileName: `nuang-m05-${safeFilePart(setup.roundId)}-${safeFilePart(setup.participantCode)}.json`,
      mimeType: "application/json",
    });
  }

  function exportSessionCsv() {
    const payload = buildSessionPayload();
    if (!payload) return;
    const columns = [
      "study_id",
      "protocol_version",
      "round_id",
      "participant_id_pseudonymous",
      "sampling_cells",
      "form_id",
      "response_format_id",
      "opaque_item_id",
      "item_revision_id",
      "order_index",
      "first_response_value",
      "first_difficult_reason",
      "response_changed",
      "response_latency_bucket",
      "paraphrase_summary",
      "recalled_situation_summary",
      "response_reason_code",
      "issue_codes",
      "severity",
      "desirability_direction",
      "access_notes_deidentified",
      "seam_probe_summary",
      "constraint_probe_summary",
      "experience_probe_summary",
      "wording_preference",
      "verbatim_excerpt_if_consented",
      "interviewer_id",
      "adjudicated_decision",
    ] as const;
    const rows = m05FacilitatorDefinition.items.map((item) => {
      const response = participantSession?.responses[item.opaqueItemId];
      const record = interviewRecords[item.opaqueItemId];
      const firstChoice = response?.firstChoice;
      return {
        access_notes_deidentified: record.accessNotes,
        adjudicated_decision: "",
        constraint_probe_summary: record.constraintProbeSummary,
        desirability_direction: record.desirabilityDirection,
        experience_probe_summary: record.experienceProbeSummary,
        first_difficult_reason:
          firstChoice?.kind === "unsure" ? firstChoice.reason : "",
        first_response_value:
          firstChoice?.kind === "scale" ? String(firstChoice.value) : "UNSURE",
        form_id: m05FacilitatorDefinition.formId,
        interviewer_id: setup.interviewerId.trim(),
        issue_codes: record.issueCodes.join("|"),
        item_revision_id: item.itemRevisionId,
        opaque_item_id: item.opaqueItemId,
        order_index: String(item.participantItem.orderIndex),
        paraphrase_summary: record.paraphraseSummary,
        participant_id_pseudonymous: setup.participantCode.trim(),
        protocol_version: m05FacilitatorDefinition.protocolVersion,
        recalled_situation_summary: record.recalledSituationSummary,
        response_changed: response?.responseChanged ? "true" : "false",
        response_format_id: m05FacilitatorDefinition.responseFormatId,
        response_latency_bucket: latencyBucket(
          response?.firstAnsweredElapsedMs,
        ),
        response_reason_code: record.responseReasonCode,
        round_id: setup.roundId.trim(),
        sampling_cells: setup.samplingCells.trim(),
        seam_probe_summary: record.seamProbeSummary,
        severity: record.severity,
        study_id: "NUANG-M05-COGNITIVE",
        verbatim_excerpt_if_consented: record.verbatimExcerpt,
        wording_preference: record.wordingPreference,
      };
    });
    downloadTextFile({
      content: `\uFEFF${[
        columns.join(","),
        ...rows.map((row) =>
          columns.map((column) => csvCell(row[column])).join(","),
        ),
      ].join("\n")}`,
      fileName: `nuang-m05-${safeFilePart(setup.roundId)}-${safeFilePart(setup.participantCode)}.csv`,
      mimeType: "text/csv;charset=utf-8",
    });
  }

  if (surface === "participant") {
    return (
      <div className={styles.participantSurface}>
        <div className={styles.handoffBanner}>
          <LockKeyhole aria-hidden="true" size={18} strokeWidth={1.7} />
          <div>
            <strong>이제 기기를 참여자에게 건네주세요</strong>
            <p>
              진행자는 문장 뜻을 설명하거나 답을 유도하지 않습니다. 다섯 문항을
              다 고른 뒤 기기를 다시 받으세요.
            </p>
          </div>
        </div>
        <M05ParticipantRunner
          completionActionLabel="진행자에게 기기 건네기"
          onComplete={setParticipantSession}
          onContinueAfterComplete={() => setSurface("interview")}
          onExit={() => setSurface("setup")}
        />
      </div>
    );
  }

  if (surface === "setup") {
    return (
      <section
        aria-labelledby="m05-session-title"
        className={styles.sessionPanel}
      >
        <div className={styles.sessionHeader}>
          <div>
            <p>진행자용 · 외부 참여 전 법률·연구 승인 필요</p>
            <h2 id="m05-session-title">인지 인터뷰 한 세션 시작</h2>
          </div>
          <button
            className={styles.textButton}
            onClick={resetSession}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={15} />
            초안 초기화
          </button>
        </div>

        <div className={styles.notice}>
          <strong>이 화면에서 기록하는 것은 점수 검사가 아닙니다.</strong>
          <p>
            참여자가 문장을 어떻게 이해하고 답을 고르는지 확인하는 정성
            연구입니다. 이름·전화번호·이메일은 입력하지 않고 가명 코드만
            사용합니다.
          </p>
        </div>

        <div className={styles.setupGrid}>
          <label>
            <span>회차</span>
            <input
              maxLength={30}
              onChange={(event) => updateSetup("roundId", event.target.value)}
              placeholder="예: R1"
              value={setup.roundId}
            />
          </label>
          <label>
            <span>참여자 가명 코드</span>
            <input
              maxLength={40}
              onChange={(event) =>
                updateSetup("participantCode", event.target.value)
              }
              placeholder="예: P-R1-001"
              value={setup.participantCode}
            />
            <small>이름이나 연락처를 쓰지 마세요.</small>
          </label>
          <label>
            <span>진행자 코드</span>
            <input
              maxLength={40}
              onChange={(event) =>
                updateSetup("interviewerId", event.target.value)
              }
              placeholder="예: MOD-01"
              value={setup.interviewerId}
            />
          </label>
          <label>
            <span>표본 구분</span>
            <input
              maxLength={120}
              onChange={(event) =>
                updateSetup("samplingCells", event.target.value)
              }
              placeholder="예: 20대 · 직장인 · 모바일"
              value={setup.samplingCells}
            />
            <small>민감하거나 불필요한 정보는 적지 않습니다.</small>
          </label>
        </div>

        <fieldset className={styles.preflight}>
          <legend>시작 전 네 가지 확인</legend>
          <CheckRow
            checked={setup.consentConfirmed}
            label="연구 목적·보관기간·철회 방법을 안내하고 참여 동의를 받았습니다."
            onChange={(checked) => updateSetup("consentConfirmed", checked)}
          />
          <CheckRow
            checked={setup.withdrawalExplained}
            label="언제든 중단할 수 있고 불이익이 없다는 점을 설명했습니다."
            onChange={(checked) => updateSetup("withdrawalExplained", checked)}
          />
          <CheckRow
            checked={setup.recordingScopeConfirmed}
            label="녹음·화면 기록 여부와 사용 범위를 별도로 확인했습니다."
            onChange={(checked) =>
              updateSetup("recordingScopeConfirmed", checked)
            }
          />
          <CheckRow
            checked={setup.noDirectIdentifiers}
            label="이 기록에 이름·연락처·이메일 등 직접 식별정보를 넣지 않습니다."
            onChange={(checked) => updateSetup("noDirectIdentifiers", checked)}
          />
        </fieldset>

        <div className={styles.primaryActions}>
          <button
            disabled={!setupComplete}
            onClick={() => setSurface("participant")}
            type="button"
          >
            참여자 문항 시작
            <ArrowRight aria-hidden="true" size={17} />
          </button>
          {!setupComplete ? (
            <p>필수 정보와 네 가지 확인을 모두 완료하면 시작할 수 있습니다.</p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="m05-interview-title"
      className={styles.sessionPanel}
    >
      <div className={styles.interviewProgress}>
        <div>
          <p>문항별 후속 면담</p>
          <h2 id="m05-interview-title">
            {currentIndex + 1}. {currentItem.participantItem.promptText}
          </h2>
        </div>
        <span>
          기록 완료 {completeItemCount}/{m05FacilitatorDefinition.items.length}
        </span>
      </div>

      <div className={styles.screenBoundary}>
        <LockKeyhole aria-hidden="true" size={18} />
        <p>
          아래 목표 성향과 판정 기준은 참여자에게 보여주지 않습니다. 참여자의
          설명을 먼저 들은 뒤 진행자가 기록하세요.
        </p>
      </div>

      <div className={styles.itemContext}>
        <span>{currentItem.participantItem.contextLabel}</span>
        <strong>{currentItem.participantItem.promptText}</strong>
        <small>
          첫 응답:{" "}
          {formatParticipantResponse(
            participantSession,
            currentItem.opaqueItemId,
          )}
        </small>
      </div>

      <details className={styles.internalDetail}>
        <summary>진행자용 검토 목표와 통과 근거</summary>
        <dl>
          <div>
            <dt>내부 문항</dt>
            <dd>{currentItem.itemRevisionId}</dd>
          </div>
          <div>
            <dt>목표 세부 성향</dt>
            <dd>{currentItem.targetFacet}</dd>
          </div>
          <div>
            <dt>우선 확인</dt>
            <dd>{currentItem.priorityIssue}</dd>
          </div>
          <div>
            <dt>통과에 필요한 관찰</dt>
            <dd>{currentItem.passEvidence}</dd>
          </div>
        </dl>
      </details>

      <section className={styles.probes} aria-labelledby="probe-title">
        <div className={styles.subheading}>
          <h3 id="probe-title">반드시 물어볼 질문</h3>
          <span>답을 설명해 주지 말고 그대로 질문하세요.</span>
        </div>
        <div className={styles.probeGroupTitle}>
          <strong>모든 문항 공통 확인</strong>
          <span>뜻·기준·실제 경험·척도·판단 어려움·좋아 보이는 답</span>
        </div>
        {m05FacilitatorDefinition.commonProbes.map((question, index) => {
          const key = `common-${index}`;
          return (
            <ProbeRow
              checked={Boolean(currentRecord.probeChecks[key])}
              key={key}
              label={`공통 질문 ${index + 1}`}
              onChange={() => toggleProbe(key)}
              question={question}
            />
          );
        })}
        <div className={styles.probeGroupTitle}>
          <strong>이 문항 전용 확인</strong>
          <span>수정 의도와 인접 성향·환경 영향을 집중 확인합니다.</span>
        </div>
        <ProbeRow
          checked={Boolean(currentRecord.probeChecks.comprehension)}
          label="자기 말로 설명"
          onChange={() => toggleProbe("comprehension")}
          question={currentItem.comprehensionProbe}
        />
        <ProbeRow
          checked={Boolean(currentRecord.probeChecks.recall)}
          label="떠올린 실제 상황"
          onChange={() => toggleProbe("recall")}
          question={currentItem.recallProbe}
        />
        <ProbeRow
          checked={Boolean(currentRecord.probeChecks.judgment)}
          label="답을 고른 이유"
          onChange={() => toggleProbe("judgment")}
          question={currentItem.judgmentProbe}
        />
        <ProbeRow
          checked={Boolean(currentRecord.probeChecks.desirability)}
          label="좋아 보이는 답 영향"
          onChange={() => toggleProbe("desirability")}
          question={currentItem.desirabilityProbe}
        />
        <ProbeRow
          checked={Boolean(currentRecord.probeChecks.access)}
          label="경험·환경·접근 차이"
          onChange={() => toggleProbe("access")}
          question={currentItem.accessProbe}
        />
        {currentItem.seamProbe ? (
          <ProbeRow
            checked={Boolean(currentRecord.probeChecks.seam)}
            label="인접 성향 구분"
            onChange={() => toggleProbe("seam")}
            question={currentItem.seamProbe}
          />
        ) : null}
        {currentItem.constraintProbe ? (
          <ProbeRow
            checked={Boolean(currentRecord.probeChecks.constraint)}
            label="환경 제약 분리"
            onChange={() => toggleProbe("constraint")}
            question={currentItem.constraintProbe}
          />
        ) : null}
        {currentItem.experienceProbe ? (
          <ProbeRow
            checked={Boolean(currentRecord.probeChecks.experience)}
            label="경험 부족 처리"
            onChange={() => toggleProbe("experience")}
            question={currentItem.experienceProbe}
          />
        ) : null}
        {currentItem.wordingProbe ? (
          <ProbeRow
            checked={Boolean(currentRecord.probeChecks.wording)}
            label="표현 선호"
            onChange={() => toggleProbe("wording")}
            question={currentItem.wordingProbe}
          />
        ) : null}
      </section>

      <section className={styles.recordFields} aria-labelledby="record-title">
        <div className={styles.subheading}>
          <h3 id="record-title">가명 면담 기록</h3>
          <span>* 표시는 내보내기 전 필수입니다.</span>
        </div>
        <label className={styles.wideField}>
          <span>참여자가 자기 말로 설명한 뜻 *</span>
          <textarea
            onChange={(event) =>
              updateRecord("paraphraseSummary", event.target.value)
            }
            placeholder="해석을 덧붙이지 말고 참여자가 이해한 뜻을 요약하세요."
            rows={3}
            value={currentRecord.paraphraseSummary}
          />
        </label>
        <label className={styles.wideField}>
          <span>떠올린 상황 요약 *</span>
          <textarea
            onChange={(event) =>
              updateRecord("recalledSituationSummary", event.target.value)
            }
            placeholder="직접 식별정보 없이 어떤 종류의 상황인지 적으세요."
            rows={3}
            value={currentRecord.recalledSituationSummary}
          />
        </label>
        <label>
          <span>응답을 고른 주된 이유 *</span>
          <select
            onChange={(event) =>
              updateRecord("responseReasonCode", event.target.value)
            }
            value={currentRecord.responseReasonCode}
          >
            <option value="">선택하세요</option>
            <option value="TRAIT_PATTERN">평소 성향·반응</option>
            <option value="SITUATIONAL_CONSTRAINT">상황·환경 제약</option>
            <option value="ABILITY_OR_ACCESS">능력·기회·접근 차이</option>
            <option value="SOCIAL_DESIRABILITY">좋아 보이는 답</option>
            <option value="WORDING_OR_SCALE">문구·응답척도</option>
            <option value="MIXED_OR_UNCLEAR">혼합·구분 어려움</option>
          </select>
        </label>
        <label>
          <span>문제 심각도 *</span>
          <select
            onChange={(event) =>
              updateRecord(
                "severity",
                event.target.value as InterviewRecord["severity"],
              )
            }
            value={currentRecord.severity}
          >
            <option value="">선택하세요</option>
            <option value="S0_NOTE">S0 · 문제 없음</option>
            <option value="S1_MINOR">S1 · 가벼운 관찰</option>
            <option value="S2_MATERIAL">S2 · 수정·재검증 전 통과 금지</option>
            <option value="S3_CRITICAL">S3 · 즉시 보류·책임자 판정</option>
          </select>
        </label>
        <fieldset className={`${styles.issueCodes} ${styles.wideField}`}>
          <legend>발견한 문제 코드 *</legend>
          {[
            ["NONE", "특별한 문제 없음"],
            ["COMPREHENSION", "뜻 오해"],
            ["RECALL", "상황을 떠올리기 어려움"],
            ["JUDGMENT", "답 판단 기준이 다름"],
            ["RESPONSE_SCALE", "응답척도 문제"],
            ["DESIRABILITY", "좋아 보이는 답 영향"],
            ["ACCESS", "경험·환경·접근 차이"],
            ["ADJACENT_CONSTRUCT", "다른 성향으로 해석"],
            ["PRIVACY", "개인정보·불편 위험"],
          ].map(([code, label]) => (
            <label key={code}>
              <input
                checked={currentRecord.issueCodes.includes(code)}
                onChange={() => toggleIssueCode(code)}
                type="checkbox"
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <label>
          <span>좋아 보이는 방향 영향</span>
          <input
            onChange={(event) =>
              updateRecord("desirabilityDirection", event.target.value)
            }
            placeholder="어느 답이 더 좋아 보였는지"
            value={currentRecord.desirabilityDirection}
          />
        </label>
        <label>
          <span>환경·접근 메모</span>
          <input
            onChange={(event) =>
              updateRecord("accessNotes", event.target.value)
            }
            placeholder="개인을 알아볼 수 없게 요약"
            value={currentRecord.accessNotes}
          />
        </label>
        {currentItem.seamProbe ? (
          <label className={styles.wideField}>
            <span>인접 성향 구분 응답</span>
            <textarea
              onChange={(event) =>
                updateRecord("seamProbeSummary", event.target.value)
              }
              rows={2}
              value={currentRecord.seamProbeSummary}
            />
          </label>
        ) : null}
        {currentItem.constraintProbe ? (
          <label className={styles.wideField}>
            <span>환경 제약 분리 응답</span>
            <textarea
              onChange={(event) =>
                updateRecord("constraintProbeSummary", event.target.value)
              }
              rows={2}
              value={currentRecord.constraintProbeSummary}
            />
          </label>
        ) : null}
        {currentItem.experienceProbe ? (
          <label className={styles.wideField}>
            <span>경험 부족 처리 응답</span>
            <textarea
              onChange={(event) =>
                updateRecord("experienceProbeSummary", event.target.value)
              }
              rows={2}
              value={currentRecord.experienceProbeSummary}
            />
          </label>
        ) : null}
        {currentItem.wordingProbe ? (
          <label className={styles.wideField}>
            <span>표현 선호와 이유</span>
            <textarea
              onChange={(event) =>
                updateRecord("wordingPreference", event.target.value)
              }
              rows={2}
              value={currentRecord.wordingPreference}
            />
          </label>
        ) : null}
        <label className={styles.wideField}>
          <span>동의받은 짧은 원문 인용</span>
          <textarea
            onChange={(event) =>
              updateRecord("verbatimExcerpt", event.target.value)
            }
            placeholder="인용 동의를 받지 않았다면 비워 두세요."
            rows={2}
            value={currentRecord.verbatimExcerpt}
          />
        </label>
        <label>
          <span>이 세션의 문항 판정 *</span>
          <select
            onChange={(event) =>
              updateRecord("decision", event.target.value as InterviewDecision)
            }
            value={currentRecord.decision}
          >
            <option value="">선택하세요</option>
            <option value="KEEP_FOR_PILOT">파일럿 후보 유지</option>
            <option value="COPY_REVISE_RETEST">문구 수정 후 재검사</option>
            <option value="CONSTRUCT_REWRITE">구성개념부터 다시 작성</option>
            <option value="HOLD_FOR_SUBGROUP">특정 집단 근거 보강</option>
            <option value="EXCLUDE">후보 제외</option>
          </select>
        </label>
        <label className={styles.wideField}>
          <span>판정 근거 *</span>
          <textarea
            onChange={(event) =>
              updateRecord("evidenceSummary", event.target.value)
            }
            placeholder="어떤 참여자 설명과 관찰 때문에 이 판정을 내렸는지 적으세요."
            rows={3}
            value={currentRecord.evidenceSummary}
          />
        </label>
      </section>

      <div className={styles.itemNavigation}>
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={17} />
          이전 문항
        </button>
        {currentIndex < m05FacilitatorDefinition.items.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((index) => index + 1)}
            type="button"
          >
            다음 문항
            <ArrowRight aria-hidden="true" size={17} />
          </button>
        ) : null}
      </div>

      <div className={styles.exportPanel}>
        <div>
          <strong>세션 파일 내보내기</strong>
          <p>
            다섯 문항의 필수 질문·기록·판정을 모두 마치면 집계용 CSV와 감사용
            JSON을 내려받을 수 있습니다. 한 세션의 판정은 최종 승인이 아닙니다.
          </p>
        </div>
        <div className={styles.exportActions}>
          <button
            disabled={
              completeItemCount !== m05FacilitatorDefinition.items.length
            }
            onClick={exportSessionCsv}
            type="button"
          >
            <Download aria-hidden="true" size={17} />
            집계용 CSV 받기
          </button>
          <button
            disabled={
              completeItemCount !== m05FacilitatorDefinition.items.length
            }
            onClick={exportSessionJson}
            type="button"
          >
            감사용 JSON 받기
          </button>
        </div>
        <small>
          다음 단계: 여러 참여자 세션을 모아 반복되는 S2·S3 문제와 집단별 차이를
          판정합니다. `adjudicated_decision`은 이 화면에서 비워 두며, 측정
          책임자가 여러 세션을 함께 본 뒤에만 기록합니다.
        </small>
      </div>
    </section>
  );
}

function CheckRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label>
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}

function ProbeRow({
  checked,
  label,
  onChange,
  question,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
  question: string;
}) {
  return (
    <label className={styles.probeRow}>
      <input checked={checked} onChange={onChange} type="checkbox" />
      <span>
        <strong>{label}</strong>
        <small>{question}</small>
      </span>
    </label>
  );
}

function ensureRecord(record?: InterviewRecord): InterviewRecord {
  return (
    record ?? {
      accessNotes: "",
      constraintProbeSummary: "",
      decision: "",
      desirabilityDirection: "",
      evidenceSummary: "",
      experienceProbeSummary: "",
      issueCodes: [],
      paraphraseSummary: "",
      probeChecks: {},
      recalledSituationSummary: "",
      responseReasonCode: "",
      seamProbeSummary: "",
      severity: "",
      verbatimExcerpt: "",
      wordingPreference: "",
    }
  );
}

function isInterviewRecordComplete(
  record: InterviewRecord | undefined,
  item: (typeof m05FacilitatorDefinition.items)[number],
) {
  if (!record) return false;
  const commonProbesComplete = m05FacilitatorDefinition.commonProbes.every(
    (_, index) => record.probeChecks[`common-${index}`],
  );
  const baseProbesComplete = itemProbeKeys.every(
    (key) => record.probeChecks[key],
  );
  const optionalProbesComplete =
    (!item.seamProbe || record.probeChecks.seam) &&
    (!item.constraintProbe || record.probeChecks.constraint) &&
    (!item.experienceProbe || record.probeChecks.experience) &&
    (!item.wordingProbe || record.probeChecks.wording);
  return Boolean(
    commonProbesComplete &&
    baseProbesComplete &&
    optionalProbesComplete &&
    record.paraphraseSummary.trim() &&
    record.recalledSituationSummary.trim() &&
    record.responseReasonCode &&
    record.issueCodes.length > 0 &&
    record.severity &&
    record.decision &&
    record.evidenceSummary.trim(),
  );
}

function formatParticipantResponse(
  session: M05ParticipantSession | null,
  opaqueItemId: string,
) {
  const response = session?.responses[opaqueItemId];
  if (!response) return "기록 없음";
  const choice = response.currentChoice;
  if (choice.kind === "scale") {
    return `${choice.value}점${response.responseChanged ? " · 답 변경 있음" : ""}`;
  }
  return `판단 어려움 · ${
    {
      CONTEXT_VARIES: "상황마다 다름",
      NO_EXPERIENCE: "경험 부족",
      PREFER_NOT_TO_ANSWER: "응답하지 않음",
      WORDING_UNCLEAR: "문구 불명확",
    }[choice.reason]
  }`;
}

function downloadTextFile({
  content,
  fileName,
  mimeType,
}: {
  content: string;
  fileName: string;
  mimeType: string;
}) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFilePart(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-") || "session";
}

function latencyBucket(value?: number) {
  if (typeof value !== "number") return "NOT_RECORDED";
  if (value < 5_000) return "0_4999_MS";
  if (value < 15_000) return "5000_14999_MS";
  return "15000_PLUS_MS";
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
