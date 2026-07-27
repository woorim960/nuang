"use client";

import {
  CalendarClock,
  Check,
  Copy,
  Eye,
  FilePenLine,
  Plus,
  Send,
  Star,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { AdminConfirmDialog } from "@/features/admin/AdminConfirmDialog";
import type {
  AdminCommunityContentDashboard,
  AdminCommunityContentItem,
  AdminCommunityContentStatus,
  AdminCommunityContentType,
} from "@/features/admin/server-admin-community-content";
import styles from "./AdminCommunityContentManager.module.css";

type EditorDraft = {
  body: string;
  contentType: AdminCommunityContentType;
  id: string | null;
  options: [{ key: string; label: string }, { key: string; label: string }];
  prompt: string;
  responseClosesAt: string;
  scheduledFor: string;
  status: AdminCommunityContentStatus;
  title: string;
};

const statusOrder: AdminCommunityContentStatus[] = [
  "published",
  "scheduled",
  "draft",
  "closed",
  "archived",
];

export function AdminCommunityContentManager({
  contentType,
  dashboard,
}: {
  contentType: AdminCommunityContentType;
  dashboard: AdminCommunityContentDashboard;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [editor, setEditor] = useState<EditorDraft | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filter, setFilter] = useState<AdminCommunityContentStatus | "all">(
    "all",
  );
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<{
    action: "archive" | "delete_draft";
    item: AdminCommunityContentItem;
  } | null>(null);
  const items = useMemo(
    () =>
      dashboard.items.filter(
        (item) =>
          item.contentType === contentType &&
          (filter === "all" || item.status === filter),
      ),
    [contentType, dashboard.items, filter],
  );

  function openNew() {
    setEditor(createEmptyDraft(contentType));
    setMessage("");
    setPreviewOpen(false);
  }

  function openEdit(item: AdminCommunityContentItem) {
    setEditor(toEditorDraft(item));
    setMessage("");
    setPreviewOpen(false);
  }

  async function saveThen(
    nextAction: "none" | "publish" | "schedule" = "none",
  ) {
    if (!editor || !formRef.current?.reportValidity()) return;
    if (nextAction === "schedule" && !editor.scheduledFor) {
      setMessage("예약할 날짜와 시간을 선택해 주세요.");
      return;
    }
    const saveAction = editor.id ? "update" : "create";
    setPending(nextAction === "none" ? "save" : nextAction);
    setMessage("");
    const saved = await requestContent({
      action: saveAction,
      body: editor.body,
      contentId: editor.id ?? undefined,
      contentType: editor.contentType,
      options: editor.contentType === "balance_game" ? editor.options : [],
      prompt: editor.prompt,
      responseClosesAt: editor.responseClosesAt
        ? new Date(editor.responseClosesAt).toISOString()
        : null,
      title: editor.title,
    });
    if (!saved.ok || !saved.contentId) {
      setMessage(saved.message);
      setPending(null);
      return;
    }
    if (nextAction !== "none") {
      const changed = await requestContent(
        nextAction === "schedule"
          ? {
              action: "schedule",
              contentId: saved.contentId,
              scheduledFor: new Date(editor.scheduledFor).toISOString(),
            }
          : { action: "publish", contentId: saved.contentId },
      );
      if (!changed.ok) {
        setEditor((current) =>
          current ? { ...current, id: saved.contentId } : current,
        );
        setMessage(changed.message);
        setPending(null);
        router.refresh();
        return;
      }
    }
    setEditor(null);
    setPreviewOpen(false);
    setPending(null);
    router.refresh();
  }

  async function runAction(
    action:
      | "archive"
      | "close"
      | "delete_draft"
      | "duplicate"
      | "feature"
      | "publish",
    item: AdminCommunityContentItem,
  ) {
    setPending(`${action}:${item.id}`);
    setMessage("");
    const result = await requestContent({ action, contentId: item.id });
    if (!result.ok) {
      setMessage(result.message);
      setPending(null);
      return;
    }
    setPending(null);
    setConfirmation(null);
    router.refresh();
  }

  return (
    <div className={styles.manager}>
      <div className={styles.toolbar}>
        <div aria-label="콘텐츠 상태 필터" className={styles.filters}>
          <button
            data-active={filter === "all"}
            onClick={() => setFilter("all")}
            type="button"
          >
            전체
          </button>
          {statusOrder.map((status) => (
            <button
              data-active={filter === status}
              key={status}
              onClick={() => setFilter(status)}
              type="button"
            >
              {statusLabel(status)}
              <span>
                {countByTypeAndStatus(dashboard, contentType, status)}
              </span>
            </button>
          ))}
        </div>
        <button className={styles.createButton} onClick={openNew} type="button">
          <Plus aria-hidden="true" size={17} strokeWidth={1.8} />
          새로 만들기
        </button>
      </div>

      {message ? (
        <p className={styles.alert} role="alert">
          {message}
        </p>
      ) : null}

      {editor ? (
        <section className={styles.editorShell}>
          <header className={styles.editorHeader}>
            <div>
              <span>{editor.id ? "콘텐츠 편집" : "새 콘텐츠"}</span>
              <h2>
                {contentType === "balance_game"
                  ? "밸런스게임 만들기"
                  : "오늘의 질문 만들기"}
              </h2>
            </div>
            <button
              aria-label="편집 닫기"
              onClick={() => setEditor(null)}
              type="button"
            >
              <X aria-hidden="true" size={20} strokeWidth={1.7} />
            </button>
          </header>

          <div className={styles.editorGrid}>
            <form
              className={styles.form}
              onSubmit={(event) => event.preventDefault()}
              ref={formRef}
            >
              <label>
                <span>운영용 제목</span>
                <input
                  maxLength={80}
                  minLength={2}
                  onChange={(event) =>
                    setEditor({ ...editor, title: event.target.value })
                  }
                  placeholder="목록에서 알아보기 쉬운 제목"
                  required
                  value={editor.title}
                />
                <small>사용자에게는 노출되지 않습니다.</small>
              </label>
              <label>
                <span>질문</span>
                <textarea
                  maxLength={160}
                  minLength={4}
                  onChange={(event) =>
                    setEditor({ ...editor, prompt: event.target.value })
                  }
                  placeholder={
                    contentType === "balance_game"
                      ? "두 선택지를 함께 떠올릴 수 있는 질문"
                      : "경험과 생각을 편하게 나눌 수 있는 질문"
                  }
                  required
                  rows={3}
                  value={editor.prompt}
                />
                <small>{editor.prompt.length}/160</small>
              </label>

              {contentType === "balance_game" ? (
                <>
                  <div className={styles.optionGrid}>
                    {editor.options.map((option, index) => (
                      <label key={index}>
                        <span>선택 {index + 1}</span>
                        <input
                          maxLength={80}
                          onChange={(event) => {
                            const next = [
                              ...editor.options,
                            ] as EditorDraft["options"];
                            next[index] = {
                              key: option.key,
                              label: event.target.value,
                            };
                            setEditor({ ...editor, options: next });
                          }}
                          placeholder={
                            index === 0 ? "첫 번째 선택" : "두 번째 선택"
                          }
                          required
                          value={option.label}
                        />
                      </label>
                    ))}
                  </div>
                  <label>
                    <span>피드 안내 문구</span>
                    <textarea
                      maxLength={800}
                      onChange={(event) =>
                        setEditor({ ...editor, body: event.target.value })
                      }
                      placeholder="비워두면 질문이 표시됩니다."
                      rows={2}
                      value={editor.body}
                    />
                  </label>
                </>
              ) : null}

              <label>
                <span>예약 시간</span>
                <input
                  min={minimumScheduleInput()}
                  onChange={(event) =>
                    setEditor({ ...editor, scheduledFor: event.target.value })
                  }
                  type="datetime-local"
                  value={editor.scheduledFor}
                />
              </label>
              <label>
                <span>응답 마감 시간</span>
                <input
                  min={minimumScheduleInput()}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      responseClosesAt: event.target.value,
                    })
                  }
                  type="datetime-local"
                  value={editor.responseClosesAt}
                />
                <small>
                  비워두면 운영자가 직접 마감할 때까지 참여할 수 있습니다.
                </small>
              </label>

              <div className={styles.formActions}>
                <button
                  className={styles.secondaryButton}
                  disabled={Boolean(pending)}
                  onClick={() => setPreviewOpen((open) => !open)}
                  type="button"
                >
                  <Eye aria-hidden="true" size={16} strokeWidth={1.8} />
                  {previewOpen ? "미리보기 닫기" : "미리보기"}
                </button>
                <button
                  className={styles.secondaryButton}
                  disabled={Boolean(pending)}
                  onClick={() => void saveThen()}
                  type="button"
                >
                  <Check aria-hidden="true" size={16} strokeWidth={1.8} />
                  임시저장
                </button>
                <button
                  className={styles.secondaryButton}
                  disabled={Boolean(pending)}
                  onClick={() => void saveThen("schedule")}
                  type="button"
                >
                  <CalendarClock
                    aria-hidden="true"
                    size={16}
                    strokeWidth={1.8}
                  />
                  예약
                </button>
                <button
                  className={styles.primaryButton}
                  disabled={Boolean(pending)}
                  onClick={() => void saveThen("publish")}
                  type="button"
                >
                  <Send aria-hidden="true" size={16} strokeWidth={1.8} />
                  지금 게시
                </button>
              </div>
            </form>
            {previewOpen ? <ContentPreview editor={editor} /> : null}
          </div>
        </section>
      ) : null}

      {items.length ? (
        <div className={styles.contentList}>
          {items.map((item) => {
            const itemPending = pending?.endsWith(item.id);
            return (
              <article key={item.id}>
                <div className={styles.itemMain}>
                  <div className={styles.itemHeading}>
                    <span data-status={item.status}>
                      {statusLabel(item.status)}
                    </span>
                    <small>v{item.revision}</small>
                    {item.isFeatured ? (
                      <strong className={styles.featuredBadge}>
                        대표 노출
                      </strong>
                    ) : null}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.prompt}</p>
                  {item.contentType === "balance_game" ? (
                    <div className={styles.optionSummary}>
                      {item.options.map((option) => (
                        <span key={option.key}>{option.label}</span>
                      ))}
                    </div>
                  ) : null}
                  <div className={styles.itemMeta}>
                    {item.status === "scheduled" && item.scheduledFor ? (
                      <span>
                        <CalendarClock aria-hidden="true" size={14} />
                        {formatDateTime(item.scheduledFor)} 게시
                      </span>
                    ) : (
                      <span>{formatDateTime(item.updatedAt)} 수정</span>
                    )}
                    {item.responseClosesAt && item.status === "published" ? (
                      <span>
                        <CalendarClock aria-hidden="true" size={14} />
                        {formatDateTime(item.responseClosesAt)} 응답 마감
                      </span>
                    ) : null}
                    {item.contentType === "balance_game" ? (
                      <span>
                        {item.voteCount.toLocaleString("ko-KR")}명 참여
                      </span>
                    ) : (
                      <span>
                        {item.replyCount.toLocaleString("ko-KR")}개 답변
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.itemActions}>
                  {item.status === "draft" || item.status === "scheduled" ? (
                    <>
                      <button
                        disabled={itemPending}
                        onClick={() => openEdit(item)}
                        type="button"
                      >
                        <FilePenLine aria-hidden="true" size={15} />
                        편집
                      </button>
                      <button
                        disabled={itemPending}
                        onClick={() => void runAction("publish", item)}
                        type="button"
                      >
                        <Send aria-hidden="true" size={15} />
                        게시
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={itemPending}
                      onClick={() => void runAction("duplicate", item)}
                      type="button"
                    >
                      <Copy aria-hidden="true" size={15} />
                      복제
                    </button>
                  )}
                  {item.status === "published" ? (
                    <button
                      disabled={itemPending}
                      onClick={() => void runAction("close", item)}
                      type="button"
                    >
                      <Square aria-hidden="true" size={14} />
                      응답 마감
                    </button>
                  ) : null}
                  {item.status === "published" && !item.isFeatured ? (
                    <button
                      disabled={itemPending}
                      onClick={() => void runAction("feature", item)}
                      type="button"
                    >
                      <Star aria-hidden="true" size={15} />
                      대표로 노출
                    </button>
                  ) : null}
                  {item.status !== "archived" && item.status !== "draft" ? (
                    <button
                      className={styles.dangerButton}
                      disabled={itemPending}
                      onClick={() =>
                        setConfirmation({ action: "archive", item })
                      }
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={15} />
                      삭제
                    </button>
                  ) : null}
                  {item.status === "draft" ? (
                    <button
                      className={styles.dangerButton}
                      disabled={itemPending}
                      onClick={() =>
                        setConfirmation({ action: "delete_draft", item })
                      }
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={15} />
                      삭제
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <strong>표시할 콘텐츠가 없습니다</strong>
          <p>새로 만들기를 눌러 첫 콘텐츠를 준비해 보세요.</p>
        </div>
      )}
      <AdminConfirmDialog
        confirmLabel={
          confirmation?.action === "delete_draft" ? "완전히 삭제" : "삭제"
        }
        description={
          confirmation?.action === "delete_draft"
            ? "삭제한 임시저장은 복구할 수 없습니다."
            : "사용자 피드에서 즉시 사라집니다. 운영 기록에는 조치 이력만 남습니다."
        }
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          if (confirmation) {
            void runAction(confirmation.action, confirmation.item);
          }
        }}
        open={Boolean(confirmation)}
        pending={Boolean(
          confirmation && pending?.endsWith(confirmation.item.id),
        )}
        title={
          confirmation?.action === "delete_draft"
            ? "이 임시저장을 삭제할까요?"
            : "이 콘텐츠를 삭제할까요?"
        }
      />
    </div>
  );
}

function ContentPreview({ editor }: { editor: EditorDraft }) {
  return (
    <aside className={styles.preview}>
      <div className={styles.previewTop}>
        <span>피드 미리보기</span>
        <strong>NUANG</strong>
      </div>
      <small>
        {editor.contentType === "balance_game"
          ? "오늘의 성향 놀이터"
          : "오늘의 질문"}
      </small>
      <h3>{editor.prompt || "질문이 이곳에 표시됩니다."}</h3>
      {editor.contentType === "balance_game" ? (
        <div>
          {editor.options.map((option, index) => (
            <span key={index}>{option.label || `선택 ${index + 1}`}</span>
          ))}
        </div>
      ) : (
        <p>사용자는 이 질문에 댓글로 자신의 경험과 생각을 남깁니다.</p>
      )}
    </aside>
  );
}

function createEmptyDraft(contentType: AdminCommunityContentType): EditorDraft {
  return {
    body: "",
    contentType,
    id: null,
    options: [
      { key: "option_a", label: "" },
      { key: "option_b", label: "" },
    ],
    prompt: "",
    responseClosesAt: "",
    scheduledFor: "",
    status: "draft",
    title: "",
  };
}

function toEditorDraft(item: AdminCommunityContentItem): EditorDraft {
  const options = item.options.slice(0, 2);
  return {
    body: item.body,
    contentType: item.contentType,
    id: item.id,
    options: [
      options[0] ?? { key: "option_a", label: "" },
      options[1] ?? { key: "option_b", label: "" },
    ],
    prompt: item.prompt,
    responseClosesAt: item.responseClosesAt
      ? toLocalDateTime(item.responseClosesAt)
      : "",
    scheduledFor: item.scheduledFor ? toLocalDateTime(item.scheduledFor) : "",
    status: item.status,
    title: item.title,
  };
}

async function requestContent(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/community/content", {
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const data = (await response.json().catch(() => null)) as {
    contentId?: string | null;
    message?: string;
    ok?: boolean;
  } | null;
  return {
    contentId: data?.contentId ?? null,
    message: data?.message ?? "콘텐츠를 저장하지 못했습니다.",
    ok: response.ok && data?.ok === true,
  };
}

function countByTypeAndStatus(
  dashboard: AdminCommunityContentDashboard,
  type: AdminCommunityContentType,
  status: AdminCommunityContentStatus,
) {
  return dashboard.items.filter(
    (item) => item.contentType === type && item.status === status,
  ).length;
}

function statusLabel(status: AdminCommunityContentStatus) {
  return {
    archived: "삭제됨",
    closed: "응답 마감",
    draft: "임시저장",
    published: "게시 중",
    scheduled: "예약",
  }[status];
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 확인 필요";
  const koreanTime = new Date(date.getTime() + 9 * 60 * 60 * 1_000);
  const year = koreanTime.getUTCFullYear();
  const month = koreanTime.getUTCMonth() + 1;
  const day = koreanTime.getUTCDate();
  const hour = String(koreanTime.getUTCHours()).padStart(2, "0");
  const minute = String(koreanTime.getUTCMinutes()).padStart(2, "0");

  return `${year}. ${month}. ${day}. ${hour}:${minute}`;
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function minimumScheduleInput() {
  return toLocalDateTime(new Date(Date.now() + 2 * 60_000).toISOString());
}
