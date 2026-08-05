"use client";

import {
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  LockKeyhole,
  RotateCcw,
  Save,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminConfirmDialog } from "@/features/admin/AdminConfirmDialog";
import {
  legalReleaseStatusLabel,
  legalReviewStatusLabel,
  legalReviewStatuses,
  type LegalReviewStatus,
} from "@/features/admin/legal-review-contract";
import type {
  AdminLegalDashboard,
  AdminLegalReviewItem,
} from "@/features/admin/server-admin-legal";
import shared from "./AdminShared.module.css";
import styles from "./AdminLegalReviewWorkspace.module.css";

type LegalAction =
  | "approve_release"
  | "reopen"
  | "request_changes"
  | "start_review"
  | "update_item"
  | "update_release";

const categoryCopy = {
  privacy: {
    description:
      "수집 항목·목적·공개 범위·보관·위탁·권리 행사가 실제 시스템과 일치하는지 확인합니다.",
    title: "개인정보 처리방침",
  },
  research: {
    description:
      "사용자 연구, OAuth, 마케팅·광고처럼 별도 동의와 외부 사업자가 연결되는 흐름을 확인합니다.",
    title: "연구·로그인·선택 기능",
  },
  terms: {
    description:
      "서비스 범위, 회원의 권리·의무, 커뮤니티 조치, 탈퇴와 책임 문구를 실제 기능과 비교합니다.",
    title: "이용약관",
  },
} as const;

export function AdminLegalReviewWorkspace({
  dashboard,
}: {
  dashboard: AdminLegalDashboard;
}) {
  const router = useRouter();
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [approvedByLabel, setApprovedByLabel] = useState(
    dashboard.release.approvedByLabel,
  );
  const [confirmation, setConfirmation] = useState<
    "approve_release" | "reopen" | null
  >(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [releaseDraft, setReleaseDraft] = useState({
    approvalEvidenceRef: dashboard.release.approvalEvidenceRef,
    changeSummary: dashboard.release.changeSummary,
    ownerLabel: dashboard.release.ownerLabel,
    reviewerLabel: dashboard.release.reviewerLabel,
    sourceCommitSha: dashboard.release.sourceCommitSha,
  });

  const completedCount = dashboard.items.filter((item) =>
    ["approved", "not_applicable"].includes(item.status),
  ).length;
  const readyCount = dashboard.items.filter(
    (item) => item.status !== "pending",
  ).length;
  const environmentReadyCount = dashboard.environment.filter(
    (item) => item.ready,
  ).length;
  const statusTone =
    dashboard.release.status === "approved"
      ? "success"
      : dashboard.release.status === "in_review"
        ? "brand"
        : dashboard.release.status === "changes_requested"
          ? "danger"
          : "warning";

  async function runAction({
    action,
    itemKey,
    payload = {},
    pendingKey = action,
  }: {
    action: LegalAction;
    itemKey?: string;
    payload?: Record<string, unknown>;
    pendingKey?: string;
  }) {
    if (!dashboard.available) return false;
    setMessage("");
    setPending(pendingKey);
    const response = await fetch("/api/admin/legal", {
      body: JSON.stringify({
        action,
        itemKey,
        payload,
        releaseId: dashboard.release.id,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const result = (await response.json().catch(() => null)) as {
      message?: string;
      ok?: boolean;
    } | null;
    if (!response.ok || !result?.ok) {
      setMessage(result?.message ?? "법률 검토 기록을 저장하지 못했습니다.");
      setPending(null);
      return false;
    }
    setPending(null);
    router.refresh();
    return true;
  }

  function confirmReleaseAction() {
    if (confirmation === "approve_release") {
      void runAction({
        action: "approve_release",
        payload: { approvalConfirmed, approvedByLabel },
      }).then((ok) => {
        if (ok) setConfirmation(null);
      });
      return;
    }
    if (confirmation === "reopen") {
      void runAction({ action: "reopen" }).then((ok) => {
        if (ok) setConfirmation(null);
      });
    }
  }

  return (
    <>
      <section
        aria-labelledby="legal-review-workflow-title"
        className={`${shared.panel} ${styles.workflowPanel}`}
      >
        <div className={styles.workflowHeader}>
          <div>
            <span>처음 진행하는 담당자를 위한 안내</span>
            <h2 id="legal-review-workflow-title">
              법률 검토, 이 순서대로 진행하세요
            </h2>
            <p>
              위에서 아래로 한 단계씩 완료하면 변호사 검토와 최종 승인 기록까지
              빠뜨리지 않고 진행할 수 있습니다.
            </p>
          </div>
          <em>6단계</em>
        </div>
        <div className={styles.workflow}>
          <WorkflowStep
            description="내부 책임자, 담당 변호사·법무법인, 현재 검토할 Git 커밋과 변경 요약을 입력하고 기본 정보를 저장합니다."
            effect="누가 어떤 제품 버전을 검토하는지 정해집니다."
            index="01"
            title="검토 기본 정보 입력"
          />
          <WorkflowStep
            description="15개 항목마다 내부 담당자와 화면 캡처·테스트 결과·문서처럼 확인할 증빙의 안전한 위치를 기록합니다. AI 사전검토 결과는 쟁점 목록으로만 첨부합니다."
            effect="변호사가 사실과 AI 사전검토의 한계를 바로 확인할 수 있습니다."
            index="02"
            title="담당자와 증빙 정리"
          />
          <WorkflowStep
            description="외부에 보낼 준비가 끝난 항목의 상태를 모두 ‘변호사 전달 준비’로 바꾸고 항목별로 저장합니다."
            effect="변호사 검토 시작 버튼을 사용할 수 있습니다."
            index="03"
            title="모든 항목 준비 완료"
          />
          <WorkflowStep
            description="검토 문서를 내려받아 담당 변호사에게 전달한 뒤 ‘변호사 검토 시작’을 눌러 현재 버전을 검토 중으로 전환합니다."
            effect="전달 시점과 검토 대상 버전이 고정됩니다."
            index="04"
            title="검토 패키지 전달"
          />
          <WorkflowStep
            description="변호사 의견에 따라 문구와 기능을 수정·재시험하고, 각 항목에 새 증빙을 연결한 뒤 ‘변호사 검토 완료’ 또는 ‘해당 없음’으로 저장합니다."
            effect="남은 수정 사항 없이 최종 승인할 준비가 됩니다."
            index="05"
            title="의견 반영과 항목 완료"
          />
          <WorkflowStep
            description="최종 승인자와 외부 승인 증빙 위치를 확인하고 확인란을 선택한 뒤 ‘최종 승인 기록’을 실행합니다."
            effect="법률 P0 증빙이 완성됩니다. 정책 게시와 운영 배포는 별도입니다."
            index="06"
            title="최종 승인 기록"
          />
        </div>
        <p className={styles.workflowFootnote}>
          중간에 수정 의견이 생기면 ‘수정 반영으로 전환’한 뒤 02단계부터 필요한
          항목만 다시 진행하세요. 기존 감사 기록은 유지됩니다.
        </p>
      </section>

      <section className={`${shared.panel} ${styles.releasePanel}`}>
        <div className={styles.releaseHeader}>
          <span className={styles.releaseIcon}>
            <FileCheck2 aria-hidden="true" size={22} strokeWidth={1.7} />
          </span>
          <div>
            <p>현재 법률 검토 릴리스</p>
            <h2>{dashboard.release.releaseKey}</h2>
            <span>
              이용약관 {dashboard.release.termsVersion} · 개인정보 처리방침{" "}
              {dashboard.release.privacyVersion}
            </span>
          </div>
          <em className={shared.status} data-tone={statusTone}>
            {legalReleaseStatusLabel(dashboard.release.status)}
          </em>
        </div>
        <div className={styles.releaseMetrics}>
          <Metric
            label="변호사 전달 준비"
            total={dashboard.items.length}
            value={readyCount}
          />
          <Metric
            label="변호사 검토 완료"
            total={dashboard.items.length}
            value={completedCount}
          />
          <Metric
            label="운영 사실 설정"
            total={dashboard.environment.length}
            value={environmentReadyCount}
          />
        </div>
      </section>

      {!dashboard.available ? (
        <section className={`${shared.error} ${styles.unavailable}`}>
          <ShieldAlert aria-hidden="true" size={22} strokeWidth={1.7} />
          <strong>
            검토 화면은 준비됐지만 저장 기능이 아직 연결되지 않았습니다
          </strong>
          <p>{dashboard.unavailableReason}</p>
          <code>202608050007_admin_legal_review_operations.sql</code>
          <div className={styles.setupGuide}>
            <strong>처음 한 번만 연결하는 방법</strong>
            <ol>
              <li>
                Supabase 프로젝트 소유자 또는 개발 담당자가 SQL Editor를 엽니다.
              </li>
              <li>
                위 마이그레이션 파일의 전체 내용을 새 쿼리에 붙여 넣고
                실행합니다.
              </li>
              <li>
                관리자 시스템 상태에서 법률 검토 저장소 2개와 상태 변경 기능이
                정상인지 확인한 뒤 이 화면을 새로고침합니다.
              </li>
            </ol>
            <Link href="/admin/system">
              시스템 상태에서 연결 확인
              <ArrowRight aria-hidden="true" size={14} />
            </Link>
          </div>
        </section>
      ) : null}

      <section className={`${shared.panel} ${styles.boundary}`}>
        <LockKeyhole aria-hidden="true" size={20} strokeWidth={1.7} />
        <div>
          <strong>AI 사전검토와 변호사 승인은 서로 다른 단계입니다</strong>
          <p>
            AI는 공식 자료와 코드를 대조해 쟁점을 찾을 뿐 승인 상태를 만들 수
            없습니다. 내부 담당자는 실제 제품 사실과 증빙을 정리하고, 담당
            변호사가 문서와 기능의 적정성을 판단합니다. 메모에는 자문 원문이나
            민감한 계약 내용을 복사하지 말고 안전한 문서 보관 위치만 남기세요.
          </p>
        </div>
      </section>

      <section className={`${shared.panel} ${styles.documentPanel}`}>
        <div className={shared.panelHeader}>
          <h2>변호사 검토 패키지</h2>
          <button
            className={styles.downloadButton}
            onClick={() => downloadReviewPackage(dashboard)}
            type="button"
          >
            <Download aria-hidden="true" size={15} />
            검토 문서 받기
          </button>
        </div>
        <div className={styles.documentGrid}>
          {dashboard.documents.map((document) => (
            <article key={document.id}>
              <FileText aria-hidden="true" size={20} strokeWidth={1.7} />
              <div>
                <strong>{document.title}</strong>
                <span>
                  {document.version} · {document.effectiveDate} ·{" "}
                  {document.sections.length}개 항목
                </span>
              </div>
              <Link href={document.href} target="_blank">
                현재 문서 열기
                <ExternalLink aria-hidden="true" size={14} />
              </Link>
            </article>
          ))}
        </div>
        <p className={styles.packageGuide}>
          내려받은 Markdown에는 현재 정책 전문, 검토 항목, 상태와 증빙 목록이
          함께 들어 있습니다. 담당 변호사는 문서에 직접 의견을 남기고, 관리자는
          최종본의 안전한 보관 위치만 이 화면에 기록하세요.
        </p>
      </section>

      <section className={`${shared.panel} ${styles.environmentPanel}`}>
        <div className={shared.panelHeader}>
          <h2>정책 문구와 대조할 운영 사실</h2>
          <span>
            {environmentReadyCount}/{dashboard.environment.length} 설정
          </span>
        </div>
        <div className={styles.environmentGrid}>
          {dashboard.environment.map((item) => (
            <article data-ready={item.ready} key={item.key}>
              <span aria-hidden="true">{item.ready ? "확인" : "미설정"}</span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
        <p className={styles.environmentNote}>
          값이 설정됐다는 사실만 표시하며 실제 이름·이메일·비밀키는 관리자
          화면에 노출하지 않습니다. 담당 변호사에게는 필요한 공개 정보만 별도
          전달하세요.
        </p>
      </section>

      <section className={`${shared.panel} ${styles.releaseForm}`}>
        <div className={shared.panelHeader}>
          <h2>검토 기본 정보</h2>
          <span>외부 전달 전 저장</span>
        </div>
        <div className={styles.releaseFormGrid}>
          <Field
            label="내부 책임자"
            onChange={(value) =>
              setReleaseDraft((current) => ({ ...current, ownerLabel: value }))
            }
            placeholder="예: 제품·개인정보 책임자 코드"
            value={releaseDraft.ownerLabel}
          />
          <Field
            label="담당 변호사·법무법인"
            onChange={(value) =>
              setReleaseDraft((current) => ({
                ...current,
                reviewerLabel: value,
              }))
            }
            placeholder="예: 법무법인과 담당 변호사 참조 코드"
            value={releaseDraft.reviewerLabel}
          />
          <Field
            label="검토 대상 코드 버전"
            onChange={(value) =>
              setReleaseDraft((current) => ({
                ...current,
                sourceCommitSha: value,
              }))
            }
            placeholder="Git commit SHA"
            value={releaseDraft.sourceCommitSha}
          />
          <Field
            label="변호사 승인 증빙 위치"
            onChange={(value) =>
              setReleaseDraft((current) => ({
                ...current,
                approvalEvidenceRef: value,
              }))
            }
            placeholder="안전한 문서함의 문서 ID·경로"
            value={releaseDraft.approvalEvidenceRef}
          />
          <label className={styles.wideField}>
            <span>변경 요약</span>
            <textarea
              maxLength={2000}
              onChange={(event) =>
                setReleaseDraft((current) => ({
                  ...current,
                  changeSummary: event.target.value,
                }))
              }
              placeholder="이 버전에서 기능·데이터 처리·정책 문구가 어떻게 바뀌었는지 요약하세요."
              rows={4}
              value={releaseDraft.changeSummary}
            />
          </label>
        </div>
        <div className={styles.formActions}>
          <button
            disabled={
              !dashboard.available ||
              Boolean(pending) ||
              ["approved", "superseded"].includes(dashboard.release.status)
            }
            onClick={() =>
              void runAction({
                action: "update_release",
                payload: releaseDraft,
              })
            }
            type="button"
          >
            <Save aria-hidden="true" size={15} />
            기본 정보 저장
          </button>
          <p>
            승인 증빙은 이메일 원문이나 계약서를 붙여 넣는 칸이 아닙니다. 접근이
            제한된 문서함의 참조값만 기록하세요.
          </p>
        </div>
      </section>

      {(["terms", "privacy", "research"] as const).map((category) => {
        const items = dashboard.items.filter(
          (item) => item.category === category,
        );
        return (
          <section
            className={`${shared.panel} ${styles.itemSection}`}
            key={category}
          >
            <div className={styles.itemSectionHeader}>
              <div>
                <h2>{categoryCopy[category].title}</h2>
                <p>{categoryCopy[category].description}</p>
              </div>
              <span>
                {
                  items.filter((item) =>
                    ["approved", "not_applicable"].includes(item.status),
                  ).length
                }
                /{items.length} 완료
              </span>
            </div>
            <div className={styles.itemList}>
              {items.map((item, index) => (
                <LegalItemEditor
                  available={dashboard.available}
                  disabled={
                    Boolean(pending) ||
                    ["approved", "superseded"].includes(
                      dashboard.release.status,
                    )
                  }
                  index={index + 1}
                  item={item}
                  key={item.itemKey}
                  onSave={(draft) =>
                    runAction({
                      action: "update_item",
                      itemKey: item.itemKey,
                      payload: draft,
                      pendingKey: `item:${item.itemKey}`,
                    })
                  }
                  pending={pending === `item:${item.itemKey}`}
                />
              ))}
            </div>
          </section>
        );
      })}

      <section className={`${shared.panel} ${styles.approvalPanel}`}>
        <div>
          <p>출시 게이트 기록</p>
          <h2>변호사 법률 검토 최종 승인</h2>
          <span>
            모든 필수 항목, 검토 대상 코드, 변호사 승인 증빙과 승인자를 확인한
            뒤에만 완료합니다.
          </span>
        </div>
        {dashboard.release.status === "in_review" ? (
          <div className={styles.approvalInput}>
            <Field
              label="변호사 최종 승인자"
              onChange={setApprovedByLabel}
              placeholder="담당 변호사 또는 법무법인의 승인 참조"
              value={approvedByLabel}
            />
            <label>
              <input
                checked={approvalConfirmed}
                onChange={(event) => setApprovalConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>
                담당 변호사가 이 코드 버전의 이용약관·개인정보 처리방침과 실제
                기능을 검토했고, 승인 증빙의 보관 위치를 확인했습니다.
              </span>
            </label>
          </div>
        ) : null}
        <div className={styles.approvalActions}>
          {dashboard.release.status === "draft" ||
          dashboard.release.status === "changes_requested" ? (
            <button
              disabled={!dashboard.available || Boolean(pending)}
              onClick={() => void runAction({ action: "start_review" })}
              type="button"
            >
              변호사 검토 시작
              <ArrowRight aria-hidden="true" size={16} />
            </button>
          ) : null}
          {dashboard.release.status === "in_review" ? (
            <>
              <button
                className={styles.secondaryButton}
                disabled={!dashboard.available || Boolean(pending)}
                onClick={() => void runAction({ action: "request_changes" })}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={15} />
                수정 반영으로 전환
              </button>
              <button
                disabled={
                  !dashboard.available ||
                  !approvalConfirmed ||
                  !approvedByLabel.trim() ||
                  Boolean(pending)
                }
                onClick={() => setConfirmation("approve_release")}
                type="button"
              >
                <Check aria-hidden="true" size={15} />
                최종 승인 기록
              </button>
            </>
          ) : null}
          {dashboard.release.status === "approved" ? (
            <button
              className={styles.secondaryButton}
              disabled={!dashboard.available || Boolean(pending)}
              onClick={() => setConfirmation("reopen")}
              type="button"
            >
              변경 검토 다시 열기
            </button>
          ) : null}
        </div>
        <small>
          최종 승인 기록은 법률 P0 증빙을 완성할 뿐입니다. 정책 화면의 준비 상태
          해제, 검색 노출, OAuth 공개, measurement release 활성화와 운영 배포는
          각각 별도 승인 절차입니다.
        </small>
        {message ? (
          <p className={styles.message} role="alert">
            {message}
          </p>
        ) : null}
      </section>

      <section className={`${shared.panel} ${styles.references}`}>
        <div className={shared.panelHeader}>
          <h2>공식 기준 확인</h2>
          <span>법률 검토자가 최종 적용 여부 판단</span>
        </div>
        <div>
          {dashboard.references.map((reference) => (
            <a
              href={reference.href}
              key={reference.href}
              rel="noreferrer noopener"
              target="_blank"
            >
              {reference.label}
              <ExternalLink aria-hidden="true" size={14} />
            </a>
          ))}
        </div>
        <p>
          공식 자료는 검토 출발점이며 뉴앙의 구체적 적용 결론이 아닙니다. 사업자
          형태, 출시 국가, 유료 기능, 광고·연구 범위가 바뀌면 변호사 검토 범위도
          다시 확정하세요.
        </p>
      </section>

      <AdminConfirmDialog
        confirmLabel={
          confirmation === "approve_release" ? "최종 승인 기록" : "다시 열기"
        }
        description={
          confirmation === "approve_release"
            ? "모든 항목의 변호사 검토 결과와 승인 증빙이 이 코드 버전에 대응하는지 다시 확인합니다. 승인해도 정책이 자동 게시되거나 서비스가 배포되지는 않습니다."
            : "승인 상태를 해제하고 수정 반영 단계로 되돌립니다. 기존 감사 기록은 삭제되지 않습니다."
        }
        onCancel={() => setConfirmation(null)}
        onConfirm={confirmReleaseAction}
        open={Boolean(confirmation)}
        pending={Boolean(pending)}
        title={
          confirmation === "approve_release"
            ? "외부 법률 승인을 기록할까요?"
            : "법률 검토를 다시 열까요?"
        }
        tone={confirmation === "approve_release" ? "brand" : "danger"}
      />
    </>
  );
}

function LegalItemEditor({
  available,
  disabled,
  index,
  item,
  onSave,
  pending,
}: {
  available: boolean;
  disabled: boolean;
  index: number;
  item: AdminLegalReviewItem;
  onSave: (draft: {
    evidenceRef: string;
    note: string;
    ownerLabel: string;
    status: LegalReviewStatus;
  }) => Promise<boolean>;
  pending: boolean;
}) {
  const [draft, setDraft] = useState({
    evidenceRef: item.evidenceRef,
    note: item.note,
    ownerLabel: item.ownerLabel,
    status: item.status,
  });
  const saveDisabled =
    !available ||
    disabled ||
    pending ||
    (draft.status === "approved" && !draft.evidenceRef.trim()) ||
    (draft.status === "not_applicable" && !draft.note.trim());

  return (
    <article className={styles.itemCard} data-status={draft.status}>
      <header>
        <span>{String(index).padStart(2, "0")}</span>
        <div>
          <strong>{item.title}</strong>
          <small>기본 담당: {item.ownerRole}</small>
        </div>
        <em className={shared.status} data-tone={itemStatusTone(draft.status)}>
          {legalReviewStatusLabel(draft.status)}
        </em>
      </header>
      <p>{item.question}</p>
      <dl>
        <div>
          <dt>확인할 증빙</dt>
          <dd>{item.evidenceHint}</dd>
        </div>
        <div>
          <dt>완료 기준</dt>
          <dd>
            변호사 검토 의견을 반영하고 실제 기능과 다시 대조한 뒤, 승인 또는
            해당 없음의 근거를 남깁니다.
          </dd>
        </div>
      </dl>
      <div className={styles.itemForm}>
        <label>
          <span>상태</span>
          <select
            disabled={disabled}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                status: event.target.value as LegalReviewStatus,
              }))
            }
            value={draft.status}
          >
            {legalReviewStatuses.map((status) => (
              <option key={status} value={status}>
                {legalReviewStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <Field
          disabled={disabled}
          label="내부 담당자"
          onChange={(value) =>
            setDraft((current) => ({ ...current, ownerLabel: value }))
          }
          placeholder="담당자 이름 또는 운영 코드"
          value={draft.ownerLabel}
        />
        <Field
          disabled={disabled}
          label="증빙 위치"
          onChange={(value) =>
            setDraft((current) => ({ ...current, evidenceRef: value }))
          }
          placeholder="문서 ID·테스트 보고서·안전한 경로"
          value={draft.evidenceRef}
        />
        <label className={styles.wideField}>
          <span>검토 메모</span>
          <textarea
            disabled={disabled}
            maxLength={1500}
            onChange={(event) =>
              setDraft((current) => ({ ...current, note: event.target.value }))
            }
            placeholder="결론과 남은 조치만 요약하세요. 비밀 자문 원문은 넣지 않습니다."
            rows={3}
            value={draft.note}
          />
        </label>
      </div>
      <footer>
        <span>
          {draft.status === "approved"
            ? "변호사 검토 완료에는 증빙 위치가 필요합니다."
            : draft.status === "not_applicable"
              ? "해당 없음에는 판단 이유가 필요합니다."
              : "저장 후 변경 내용은 운영 기록에 남습니다."}
        </span>
        <button
          disabled={saveDisabled}
          onClick={() => void onSave(draft)}
          type="button"
        >
          <Save aria-hidden="true" size={14} />
          {pending ? "저장 중" : "항목 저장"}
        </button>
      </footer>
    </article>
  );
}

function Metric({
  label,
  total,
  value,
}: {
  label: string;
  total: number;
  value: number;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>/{total}</small>
    </div>
  );
}

function WorkflowStep({
  description,
  effect,
  index,
  title,
}: {
  description: string;
  effect: string;
  index: string;
  title: string;
}) {
  return (
    <article>
      <span>{index}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
        <small>완료하면 · {effect}</small>
      </div>
    </article>
  );
}

function Field({
  disabled = false,
  label,
  onChange,
  placeholder,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function itemStatusTone(status: LegalReviewStatus) {
  if (status === "approved") return "success";
  if (status === "changes_requested") return "danger";
  if (status === "in_review" || status === "ready") return "brand";
  return "warning";
}

function downloadReviewPackage(dashboard: AdminLegalDashboard) {
  const content = createReviewPackage(dashboard);
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/markdown;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${dashboard.release.releaseKey}-review-package.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function createReviewPackage(dashboard: AdminLegalDashboard) {
  const lines = [
    `# ${dashboard.release.releaseKey} 법률 검토 패키지`,
    "",
    `- 생성 시각: ${dashboard.generatedAt}`,
    `- 정책 버전: ${dashboard.release.policyVersion}`,
    `- 검토 대상 코드: ${dashboard.release.sourceCommitSha || "미입력"}`,
    `- 내부 책임자: ${dashboard.release.ownerLabel || "미입력"}`,
    `- 담당 변호사·법무법인: ${dashboard.release.reviewerLabel || "미입력"}`,
    "",
    "> AI 사전검토는 쟁점 정리일 뿐 법률 자문이나 변호사 최종 승인 자체가 아닙니다.",
    "",
    "## 검토 항목",
    "",
    ...dashboard.items.flatMap((item) => [
      `### ${item.title}`,
      "",
      `- 구분: ${categoryCopy[item.category].title}`,
      `- 질문: ${item.question}`,
      `- 상태: ${legalReviewStatusLabel(item.status)}`,
      `- 내부 담당자: ${item.ownerLabel || "미입력"}`,
      `- 확인할 증빙: ${item.evidenceHint}`,
      `- 증빙 위치: ${item.evidenceRef || "미입력"}`,
      `- 검토 메모: ${item.note || "미입력"}`,
      "",
    ]),
  ];
  for (const document of dashboard.documents) {
    lines.push(`## ${document.title}`, "");
    lines.push(
      `- 버전: ${document.version}`,
      `- 시행 예정일: ${document.effectiveDate}`,
      "",
    );
    for (const section of document.sections) {
      lines.push(`### ${section.title}`, "");
      for (const item of section.items) lines.push(`- ${item}`);
      lines.push("");
    }
  }
  lines.push("## 공식 참고자료", "");
  for (const reference of dashboard.references) {
    lines.push(`- [${reference.label}](${reference.href})`);
  }
  lines.push("");
  return lines.join("\n");
}
