"use client";

import {
  ArrowLeft,
  Copy,
  ExternalLink,
  LoaderCircle,
  MessagesSquare,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  prepareKakaoReportShareImage,
  sendReportToKakaoTalk,
} from "@/features/share/kakao-talk-share";
import {
  createReportShareText,
  type ReportShareContent,
} from "@/features/share/report-share-contract";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
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
  startInCommunity?: boolean;
};

type ShareActionId =
  "copy_link" | "feed_share" | "kakao_share" | "native_share";
type ShareStatus = {
  kind: "error" | "notice" | "success";
  message: string;
} | null;
type ShareStep = "actions" | "community" | "publish-confirm";
type ReportVisibility = "private" | "profile_public";
type PublishProgress = "preparing" | "publishing" | null;

class ReportShareRequestError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ReportShareRequestError";
  }
}

const reportTypeLabels: Record<ReportShareContent["reportType"], string> = {
  core: "코어 검사",
  lab: "별난 연구소",
  topic: "주제 검사",
};

const secondaryActions: ReadonlyArray<{
  id: Exclude<ShareActionId, "kakao_share">;
  label: string;
}> = [
  { id: "copy_link", label: "링크 복사" },
  { id: "native_share", label: "다른 앱으로 공유" },
  { id: "feed_share", label: "커뮤니티에 공유" },
];

const publishActionLabels: Record<ShareActionId, string> = {
  copy_link: "공개하고 링크 복사",
  feed_share: "공개하고 커뮤니티에 공유",
  kakao_share: "공개하고 카카오톡 공유",
  native_share: "공개하고 공유",
};

export function ReportShareSheet({
  canonicalUrl,
  content,
  initialCommunityNote,
  isOpen,
  onClose,
  onNavigate,
  originalReportKey,
  returnFocusRef,
  startInCommunity = false,
}: ReportShareSheetProps) {
  const [activeAction, setActiveAction] = useState<ShareActionId | null>(null);
  const [communityNote, setCommunityNote] = useState("");
  const [kakaoPreparation, setKakaoPreparation] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [pendingPrivateAction, setPendingPrivateAction] =
    useState<ShareActionId | null>(null);
  const [publishProgress, setPublishProgress] = useState<PublishProgress>(null);
  const [step, setStep] = useState<ShareStep>(
    startInCommunity ? "community" : "actions",
  );
  const [status, setStatus] = useState<ShareStatus>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const guestShareUrlRef = useRef<{ key: string; url: string } | null>(null);
  const isCriticalTransitionRef = useRef(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const isCriticalTransition =
    step === "publish-confirm" && activeAction !== null;

  useEffect(() => {
    isCriticalTransitionRef.current = isCriticalTransition;
  }, [isCriticalTransition]);

  const getFreshShareUrl = useCallback(async () => {
    if (originalReportKey) {
      const response = await fetch("/api/report-share-links", {
        body: JSON.stringify({ reportKey: originalReportKey }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
        ok?: boolean;
        url?: string;
      } | null;

      if (shouldUseGuestSummaryFallback(response.status, payload?.error)) {
        return createGuestShareUrl(content, guestShareUrlRef);
      }

      if (!response.ok || !payload?.ok || !payload.url) {
        throw new ReportShareRequestError(
          payload?.error ?? "share_link_failed",
          payload?.message ?? "share_link_failed",
        );
      }

      return payload.url;
    }

    if (canonicalUrl) {
      return new URL(canonicalUrl, window.location.origin).toString();
    }

    return createGuestShareUrl(content, guestShareUrlRef);
  }, [canonicalUrl, content, originalReportKey]);

  const closeSheet = useCallback(() => {
    if (isCriticalTransitionRef.current) return;
    setCommunityNote("");
    setStatus(null);
    setActiveAction(null);
    setPendingPrivateAction(null);
    setPublishProgress(null);
    setStep("actions");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || step === "actions") return;
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    void prepareKakaoReportShareImage(content.reportType)
      .then(() => {
        if (!cancelled) setKakaoPreparation("ready");
      })
      .catch(() => {
        if (!cancelled) setKakaoPreparation("unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, [content.reportType, isOpen]);

  if (!isOpen) return null;

  function requestPublication(action: ShareActionId) {
    setPendingPrivateAction(action);
    setStatus(null);
    setStep("publish-confirm");
  }

  function handleActionError(
    action: ShareActionId,
    error: unknown,
    fallback: string,
  ) {
    if (isPrivateReportError(error)) {
      requestPublication(action);
      return;
    }
    setStatus({
      kind: "error",
      message: toShareErrorMessage(error, fallback),
    });
  }

  async function handleCopyLink() {
    try {
      setActiveAction("copy_link");
      setStatus(null);
      await copyShareUrl(await getFreshShareUrl());
    } catch (error) {
      handleActionError(
        "copy_link",
        error,
        "링크를 복사하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function handleNativeShare() {
    try {
      setActiveAction("native_share");
      setStatus(null);
      await openNativeShare(await getFreshShareUrl());
    } catch (error) {
      if (isAbortError(error)) {
        setStatus(null);
        return;
      }
      handleActionError(
        "native_share",
        error,
        "공유창을 열지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function handleKakaoShare() {
    try {
      setActiveAction("kakao_share");
      setStatus(null);
      await openKakaoShareOrFallback(await getFreshShareUrl());
    } catch (error) {
      if (isAbortError(error)) {
        setStatus(null);
        return;
      }
      handleActionError(
        "kakao_share",
        error,
        "카카오톡 공유를 열지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function handleOpenCommunity() {
    try {
      setActiveAction("feed_share");
      setStatus(null);
      const shareUrl = await getFreshShareUrl();
      if (
        !parseOriginalReportAttachment(shareUrl) &&
        !(await hasCurrentAccount())
      ) {
        navigateToLoginForCommunity(onNavigate);
        return;
      }
      setCommunityNote(
        (current) => current || initialCommunityNote?.slice(0, 120) || "",
      );
      setStep("community");
    } catch (error) {
      handleActionError(
        "feed_share",
        error,
        "커뮤니티 공유를 준비하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function handlePublishAndContinue() {
    const action = pendingPrivateAction;
    if (!originalReportKey || !action) {
      setStatus({
        kind: "error",
        message: "공개 상태를 바꿀 원본 리포트를 찾지 못했어요.",
      });
      return;
    }

    let publicationCompleted = false;

    try {
      setActiveAction(action);
      setPublishProgress("publishing");
      setStatus(null);
      const response = await fetch("/api/profile-report-visibility", {
        body: JSON.stringify({
          reportKey: originalReportKey,
          visibility: "profile_public",
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        visibility?: ReportVisibility;
      } | null;

      if (!response.ok || payload?.visibility !== "profile_public") {
        throw new Error(
          payload?.message ??
            "공개 상태를 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        );
      }

      publicationCompleted = true;
      setPublishProgress("preparing");
      setPendingPrivateAction(null);

      if (action === "feed_share") {
        setCommunityNote(
          (current) => current || initialCommunityNote?.slice(0, 120) || "",
        );
        setStep("community");
        return;
      }

      const url = await getFreshShareUrl();
      setStep("actions");
      if (action === "copy_link") {
        await copyShareUrl(url);
      } else if (action === "native_share") {
        await openNativeShare(url);
      } else {
        await openKakaoShareOrFallback(url);
      }
    } catch (error) {
      if (isAbortError(error)) {
        setStep("actions");
        setStatus(
          publicationCompleted
            ? { kind: "notice", message: "결과는 공개됐고 공유는 취소했어요." }
            : null,
        );
        return;
      }
      if (publicationCompleted) {
        setStep("actions");
        setStatus({
          kind: "error",
          message:
            "결과는 공개됐지만 공유를 마치지 못했어요. 다시 시도해 주세요.",
        });
      } else {
        setStatus({
          kind: "error",
          message: toShareErrorMessage(
            error,
            "공개 상태를 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.",
          ),
        });
      }
    } finally {
      setActiveAction(null);
      setPublishProgress(null);
    }
  }

  async function copyShareUrl(url: string) {
    await copyText(url);
    setStatus({ kind: "success", message: "결과 링크를 복사했어요." });
  }

  async function openNativeShare(url: string) {
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
  }

  async function openKakaoShareOrFallback(url: string) {
    try {
      if (kakaoPreparation !== "ready") {
        await prepareKakaoReportShareImage(content.reportType);
      }
      await sendReportToKakaoTalk({ content, url });
      setStatus({
        kind: "success",
        message: "카카오톡에서 보낼 대상을 선택해 주세요.",
      });
    } catch (error) {
      if (isKakaoImagePreparationError(error)) throw error;
      if (typeof navigator.share === "function") {
        await navigator.share({
          text: createReportShareText(content),
          title: `${content.title} | 뉴앙`,
          url,
        });
        setStatus({
          kind: "notice",
          message: "카카오톡을 열지 못해 기기의 공유창을 열었어요.",
        });
        return;
      }

      await copyText(url);
      setStatus({
        kind: "notice",
        message: "카카오톡을 열지 못해 결과 링크를 복사했어요.",
      });
    }
  }

  async function handleFeedShare() {
    try {
      setActiveAction("feed_share");
      setStatus(null);
      const originalUrl = await getFreshShareUrl();
      const attachment = parseOriginalReportAttachment(originalUrl);
      const guestBody = [communityNote.trim(), originalUrl]
        .filter(Boolean)
        .join("\n\n");
      const response = await fetch("/api/feed", {
        body: JSON.stringify({
          action: "create_post",
          ...(attachment ? { attachments: [attachment] } : {}),
          body: attachment ? communityNote.trim() : guestBody,
          source: attachment ? "report_share" : "free_text",
          ...(attachment ? { sourceId: attachment.id } : {}),
          topic: {
            category: null,
            source: "manual",
            tags: createReportFeedTags(content),
          },
          visibility: "public",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
      } | null;

      if (response.status === 401) {
        navigateToLoginForCommunity(onNavigate);
        return;
      }
      if (!response.ok || !payload?.ok) throw new Error("feed_share_failed");

      setStatus({ kind: "success", message: "커뮤니티에 결과를 공유했어요." });
      navigate("/feed", onNavigate);
    } catch (error) {
      handleActionError(
        "feed_share",
        error,
        "커뮤니티에 공유하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      );
    } finally {
      setActiveAction(null);
    }
  }

  const actionHandlers: Record<ShareActionId, () => Promise<void>> = {
    copy_link: handleCopyLink,
    feed_share: handleOpenCommunity,
    kakao_share: handleKakaoShare,
    native_share: handleNativeShare,
  };
  const headerCopy =
    step === "community"
      ? "글을 덧붙여 커뮤니티에 올려요."
      : step === "publish-confirm"
        ? "공개 범위를 확인해 주세요."
        : "결과 요약을 안전하게 공유해요.";

  return (
    <BottomSheet
      backdropDisabled={isCriticalTransition}
      backdropLabel="공유 창 닫기"
      className={styles.sheet}
      dialogProps={{
        "aria-describedby": "report-share-description",
        "aria-labelledby": "report-share-title",
        "data-report-type": content.reportType,
        "data-step": step,
      }}
      dialogRef={dialogRef}
      initialFocus="dialog"
      onClose={closeSheet}
      returnFocusRef={returnFocusRef}
    >
      <div aria-hidden="true" className={styles.handle} />
      <header className={styles.header}>
        {step !== "actions" ? (
          <button
            aria-label="공유 방식 선택으로 돌아가기"
            className={styles.backButton}
            disabled={isCriticalTransition}
            onClick={() => {
              setPendingPrivateAction(null);
              setStatus(null);
              setStep("actions");
            }}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.8} />
          </button>
        ) : null}
        <div className={styles.headerCopy}>
          <h2 id="report-share-title" ref={stepHeadingRef} tabIndex={-1}>
            {step === "community"
              ? "커뮤니티에 공유"
              : step === "publish-confirm"
                ? "공개 후 공유"
                : "결과 공유"}
          </h2>
          <p id="report-share-description">{headerCopy}</p>
        </div>
        <button
          aria-label="공유 창 닫기"
          className={styles.closeButton}
          disabled={isCriticalTransition}
          onClick={closeSheet}
          type="button"
        >
          <X aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
      </header>

      {step === "actions" ? (
        <>
          <ReportIdentity content={content} />
          <section aria-label="공유 방법" className={styles.actionSection}>
            <button
              aria-busy={activeAction === "kakao_share"}
              aria-label="카카오톡으로 보내기"
              className={styles.kakaoAction}
              disabled={activeAction !== null}
              onClick={() => void handleKakaoShare()}
              type="button"
            >
              <span className={styles.kakaoIcon}>
                {activeAction === "kakao_share" ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className={styles.spinner}
                    size={19}
                  />
                ) : (
                  <KakaoBubbleIcon />
                )}
              </span>
              <strong>카카오톡으로 보내기</strong>
            </button>
            <p className={styles.kakaoHelp}>
              카카오톡에서 보낼 대화방을 직접 선택해요.
            </p>
            <div className={styles.secondaryActions}>
              {secondaryActions.map((action) => {
                const Icon =
                  action.id === "copy_link"
                    ? Copy
                    : action.id === "native_share"
                      ? ExternalLink
                      : MessagesSquare;
                const isWorking = activeAction === action.id;
                return (
                  <button
                    aria-busy={isWorking}
                    aria-label={action.label}
                    data-action={action.id}
                    disabled={activeAction !== null}
                    key={action.id}
                    onClick={() => void actionHandlers[action.id]()}
                    type="button"
                  >
                    {isWorking ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className={styles.spinner}
                        size={19}
                      />
                    ) : (
                      <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
                    )}
                    <strong>{action.label}</strong>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      ) : step === "community" ? (
        <section className={styles.communityStep}>
          <ReportIdentity compact content={content} />
          <label className={styles.noteField}>
            <span>
              한마디 덧붙이기 <small>선택</small>
            </span>
            <textarea
              maxLength={120}
              onChange={(event) => setCommunityNote(event.target.value)}
              placeholder="이 결과를 보고 든 생각을 남겨보세요."
              rows={3}
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
      ) : (
        <section className={styles.publishConfirm}>
          <ReportIdentity compact content={content} />
          <span className={styles.privateStatus}>현재 비공개</span>
          <h3>이 결과를 공개하고 공유할까요?</h3>
          <p className={styles.publishCopy}>
            공개하면 프로필과 링크를 받은 사람 누구나 결과 요약을 볼 수 있어요.
          </p>
          <div className={styles.disclosure}>
            <p>
              <span>공개됨</span>
              <strong>결과 이름과 요약</strong>
            </p>
            <p>
              <span>공개되지 않음</span>
              <strong>내 답변과 원점수</strong>
            </p>
          </div>
          <p className={styles.publishNote}>
            마이 &gt; 검사 결과에서 언제든 다시 비공개로 바꿀 수 있어요.
          </p>
          <div className={styles.publishConfirmActions}>
            <button
              className={styles.cancelButton}
              disabled={isCriticalTransition}
              onClick={() => {
                setPendingPrivateAction(null);
                setStatus(null);
                setStep("actions");
              }}
              type="button"
            >
              취소
            </button>
            <button
              aria-busy={isCriticalTransition}
              className={styles.publishButton}
              disabled={isCriticalTransition}
              onClick={() => void handlePublishAndContinue()}
              type="button"
            >
              {isCriticalTransition ? (
                <LoaderCircle
                  aria-hidden="true"
                  className={styles.spinner}
                  size={18}
                />
              ) : null}
              {publishProgress === "publishing"
                ? "공개 설정 중"
                : publishProgress === "preparing"
                  ? "공유 준비 중"
                  : publishActionLabels[pendingPrivateAction ?? "kakao_share"]}
            </button>
          </div>
        </section>
      )}

      {status ? (
        <p
          aria-live="polite"
          className={styles.status}
          data-kind={status.kind}
          role={status.kind === "error" ? "alert" : "status"}
        >
          {status.message}
        </p>
      ) : null}

      {step === "actions" ? (
        <p className={styles.privacyNote}>
          답변, 연락처와 계정 정보는 공유되지 않아요.
        </p>
      ) : null}
    </BottomSheet>
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

function ReportIdentity({
  compact = false,
  content,
}: {
  compact?: boolean;
  content: ReportShareContent;
}) {
  return (
    <section
      aria-label={`${reportTypeLabels[content.reportType]} 공유 결과`}
      className={styles.resultIdentity}
      data-compact={compact}
      data-report-type={content.reportType}
    >
      <p className={styles.resultMeta}>
        {reportTypeLabels[content.reportType]} · {content.title}
      </p>
      <h3>
        {content.code ? <span>{content.code}</span> : null}
        {content.resultName}
      </h3>
      {!compact ? (
        <p className={styles.resultSummary}>{content.summary}</p>
      ) : null}
    </section>
  );
}

function KakaoBubbleIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M12 4.25c-4.42 0-8 2.82-8 6.3 0 2.22 1.46 4.17 3.67 5.29l-.93 3.43c-.08.31.27.56.54.38l4.04-2.7c.22.02.45.03.68.03 4.42 0 8-2.82 8-6.43 0-3.48-3.58-6.3-8-6.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function toShareErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const kakaoImageMessages: Record<string, string> = {
      kakao_share_image_asset_invalid:
        "공유 이미지 형식을 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      kakao_share_image_asset_unavailable:
        "공유 이미지를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      kakao_share_image_upload_invalid:
        "카카오 공유 이미지를 준비하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    };
    if (kakaoImageMessages[error.message]) {
      return kakaoImageMessages[error.message];
    }
  }
  if (
    error instanceof Error &&
    /[가-힣]/.test(error.message) &&
    !/(failed|unavailable|fetch|clipboard|sdk)/i.test(error.message)
  ) {
    return error.message;
  }
  return fallback;
}

function isPrivateReportError(error: unknown) {
  return (
    error instanceof ReportShareRequestError && error.code === "report_private"
  );
}

function shouldUseGuestSummaryFallback(status: number, error?: string) {
  return (
    status === 401 ||
    error === "account_not_found" ||
    error === "public_profile_not_found" ||
    error === "report_not_found"
  );
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function isKakaoImagePreparationError(error: unknown) {
  return (
    error instanceof Error && error.message.startsWith("kakao_share_image_")
  );
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

async function createGuestShareUrl(
  content: ReportShareContent,
  cacheRef: RefObject<{ key: string; url: string } | null>,
) {
  const contentKey = JSON.stringify(content);
  if (cacheRef.current?.key === contentKey) return cacheRef.current.url;

  const response = await fetch("/api/guest-report-share-links", {
    body: JSON.stringify({ content }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as {
    message?: string;
    ok?: boolean;
    url?: string;
  } | null;
  if (!response.ok || !payload?.ok || !payload.url) {
    throw new Error(
      payload?.message ??
        "공유 링크를 준비하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    );
  }

  cacheRef.current = { key: contentKey, url: payload.url };
  return payload.url;
}

function navigateToLoginForCommunity(onNavigate?: (href: string) => void) {
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set("share", "community");
  const nextPath = `${currentUrl.pathname}${currentUrl.search}`;
  navigate(
    `/login?next=${encodeURIComponent(nextPath)}&reason=share`,
    onNavigate,
  );
}

async function hasCurrentAccount() {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return false;

  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<null>((resolve) =>
        window.setTimeout(() => resolve(null), 2500),
      ),
    ]);
    return Boolean(result?.data.user);
  } catch {
    return false;
  }
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
