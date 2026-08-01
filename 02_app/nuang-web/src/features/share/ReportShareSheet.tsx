"use client";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  FlaskConical,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  MessagesSquare,
  Share2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  createReportShareText,
  reportShareActions,
  type ReportShareContent,
} from "@/features/share/report-share-contract";
import styles from "./ReportShareSheet.module.css";

type ReportShareSheetProps = {
  canonicalUrl?: string;
  content: ReportShareContent;
  initialCommunityNote?: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (href: string) => void;
  originalReportKey?: string;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
};

type ShareActionId = (typeof reportShareActions)[number]["id"];
type ShareStatus = {
  kind: "error" | "notice" | "success";
  message: string;
} | null;
type ShareStep = "actions" | "community";

const actionDescriptions: Record<ShareActionId, string> = {
  copy_link: "원본 결과 주소를 복사해요",
  feed_share: "내 한마디와 함께 피드에 올려요",
  native_share: "휴대폰의 공유창을 열어요",
};

const reportTypeLabels: Record<ReportShareContent["reportType"], string> = {
  core: "코어 검사",
  lab: "별난 연구소",
  topic: "주제 검사",
};

const subscribeToClient = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ReportShareSheet({
  canonicalUrl,
  content,
  initialCommunityNote,
  isOpen,
  onClose,
  onNavigate,
  originalReportKey,
  returnFocusRef,
}: ReportShareSheetProps) {
  const [activeAction, setActiveAction] = useState<ShareActionId | null>(null);
  const [communityNote, setCommunityNote] = useState("");
  const [feedOriginalUrl, setFeedOriginalUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [step, setStep] = useState<ShareStep>("actions");
  const [status, setStatus] = useState<ShareStatus>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isClient = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );
  const sharesOriginalReport = Boolean(canonicalUrl || originalReportKey);

  const closeSheet = useCallback(() => {
    setCommunityNote("");
    setStatus(null);
    setActiveAction(null);
    setStep("actions");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const returnFocusElement = returnFocusRef?.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() =>
      dialogRef.current?.focus({ preventScroll: true }),
    );

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSheet();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      (returnFocusElement ?? previousFocusRef.current)?.focus();
    };
  }, [closeSheet, isOpen, returnFocusRef]);

  if (!isClient || !isOpen) return null;

  async function getOrCreateShareUrl() {
    if (shareUrl) return shareUrl;
    if (canonicalUrl) {
      const resolvedUrl = new URL(
        canonicalUrl,
        window.location.origin,
      ).toString();
      setShareUrl(resolvedUrl);
      return resolvedUrl;
    }

    if (!originalReportKey) {
      throw new Error("검사 결과를 계정에 저장한 뒤 공유할 수 있어요.");
    }

    const isCoreReport = originalReportKey.startsWith("core_");
    const response = await fetch(
      isCoreReport ? "/api/share-links" : "/api/report-share-links",
      {
        body: JSON.stringify(
          isCoreReport
            ? {
                resultReportId: originalReportKey.slice("core_".length),
                ttlDays: 30,
                visibility: "summary",
              }
            : { reportKey: originalReportKey },
        ),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
    );
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      ok?: boolean;
      shareLink?: { url?: string };
      url?: string;
    } | null;
    const resolvedUrl = payload?.shareLink?.url ?? payload?.url;

    if (!response.ok || !payload?.ok || !resolvedUrl) {
      throw new Error(payload?.message ?? "share_link_failed");
    }

    setShareUrl(resolvedUrl);
    return resolvedUrl;
  }

  async function getOrCreateFeedOriginalUrl() {
    if (feedOriginalUrl) return feedOriginalUrl;
    if (canonicalUrl) {
      const resolvedUrl = new URL(
        canonicalUrl,
        window.location.origin,
      ).toString();
      setFeedOriginalUrl(resolvedUrl);
      return resolvedUrl;
    }
    if (!originalReportKey) {
      throw new Error("검사 결과를 계정에 저장한 뒤 공유할 수 있어요.");
    }
    const response = await fetch("/api/report-share-links", {
      body: JSON.stringify({ reportKey: originalReportKey }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      ok?: boolean;
      url?: string;
    } | null;
    if (!response.ok || !payload?.ok || !payload.url) {
      throw new Error(payload?.message ?? "share_link_failed");
    }
    setFeedOriginalUrl(payload.url);
    return payload.url;
  }

  async function handleCopyLink() {
    try {
      setActiveAction("copy_link");
      setStatus(null);
      const url = await getOrCreateShareUrl();
      await copyText(url);
      setStatus({
        kind: "success",
        message: sharesOriginalReport
          ? "원본 리포트 링크를 복사했어요."
          : "공유 링크를 복사했어요. 30일 동안 열 수 있어요.",
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message: toShareErrorMessage(
          error,
          "링크를 복사하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        ),
      });
    } finally {
      setActiveAction(null);
    }
  }

  async function handleNativeShare() {
    try {
      setActiveAction("native_share");
      setStatus(null);
      const url = await getOrCreateShareUrl();

      if (typeof navigator.share !== "function") {
        await copyText(url);
        setStatus({
          kind: "notice",
          message: "이 기기에서는 공유창을 열 수 없어 링크를 복사했어요.",
        });
        return;
      }

      await navigator.share({
        text: createReportShareText(content),
        title: `${content.title} | 뉴앙`,
        url,
      });
      setStatus({ kind: "success", message: "공유할 앱을 열었어요." });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus(null);
        return;
      }
      setStatus({
        kind: "error",
        message: toShareErrorMessage(
          error,
          "공유창을 열지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        ),
      });
    } finally {
      setActiveAction(null);
    }
  }

  async function handleFeedShare() {
    try {
      setActiveAction("feed_share");
      setStatus(null);
      const originalUrl = await getOrCreateFeedOriginalUrl();
      const attachment = parseOriginalReportAttachment(originalUrl);
      if (!attachment) {
        throw new Error(
          "원본 리포트를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        );
      }
      const note = communityNote.trim();
      const response = await fetch("/api/feed", {
        body: JSON.stringify({
          action: "create_post",
          attachments: [attachment],
          body: note,
          source: "report_share",
          sourceId: attachment.id,
          topic: {
            category: null,
            source: "manual",
            tags: createReportFeedTags(content),
          },
          visibility: "public",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
      } | null;

      if (response.status === 401) {
        const nextPath = `${window.location.pathname}${window.location.search}`;
        navigate(`/login?next=${encodeURIComponent(nextPath)}`, onNavigate);
        return;
      }

      if (!response.ok || !payload?.ok) throw new Error("feed_share_failed");

      setStatus({
        kind: "success",
        message: "커뮤니티에 결과를 공유했어요.",
      });
      navigate("/feed", onNavigate);
    } catch (error) {
      setStatus({
        kind: "error",
        message: toShareErrorMessage(
          error,
          "커뮤니티에 공유하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        ),
      });
    } finally {
      setActiveAction(null);
    }
  }

  const actionHandlers: Record<ShareActionId, () => Promise<void>> = {
    copy_link: handleCopyLink,
    feed_share: async () => {
      setStatus(null);
      setCommunityNote(
        (current) => current || initialCommunityNote?.slice(0, 120) || "",
      );
      setStep("community");
    },
    native_share: handleNativeShare,
  };

  return createPortal(
    <div className={styles.layer}>
      <button
        aria-label="공유 창 닫기"
        className={styles.backdrop}
        onClick={closeSheet}
        tabIndex={-1}
        type="button"
      />
      <div
        aria-labelledby="report-share-title"
        aria-modal="true"
        className={styles.sheet}
        data-report-type={content.reportType}
        data-step={step}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div aria-hidden="true" className={styles.handle} />
        <header className={styles.header}>
          {step === "community" ? (
            <button
              aria-label="공유 방식 선택으로 돌아가기"
              className={styles.backButton}
              onClick={() => {
                setStatus(null);
                setStep("actions");
              }}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.75} />
            </button>
          ) : null}
          <div>
            <h2 id="report-share-title">
              {step === "community" ? "커뮤니티에 공유" : "결과 공유"}
            </h2>
            <p>
              {step === "community"
                ? "피드에 올라갈 내용을 확인해 주세요."
                : sharesOriginalReport
                  ? "검사 당시의 원본 결과 리포트를 그대로 공유해요."
                  : "계정에 저장한 결과만 안전하게 공유할 수 있어요."}
            </p>
          </div>
          <button
            aria-label="공유 창 닫기"
            className={styles.closeButton}
            onClick={closeSheet}
            type="button"
          >
            <X aria-hidden="true" size={20} strokeWidth={1.75} />
          </button>
        </header>

        {step === "actions" ? (
          <>
            <ReportPreview content={content} />

            <section
              aria-labelledby="report-share-method-title"
              className={styles.actionSection}
            >
              <h3 id="report-share-method-title">공유 방법</h3>
              <div className={styles.actions}>
                {reportShareActions.map((action) => {
                  const Icon =
                    action.id === "copy_link"
                      ? Copy
                      : action.id === "native_share"
                        ? ExternalLink
                        : MessageCircle;
                  const isWorking = activeAction === action.id;

                  return (
                    <button
                      aria-busy={isWorking}
                      aria-label={action.label}
                      data-action={action.id}
                      disabled={activeAction !== null || !sharesOriginalReport}
                      key={action.id}
                      onClick={() => void actionHandlers[action.id]()}
                      type="button"
                    >
                      <span className={styles.actionIcon}>
                        {isWorking ? (
                          <LoaderCircle
                            aria-hidden="true"
                            className={styles.spinner}
                            size={19}
                          />
                        ) : (
                          <Icon
                            aria-hidden="true"
                            size={19}
                            strokeWidth={1.7}
                          />
                        )}
                      </span>
                      <span className={styles.actionCopy}>
                        <strong>{action.label}</strong>
                        <small>{actionDescriptions[action.id]}</small>
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        className={styles.actionChevron}
                        size={18}
                        strokeWidth={1.7}
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          <section className={styles.communityStep}>
            <span className={styles.sectionLabel}>피드 미리보기</span>
            {communityNote.trim() ? (
              <p className={styles.notePreview}>{communityNote.trim()}</p>
            ) : null}
            <ReportPreview compact content={content} />
            <label className={styles.noteField}>
              <span>
                한마디 덧붙이기 <small>선택</small>
              </span>
              <textarea
                maxLength={120}
                onChange={(event) => setCommunityNote(event.target.value)}
                placeholder="이 결과를 보고 든 생각을 남겨보세요."
                rows={2}
                value={communityNote}
              />
              <small>{communityNote.length} / 120</small>
            </label>
            <button
              aria-busy={activeAction === "feed_share"}
              className={styles.confirmButton}
              disabled={activeAction !== null}
              onClick={() => void handleFeedShare()}
              type="button"
            >
              {activeAction === "feed_share" ? (
                <LoaderCircle
                  aria-hidden="true"
                  className={styles.spinner}
                  size={18}
                />
              ) : null}
              {activeAction === "feed_share" ? "공유 중" : "커뮤니티에 공유"}
            </button>
          </section>
        )}

        {status ? (
          <p
            aria-live="polite"
            className={styles.status}
            data-kind={status.kind}
            role={status.kind === "error" ? "alert" : "status"}
          >
            {status.kind === "error" ? (
              <Share2 aria-hidden="true" size={16} strokeWidth={1.8} />
            ) : (
              <Check aria-hidden="true" size={16} strokeWidth={2} />
            )}
            {status.message}
          </p>
        ) : null}

        <div className={styles.visibilityNote}>
          <LockKeyhole aria-hidden="true" size={16} strokeWidth={1.8} />
          <p>
            {sharesOriginalReport
              ? "프로필에서 이 결과를 비공개로 바꾸면 공유 링크도 함께 닫혀요."
              : "먼저 로그인하고 결과를 계정에 저장해 주세요."}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function createReportFeedTags(content: ReportShareContent) {
  return Array.from(
    new Set([
      reportTypeLabels[content.reportType],
      content.title.replace(/\s*결과\s*$/, "").trim(),
    ]),
  )
    .filter(Boolean)
    .map((tag) => tag.slice(0, 20))
    .slice(0, 2);
}

function ReportPreview({
  compact = false,
  content,
}: {
  compact?: boolean;
  content: ReportShareContent;
}) {
  const Icon =
    content.reportType === "core"
      ? FileText
      : content.reportType === "topic"
        ? MessagesSquare
        : FlaskConical;

  return (
    <section
      aria-label={`${reportTypeLabels[content.reportType]} 결과 미리보기`}
      className={styles.preview}
      data-compact={compact}
      data-report-type={content.reportType}
    >
      <div className={styles.typeMark}>
        <Icon aria-hidden="true" size={20} strokeWidth={1.65} />
      </div>
      <div className={styles.previewCopy}>
        <p>
          {reportTypeLabels[content.reportType]} · {content.title}
        </p>
        <div className={styles.previewTitle}>
          {content.code ? <strong>{content.code}</strong> : null}
          <h3>{content.resultName}</h3>
        </div>
        <span>{content.summary}</span>
        {!compact ? (
          <ul>
            {content.highlights.slice(0, 2).map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function toShareErrorMessage(error: unknown, fallback: string) {
  if (
    error instanceof Error &&
    error.message &&
    error.message !== "share_link_failed" &&
    error.message !== "feed_share_failed"
  ) {
    return error.message;
  }
  return fallback;
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) throw new Error("clipboard_unavailable");
}

function navigate(href: string, onNavigate?: (href: string) => void) {
  if (onNavigate) {
    onNavigate(href);
    return;
  }

  window.location.assign(href);
}

function parseOriginalReportAttachment(value: string) {
  try {
    const url = new URL(value, window.location.origin);
    const match = url.pathname.match(
      /^\/feed\/profiles\/([^/]+)\/reports\/([^/]+)\/?$/,
    );

    if (!match?.[1] || !match[2]) return null;

    return {
      id: decodeURIComponent(match[2]),
      profileId: decodeURIComponent(match[1]),
      type: "original_report" as const,
    };
  } catch {
    return null;
  }
}
