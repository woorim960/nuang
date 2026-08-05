"use client";

import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Copy,
  FileClock,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  coreDomainDefinitions,
  coreFacetDefinitions,
} from "@/features/assessment/quick-core-seed";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import { candidateQuickCoreAssessment } from "@/features/assessment/candidate-quick-core-seed";
import {
  isRepresentativeTraitTarget,
  resolveFreeTopicTraitRule,
  type FreeTopicAnswer,
  type FreeTopicAssessment,
  type FreeTopicQuestion,
} from "@/features/assessment/free-topic-assessments";
import { FreeTopicQuestionSurface } from "@/features/assessment/FreeTopicQuestionSurface";
import { FreeTopicResultView } from "@/features/assessment/FreeTopicResultView";
import { CoreAssessmentQuestionSurface } from "@/features/assessment/CoreAssessmentQuestionSurface";
import { FriendTraitMatch } from "@/features/assessment/FriendTraitMatch";
import type { FriendTraitMatchContent } from "@/features/assessment/friend-trait-match-content";
import {
  buildFreeTopicPreviewResult,
  type FreeTopicPreviewTraitImpactScenario,
} from "@/features/assessment/free-topic-preview-result";
import {
  AssessmentBottomSheet,
  AssessmentSheetAction,
  AssessmentSheetActions,
  AssessmentUnsureSheet,
} from "@/features/assessment/AssessmentQuestionControls";
import type { AssessmentAnswer } from "@/features/assessment/types";
import type { ResponseValue } from "@/lib/scoring/types";
import { LabResultView } from "@/features/lab/LabResultView";
import { LabQuestionSurface } from "@/features/lab/LabQuestionSurface";
import type { LabAnswer, LabAssessment } from "@/features/lab/lab-assessments";
import {
  QuestionRunner,
  RoomResult,
} from "@/features/together-balance/BalanceGameRoom";
import type { BalancePack } from "@/features/together-balance/types";
import { CoreResultReportTemplate } from "@/features/result/unified-core-report/CoreResultReportTemplate";
import {
  buildBalancePreviewRoom,
  buildBalanceQuestionPreviewRoom,
  buildCorePreviewModel,
  buildLabPreviewResult,
} from "./assessment-studio-preview";

import type {
  AssessmentStudioDashboard,
  AssessmentStudioDocument,
  AssessmentStudioEntry,
  AssessmentStudioStatus,
  AssessmentStudioSubtype,
} from "./assessment-studio-contract";
import { validateAssessmentStudioDocument } from "./assessment-studio-validation";
import styles from "./AdminAssessmentStudio.module.css";

type StudioTab =
  "basics" | "questions" | "results" | "preview" | "quality" | "release";
type Notice = { tone: "success" | "error"; text: string } | null;

const categoryOptions = [
  { id: "all", label: "전체" },
  { id: "core", label: "코어" },
  { id: "topic", label: "주제 검사" },
  { id: "lab", label: "별난 연구" },
  { id: "together", label: "함께하기" },
] as const;

const subtypeLabels: Record<AssessmentStudioSubtype, string> = {
  balance_pack: "밸런스 게임 팩",
  core_precision: "정밀 코어",
  core_quick: "빠른 코어",
  free_topic: "주제 검사",
  friend_match: "친구 성향 맞히기",
  odd_lab: "별난 연구",
};

const statusLabels: Record<AssessmentStudioStatus, string> = {
  archived: "보관됨",
  draft: "작성 중",
  in_review: "검토 중",
  paused: "일시 중지",
  published: "게시됨",
};

const createOptions: Array<{
  copy: string;
  subtype: AssessmentStudioSubtype;
}> = [
  { copy: "빠른 코어 검사", subtype: "core_quick" },
  { copy: "정밀 코어 검사", subtype: "core_precision" },
  { copy: "주제 검사", subtype: "free_topic" },
  { copy: "별난 연구", subtype: "odd_lab" },
  { copy: "밸런스 게임 팩", subtype: "balance_pack" },
  { copy: "친구 성향 맞히기", subtype: "friend_match" },
];

export function AdminAssessmentStudio({
  initialDashboard,
}: {
  initialDashboard: AssessmentStudioDashboard;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialDashboard.entries);
  const [selectedKey, setSelectedKey] = useState(
    initialDashboard.entries[0]?.sourceKey ?? "",
  );
  const [draft, setDraft] = useState<AssessmentStudioDocument | null>(
    initialDashboard.entries[0]?.document ?? null,
  );
  const [activeTab, setActiveTab] = useState<StudioTab>("basics");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("active");
  const [query, setQuery] = useState("");
  const [questionQuery, setQuestionQuery] = useState("");
  const [questionPage, setQuestionPage] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const selected =
    entries.find((entry) => entry.sourceKey === selectedKey) ?? null;
  const issues = useMemo(
    () => (draft ? validateAssessmentStudioDocument(draft) : []),
    [draft],
  );
  const counts = useMemo(
    () => ({
      blocked: entries.filter((entry) =>
        entry.validationIssues.some((issue) => issue.severity === "blocker"),
      ).length,
      inReview: entries.filter((entry) => entry.status === "in_review").length,
      published: entries.filter((entry) => entry.status === "published").length,
      total: entries.length,
    }),
    [entries],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko-KR");
    return entries.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false;
      if (status === "active" && entry.status === "archived") return false;
      if (status !== "all" && status !== "active" && entry.status !== status)
        return false;
      if (!normalized) return true;
      return `${entry.title} ${entry.slug} ${subtypeLabels[entry.subtype]}`
        .toLocaleLowerCase("ko-KR")
        .includes(normalized);
    });
  }, [category, entries, query, status]);

  function selectEntry(entry: AssessmentStudioEntry) {
    if (
      dirty &&
      !window.confirm("저장하지 않은 변경을 버리고 다른 검사를 열까요?")
    ) {
      return;
    }
    setSelectedKey(entry.sourceKey);
    setDraft(clone(entry.document));
    setDirty(false);
    setActiveTab("basics");
    setQuestionPage(0);
    setQuestionQuery("");
    setNote("");
    setNotice(null);
  }

  function change(next: AssessmentStudioDocument) {
    syncPayloadIdentity(next);
    setDraft(next);
    setDirty(true);
    setNotice(null);
  }

  async function save() {
    if (!draft || !selected) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/experiences", {
        body: JSON.stringify({
          action: "save",
          displayOrder: selected.displayOrder,
          document: draft,
          entryId: selected.id,
          expectedRevision: selected.id ? selected.workingRevision : null,
          sourceOrigin: selected.sourceOrigin,
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const body = await response.json();
      if (!response.ok || !body.ok)
        throw new Error(body.message ?? "저장하지 못했습니다.");
      const entryId = String(body.data.entryId);
      const revision = Number(body.data.revision);
      setEntries((current) =>
        current.map((entry) =>
          entry.sourceKey === selected.sourceKey
            ? {
                ...entry,
                document: clone(draft),
                hasUnpublishedChanges: true,
                id: entryId,
                summary: draft.description,
                title: draft.title,
                validationIssues: body.issues ?? issues,
                workingRevision: revision,
              }
            : entry,
        ),
      );
      setDirty(false);
      setNotice({ tone: "success", text: "작업본을 안전하게 저장했습니다." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "저장하지 못했습니다.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function manage(action: string, releaseId?: string) {
    if (!selected?.id) {
      setNotice({ tone: "error", text: "먼저 작업본을 저장해 주세요." });
      return;
    }
    if (dirty) {
      setNotice({ tone: "error", text: "변경 내용을 먼저 저장해 주세요." });
      return;
    }
    if (note.trim().length < 5) {
      setNotice({ tone: "error", text: "작업 사유를 5자 이상 적어 주세요." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/experiences", {
        body: JSON.stringify({
          action,
          entryId: selected.id,
          note: note.trim(),
          ...(releaseId ? { releaseId } : {}),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok || !body.ok)
        throw new Error(body.message ?? "처리하지 못했습니다.");
      setNotice({ tone: "success", text: actionSuccessCopy(action) });
      setNote("");
      setDirty(false);
      await refreshDashboard(selected.sourceKey);
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "처리하지 못했습니다.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function refreshDashboard(preferredKey: string) {
    const response = await fetch("/api/admin/experiences", {
      cache: "no-store",
      method: "GET",
    });
    if (!response.ok) return;
    const body = (await response.json()) as {
      dashboard?: AssessmentStudioDashboard;
      ok?: boolean;
    };
    if (!body.ok || !body.dashboard) return;
    setEntries(body.dashboard.entries);
    const next =
      body.dashboard.entries.find(
        (entry) => entry.sourceKey === preferredKey,
      ) ?? body.dashboard.entries[0];
    if (next) {
      setSelectedKey(next.sourceKey);
      setDraft(clone(next.document));
    }
  }

  function duplicateSelected() {
    if (!draft || !selected) return;
    const suffix = crypto.randomUUID().slice(0, 6);
    const next = clone(draft);
    next.slug = `${draft.slug}-copy-${suffix}`;
    next.title = `${draft.title} 복사본`;
    syncPayloadIdentity(next);
    const entry: AssessmentStudioEntry = {
      ...selected,
      archivedAt: null,
      document: next,
      hasUnpublishedChanges: true,
      id: null,
      publishedAt: null,
      publishedReleaseId: null,
      publishedReleaseKey: null,
      releases: [],
      slug: next.slug,
      sourceKey: `${next.category}:${next.slug}`,
      sourceOrigin: "operator",
      status: "draft",
      summary: next.description,
      title: next.title,
      updatedAt: null,
      validationIssues: validateAssessmentStudioDocument(next),
      workingRevision: 1,
    };
    setEntries((current) => [entry, ...current]);
    setSelectedKey(entry.sourceKey);
    setDraft(next);
    setDirty(true);
    setActiveTab("basics");
    setNotice({
      tone: "success",
      text: "복사본을 만들었습니다. 주소와 내용을 확인한 뒤 저장하세요.",
    });
  }

  function createFromSubtype(subtype: AssessmentStudioSubtype) {
    const template = entries.find((entry) => entry.subtype === subtype);
    if (!template) {
      setNotice({
        tone: "error",
        text: "해당 유형의 기본 템플릿을 찾지 못했습니다.",
      });
      return;
    }
    if (
      dirty &&
      !window.confirm("저장하지 않은 변경을 버리고 새 검사를 만들까요?")
    ) {
      return;
    }
    const suffix = crypto.randomUUID().slice(0, 6);
    const next = clone(template.document);
    next.slug = `new-${subtype.replaceAll("_", "-")}-${suffix}`;
    next.title = `새 ${subtypeLabels[subtype]}`;
    next.caption =
      "고객이 검사 목적을 바로 이해할 수 있는 한 줄 설명을 입력하세요.";
    next.description =
      "검사의 대상과 사용자가 얻게 될 결과를 구체적으로 설명하세요.";
    syncPayloadIdentity(next);
    const entry: AssessmentStudioEntry = {
      ...template,
      archivedAt: null,
      document: next,
      hasUnpublishedChanges: true,
      id: null,
      publishedAt: null,
      publishedReleaseId: null,
      publishedReleaseKey: null,
      releases: [],
      slug: next.slug,
      sourceKey: `${next.category}:${next.slug}`,
      sourceOrigin: "operator",
      status: "draft",
      summary: next.description,
      title: next.title,
      updatedAt: null,
      validationIssues: validateAssessmentStudioDocument(next),
      workingRevision: 1,
    };
    setEntries((current) => [entry, ...current]);
    setSelectedKey(entry.sourceKey);
    setDraft(next);
    setDirty(true);
    setCreateOpen(false);
    setActiveTab("basics");
    setQuestionPage(0);
    setQuestionQuery("");
    setNotice({
      tone: "success",
      text: "안전한 기본 템플릿으로 새 작업본을 만들었습니다. 내용을 완성한 뒤 저장하세요.",
    });
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>검사·놀이 콘텐츠 제작과 릴리스</p>
          <h1>검사 스튜디오</h1>
          <span>
            문항부터 결과까지 한 버전으로 검수하고 안전하게 공개합니다.
          </span>
        </div>
        <div className={styles.headerMetrics}>
          <Metric label="전체" value={counts.total} />
          <Metric label="게시" value={counts.published} />
          <Metric label="검토" value={counts.inReview} />
          <Metric label="차단" value={counts.blocked} danger />
        </div>
      </header>

      {!initialDashboard.databaseAvailable ? (
        <section className={styles.setupBanner}>
          <CircleAlert aria-hidden="true" size={18} />
          <div>
            <strong>현재는 기본 콘텐츠를 읽기 전용으로 보여주고 있어요.</strong>
            <span>
              202608030005 마이그레이션을 적용하면 저장·검토·게시 기능이
              열립니다.
            </span>
          </div>
        </section>
      ) : null}

      <div className={styles.layout}>
        <aside className={styles.catalog}>
          <div className={styles.catalogTop}>
            <div>
              <strong>검사 카탈로그</strong>
              <span>{filtered.length}개 표시</span>
            </div>
            <button
              onClick={() => setCreateOpen((current) => !current)}
              type="button"
            >
              <Plus aria-hidden="true" size={16} />
              새로 만들기
            </button>
          </div>
          {createOpen ? (
            <div className={styles.createMenu}>
              <strong>만들 검사 유형</strong>
              <span>유형별 안전한 기본 구조로 시작합니다.</span>
              <div>
                {createOptions.map((option) => (
                  <button
                    key={option.subtype}
                    onClick={() => createFromSubtype(option.subtype)}
                    type="button"
                  >
                    {option.copy}
                    <ChevronRight aria-hidden="true" size={15} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <label className={styles.search}>
            <Search aria-hidden="true" size={16} />
            <input
              aria-label="검사 검색"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="검사명·주소 검색"
              value={query}
            />
          </label>
          <div className={styles.filters}>
            <select
              aria-label="검사 카테고리"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label="검사 상태"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              <option value="active">운영 목록</option>
              <option value="all">전체 상태</option>
              <option value="draft">작성 중</option>
              <option value="in_review">검토 중</option>
              <option value="published">게시됨</option>
              <option value="paused">일시 중지</option>
              <option value="archived">보관됨</option>
            </select>
          </div>
          <div className={styles.entryList}>
            {filtered.map((entry) => (
              <button
                className={styles.entry}
                data-active={entry.sourceKey === selectedKey}
                key={entry.sourceKey}
                onClick={() => selectEntry(entry)}
                type="button"
              >
                <span className={styles.entryLine}>
                  <small>{subtypeLabels[entry.subtype]}</small>
                  <Status status={entry.status} />
                </span>
                <strong>{entry.title}</strong>
                <span className={styles.entryMeta}>
                  {entry.itemCount}문항 · 결과 {entry.resultCount}개
                </span>
                {entry.validationIssues.some(
                  (item) => item.severity === "blocker",
                ) ? (
                  <em>
                    <CircleAlert aria-hidden="true" size={13} /> 발행 차단 확인
                  </em>
                ) : null}
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.workspace}>
          {!draft || !selected ? (
            <div className={styles.empty}>관리할 검사를 선택해 주세요.</div>
          ) : (
            <>
              <div className={styles.workspaceHeader}>
                <div>
                  <span>
                    {subtypeLabels[draft.subtype]} · {draft.slug}
                  </span>
                  <h2>{draft.title}</h2>
                  <p>
                    {dirty
                      ? "저장하지 않은 변경이 있습니다."
                      : selected.hasUnpublishedChanges
                        ? "공개본 이후 변경된 작업본입니다."
                        : "현재 작업본이 안전하게 저장되어 있습니다."}
                  </p>
                </div>
                <div className={styles.workspaceActions}>
                  <button
                    className={styles.secondaryButton}
                    onClick={duplicateSelected}
                    type="button"
                  >
                    <Copy aria-hidden="true" size={16} /> 복제
                  </button>
                  <button
                    className={styles.primaryButton}
                    disabled={
                      busy || !dirty || !initialDashboard.databaseAvailable
                    }
                    onClick={save}
                    type="button"
                  >
                    {busy ? (
                      <Loader2
                        aria-hidden="true"
                        className={styles.spin}
                        size={16}
                      />
                    ) : (
                      <Save aria-hidden="true" size={16} />
                    )}
                    작업본 저장
                  </button>
                </div>
              </div>

              {notice ? (
                <div className={styles.notice} data-tone={notice.tone}>
                  {notice.text}
                </div>
              ) : null}

              <nav aria-label="검사 편집 단계" className={styles.tabs}>
                {(
                  [
                    ["basics", "기본 정보"],
                    ["questions", `문항 ${questionCount(draft)}`],
                    ["results", "채점·결과"],
                    ["preview", "고객 화면 미리보기"],
                    ["quality", `품질 검증 ${issues.length}`],
                    ["release", "버전·공개"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    aria-current={activeTab === id ? "page" : undefined}
                    data-active={activeTab === id}
                    key={id}
                    onClick={() => setActiveTab(id)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <div className={styles.editor}>
                {activeTab === "basics" ? (
                  <BasicsEditor
                    document={draft}
                    onChange={change}
                    onDisplayOrderChange={(displayOrder) => {
                      setEntries((current) =>
                        current.map((entry) =>
                          entry.sourceKey === selected.sourceKey
                            ? { ...entry, displayOrder }
                            : entry,
                        ),
                      );
                      setDirty(true);
                    }}
                    selected={selected}
                  />
                ) : null}
                {activeTab === "questions" ? (
                  <QuestionEditor
                    document={draft}
                    onChange={change}
                    page={questionPage}
                    query={questionQuery}
                    setPage={setQuestionPage}
                    setQuery={setQuestionQuery}
                  />
                ) : null}
                {activeTab === "results" ? (
                  <ResultEditor document={draft} onChange={change} />
                ) : null}
                {activeTab === "preview" ? (
                  <PreviewPanel document={draft} />
                ) : null}
                {activeTab === "quality" ? (
                  <QualityPanel issues={issues} />
                ) : null}
                {activeTab === "release" ? (
                  <ReleasePanel
                    busy={busy}
                    dirty={dirty}
                    entry={selected}
                    issues={issues}
                    note={note}
                    onAction={manage}
                    setNote={setNote}
                  />
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div data-danger={danger}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Status({ status }: { status: AssessmentStudioStatus }) {
  return (
    <span className={styles.status} data-status={status}>
      {statusLabels[status]}
    </span>
  );
}

function BasicsEditor({
  document,
  onChange,
  onDisplayOrderChange,
  selected,
}: {
  document: AssessmentStudioDocument;
  onChange: (value: AssessmentStudioDocument) => void;
  onDisplayOrderChange: (value: number) => void;
  selected: AssessmentStudioEntry;
}) {
  const identityLocked = Boolean(selected.publishedReleaseId);
  return (
    <div className={styles.formStack}>
      <SectionHeading
        title="고객에게 보이는 정보"
        copy="첫 화면에서 검사 목적이 바로 이해되도록 짧고 구체적으로 작성합니다."
      />
      <div className={styles.fieldGrid}>
        <Field label="검사 제목" wide>
          <input
            maxLength={120}
            onChange={(event) =>
              onChange({ ...document, title: event.target.value })
            }
            value={document.title}
          />
        </Field>
        <Field label="한 줄 설명" wide>
          <input
            maxLength={240}
            onChange={(event) =>
              onChange({ ...document, caption: event.target.value })
            }
            value={document.caption}
          />
        </Field>
        <Field label="상세 설명" wide>
          <textarea
            maxLength={500}
            onChange={(event) =>
              onChange({ ...document, description: event.target.value })
            }
            rows={4}
            value={document.description}
          />
        </Field>
        <Field
          hint={
            identityLocked
              ? "첫 게시 후 주소는 잠깁니다."
              : "영문 소문자와 하이픈만 사용"
          }
          label="검사 주소"
        >
          <input
            disabled={identityLocked}
            onChange={(event) =>
              onChange({ ...document, slug: event.target.value })
            }
            value={document.slug}
          />
        </Field>
        <Field label="예상 시간">
          <div className={styles.inputWithSuffix}>
            <input
              max={120}
              min={1}
              onChange={(event) =>
                onChange({
                  ...document,
                  estimatedMinutes: Number(event.target.value),
                })
              }
              type="number"
              value={document.estimatedMinutes}
            />
            <span>분</span>
          </div>
        </Field>
        <Field hint="숫자가 작을수록 목록 위에 표시됩니다." label="노출 순서">
          <input
            min={0}
            onChange={(event) =>
              onDisplayOrderChange(Math.max(0, Number(event.target.value)))
            }
            type="number"
            value={selected.displayOrder}
          />
        </Field>
        <Field
          hint="뉴앙 베타에서는 전 연령 콘텐츠만 공개됩니다. 성인 인증 필요를 선택한 검사는 저장·검수할 수 있지만 앱 목록과 직접 주소에서 모두 비공개됩니다."
          label="이용 연령"
        >
          <select
            onChange={(event) =>
              onChange({
                ...document,
                ageAccessPolicy: event.target
                  .value as AssessmentStudioDocument["ageAccessPolicy"],
              })
            }
            value={document.ageAccessPolicy}
          >
            <option value="all_ages">전 연령</option>
            <option value="adult_verification_required">
              성인 인증 필요 · 베타 비공개
            </option>
          </select>
        </Field>
        <Field label="콘텐츠 민감도">
          <select
            onChange={(event) =>
              onChange({
                ...document,
                sensitivity: event.target
                  .value as AssessmentStudioDocument["sensitivity"],
              })
            }
            value={document.sensitivity}
          >
            <option value="general">일반</option>
            <option value="caution">주의 검토</option>
          </select>
        </Field>
      </div>
      <div className={styles.infoBox}>
        <strong>검사 정체성</strong>
        <span>
          {subtypeLabels[document.subtype]} · schema v{document.schemaVersion}
        </span>
        <p>
          검사 유형과 주소는 기존 결과·공유 링크를 보호하기 위해 첫 게시 이후
          바꿀 수 없습니다.
        </p>
      </div>
    </div>
  );
}

function QuestionEditor({
  document,
  onChange,
  page,
  query,
  setPage,
  setQuery,
}: {
  document: AssessmentStudioDocument;
  onChange: (value: AssessmentStudioDocument) => void;
  page: number;
  query: string;
  setPage: (value: number) => void;
  setQuery: (value: string) => void;
}) {
  const questions = getQuestions(document);
  const normalized = query.trim().toLocaleLowerCase("ko-KR");
  const matches = questions
    .map((question, index) => ({ index, question }))
    .filter(({ question }) =>
      JSON.stringify(question).toLocaleLowerCase("ko-KR").includes(normalized),
    );
  const perPage = 12;
  const pageCount = Math.max(1, Math.ceil(matches.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const visible = matches.slice(safePage * perPage, (safePage + 1) * perPage);

  function updateQuestion(index: number, next: Record<string, unknown>) {
    const nextDocument = clone(document);
    const list = getQuestions(nextDocument);
    list[index] = next;
    setQuestions(nextDocument, list);
    onChange(nextDocument);
  }
  function addQuestion() {
    const next = clone(document);
    const list = getQuestions(next);
    const created = newQuestion(next, list.length);
    if (!created) return;
    list.push(created);
    setQuestions(next, list);
    onChange(next);
    setPage(Math.floor(list.length / perPage));
  }
  function removeQuestion(index: number) {
    if (
      !window.confirm(
        "이 작업본에서 문항을 제외할까요? 공개본과 과거 결과는 바뀌지 않습니다.",
      )
    )
      return;
    const next = clone(document);
    const list = getQuestions(next);
    list.splice(index, 1);
    setQuestions(next, list);
    onChange(next);
  }

  return (
    <div className={styles.formStack}>
      <div className={styles.editorToolbar}>
        <div>
          <h3>문항 편집</h3>
          <p>안정 ID와 채점 연결을 확인하면서 고객 문구를 다듬습니다.</p>
        </div>
        <button
          disabled={
            document.category === "core" || document.subtype === "friend_match"
          }
          onClick={addQuestion}
          type="button"
        >
          <Plus aria-hidden="true" size={16} /> 문항 추가
        </button>
      </div>
      {document.category === "core" ? (
        <div className={styles.warningBox}>
          코어 문항의 추가·삭제와 축 변경은 채점 엔진 릴리스가 함께 필요해 잠겨
          있습니다. 문구는 수정할 수 있습니다.
        </div>
      ) : null}
      <label className={styles.search}>
        <Search aria-hidden="true" size={16} />
        <input
          aria-label="문항 검색"
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          placeholder="문항·보기·ID 검색"
          value={query}
        />
      </label>
      <div className={styles.questionList}>
        {visible.map(({ index, question }) => (
          <QuestionCard
            document={document}
            index={index}
            key={String(question.id ?? index)}
            onChange={(next) => updateQuestion(index, next)}
            onRemove={() => removeQuestion(index)}
            question={question}
          />
        ))}
      </div>
      {matches.length === 0 ? (
        <div className={styles.empty}>조건에 맞는 문항이 없습니다.</div>
      ) : null}
      {pageCount > 1 ? (
        <div className={styles.pagination}>
          <button
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            type="button"
          >
            <ChevronLeft size={16} /> 이전
          </button>
          <span>
            {safePage + 1} / {pageCount}
          </span>
          <button
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
            type="button"
          >
            다음 <ChevronRight size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function QuestionCard({
  document,
  index,
  onChange,
  onRemove,
  question,
}: {
  document: AssessmentStudioDocument;
  index: number;
  onChange: (value: Record<string, unknown>) => void;
  onRemove: () => void;
  question: Record<string, unknown>;
}) {
  const isBalance = document.subtype === "balance_pack";
  const isLab = document.subtype === "odd_lab";
  const isTopic = document.subtype === "free_topic";
  const textKey = isBalance ? "prompt" : "text";
  const options = Array.isArray(question.options)
    ? (question.options as Record<string, unknown>[])
    : [];
  const topicAssessment = asObject(asObject(document.payload).assessment);
  const balancePack = asObject(asObject(document.payload).pack);
  const topicScales = asArray(topicAssessment.reportScales) as Record<
    string,
    unknown
  >[];
  const target = asObject(question.target);
  const targetKind = target.kind === "domain" ? "domain" : "facet";
  const targetOptions =
    targetKind === "domain"
      ? coreDomainDefinitions.map((item) => ({
          id: item.domainId,
          label: item.label,
          representative: true,
        }))
      : coreFacetDefinitions.map((item) => ({
          id: item.facetId,
          label: item.label,
          representative: isRepresentativeTraitTarget({
            id: item.facetId,
            kind: "facet",
          }),
        }));
  const resolvedTraitScoring = isTopic
    ? resolveFreeTopicTraitRule(
        document.slug,
        question as unknown as FreeTopicQuestion,
      ).scoring
    : "excluded";
  return (
    <article className={styles.questionCard}>
      <header>
        <span>문항 {index + 1}</span>
        <code>{String(question.id ?? "ID 없음")}</code>
        {document.category !== "core" && document.subtype !== "friend_match" ? (
          <button
            aria-label={`${index + 1}번 문항 제외`}
            onClick={onRemove}
            type="button"
          >
            <Archive size={15} /> 제외
          </button>
        ) : null}
      </header>
      <div className={styles.fieldGrid}>
        {"contextLabel" in question ? (
          <Field label="상황">
            <input
              onChange={(event) =>
                onChange({ ...question, contextLabel: event.target.value })
              }
              value={String(question.contextLabel ?? "")}
            />
          </Field>
        ) : null}
        {isBalance ? (
          <Field label="하위 주제">
            <input
              onChange={(event) =>
                onChange({ ...question, subtopic: event.target.value })
              }
              value={String(question.subtopic ?? "")}
            />
          </Field>
        ) : null}
        <Field label="질문" wide>
          <textarea
            onChange={(event) =>
              onChange({ ...question, [textKey]: event.target.value })
            }
            rows={2}
            value={String(question[textKey] ?? "")}
          />
        </Field>
        {options.map((option, optionIndex) => {
          const labelKey = isBalance ? "text" : "label";
          const labProfiles = asArray(
            asObject(asObject(document.payload).assessment).profiles,
          ) as Record<string, unknown>[];
          return (
            <Field
              key={String(option.id ?? optionIndex)}
              label={`보기 ${optionIndex + 1}`}
            >
              <input
                onChange={(event) => {
                  const nextOptions = options.map((item, current) =>
                    current === optionIndex
                      ? { ...item, [labelKey]: event.target.value }
                      : item,
                  );
                  onChange({ ...question, options: nextOptions });
                }}
                value={String(option[labelKey] ?? "")}
              />
              {isBalance ? (
                <input
                  aria-label={`보기 ${optionIndex + 1} 안정 ID`}
                  onChange={(event) => {
                    const nextOptions = options.map((item, current) =>
                      current === optionIndex
                        ? { ...item, id: event.target.value }
                        : item,
                    );
                    onChange({ ...question, options: nextOptions });
                  }}
                  placeholder="보기 안정 ID"
                  value={String(option.id ?? "")}
                />
              ) : null}
              {isLab ? (
                <select
                  aria-label={`보기 ${optionIndex + 1} 결과 연결`}
                  onChange={(event) => {
                    const nextOptions = options.map((item, current) =>
                      current === optionIndex
                        ? { ...item, resultId: event.target.value }
                        : item,
                    );
                    onChange({ ...question, options: nextOptions });
                  }}
                  value={String(option.resultId ?? "")}
                >
                  <option value="">결과를 선택하세요</option>
                  {labProfiles.map((profile) => (
                    <option key={String(profile.id)} value={String(profile.id)}>
                      {String(profile.title ?? profile.id)}
                    </option>
                  ))}
                </select>
              ) : null}
            </Field>
          );
        })}
        {isTopic ? (
          <>
            <Field
              label="이 문항이 보는 성향 범위"
              hint="대부분의 구체적인 행동 문항은 ‘세부 성향’을 선택합니다."
            >
              <select
                onChange={(event) => {
                  const kind = event.target.value as "domain" | "facet";
                  const first =
                    kind === "domain"
                      ? coreDomainDefinitions[0]?.domainId
                      : coreFacetDefinitions[0]?.facetId;
                  onChange({ ...question, target: { id: first ?? "", kind } });
                }}
                value={targetKind}
              >
                <option value="facet">세부 성향 · 구체적인 행동</option>
                <option value="domain">5대 영역 · 넓은 성향 전체</option>
              </select>
            </Field>
            <Field
              label="이 문항이 측정하는 성향"
              hint="사용자의 답이 높을수록 어느 성향이 강하게 나타나는지 선택합니다."
            >
              <select
                onChange={(event) =>
                  onChange({
                    ...question,
                    target: {
                      ...target,
                      id: event.target.value,
                      kind: targetKind,
                    },
                  })
                }
                value={String(target.id ?? "")}
              >
                <option value="">성향을 선택하세요</option>
                {targetOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} · {item.id} ·{" "}
                    {item.representative ? "뉴앙코드 반영 가능" : "리포트 전용"}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="뉴앙코드 반영 방향"
              hint="주제 결과 문구의 높고 낮음과 뉴앙코드 방향이 다르면 ‘반대 방향’을 선택하세요."
            >
              <select
                onChange={(event) =>
                  onChange({ ...question, traitScoring: event.target.value })
                }
                value={resolvedTraitScoring}
              >
                <option value="same">답이 높을수록 이 성향이 강함</option>
                <option value="reverse">답이 낮을수록 이 성향이 강함</option>
                <option value="excluded">결과 리포트에만 사용</option>
              </select>
            </Field>
            {topicScales.length > 0 ? (
              <Field label="결과 척도">
                <select
                  onChange={(event) =>
                    onChange({
                      ...question,
                      reportScaleId: event.target.value || undefined,
                    })
                  }
                  value={String(question.reportScaleId ?? "")}
                >
                  <option value="">결과 척도를 선택하세요</option>
                  {topicScales.map((scale) => (
                    <option key={String(scale.id)} value={String(scale.id)}>
                      {String(scale.areaLabel ?? scale.id)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label="채점 방향">
              <span className={styles.checkboxField}>
                <input
                  checked={question.isReverse === true}
                  onChange={(event) =>
                    onChange({ ...question, isReverse: event.target.checked })
                  }
                  type="checkbox"
                />{" "}
                반대 방향으로 채점
              </span>
            </Field>
          </>
        ) : null}
        {isBalance ? (
          <>
            <Field label="진행 단계">
              <select
                onChange={(event) =>
                  onChange({ ...question, phase: event.target.value })
                }
                value={String(question.phase ?? "familiar")}
              >
                <option value="familiar">가볍게 시작</option>
                <option value="everyday">일상 취향</option>
                <option value="conversation">대화 확장</option>
              </select>
            </Field>
            <Field label="추천 관계">
              <select
                onChange={(event) =>
                  onChange({ ...question, audience: event.target.value })
                }
                value={String(question.audience ?? "all")}
              >
                <option value="all">누구나</option>
                <option value="friends">친구</option>
                <option value="couple">연인</option>
                <option value="family">가족</option>
                <option value="team">팀</option>
              </select>
            </Field>
            <Field label="대화 깊이">
              <select
                onChange={(event) =>
                  onChange({ ...question, intensity: event.target.value })
                }
                value={String(question.intensity ?? "light")}
              >
                <option value="light">가벼움</option>
                <option value="lively">활발함</option>
                <option value="deep">깊은 대화</option>
              </select>
            </Field>
            <Field label="민감도">
              <select
                onChange={(event) =>
                  onChange({ ...question, sensitivity: event.target.value })
                }
                value={String(question.sensitivity ?? "general")}
              >
                <option value="general">일반</option>
                <option value="personal">개인적</option>
                <option value="private">민감함</option>
              </select>
            </Field>
            <Field label="문항 역할">
              <select
                onChange={(event) =>
                  onChange({ ...question, promptRole: event.target.value })
                }
                value={String(question.promptRole ?? "taste")}
              >
                <option value="taste">취향</option>
                <option value="standard">관계 기준</option>
                <option value="preference">선호</option>
                <option value="self_behavior">나의 행동</option>
              </select>
            </Field>
            {balancePack.scoringTemplate === "reciprocal_fit" ? (
              <Field
                label="상호보완 짝 ID"
                hint="선호와 실제 행동 문항을 같은 ID로 묶습니다."
              >
                <input
                  onChange={(event) =>
                    onChange({
                      ...question,
                      meaningCode: event.target.value || undefined,
                    })
                  }
                  placeholder="예: weekend-plan"
                  value={String(question.meaningCode ?? "")}
                />
              </Field>
            ) : null}
            <Field label="결과 강조도">
              <input
                max={5}
                min={0}
                onChange={(event) =>
                  onChange({
                    ...question,
                    highlightPriority: Number(event.target.value),
                  })
                }
                type="number"
                value={Number(question.highlightPriority ?? 1)}
              />
            </Field>
            <Field label="대화 확장 가치">
              <input
                max={5}
                min={0}
                onChange={(event) =>
                  onChange({
                    ...question,
                    conversationValue: Number(event.target.value),
                  })
                }
                type="number"
                value={Number(question.conversationValue ?? 1)}
              />
            </Field>
            <Field label="궁합 점수 반영">
              <span className={styles.checkboxField}>
                <input
                  checked={question.scored !== false}
                  onChange={(event) =>
                    onChange({ ...question, scored: event.target.checked })
                  }
                  type="checkbox"
                />{" "}
                결과 계산에 포함
              </span>
            </Field>
          </>
        ) : null}
      </div>
      <footer>
        {"domainId" in question ? (
          <span>
            영역 {String(question.domainId)} · 세부축 {String(question.facetId)}{" "}
            · {question.isReverse ? "역채점" : "정채점"}
          </span>
        ) : null}
        {isTopic ? (
          <span>
            {targetKind === "domain" ? "영역" : "세부 성향"}{" "}
            {String(target.id ?? "미연결")} ·{" "}
            {resolvedTraitScoring === "excluded"
              ? "코드 미반영"
              : resolvedTraitScoring === "reverse"
                ? "코드 반대 방향 반영"
                : "코드 직접 반영"}
            {topicScales.length > 0
              ? ` · 결과 척도 ${String(question.reportScaleId ?? "미연결")}`
              : ""}
          </span>
        ) : null}
        {isBalance ? (
          <span>
            {String(question.phase)} · {String(question.audience)} ·{" "}
            {String(question.sensitivity)}
          </span>
        ) : null}
      </footer>
    </article>
  );
}

function ResultEditor({
  document,
  onChange,
}: {
  document: AssessmentStudioDocument;
  onChange: (value: AssessmentStudioDocument) => void;
}) {
  const payload = document.payload as Record<string, unknown>;
  if (document.category === "core") {
    const definition = asObject(payload.definition);
    const binding = asObject(payload.engineBinding);
    return (
      <div className={styles.formStack}>
        <SectionHeading
          title="코어 실행 묶음"
          copy="문항은행·채점·코드 체계·결과 리포트는 호환되는 한 묶음으로 발행합니다."
        />
        <dl className={styles.definitionList}>
          <div>
            <dt>검사 릴리스</dt>
            <dd>{String(definition.releaseId)}</dd>
          </div>
          <div>
            <dt>검사 ID</dt>
            <dd>{String(definition.assessmentId)}</dd>
          </div>
          <div>
            <dt>채점 엔진</dt>
            <dd>{String(binding.key)}</dd>
          </div>
          <div>
            <dt>코드 조합</dt>
            <dd>뉴앙 코드 32가지</dd>
          </div>
        </dl>
        <div className={styles.fieldGrid}>
          <Field label="결과 화면 이름" wide>
            <input
              onChange={(event) =>
                updateCoreDefinition(
                  document,
                  { ...definition, resultLabel: event.target.value },
                  onChange,
                )
              }
              value={String(definition.resultLabel ?? "")}
            />
          </Field>
        </div>
        <div className={styles.warningBox}>
          채점 엔진 설정은 고객 결과에 직접 영향을 주므로 개발자가 등록한 호환
          릴리스만 선택할 수 있습니다.
        </div>
        <Link className={styles.inlineLink} href="/admin/content?view=releases">
          코어 결과 리포트 문구와 근거 자료 관리
        </Link>
      </div>
    );
  }
  if (document.subtype === "free_topic") {
    const assessment = asObject(payload.assessment);
    const scales = asArray(assessment.reportScales) as Record<
      string,
      unknown
    >[];
    return (
      <div className={styles.formStack}>
        <SectionHeading
          title="응답 기준과 결과 척도"
          copy="사용자가 떠올릴 기간과 답변 기준부터 결과의 낮음·중간·높음 해석까지 관리합니다."
        />
        <div className={styles.fieldGrid}>
          <Field label="떠올릴 기간">
            <input
              onChange={(event) =>
                updateTopicAssessment(
                  document,
                  { ...assessment, recallPeriodLabel: event.target.value },
                  onChange,
                )
              }
              value={String(assessment.recallPeriodLabel ?? "최근 4주")}
            />
          </Field>
          <Field label="첫 문항 안내" wide>
            <input
              onChange={(event) =>
                updateTopicAssessment(
                  document,
                  { ...assessment, recallPrompt: event.target.value },
                  onChange,
                )
              }
              value={String(
                assessment.recallPrompt ??
                  "최근 4주간의 평소 모습을 떠올려 주세요.",
              )}
            />
          </Field>
          <Field label="답변 기준">
            <select
              onChange={(event) =>
                updateTopicAssessment(
                  document,
                  { ...assessment, responseScale: event.target.value },
                  onChange,
                )
              }
              value={String(assessment.responseScale ?? "frequency_5")}
            >
              <option value="frequency_5">실제로 얼마나 자주 했는지</option>
              <option value="need_5">나에게 얼마나 필요했는지</option>
              <option value="helpfulness_5">얼마나 도움이 되었는지</option>
            </select>
          </Field>
          <Field label="결과 방식">
            <select
              onChange={(event) =>
                updateTopicAssessment(
                  document,
                  { ...assessment, reportMode: event.target.value },
                  onChange,
                )
              }
              value={String(assessment.reportMode ?? "bipolar_dimensions")}
            >
              <option value="bipolar_dimensions">양쪽 성향의 방향 비교</option>
              <option value="independent_dimensions">
                각 행동을 독립적으로 해석
              </option>
            </select>
          </Field>
        </div>
        <div className={styles.editorToolbar}>
          <div>
            <h3>결과 {scales.length}개</h3>
            <p>추가한 결과는 문항의 결과 척도와 연결해야 합니다.</p>
          </div>
          <button
            onClick={() => addTopicScale(document, onChange)}
            type="button"
          >
            <Plus size={16} /> 결과 추가
          </button>
        </div>
        {scales.length === 0 ? (
          <div className={styles.warningBox}>
            결과 척도를 추가하고 각 문항과 연결해야 게시할 수 있습니다.
          </div>
        ) : (
          scales.map((scale, index) => (
            <article
              className={styles.resultCard}
              key={String(scale.id ?? index)}
            >
              <header>
                <strong>{String(scale.areaLabel ?? scale.id)}</strong>
                <code>{String(scale.id)}</code>
                <button
                  aria-label={`${String(scale.areaLabel ?? scale.id)} 결과 제외`}
                  onClick={() => removeTopicScale(document, index, onChange)}
                  type="button"
                >
                  <Archive size={15} /> 제외
                </button>
              </header>
              <div className={styles.fieldGrid}>
                <Field label="결과 영역 이름">
                  <input
                    onChange={(event) =>
                      updateTopicScale(
                        document,
                        index,
                        "areaLabel",
                        event.target.value,
                        onChange,
                      )
                    }
                    value={String(scale.areaLabel ?? "")}
                  />
                </Field>
                <Field label="결과 묶음 이름">
                  <input
                    onChange={(event) =>
                      updateTopicScale(
                        document,
                        index,
                        "groupLabel",
                        event.target.value,
                        onChange,
                      )
                    }
                    value={String(scale.groupLabel ?? "")}
                  />
                </Field>
                {(["low", "mid", "high"] as const).map((level) => (
                  <div className={styles.resultLevel} key={level}>
                    <Field
                      label={`${level === "low" ? "낮음" : level === "mid" ? "중간" : "높음"} 이름`}
                    >
                      <input
                        onChange={(event) =>
                          updateTopicScale(
                            document,
                            index,
                            `${level}Label`,
                            event.target.value,
                            onChange,
                          )
                        }
                        value={String(scale[`${level}Label`] ?? "")}
                      />
                    </Field>
                    <Field label="핵심 설명">
                      <textarea
                        onChange={(event) =>
                          updateTopicScale(
                            document,
                            index,
                            `${level}Copy`,
                            event.target.value,
                            onChange,
                          )
                        }
                        rows={3}
                        value={String(scale[`${level}Copy`] ?? "")}
                      />
                    </Field>
                    <Field label="드러나는 강점">
                      <textarea
                        onChange={(event) =>
                          updateTopicScale(
                            document,
                            index,
                            `${level}Strength`,
                            event.target.value,
                            onChange,
                          )
                        }
                        placeholder="이 점수를 가진 사용자에게 실제로 도움이 되는 강점"
                        rows={3}
                        value={String(scale[`${level}Strength`] ?? "")}
                      />
                    </Field>
                    <Field label="주의할 점">
                      <textarea
                        onChange={(event) =>
                          updateTopicScale(
                            document,
                            index,
                            `${level}Watch`,
                            event.target.value,
                            onChange,
                          )
                        }
                        placeholder="과하거나 부족할 때 생길 수 있는 어려움"
                        rows={3}
                        value={String(scale[`${level}Watch`] ?? "")}
                      />
                    </Field>
                    <Field label="바로 해볼 행동">
                      <textarea
                        onChange={(event) =>
                          updateTopicScale(
                            document,
                            index,
                            `${level}Action`,
                            event.target.value,
                            onChange,
                          )
                        }
                        placeholder="오늘부터 적용할 수 있는 구체적인 행동"
                        rows={3}
                        value={String(scale[`${level}Action`] ?? "")}
                      />
                    </Field>
                  </div>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    );
  }
  if (document.subtype === "odd_lab") {
    const assessment = asObject(payload.assessment);
    const profiles = asArray(assessment.profiles) as Record<string, unknown>[];
    return (
      <div className={styles.formStack}>
        <SectionHeading
          title="결과 유형"
          copy="답변에서 가장 자주 나타난 모습을 고르고, 강점·주의점·관계 팁·작은 실험을 함께 보여줘요."
        />
        <div className={styles.fieldGrid}>
          <Field label="결과 묶음 이름" wide>
            <input
              onChange={(event) =>
                updateLabAssessment(
                  document,
                  { ...assessment, resultLabel: event.target.value },
                  onChange,
                )
              }
              value={String(assessment.resultLabel ?? "")}
            />
          </Field>
        </div>
        <div className={styles.editorToolbar}>
          <div>
            <h3>결과 {profiles.length}개</h3>
            <p>각 보기에서 어떤 모습으로 이어질지 연결하세요.</p>
          </div>
          <button
            onClick={() => addLabProfile(document, onChange)}
            type="button"
          >
            <Plus size={16} /> 결과 추가
          </button>
        </div>
        {profiles.map((profile, index) => (
          <article
            className={styles.resultCard}
            key={String(profile.id ?? index)}
          >
            <header>
              <strong>{String(profile.title)}</strong>
              <code>{String(profile.id)}</code>
              <button
                aria-label={`${String(profile.title)} 결과 제외`}
                onClick={() => removeLabProfile(document, index, onChange)}
                type="button"
              >
                <Archive size={15} /> 제외
              </button>
            </header>
            <div className={styles.fieldGrid}>
              <Field label="결과 제목">
                <input
                  onChange={(event) =>
                    updateLabProfile(
                      document,
                      index,
                      "title",
                      event.target.value,
                      onChange,
                    )
                  }
                  value={String(profile.title ?? "")}
                />
              </Field>
              <Field label="짧게 보일 이름">
                <input
                  onChange={(event) =>
                    updateLabProfile(
                      document,
                      index,
                      "shortTitle",
                      event.target.value,
                      onChange,
                    )
                  }
                  value={String(profile.shortTitle ?? "")}
                />
              </Field>
              <Field label="한눈에 보는 설명" wide>
                <textarea
                  onChange={(event) =>
                    updateLabProfile(
                      document,
                      index,
                      "summary",
                      event.target.value,
                      onChange,
                    )
                  }
                  rows={3}
                  value={String(profile.summary ?? "")}
                />
              </Field>
              <Field label="이런 점이 잘 나타나요 (줄마다 하나)">
                <textarea
                  onChange={(event) =>
                    updateLabProfile(
                      document,
                      index,
                      "strengths",
                      event.target.value.split("\n").filter(Boolean),
                      onChange,
                    )
                  }
                  rows={4}
                  value={asArray(profile.strengths).join("\n")}
                />
              </Field>
              <Field label="이럴 때 조심해요">
                <textarea
                  onChange={(event) =>
                    updateLabProfile(
                      document,
                      index,
                      "watch",
                      event.target.value,
                      onChange,
                    )
                  }
                  rows={4}
                  value={String(profile.watch ?? "")}
                />
              </Field>
              <Field label="가까운 사람에게 알려줄 말">
                <textarea
                  onChange={(event) =>
                    updateLabProfile(
                      document,
                      index,
                      "relationTip",
                      event.target.value,
                      onChange,
                    )
                  }
                  rows={4}
                  value={String(profile.relationTip ?? "")}
                />
              </Field>
              <Field label="오늘 해볼 작은 시도">
                <textarea
                  onChange={(event) =>
                    updateLabProfile(
                      document,
                      index,
                      "smallExperiment",
                      event.target.value,
                      onChange,
                    )
                  }
                  rows={4}
                  value={String(profile.smallExperiment ?? "")}
                />
              </Field>
            </div>
          </article>
        ))}
      </div>
    );
  }
  if (document.subtype === "balance_pack") {
    const pack = asObject(payload.pack);
    return (
      <div className={styles.formStack}>
        <SectionHeading
          title="팩 구성과 궁합 의미"
          copy="방을 만들 때 사용할 문항 풀과 결과 계산 의미를 확인합니다."
        />
        <div className={styles.fieldGrid}>
          <Field label="팩 제목" wide>
            <input
              onChange={(event) =>
                updatePayloadObject(
                  document,
                  "pack",
                  { ...pack, title: event.target.value },
                  onChange,
                )
              }
              value={String(pack.title ?? "")}
            />
          </Field>
          <Field label="팩 설명" wide>
            <textarea
              onChange={(event) =>
                updatePayloadObject(
                  document,
                  "pack",
                  { ...pack, description: event.target.value },
                  onChange,
                )
              }
              rows={3}
              value={String(pack.description ?? "")}
            />
          </Field>
          <Field label="궁합 계산 방식">
            <select
              onChange={(event) =>
                updateBalanceScoring(document, event.target.value, onChange)
              }
              value={String(pack.scoringTemplate ?? "taste_sync")}
            >
              <option value="taste_sync">같은 취향 비교</option>
              <option value="relationship_standard">관계 기준 비교</option>
              <option value="ideal_preference">이상형 선호 비교</option>
              <option value="dilemma_fun">극한 선택 케미</option>
            </select>
          </Field>
          <Field label="결과 해석 기준">
            <input
              disabled
              value={balanceSemanticsLabel(String(pack.resultSemantics ?? ""))}
            />
          </Field>
          <Field label="기본 문항 수">
            <select
              onChange={(event) =>
                updatePayloadObject(
                  document,
                  "pack",
                  { ...pack, defaultQuestionCount: Number(event.target.value) },
                  onChange,
                )
              }
              value={Number(pack.defaultQuestionCount)}
            >
              {asArray(pack.supportedQuestionCounts).map((count) => (
                <option key={String(count)} value={Number(count)}>
                  {String(count)}문항
                </option>
              ))}
            </select>
          </Field>
          <Field label="문항 풀 버전">
            <input disabled value={String(pack.contentPoolVersion ?? "")} />
          </Field>
        </div>
      </div>
    );
  }
  const config = asObject(payload.config);
  return (
    <div className={styles.formStack}>
      <SectionHeading
        title="초대와 비교 결과"
        copy="기존 초대 링크가 깨지지 않도록 선택지 ID는 유지하고 고객 문구를 다듬습니다."
      />
      <div className={styles.fieldGrid}>
        <Field label="내 선택 안내">
          <input
            onChange={(event) =>
              updatePayloadObject(
                document,
                "config",
                { ...config, senderHeading: event.target.value },
                onChange,
              )
            }
            value={String(config.senderHeading ?? "")}
          />
        </Field>
        <Field label="친구 선택 예상 안내">
          <input
            onChange={(event) =>
              updatePayloadObject(
                document,
                "config",
                { ...config, predictionHeading: event.target.value },
                onChange,
              )
            }
            value={String(config.predictionHeading ?? "")}
          />
        </Field>
        <Field label="초대받은 친구 안내" wide>
          <input
            onChange={(event) =>
              updatePayloadObject(
                document,
                "config",
                { ...config, receiverHeading: event.target.value },
                onChange,
              )
            }
            value={String(config.receiverHeading ?? "")}
          />
        </Field>
        <Field label="초대 공유 제목">
          <input
            onChange={(event) =>
              updatePayloadObject(
                document,
                "config",
                { ...config, invitationTitle: event.target.value },
                onChange,
              )
            }
            value={String(config.invitationTitle ?? "")}
          />
        </Field>
        <Field label="초대 공유 문장">
          <input
            onChange={(event) =>
              updatePayloadObject(
                document,
                "config",
                { ...config, invitationText: event.target.value },
                onChange,
              )
            }
            value={String(config.invitationText ?? "")}
          />
        </Field>
        <Field label="결과 공통 설명" wide>
          <textarea
            onChange={(event) =>
              updatePayloadObject(
                document,
                "config",
                { ...config, resultInsight: event.target.value },
                onChange,
              )
            }
            rows={4}
            value={String(config.resultInsight ?? "")}
          />
        </Field>
        <FriendResultCopyFields
          config={config}
          document={document}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function FriendResultCopyFields({
  config,
  document,
  onChange,
}: {
  config: Record<string, unknown>;
  document: AssessmentStudioDocument;
  onChange: (value: AssessmentStudioDocument) => void;
}) {
  const resultCopies = asObject(config.resultCopies);
  const variants = [
    ["bothMatched", "예상도 선택도 같을 때"],
    ["predictionOnlyMatched", "예상만 맞았을 때"],
    ["choiceOnlyMatched", "선택만 같았을 때"],
    ["bothDifferent", "예상도 선택도 다를 때"],
  ] as const;

  function updateResultCopy(
    key: (typeof variants)[number][0],
    field: "description" | "title",
    value: string,
  ) {
    updatePayloadObject(
      document,
      "config",
      {
        ...config,
        resultCopies: {
          ...resultCopies,
          [key]: { ...asObject(resultCopies[key]), [field]: value },
        },
      },
      onChange,
    );
  }

  return (
    <>
      {variants.map(([key, label]) => {
        const copy = asObject(resultCopies[key]);
        return (
          <div className={styles.resultLevel} key={key}>
            <strong>{label}</strong>
            <Field label="결과 제목">
              <input
                onChange={(event) =>
                  updateResultCopy(key, "title", event.target.value)
                }
                value={String(copy.title ?? "")}
              />
            </Field>
            <Field label="결과 설명">
              <textarea
                onChange={(event) =>
                  updateResultCopy(key, "description", event.target.value)
                }
                rows={3}
                value={String(copy.description ?? "")}
              />
            </Field>
          </div>
        );
      })}
      <Field label="만료된 초대 제목">
        <input
          onChange={(event) =>
            updatePayloadObject(
              document,
              "config",
              { ...config, expiredInviteTitle: event.target.value },
              onChange,
            )
          }
          value={String(config.expiredInviteTitle ?? "")}
        />
      </Field>
      <Field label="만료된 초대 안내" wide>
        <textarea
          onChange={(event) =>
            updatePayloadObject(
              document,
              "config",
              { ...config, expiredInviteDescription: event.target.value },
              onChange,
            )
          }
          rows={3}
          value={String(config.expiredInviteDescription ?? "")}
        />
      </Field>
      <Field label="잘못된 초대 제목">
        <input
          onChange={(event) =>
            updatePayloadObject(
              document,
              "config",
              { ...config, invalidInviteTitle: event.target.value },
              onChange,
            )
          }
          value={String(config.invalidInviteTitle ?? "")}
        />
      </Field>
      <Field label="잘못된 초대 안내" wide>
        <textarea
          onChange={(event) =>
            updatePayloadObject(
              document,
              "config",
              { ...config, invalidInviteDescription: event.target.value },
              onChange,
            )
          }
          rows={3}
          value={String(config.invalidInviteDescription ?? "")}
        />
      </Field>
    </>
  );
}

function PreviewPanel({ document }: { document: AssessmentStudioDocument }) {
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState<
    Record<string, FreeTopicAnswer>
  >({});
  const [corePreviewAnswers, setCorePreviewAnswers] = useState<
    Record<string, AssessmentAnswer>
  >({});
  const [labPreviewAnswers, setLabPreviewAnswers] = useState<
    Record<string, LabAnswer>
  >({});
  const [isPreviewUnsureOpen, setIsPreviewUnsureOpen] = useState(false);
  const [isCorePreviewUnsureOpen, setIsCorePreviewUnsureOpen] = useState(false);
  const [isCorePreviewHelpOpen, setIsCorePreviewHelpOpen] = useState(false);
  const [traitImpactScenario, setTraitImpactScenario] =
    useState<FreeTopicPreviewTraitImpactScenario>("clearer");
  const payload = document.payload as Record<string, unknown>;
  const allQuestions = getQuestions(document);
  const safePreviewIndex = Math.min(
    previewIndex,
    Math.max(0, allQuestions.length - 1),
  );
  const firstQuestion = allQuestions[0] ?? {};
  const options = asArray(firstQuestion.options) as Record<string, unknown>[];
  const questionText = String(
    firstQuestion.prompt ?? firstQuestion.text ?? "첫 문항을 입력해 주세요.",
  );
  const optionLabelKey = document.subtype === "balance_pack" ? "text" : "label";

  if (document.category === "core") {
    const coreAssessment =
      document.subtype === "core_precision"
        ? candidateFullCoreAssessment
        : candidateQuickCoreAssessment;
    const corePreviewIndex = Math.min(
      previewIndex,
      Math.max(0, coreAssessment.items.length - 1),
    );
    const currentCoreItem = coreAssessment.items[corePreviewIndex];
    const currentCoreAnswer = currentCoreItem
      ? corePreviewAnswers[currentCoreItem.itemId]
      : undefined;
    const coreModel = buildCorePreviewModel(
      document.subtype === "core_precision" ? "full" : "quick",
    );
    return (
      <div className={styles.formStack}>
        <SectionHeading
          title="고객 화면 미리보기"
          copy="문항을 고르는 화면과 결과 리포트를 모두 실제 고객 공통 컴포넌트로 보여줍니다. 문항을 직접 선택해 모바일 흐름을 함께 확인하세요."
        />
        <div className={styles.previewToolbar}>
          <label>
            <span>미리 볼 문항</span>
            <select
              onChange={(event) => setPreviewIndex(Number(event.target.value))}
              value={corePreviewIndex}
            >
              {coreAssessment.items.map((item, index) => (
                <option key={item.itemId} value={index}>
                  {index + 1}. {item.contextLabel ?? item.text}
                </option>
              ))}
            </select>
          </label>
          <p>
            답을 고른 뒤 다음으로 이동하며, 실제 고객 화면의 선택 상태와 흐름을
            확인하세요. 이 선택은 저장되지 않습니다.
          </p>
        </div>
        <div className={styles.previewGrid}>
          <article className={styles.liveTopicPreviewFrame}>
            <header>
              <span>실제 고객 문항 선택 화면</span>
              <strong>모바일 390px 기준</strong>
            </header>
            <div className={styles.liveTopicPreviewViewport}>
              {currentCoreItem ? (
                <CoreAssessmentQuestionSurface
                  answer={currentCoreAnswer}
                  countLabel={`전체 ${coreAssessment.items.length}개 중 ${corePreviewIndex + 1}번째 문항`}
                  current={corePreviewIndex + 1}
                  currentItem={currentCoreItem}
                  guideLabel="최근 6개월을 기준으로"
                  isAdaptiveQuestion={false}
                  nextDisabled={!currentCoreAnswer}
                  nextLabel={
                    corePreviewIndex === coreAssessment.items.length - 1
                      ? "결과 보기"
                      : "다음"
                  }
                  onAnswer={(value) =>
                    setCorePreviewAnswers((previous) => ({
                      ...previous,
                      [currentCoreItem.itemId]: {
                        answeredAt: new Date().toISOString(),
                        itemId: currentCoreItem.itemId,
                        value,
                      },
                    }))
                  }
                  onClose={() => undefined}
                  onGuideOpen={() => setIsCorePreviewHelpOpen(true)}
                  onNext={() =>
                    setPreviewIndex((index) =>
                      Math.min(coreAssessment.items.length - 1, index + 1),
                    )
                  }
                  onPrevious={() =>
                    setPreviewIndex((index) => Math.max(0, index - 1))
                  }
                  onUnsureOpen={() => setIsCorePreviewUnsureOpen(true)}
                  previousDisabled={corePreviewIndex === 0}
                  title={coreAssessment.title}
                  total={coreAssessment.items.length}
                />
              ) : (
                <div className={styles.empty}>미리 볼 문항이 없습니다.</div>
              )}
            </div>
          </article>
          <article className={styles.liveTopicPreviewFrame}>
            <header>
              <span>실제 고객 결과 리포트</span>
              <strong>모바일 390px 기준</strong>
            </header>
            <div className={styles.liveTopicPreviewViewport}>
              <CoreResultReportTemplate
                backHref="#"
                model={coreModel}
                primaryAction={{ href: "/home", label: "홈으로 돌아가기" }}
                shareEnabled={false}
                surface="completion"
              />
            </div>
          </article>
        </div>
        <div className={styles.infoBox}>
          <strong>게시 전 확인</strong>
          <p>
            문항의 상황과 답변 문구가 자연스러운지부터 코드와 생활·관계·성장
            안내까지 실제 고객 흐름의 순서대로 확인하세요.
          </p>
        </div>
        {isCorePreviewHelpOpen ? (
          <AssessmentBottomSheet
            copy="특별했던 한 번보다 최근 6개월의 평소 모습을 떠올리며, 비슷한 상황에서 문장 속 모습이 얼마나 자주 나타나는지 답해 주세요."
            onClose={() => setIsCorePreviewHelpOpen(false)}
            title="어떤 모습을 떠올리면 될까요?"
          >
            <AssessmentSheetActions>
              <AssessmentSheetAction
                onClick={() => setIsCorePreviewHelpOpen(false)}
              >
                이해했어요
              </AssessmentSheetAction>
            </AssessmentSheetActions>
          </AssessmentBottomSheet>
        ) : null}
        {isCorePreviewUnsureOpen && currentCoreItem ? (
          <AssessmentUnsureSheet
            onClose={() => setIsCorePreviewUnsureOpen(false)}
            onSelect={(unsureReason) => {
              setCorePreviewAnswers((previous) => ({
                ...previous,
                [currentCoreItem.itemId]: {
                  answeredAt: new Date().toISOString(),
                  isUnsure: true,
                  itemId: currentCoreItem.itemId,
                  unsureReason,
                },
              }));
              setIsCorePreviewUnsureOpen(false);
            }}
            selectedReason={currentCoreAnswer?.unsureReason}
          />
        ) : null}
      </div>
    );
  }

  if (document.subtype === "odd_lab") {
    const labAssessment = asObject(
      payload.assessment,
    ) as unknown as LabAssessment;
    const labPreviewIndex = Math.min(
      previewIndex,
      Math.max(0, labAssessment.questions.length - 1),
    );
    const currentLabQuestion = labAssessment.questions[labPreviewIndex];
    const currentLabAnswer = currentLabQuestion
      ? labPreviewAnswers[currentLabQuestion.id]
      : undefined;
    const previewResult = buildLabPreviewResult(labAssessment);
    return (
      <div className={styles.formStack}>
        <SectionHeading
          title="고객 화면 미리보기"
          copy="실제 별난 연구 문항 선택 화면과 결과 리포트를 함께 보여줍니다. 답을 직접 고르며 문항의 맥락과 선택지를 확인하세요."
        />
        <div className={styles.previewToolbar}>
          <label>
            <span>미리 볼 문항</span>
            <select
              onChange={(event) => setPreviewIndex(Number(event.target.value))}
              value={labPreviewIndex}
            >
              {labAssessment.questions.map((question, index) => (
                <option key={question.id} value={index}>
                  {index + 1}. {question.contextLabel ?? question.text}
                </option>
              ))}
            </select>
          </label>
          <p>답을 고른 뒤 다음으로 이동하는 실제 고객 흐름을 확인하세요.</p>
        </div>
        <div className={styles.previewGrid}>
          <article className={styles.liveTopicPreviewFrame}>
            <header>
              <span>실제 고객 문항 선택 화면</span>
              <strong>모바일 390px 기준</strong>
            </header>
            <div className={styles.liveTopicPreviewViewport}>
              {currentLabQuestion ? (
                <LabQuestionSurface
                  assessment={labAssessment}
                  current={labPreviewIndex + 1}
                  nextDisabled={!currentLabAnswer}
                  nextLabel={
                    labPreviewIndex === labAssessment.questions.length - 1
                      ? "결과 보기"
                      : "다음"
                  }
                  onClose={() => undefined}
                  onNext={() =>
                    setPreviewIndex((index) =>
                      Math.min(labAssessment.questions.length - 1, index + 1),
                    )
                  }
                  onPrevious={() =>
                    setPreviewIndex((index) => Math.max(0, index - 1))
                  }
                  onSelect={(optionId) => {
                    const option = currentLabQuestion.options.find(
                      (item) => item.id === optionId,
                    );
                    if (!option) return;
                    setLabPreviewAnswers((previous) => ({
                      ...previous,
                      [currentLabQuestion.id]: {
                        optionId,
                        questionId: currentLabQuestion.id,
                        resultId: option.resultId,
                      },
                    }));
                  }}
                  previousDisabled={labPreviewIndex === 0}
                  question={currentLabQuestion}
                  selectedId={currentLabAnswer?.optionId}
                  total={labAssessment.questions.length}
                />
              ) : (
                <div className={styles.empty}>미리 볼 문항이 없습니다.</div>
              )}
            </div>
          </article>
          <article className={styles.liveTopicPreviewFrame}>
            <header>
              <span>실제 고객 결과 리포트</span>
              <strong>모바일 390px 기준</strong>
            </header>
            <div className={styles.liveTopicPreviewViewport}>
              <LabResultView
                assessment={labAssessment}
                backHref="#"
                initialResult={previewResult}
                readOnly
                shareEnabled={false}
              />
            </div>
          </article>
        </div>
        <div className={styles.infoBox}>
          <strong>게시 전 확인</strong>
          <p>
            결과 제목과 설명뿐 아니라 강점, 조심할 점, 관계에서 전할 말, 오늘
            해볼 작은 시도가 실제 고객 리포트의 같은 위치에 자연스럽게 읽히는지
            확인하세요.
          </p>
        </div>
      </div>
    );
  }

  if (document.subtype === "balance_pack") {
    const balancePack = asObject(payload.pack) as unknown as BalancePack;
    const questionPreviewRoom = buildBalanceQuestionPreviewRoom(balancePack);
    const previewRoom = buildBalancePreviewRoom(balancePack);
    return (
      <div className={styles.formStack}>
        <SectionHeading
          title="고객 화면 미리보기"
          copy="실제 방에서 선택하는 화면과 결과 화면을 함께 보여줍니다. 왼쪽 또는 오른쪽 선택지를 누르면 실제처럼 다음 문항으로 넘어갑니다."
        />
        <div className={styles.previewToolbar}>
          <p>
            선택은 운영센터 미리보기 안에서만 움직이며, 실제 방·참여자·피드에는
            아무 기록도 남기지 않습니다.
          </p>
        </div>
        <div className={styles.previewGrid}>
          <article className={styles.liveTopicPreviewFrame}>
            <header>
              <span>실제 고객 문항 선택 화면</span>
              <strong>모바일 390px 기준</strong>
            </header>
            <div className={styles.liveTopicPreviewViewport}>
              <QuestionRunner
                onRoomChange={() => undefined}
                previewMode
                room={questionPreviewRoom}
              />
            </div>
          </article>
          <article className={styles.liveTopicPreviewFrame}>
            <header>
              <span>실제 고객 결과 리포트</span>
              <strong>모바일 390px 기준</strong>
            </header>
            <div className={styles.liveTopicPreviewViewport}>
              <RoomResult
                onRoomChange={() => undefined}
                previewMode
                room={previewRoom}
              />
            </div>
          </article>
        </div>
        <div className={styles.infoBox}>
          <strong>게시 전 확인</strong>
          <p>
            이 팩의 계산 기준이 결과 제목과 점수 설명에 맞는지, 두 사람씩
            비교하는 화면과 질문별 결과가 충분히 이해되는지 확인하세요.
          </p>
        </div>
      </div>
    );
  }

  if (document.subtype === "friend_match") {
    const friendContent = asObject(
      payload.config,
    ) as unknown as FriendTraitMatchContent;
    return (
      <div className={styles.formStack}>
        <SectionHeading
          title="고객 화면 미리보기"
          copy="친구 성향 맞히기에서 실제로 보이는 내 선택과 친구 선택 화면을 각각 확인합니다. 선택과 다음 단계 이동은 미리보기 안에서만 진행됩니다."
        />
        <div className={styles.previewGrid}>
          <article className={styles.liveTopicPreviewFrame}>
            <header>
              <span>실제 고객 문항 선택 화면 · 내 선택</span>
              <strong>모바일 390px 기준</strong>
            </header>
            <div className={styles.liveTopicPreviewViewport}>
              <FriendTraitMatch
                content={friendContent}
                previewMode
                slug={document.slug}
              />
            </div>
          </article>
          <article className={styles.liveTopicPreviewFrame}>
            <header>
              <span>실제 고객 문항 선택 화면 · 친구 선택</span>
              <strong>모바일 390px 기준</strong>
            </header>
            <div className={styles.liveTopicPreviewViewport}>
              <FriendTraitMatch
                content={friendContent}
                inviteState={{
                  expiresAt: 2_000_000_000_000,
                  guess: "plan",
                  mine: "listen",
                  status: "ready",
                }}
                previewMode
                slug={document.slug}
              />
            </div>
          </article>
        </div>
        <div className={styles.infoBox}>
          <strong>게시 전 확인</strong>
          <p>
            내 선택과 친구의 실제 선택을 묻는 문장이 분명한지, 두 선택지가
            한눈에 구별되는지 확인하세요.
          </p>
        </div>
      </div>
    );
  }

  let resultTitle = "검사를 마치면 나의 성향 결과가 여기에 보여요";
  let resultCopy = document.description;
  let resultItems: string[] = [];
  if (document.subtype === "free_topic") {
    const scales = asArray(asObject(payload.assessment).reportScales) as Record<
      string,
      unknown
    >[];
    resultTitle = "이 주제에서 드러난 내 모습";
    resultItems = scales
      .slice(0, 3)
      .map((scale) => String(scale.areaLabel ?? scale.id));
  } else {
    resultTitle = "친구는 나를 얼마나 잘 알까?";
    resultCopy = String(asObject(payload.config).resultInsight ?? resultCopy);
    resultItems = ["내가 예상한 선택", "친구가 직접 고른 선택"];
  }

  if (document.subtype === "free_topic") {
    const topicAssessment = asObject(
      payload.assessment,
    ) as unknown as FreeTopicAssessment;
    const topicQuestions = allQuestions as unknown as FreeTopicQuestion[];
    const currentQuestion = topicQuestions[safePreviewIndex];
    const currentAnswer = currentQuestion
      ? previewAnswers[currentQuestion.id]
      : undefined;
    const previewResult = buildFreeTopicPreviewResult({
      assessment: topicAssessment,
      questions: topicQuestions,
      traitImpactScenario,
    });

    return (
      <div className={styles.formStack}>
        <SectionHeading
          title="고객 화면 미리보기"
          copy="실제 뉴앙 앱과 같은 문항 컴포넌트·문구·응답 동작을 그대로 사용합니다. 문항을 직접 선택하며 모바일 화면을 검수하세요."
        />
        <div className={styles.previewToolbar}>
          <label>
            <span>미리 볼 문항</span>
            <select
              onChange={(event) => setPreviewIndex(Number(event.target.value))}
              value={safePreviewIndex}
            >
              {topicQuestions.map((question, index) => (
                <option key={question.id} value={index}>
                  {index + 1}. {question.contextLabel}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>성향 반영 상태</span>
            <select
              aria-label="성향 반영 상태"
              onChange={(event) =>
                setTraitImpactScenario(
                  event.target.value as FreeTopicPreviewTraitImpactScenario,
                )
              }
              value={traitImpactScenario}
            >
              <option value="clearer">한 가지 모습이 더 뚜렷해짐</option>
              <option value="small">아주 작은 변화</option>
              <option value="large">비교적 큰 변화</option>
              <option value="unchanged">변화 없음</option>
              <option value="more_balanced">두 모습의 차이가 줄어듦</option>
              <option value="opposite_seen">반대쪽 모습도 보임</option>
              <option value="multiple">여러 부분이 함께 달라짐</option>
              <option value="code_changed">코드 글자 변경</option>
              <option value="retest">같은 주제 재검사</option>
              <option value="no_baseline">비교할 코어 결과 없음</option>
              <option value="insufficient_evidence">유효한 근거 부족</option>
              <option value="not_selected_as_latest">
                더 최근의 같은 주제 결과가 있음
              </option>
              <option value="syncing">서버 반영 중</option>
              <option value="login_required">로그인 필요</option>
              <option value="connection_failed">연결 실패</option>
            </select>
          </label>
          <p>
            문항과 결과는 실제 앱 공통 컴포넌트를 사용합니다. 성향 반영 상태를
            바꿔 모든 안내 문구와 모바일 배치를 검수하세요.
          </p>
        </div>
        <div className={styles.previewGrid}>
          <article className={styles.liveTopicPreviewFrame}>
            <header>
              <span>실제 고객 문항 화면</span>
              <strong>모바일 390px 기준</strong>
            </header>
            <div className={styles.liveTopicPreviewViewport}>
              {currentQuestion ? (
                <FreeTopicQuestionSurface
                  answer={currentAnswer}
                  assessment={topicAssessment}
                  current={safePreviewIndex + 1}
                  nextLabel={
                    safePreviewIndex === topicQuestions.length - 1
                      ? "결과 보기"
                      : "다음"
                  }
                  onAnswer={(value: ResponseValue) =>
                    setPreviewAnswers((previous) => ({
                      ...previous,
                      [currentQuestion.id]: {
                        answeredAt: new Date().toISOString(),
                        questionId: currentQuestion.id,
                        value,
                      },
                    }))
                  }
                  onClose={() => undefined}
                  onNext={() =>
                    setPreviewIndex((index) =>
                      Math.min(topicQuestions.length - 1, index + 1),
                    )
                  }
                  onPrevious={() =>
                    setPreviewIndex((index) => Math.max(0, index - 1))
                  }
                  onUnsureOpen={() => setIsPreviewUnsureOpen(true)}
                  question={currentQuestion}
                  total={topicQuestions.length}
                />
              ) : (
                <div className={styles.empty}>미리 볼 문항이 없습니다.</div>
              )}
            </div>
          </article>
          <article className={styles.liveTopicPreviewFrame}>
            <header>
              <span>실제 고객 결과 리포트</span>
              <strong>모바일 390px 기준</strong>
            </header>
            <div className={styles.liveTopicPreviewViewport}>
              {topicQuestions.length > 0 ? (
                <FreeTopicResultView
                  assessmentOverride={topicAssessment}
                  initialResult={previewResult}
                  key={`${topicAssessment.slug}:${traitImpactScenario}`}
                  localResultId={previewResult.localResultId}
                  previewMode
                  questionsOverride={topicQuestions}
                  shareEnabled={false}
                  slug={topicAssessment.slug}
                />
              ) : (
                <div className={styles.empty}>미리 볼 결과가 없습니다.</div>
              )}
            </div>
          </article>
        </div>
        <div className={styles.infoBox}>
          <strong>게시 전 확인</strong>
          <p>
            문항 상황과 행동이 한 번에 이해되는지, 다섯 응답 문구가 검사 의도와
            맞는지, 작은 모바일 화면에서도 긴 문장이 자연스럽게 읽히는지
            확인하세요.
          </p>
        </div>
        {isPreviewUnsureOpen && currentQuestion ? (
          <AssessmentUnsureSheet
            note={
              topicAssessment.reportMode === "independent_dimensions"
                ? "이 문항과 같은 상황의 답은 결과 비교에서 함께 제외해요. 중간 점수로 바꾸지 않으니 가장 가까운 이유를 선택해 주세요."
                : "겪어보지 않은 상황은 중간 점수로 계산하지 않아요. 가장 가까운 이유를 선택해 주세요."
            }
            onClose={() => setIsPreviewUnsureOpen(false)}
            onSelect={(unsureReason) => {
              setPreviewAnswers((previous) => ({
                ...previous,
                [currentQuestion.id]: {
                  answeredAt: new Date().toISOString(),
                  questionId: currentQuestion.id,
                  unsureReason,
                },
              }));
              setIsPreviewUnsureOpen(false);
            }}
            selectedReason={currentAnswer?.unsureReason}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.formStack}>
      <SectionHeading
        title="고객 화면 미리보기"
        copy="실제 앱의 정보 위계와 모바일 폭에 가깝게 제목·문항·결과 문구를 한 번에 확인합니다."
      />
      <div className={styles.previewGrid}>
        <article className={styles.phonePreview}>
          <header>
            <small>{subtypeLabels[document.subtype]}</small>
            <strong>{document.title}</strong>
            <p>{document.caption}</p>
            <span>
              약 {document.estimatedMinutes}분 · {questionCount(document)}문항
            </span>
          </header>
          <div className={styles.previewQuestion}>
            <small>첫 문항</small>
            <strong>{questionText}</strong>
            <div>
              {options.length > 0
                ? options
                    .slice(0, 5)
                    .map((option, index) => (
                      <span key={String(option.id ?? index)}>
                        {String(option[optionLabelKey] ?? `보기 ${index + 1}`)}
                      </span>
                    ))
                : ["전혀 그렇지 않다", "보통이다", "매우 그렇다"].map(
                    (label) => <span key={label}>{label}</span>,
                  )}
            </div>
          </div>
        </article>
        <article className={`${styles.phonePreview} ${styles.resultPreview}`}>
          <header>
            <small>결과 리포트 미리보기</small>
            <strong>{resultTitle}</strong>
            <p>{resultCopy}</p>
          </header>
          <div>
            {resultItems.length > 0 ? (
              resultItems.map((item, index) => (
                <span key={`${item}-${index}`}>
                  <b>{index + 1}</b>
                  {item}
                </span>
              ))
            ) : (
              <p>
                결과 항목을 연결하면 이곳에서 정보량과 문구를 확인할 수 있어요.
              </p>
            )}
          </div>
        </article>
      </div>
      <div className={styles.infoBox}>
        <strong>게시 전 확인</strong>
        <p>
          긴 제목이 잘리지 않는지, 첫 문항의 대상과 상황이 명확한지, 결과가 좋은
          말만 반복하지 않고 강점·주의점·다음 행동을 함께 설명하는지 확인하세요.
        </p>
      </div>
    </div>
  );
}

function QualityPanel({
  issues,
}: {
  issues: ReturnType<typeof validateAssessmentStudioDocument>;
}) {
  const blockers = issues.filter((item) => item.severity === "blocker");
  return (
    <div className={styles.formStack}>
      <SectionHeading
        title="자동 품질 검증"
        copy="발행 차단 항목은 반드시 해결하고, 권고 항목은 고객 화면 미리보기와 함께 판단합니다."
      />
      <div className={styles.qualitySummary}>
        <div data-tone={blockers.length ? "danger" : "safe"}>
          {blockers.length ? (
            <CircleAlert size={19} />
          ) : (
            <CheckCircle2 size={19} />
          )}
          <span>
            <strong>
              {blockers.length
                ? `${blockers.length}개 발행 차단`
                : "발행 차단 없음"}
            </strong>
            <small>{issues.length - blockers.length}개 개선 권고</small>
          </span>
        </div>
      </div>
      {issues.length === 0 ? (
        <div className={styles.successBox}>
          <CheckCircle2 size={18} /> 구조·문항·결과의 필수 검사를 통과했습니다.
        </div>
      ) : (
        <ul className={styles.issueList}>
          {issues.map((item, index) => (
            <li
              data-severity={item.severity}
              key={`${item.code}-${item.fieldPath}-${index}`}
            >
              <span>
                {item.severity === "blocker"
                  ? "발행 차단"
                  : item.severity === "warning"
                    ? "개선 권고"
                    : "참고"}
              </span>
              <div>
                <strong>{item.message}</strong>
                <code>{item.fieldPath}</code>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReleasePanel({
  busy,
  dirty,
  entry,
  issues,
  note,
  onAction,
  setNote,
}: {
  busy: boolean;
  dirty: boolean;
  entry: AssessmentStudioEntry;
  issues: ReturnType<typeof validateAssessmentStudioDocument>;
  note: string;
  onAction: (action: string, releaseId?: string) => void;
  setNote: (value: string) => void;
}) {
  const blocked = issues.some((item) => item.severity === "blocker");
  return (
    <div className={styles.formStack}>
      <SectionHeading
        title="검토와 공개"
        copy="작업 사유와 검증 결과를 남기고, 검토된 스냅샷만 고객에게 공개합니다."
      />
      <Field
        label="변경·조치 사유"
        hint="감사 기록에 남습니다. 5자 이상 구체적으로 작성하세요."
        wide
      >
        <textarea
          onChange={(event) => setNote(event.target.value)}
          placeholder="예: 주제 문항의 모호한 대상을 구체적인 상황으로 수정"
          rows={3}
          value={note}
        />
      </Field>
      <div className={styles.releaseActions}>
        {entry.status === "archived" ? (
          <button
            disabled={busy}
            onClick={() => onAction("restore")}
            type="button"
          >
            <RefreshCw size={16} /> 복원
          </button>
        ) : (
          <>
            {entry.status !== "in_review" && entry.hasUnpublishedChanges ? (
              <button
                disabled={busy || dirty || blocked}
                onClick={() => onAction("submit_review")}
                type="button"
              >
                <Send size={16} /> 검토 요청
              </button>
            ) : null}
            {entry.status === "in_review" ? (
              <>
                <button
                  disabled={busy}
                  onClick={() => onAction("return_draft")}
                  type="button"
                >
                  <RotateCcw size={16} /> 수정으로 돌리기
                </button>
                <button
                  className={styles.publishButton}
                  disabled={busy || blocked}
                  onClick={() => onAction("publish")}
                  type="button"
                >
                  <CheckCircle2 size={16} /> 새 버전 게시
                </button>
              </>
            ) : null}
            {entry.status === "published" ? (
              <button
                disabled={busy}
                onClick={() => onAction("pause")}
                type="button"
              >
                <FileClock size={16} /> 신규 시작 일시 중지
              </button>
            ) : null}
            <button
              className={styles.archiveButton}
              disabled={busy}
              onClick={() => onAction("archive")}
              type="button"
            >
              <Archive size={16} /> 안전하게 보관
            </button>
          </>
        )}
      </div>
      {dirty ? (
        <div className={styles.warningBox}>
          공개 작업 전에 현재 변경을 저장해 주세요.
        </div>
      ) : null}
      {blocked ? (
        <div className={styles.warningBox}>
          품질 검증의 발행 차단 항목을 먼저 해결해 주세요.
        </div>
      ) : null}
      <div className={styles.releaseHistory}>
        <h3>버전 기록</h3>
        {entry.releases.length === 0 ? (
          <div className={styles.empty}>아직 DB에 게시한 버전이 없습니다.</div>
        ) : (
          entry.releases.map((release) => (
            <article key={release.id}>
              <span>
                <strong>{release.releaseKey}</strong>
                <small>
                  {formatDate(release.publishedAt)} ·{" "}
                  {release.contentHash.slice(0, 10)}
                </small>
                <p>{release.changeNote}</p>
              </span>
              {release.id !== entry.publishedReleaseId ? (
                <button
                  disabled={busy}
                  onClick={() => onAction("rollback", release.id)}
                  type="button"
                >
                  <RotateCcw size={15} /> 이 버전으로 롤백
                </button>
              ) : (
                <em>현재 공개본</em>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function SectionHeading({ title, copy }: { title: string; copy: string }) {
  return (
    <div className={styles.sectionHeading}>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}
function Field({
  children,
  hint,
  label,
  wide = false,
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
  wide?: boolean;
}) {
  return (
    <label className={styles.field} data-wide={wide}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function getQuestions(
  document: AssessmentStudioDocument,
): Record<string, unknown>[] {
  const payload = document.payload as Record<string, unknown>;
  if (document.category === "core") {
    const definition = asObject(payload.definition);
    return [
      ...asArray(definition.items),
      ...asArray(definition.adaptiveItems),
    ] as Record<string, unknown>[];
  }
  if (document.subtype === "free_topic")
    return asArray(payload.questions) as Record<string, unknown>[];
  if (document.subtype === "odd_lab")
    return asArray(asObject(payload.assessment).questions) as Record<
      string,
      unknown
    >[];
  if (document.subtype === "balance_pack")
    return asArray(asObject(payload.pack).questions) as Record<
      string,
      unknown
    >[];
  const config = asObject(payload.config);
  return [
    {
      contextLabel: config.contextLabel,
      id: "friend-match-scene",
      text: config.question,
      options: config.choices,
    },
  ];
}

function setQuestions(
  document: AssessmentStudioDocument,
  questions: Record<string, unknown>[],
) {
  const payload = document.payload as Record<string, unknown>;
  if (document.category === "core") {
    const definition = asObject(payload.definition);
    const primaryCount = asArray(definition.items).length;
    payload.definition = {
      ...definition,
      adaptiveItems: questions.slice(primaryCount),
      items: questions.slice(0, primaryCount),
    };
  } else if (document.subtype === "free_topic") payload.questions = questions;
  else if (document.subtype === "odd_lab")
    payload.assessment = { ...asObject(payload.assessment), questions };
  else if (document.subtype === "balance_pack")
    payload.pack = { ...asObject(payload.pack), questions };
  else if (document.subtype === "friend_match" && questions[0]) {
    payload.config = {
      ...asObject(payload.config),
      choices: questions[0].options,
      contextLabel: questions[0].contextLabel,
      question: questions[0].text,
    };
  }
}

function newQuestion(
  document: AssessmentStudioDocument,
  index: number,
): Record<string, unknown> | null {
  const id = `draft-${Date.now()}-${index + 1}`;
  if (document.subtype === "free_topic") {
    const payload = document.payload as Record<string, unknown>;
    const assessment = asObject(payload.assessment);
    const firstMapping = asObject(asArray(assessment.mappings)[0]);
    const mappedTarget = asObject(firstMapping.target);
    const firstScale = asObject(asArray(assessment.reportScales)[0]);
    return {
      contextLabel: "새 상황",
      id,
      isReverse: false,
      ...(firstScale.id ? { reportScaleId: firstScale.id } : {}),
      target: mappedTarget.id
        ? mappedTarget
        : { kind: "facet", id: coreFacetDefinitions[0]?.facetId ?? "SE-RE" },
      text: "새 문항을 입력하세요.",
    };
  }
  if (document.subtype === "odd_lab") {
    const profiles = asArray(
      asObject((document.payload as Record<string, unknown>).assessment)
        .profiles,
    ) as Record<string, unknown>[];
    return {
      id,
      text: "새 문항을 입력하세요.",
      options: profiles.map((profile, optionIndex) => ({
        id: `${id}-${optionIndex + 1}`,
        label: `보기 ${optionIndex + 1}`,
        resultId: profile.id,
      })),
    };
  }
  if (document.subtype === "balance_pack") {
    const pack = asObject((document.payload as Record<string, unknown>).pack);
    return {
      audience: "all",
      contentVersion: pack.contentPoolVersion,
      conversationValue: 2,
      highlightPriority: 1,
      id,
      intensity: "light",
      options: [
        { id: `${id}:a`, text: "선택 A" },
        { id: `${id}:b`, text: "선택 B" },
      ],
      packId: pack.id,
      phase: "familiar",
      prompt: "새 질문을 입력하세요.",
      promptRole: "taste",
      scored: true,
      sensitivity: "general",
      subtopic: "새 주제",
    };
  }
  return null;
}

function updateTopicScale(
  document: AssessmentStudioDocument,
  index: number,
  key: string,
  value: string,
  onChange: (value: AssessmentStudioDocument) => void,
) {
  const next = clone(document);
  const payload = next.payload as Record<string, unknown>;
  const assessment = asObject(payload.assessment);
  const scales = asArray(assessment.reportScales) as Record<string, unknown>[];
  scales[index] = { ...scales[index], [key]: value };
  payload.assessment = { ...assessment, reportScales: scales };
  onChange(next);
}
function updateTopicAssessment(
  document: AssessmentStudioDocument,
  assessment: Record<string, unknown>,
  onChange: (value: AssessmentStudioDocument) => void,
) {
  const next = clone(document);
  (next.payload as Record<string, unknown>).assessment = assessment;
  onChange(next);
}
function updateCoreDefinition(
  document: AssessmentStudioDocument,
  definition: Record<string, unknown>,
  onChange: (value: AssessmentStudioDocument) => void,
) {
  const next = clone(document);
  (next.payload as Record<string, unknown>).definition = definition;
  onChange(next);
}
function addTopicScale(
  document: AssessmentStudioDocument,
  onChange: (value: AssessmentStudioDocument) => void,
) {
  const next = clone(document);
  const payload = next.payload as Record<string, unknown>;
  const assessment = asObject(payload.assessment);
  const scales = asArray(assessment.reportScales) as Record<string, unknown>[];
  const id = `result-${Date.now()}`;
  scales.push({
    areaLabel: "새 결과 영역",
    groupLabel: "세부 결과",
    highAction: "강점을 유지하면서 과해지지 않도록 해볼 행동을 작성하세요.",
    highCopy: "이 성향이 자주 나타나는 모습을 구체적으로 작성하세요.",
    highLabel: "자주 나타나요",
    highStrength: "이 성향이 뚜렷할 때 발휘되는 강점을 작성하세요.",
    highWatch: "이 성향이 지나칠 때 생길 수 있는 어려움을 작성하세요.",
    id,
    lowAction: "부족한 부분을 무리 없이 보완할 행동을 작성하세요.",
    lowCopy: "이 성향이 적게 나타나는 모습을 구체적으로 작성하세요.",
    lowLabel: "드물게 나타나요",
    lowStrength: "이 성향이 낮을 때 오히려 도움이 되는 점을 작성하세요.",
    lowWatch: "이 성향이 부족할 때 놓치기 쉬운 점을 작성하세요.",
    midAction: "상황별 차이를 더 분명히 알아볼 행동을 작성하세요.",
    midCopy: "상황에 따라 달라지는 모습을 구체적으로 작성하세요.",
    midLabel: "상황에 따라 달라요",
    midStrength: "상황에 맞춰 조절할 수 있는 강점을 작성하세요.",
    midWatch: "기준이 흔들릴 때 생길 수 있는 어려움을 작성하세요.",
  });
  payload.assessment = {
    ...assessment,
    reportMode: "independent_dimensions",
    reportScales: scales,
  };
  onChange(next);
}
function removeTopicScale(
  document: AssessmentStudioDocument,
  index: number,
  onChange: (value: AssessmentStudioDocument) => void,
) {
  if (
    !window.confirm(
      "이 작업본에서 결과 척도를 제외할까요? 연결된 문항이 있으면 게시가 차단됩니다.",
    )
  )
    return;
  const next = clone(document);
  const payload = next.payload as Record<string, unknown>;
  const assessment = asObject(payload.assessment);
  const scales = asArray(assessment.reportScales) as Record<string, unknown>[];
  scales.splice(index, 1);
  payload.assessment = { ...assessment, reportScales: scales };
  onChange(next);
}
function updateLabProfile(
  document: AssessmentStudioDocument,
  index: number,
  key: string,
  value: unknown,
  onChange: (value: AssessmentStudioDocument) => void,
) {
  const next = clone(document);
  const payload = next.payload as Record<string, unknown>;
  const assessment = asObject(payload.assessment);
  const profiles = asArray(assessment.profiles) as Record<string, unknown>[];
  profiles[index] = { ...profiles[index], [key]: value };
  payload.assessment = { ...assessment, profiles };
  onChange(next);
}
function updateLabAssessment(
  document: AssessmentStudioDocument,
  assessment: Record<string, unknown>,
  onChange: (value: AssessmentStudioDocument) => void,
) {
  const next = clone(document);
  (next.payload as Record<string, unknown>).assessment = assessment;
  onChange(next);
}
function addLabProfile(
  document: AssessmentStudioDocument,
  onChange: (value: AssessmentStudioDocument) => void,
) {
  const next = clone(document);
  const payload = next.payload as Record<string, unknown>;
  const assessment = asObject(payload.assessment);
  const profiles = asArray(assessment.profiles) as Record<string, unknown>[];
  const profileId = `profile-${Date.now()}`;
  profiles.push({
    id: profileId,
    relationTip: "관계에서 활용할 수 있는 구체적인 팁을 작성하세요.",
    shortTitle: "새 결과",
    smallExperiment: "오늘 바로 해볼 수 있는 작은 행동을 작성하세요.",
    strengths: ["이 결과에서 실제로 드러나는 강점을 작성하세요."],
    summary: "이 결과의 핵심 성향을 한눈에 이해하도록 작성하세요.",
    title: "새 결과",
    watch: "과해질 때 생길 수 있는 어려움을 솔직하게 작성하세요.",
  });
  const questions = (
    asArray(assessment.questions) as Record<string, unknown>[]
  ).map((question, questionIndex) => ({
    ...question,
    options: [
      ...(asArray(question.options) as Record<string, unknown>[]),
      {
        id: `${String(question.id ?? `question-${questionIndex + 1}`)}-${profileId}`,
        label: "새 결과에 해당하는 보기를 작성하세요.",
        resultId: profileId,
      },
    ],
  }));
  payload.assessment = { ...assessment, profiles, questions };
  onChange(next);
}
function removeLabProfile(
  document: AssessmentStudioDocument,
  index: number,
  onChange: (value: AssessmentStudioDocument) => void,
) {
  if (
    !window.confirm(
      "이 작업본에서 이 결과 유형과 연결된 보기를 함께 제외할까요? 공개본과 과거 결과는 바뀌지 않습니다.",
    )
  )
    return;
  const next = clone(document);
  const payload = next.payload as Record<string, unknown>;
  const assessment = asObject(payload.assessment);
  const profiles = asArray(assessment.profiles) as Record<string, unknown>[];
  const removedId = String(profiles[index]?.id ?? "");
  profiles.splice(index, 1);
  const questions = (
    asArray(assessment.questions) as Record<string, unknown>[]
  ).map((question) => ({
    ...question,
    options: (asArray(question.options) as Record<string, unknown>[]).filter(
      (option) => option.resultId !== removedId,
    ),
  }));
  payload.assessment = { ...assessment, profiles, questions };
  onChange(next);
}
function updatePayloadObject(
  document: AssessmentStudioDocument,
  key: string,
  value: Record<string, unknown>,
  onChange: (value: AssessmentStudioDocument) => void,
) {
  const next = clone(document);
  (next.payload as Record<string, unknown>)[key] = value;
  onChange(next);
}
function updateBalanceScoring(
  document: AssessmentStudioDocument,
  scoringTemplate: string,
  onChange: (value: AssessmentStudioDocument) => void,
) {
  const semantics =
    (
      {
        dilemma_fun: "choice_chemistry",
        discovery_only: "discovery_only",
        ideal_preference: "ideal_preference_similarity",
        reciprocal_fit: "reciprocal_fit",
        relationship_standard: "relationship_standard_sync",
        taste_sync: "taste_sync",
      } as Record<string, string>
    )[scoringTemplate] ?? "taste_sync";
  const pack = asObject((document.payload as Record<string, unknown>).pack);
  updatePayloadObject(
    document,
    "pack",
    { ...pack, resultSemantics: semantics, scoringTemplate },
    onChange,
  );
}
function balanceSemanticsLabel(value: string) {
  return (
    (
      {
        choice_chemistry: "극한 선택에서 드러난 케미",
        discovery_only: "점수 없이 대화거리 발견",
        ideal_preference_similarity: "끌리는 포인트의 유사성",
        reciprocal_fit: "선호와 행동의 상호보완",
        relationship_standard_sync: "관계 기준의 유사성",
        taste_sync: "같이 고른 취향의 비율",
      } as Record<string, string>
    )[value] ?? "해석 기준을 확인해 주세요"
  );
}
function questionCount(document: AssessmentStudioDocument) {
  return getQuestions(document).length;
}
function syncPayloadIdentity(document: AssessmentStudioDocument) {
  const payload = document.payload as Record<string, unknown>;
  if (document.category === "core") {
    payload.definition = {
      ...asObject(payload.definition),
      estimatedMinutes: document.estimatedMinutes,
      title: document.title,
    };
  }
  if (document.subtype === "free_topic") {
    payload.assessment = {
      ...asObject(payload.assessment),
      caption: document.caption,
      evidenceUse: "dynamic_trait_evidence",
      estimatedMinutes: document.estimatedMinutes,
      impactGrade: "A",
      slug: document.slug,
      title: document.title,
    };
  }
  if (document.subtype === "odd_lab") {
    payload.assessment = {
      ...asObject(payload.assessment),
      ageAccessPolicy: document.ageAccessPolicy,
      caption: document.caption,
      cardTitle: document.title,
      estimatedMinutes: document.estimatedMinutes,
      safetyNote: document.description,
      sensitivity: document.sensitivity === "caution" ? "S2" : "S1",
      slug: document.slug,
      title: document.title,
    };
  }
  if (document.subtype === "balance_pack") {
    const pack = asObject(payload.pack);
    payload.pack = {
      ...pack,
      description: document.description,
      id: document.slug,
      questions: (asArray(pack.questions) as Record<string, unknown>[]).map(
        (question) => ({ ...question, packId: document.slug }),
      ),
      slug: document.slug,
      title: document.title,
    };
  }
  if (document.subtype === "friend_match") {
    payload.config = {
      ...asObject(payload.config),
      description: document.description,
      title: document.title,
    };
  }
}
function actionSuccessCopy(action: string) {
  return (
    (
      {
        archive: "고객 신규 노출을 중단하고 안전하게 보관했습니다.",
        pause: "신규 시작을 일시 중지했습니다. 기존 결과는 유지됩니다.",
        publish: "검증된 새 버전을 게시했습니다.",
        restore: "검사를 복원했습니다. 게시 전 상태를 확인해 주세요.",
        return_draft: "수정할 수 있도록 작업본으로 돌렸습니다.",
        rollback: "선택한 안정 버전으로 롤백했습니다.",
        submit_review: "검토 요청을 등록했습니다.",
      } as Record<string, string>
    )[action] ?? "처리했습니다."
  );
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
function clone<T>(value: T): T {
  return structuredClone(value);
}
function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
