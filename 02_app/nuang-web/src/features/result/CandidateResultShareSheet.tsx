"use client";

import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Share2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { shareResultImage } from "@/features/result/share-image";
import type { CoreScoreResult } from "@/lib/scoring/types";
import styles from "@/features/result/CandidateResultShareSheet.module.css";

export type CandidateShareAccountController = {
  claimState:
    | "checking"
    | "error"
    | "idle"
    | "missing_consent"
    | "saved"
    | "saving"
    | "unauthenticated";
  feedShareState: "error" | "idle" | "posted" | "posting";
  onCreateShareLink: (copyToClipboard?: boolean) => Promise<string | null>;
  onShareToFeed: () => Promise<void>;
  shareLinkState: "copied" | "error" | "idle" | "making" | "ready";
  shareUrl: string | null;
};

type CandidateResultShareSheetProps = {
  account: CandidateShareAccountController;
  attempt: LocalAssessmentAttempt;
  isOpen: boolean;
  onClose: () => void;
  result: CoreScoreResult;
  resultLabel: string;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

type LocalShareState =
  | "downloaded"
  | "error"
  | "idle"
  | "shared"
  | "sharing_apps"
  | "working";

const subscribeToClient = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function CandidateResultShareSheet({
  account,
  attempt,
  isOpen,
  onClose,
  result,
  resultLabel,
  returnFocusRef,
}: CandidateResultShareSheetProps) {
  const [localShareState, setLocalShareState] =
    useState<LocalShareState>("idle");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isClient = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );
  const canUseNativeShare =
    isClient && typeof navigator.share === "function";

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const returnFocusElement = returnFocusRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
  }, [isOpen, onClose, returnFocusRef]);

  if (!isClient || !result.code || !result.profileName) return null;

  async function handleImageShare() {
    if (!result.code || !result.profileName) return;

    try {
      setLocalShareState("working");
      const outcome = await shareResultImage({
        characterAssetPath: "/assets/assessment/nuang-loading-mascot-v2.png",
        code: result.code,
        domains: result.domains,
        motif: "purple",
        profileName: result.profileName,
        resultLabel,
        showDomainScores: false,
      });
      setLocalShareState(outcome);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setLocalShareState("idle");
        return;
      }
      setLocalShareState("error");
    }
  }

  async function handleAppShare() {
    if (!result.code || !result.profileName || !navigator.share) return;

    try {
      setLocalShareState("sharing_apps");
      const shareUrl =
        account.shareUrl ?? (await account.onCreateShareLink(false));

      if (!shareUrl) {
        setLocalShareState("error");
        return;
      }

      await navigator.share({
        text: `${result.code} · ${result.profileName}`,
        title: `뉴앙 ${resultLabel}`,
        url: shareUrl,
      });
      setLocalShareState("shared");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setLocalShareState("idle");
        return;
      }
      setLocalShareState("error");
    }
  }

  const isAccountWorking =
    account.claimState === "checking" || account.claimState === "saving";
  const isLinkWorking = account.shareLinkState === "making";
  const isFeedWorking = account.feedShareState === "posting";
  const loginHref = `/login?next=${encodeURIComponent(`/results/local/${attempt.id}`)}`;

  return createPortal(
    <div
      aria-hidden={!isOpen}
      className={`${styles.layer} ${isOpen ? styles.layerOpen : ""}`}
    >
      <button
        aria-label="공유 창 닫기"
        className={styles.backdrop}
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <div
        aria-labelledby="candidate-share-title"
        aria-modal="true"
        className={styles.sheet}
        ref={dialogRef}
        role="dialog"
      >
        <div aria-hidden="true" className={styles.handle} />
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>결과 공유</p>
            <h2 id="candidate-share-title">내 뉴앙 코드를 나눠볼까요?</h2>
          </div>
          <button
            aria-label="공유 창 닫기"
            className={styles.closeButton}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" size={20} strokeWidth={1.9} />
          </button>
        </header>

        <section className={styles.preview}>
          <div className={styles.tagRow}>
            <LockKeyhole aria-hidden="true" size={14} strokeWidth={2} />
            <span>공개되는 내용</span>
          </div>
          <div className={styles.resultSummary}>
            <strong>{result.code}</strong>
            <div>
              <p>{result.profileName}</p>
              <span>{resultLabel}</span>
            </div>
          </div>
          <p className={styles.privacyCopy}>
            문항별 답변과 세부 점수, 계정 정보는 포함되지 않아요.
          </p>
        </section>

        <section className={styles.actionGroup}>
          <p className={styles.groupLabel}>바로 공유하기</p>
          <button
            aria-busy={localShareState === "working"}
            className={styles.primaryAction}
            disabled={localShareState === "working"}
            onClick={() => void handleImageShare()}
            type="button"
          >
            {localShareState === "working" ? (
              <LoaderCircle
                aria-hidden="true"
                className={styles.spinner}
                size={19}
              />
            ) : (
              <Download aria-hidden="true" size={19} strokeWidth={1.9} />
            )}
            <span>
              <strong>결과 이미지 저장·공유</strong>
              <small>기기에서 바로 보내거나 이미지로 보관해요</small>
            </span>
          </button>
        </section>

        <section className={styles.actionGroup}>
          <p className={styles.groupLabel}>공유 주소로 보내기</p>
          {account.claimState === "saved" ? (
            <div className={styles.linkActions}>
              <button
                aria-busy={isLinkWorking}
                className={styles.secondaryAction}
                disabled={isLinkWorking}
                onClick={() => void account.onCreateShareLink(true)}
                type="button"
              >
                {isLinkWorking ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className={styles.spinner}
                    size={18}
                  />
                ) : (
                  <Copy aria-hidden="true" size={18} strokeWidth={1.9} />
                )}
                링크 복사
              </button>
              {canUseNativeShare ? (
                <button
                  aria-busy={localShareState === "sharing_apps"}
                  className={styles.secondaryAction}
                  disabled={localShareState === "sharing_apps"}
                  onClick={() => void handleAppShare()}
                  type="button"
                >
                  <ExternalLink aria-hidden="true" size={18} strokeWidth={1.9} />
                  다른 앱으로 보내기
                </button>
              ) : null}
              <p className={styles.expiryCopy}>
                <Link2 aria-hidden="true" size={14} strokeWidth={2} />
                공유 주소는 30일 뒤 자동으로 닫혀요.
              </p>
            </div>
          ) : isAccountWorking ? (
            <p aria-live="polite" className={styles.preparing} role="status">
              <LoaderCircle
                aria-hidden="true"
                className={styles.spinner}
                size={17}
              />
              링크 공유를 준비하고 있어요.
            </p>
          ) : (
            <div className={styles.loginGate}>
              <p>로그인하면 30일 링크와 뉴앙 피드 공유를 사용할 수 있어요.</p>
              <Link href={loginHref}>로그인하고 공유하기</Link>
            </div>
          )}
        </section>

        {account.claimState === "saved" ? (
          <section className={styles.feedGroup}>
            <div>
              <p className={styles.groupLabel}>뉴앙 안에서 나누기</p>
              <span>내 코드를 피드에서 대화의 시작점으로 써보세요.</span>
            </div>
            <button
              aria-busy={isFeedWorking}
              disabled={isFeedWorking}
              onClick={() => void account.onShareToFeed()}
              type="button"
            >
              {isFeedWorking ? (
                <LoaderCircle
                  aria-hidden="true"
                  className={styles.spinner}
                  size={18}
                />
              ) : (
                <Users aria-hidden="true" size={18} strokeWidth={1.9} />
              )}
              피드에 공유
            </button>
          </section>
        ) : null}

        <ShareStatus
          account={account}
          localShareState={localShareState}
        />
      </div>
    </div>,
    document.body,
  );
}

function ShareStatus({
  account,
  localShareState,
}: {
  account: CandidateShareAccountController;
  localShareState: LocalShareState;
}) {
  const message = getStatusMessage(account, localShareState);

  if (!message) return null;

  return (
    <p
      aria-live="polite"
      className={`${styles.status} ${message.isError ? styles.errorStatus : ""}`}
      role={message.isError ? "alert" : "status"}
    >
      {message.isError ? (
        <Share2 aria-hidden="true" size={16} strokeWidth={2} />
      ) : (
        <Check aria-hidden="true" size={16} strokeWidth={2.2} />
      )}
      {message.text}
    </p>
  );
}

function getStatusMessage(
  account: CandidateShareAccountController,
  localShareState: LocalShareState,
) {
  if (localShareState === "shared") {
    return { isError: false, text: "공유할 앱을 열었어요." };
  }
  if (localShareState === "downloaded") {
    return { isError: false, text: "결과 이미지를 저장했어요." };
  }
  if (account.shareLinkState === "copied") {
    return { isError: false, text: "공유 링크를 복사했어요." };
  }
  if (account.feedShareState === "posted") {
    return { isError: false, text: "뉴앙 피드에 공유했어요." };
  }
  if (
    localShareState === "error" ||
    account.shareLinkState === "error" ||
    account.feedShareState === "error" ||
    account.claimState === "error"
  ) {
    return {
      isError: true,
      text: "공유를 마치지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    };
  }
  return null;
}
