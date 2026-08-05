"use client";

import {
  BadgeCheck,
  Link2,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  Unlink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { clearAccountOwnedLocalAttempts } from "@/features/assessment/assessment-account-sync";
import { readJsonResponse } from "@/features/account/response-json";
import { getSupabaseOAuthProvider } from "@/features/auth/auth-policy";
import { useModalDialog } from "@/hooks/useModalDialog";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import styles from "./AuthMethodsPanel.module.css";

type AccountProvider = "google" | "kakao";

type AuthMethod = {
  canUnlink: boolean;
  current: boolean;
  emailMasked: string | null;
  label: string;
  provider: AccountProvider;
  status: "available" | "connected";
};

type SecurityOverview = {
  currentProvider: AccountProvider | null;
  features: {
    linking: boolean;
    phoneVerification: boolean;
    unlinking: boolean;
  };
  linkedCount: number;
  methods: AuthMethod[];
};

type SecurityResponse =
  | { ok: true; security: SecurityOverview }
  | { code?: string; message?: string; ok: false };

type LinkIntentResponse =
  | {
      link: {
        expiresAt: string;
        provider: AccountProvider;
        redirectTo: string;
      };
      ok: true;
    }
  | { code?: string; message?: string; ok: false };

type Notice = { message: string; tone: "error" | "success" } | null;

export function AuthMethodsPanel() {
  const router = useRouter();
  const [security, setSecurity] = useState<SecurityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<AccountProvider | "logout" | null>(
    null,
  );
  const [notice, setNotice] = useState<Notice>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<AuthMethod | null>(null);
  const unlinkTitleId = useId();
  const unlinkTriggerRef = useRef<HTMLButtonElement | null>(null);
  const unlinkDialogRef = useModalDialog<HTMLElement>({
    onClose: closeUnlinkDialog,
    open: Boolean(unlinkTarget),
  });

  useEffect(() => {
    let active = true;
    void fetch("/api/me/auth/methods", { cache: "no-store" })
      .then(async (response) => ({
        payload: await readJsonResponse<SecurityResponse>(response),
        response,
      }))
      .then(({ payload, response }) => {
        if (!active) return;
        if (response.status === 401) {
          router.replace(
            "/login?next=%2Fmy%2Fsettings%2Faccount&reason=account_security",
          );
          return;
        }
        if (!response.ok || !payload || payload.ok !== true) {
          setNotice({
            message:
              payload?.ok === false && payload.message
                ? payload.message
                : "로그인 방법을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.",
            tone: "error",
          });
          return;
        }
        setSecurity(payload.security);
      })
      .catch(() => {
        if (!active) return;
        setNotice({
          message: "연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.",
          tone: "error",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const status = new URLSearchParams(window.location.search).get("link");
    let linkNoticeTimer: number | undefined;
    if (status === "connected") {
      linkNoticeTimer = window.setTimeout(
        () =>
          setNotice({
            message:
              "로그인 방법을 연결했어요. 이제 어느 방법으로 로그인해도 같은 기록이 열려요.",
            tone: "success",
          }),
        0,
      );
      window.history.replaceState({}, "", window.location.pathname);
    } else if (
      status === "cancelled" ||
      status === "failed" ||
      status === "expired" ||
      status === "conflict" ||
      status === "disabled"
    ) {
      linkNoticeTimer = window.setTimeout(
        () =>
          setNotice({
            message:
              status === "conflict"
                ? "이 로그인 방법은 다른 뉴앙 계정에서 이미 사용 중이에요. 기존 계정으로 로그인하거나 고객 문의로 알려주세요. 현재 기록은 그대로예요."
                : "연결을 마치지 못했어요. 다시 시도해도 같은 문제가 생기면 고객 문의로 알려주세요. 현재 기록은 그대로예요.",
            tone: "error",
          }),
        0,
      );
      window.history.replaceState({}, "", window.location.pathname);
    }

    return () => {
      active = false;
      if (linkNoticeTimer !== undefined) {
        window.clearTimeout(linkNoticeTimer);
      }
    };
  }, [router]);

  async function connectProvider(provider: AccountProvider) {
    if (!security?.features.linking || pending) return;

    setPending(provider);
    setNotice(null);

    try {
      const response = await fetch("/api/me/auth/link-intents", {
        body: JSON.stringify({
          provider,
          returnPath: "/my/settings/account",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await readJsonResponse<LinkIntentResponse>(response);

      if (!response.ok || !payload || payload.ok !== true) {
        setNotice({
          message:
            payload?.ok === false && payload.message
              ? payload.message
              : "연결을 시작하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
          tone: "error",
        });
        setPending(null);
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const supabaseProvider = getSupabaseOAuthProvider(provider);
      if (!supabase || !supabaseProvider) {
        setNotice({
          message: "연결을 시작하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
          tone: "error",
        });
        setPending(null);
        return;
      }

      const { error } = await supabase.auth.linkIdentity({
        options: { redirectTo: payload.link.redirectTo },
        provider: supabaseProvider,
      });
      if (error) {
        setNotice({
          message:
            "이 로그인 방법이 다른 뉴앙 계정에서 이미 사용 중일 수 있어요. 기존 계정으로 로그인하거나 고객 문의로 알려주세요. 현재 기록은 그대로예요.",
          tone: "error",
        });
        setPending(null);
      }
    } catch {
      setNotice({
        message: "연결이 불안정해요. 기존 기록은 그대로예요.",
        tone: "error",
      });
      setPending(null);
    }
  }

  function openUnlinkDialog(method: AuthMethod, trigger: HTMLButtonElement) {
    unlinkTriggerRef.current = trigger;
    setUnlinkTarget(method);
    setNotice(null);
  }

  function closeUnlinkDialog() {
    if (pending) return;
    setUnlinkTarget(null);
    window.setTimeout(() => unlinkTriggerRef.current?.focus(), 0);
  }

  async function unlinkProvider() {
    if (!unlinkTarget || pending) return;
    const provider = unlinkTarget.provider;
    setPending(provider);
    setNotice(null);

    try {
      const response = await fetch(`/api/me/auth/methods/${provider}`, {
        method: "DELETE",
      });
      const payload = await readJsonResponse<
        { ok: true } | { code?: string; message?: string; ok: false }
      >(response);
      if (!response.ok || !payload || payload.ok !== true) {
        setNotice({
          message:
            payload?.ok === false && payload.message
              ? payload.message
              : "연결을 해제하지 못했어요. 다른 로그인 방법을 확인해 주세요.",
          tone: "error",
        });
        setPending(null);
        setUnlinkTarget(null);
        return;
      }

      setSecurity((current) =>
        current
          ? {
              ...current,
              linkedCount: Math.max(1, current.linkedCount - 1),
              methods: current.methods.map((method) =>
                method.provider === provider
                  ? {
                      ...method,
                      canUnlink: false,
                      current: false,
                      emailMasked: null,
                      status: "available",
                    }
                  : method,
              ),
            }
          : current,
      );
      setNotice({
        message: `${unlinkTarget.label} 연결을 해제했어요. 뉴앙 기록은 그대로 보관돼요.`,
        tone: "success",
      });
      setPending(null);
      setUnlinkTarget(null);
    } catch {
      setNotice({
        message: "연결이 불안정해요. 로그인 방법은 변경되지 않았어요.",
        tone: "error",
      });
      setPending(null);
      setUnlinkTarget(null);
    }
  }

  async function signOut() {
    if (pending) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setNotice({
        message: "로그아웃을 시작하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        tone: "error",
      });
      return;
    }

    setPending("logout");
    const { error } = await supabase.auth.signOut();
    if (error) {
      setPending(null);
      setNotice({
        message: "로그아웃하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        tone: "error",
      });
      return;
    }
    await clearAccountOwnedLocalAttempts();
    router.replace("/home");
    router.refresh();
  }

  return (
    <section aria-labelledby="auth-methods-title" className={styles.section}>
      <div className={styles.sectionHeading}>
        <div>
          <p>ACCOUNT ACCESS</p>
          <h2 id="auth-methods-title">로그인 방법</h2>
        </div>
        {security ? (
          <span className={styles.methodCount}>
            연결 {security.linkedCount}개
          </span>
        ) : null}
      </div>
      <p className={styles.sectionDescription}>
        어느 방법으로 로그인해도 같은 검사와 기록을 이어볼 수 있어요.
      </p>

      {loading ? (
        <div aria-live="polite" className={styles.skeleton} role="status">
          <span />
          <span />
          <span className="sr-only">로그인 방법을 확인하는 중</span>
        </div>
      ) : security ? (
        <div className={styles.methodList}>
          {security.methods.map((method) => (
            <article className={styles.methodCard} key={method.provider}>
              <ProviderLogo provider={method.provider} />
              <div className={styles.methodCopy}>
                <strong>{method.label}</strong>
                {method.status === "connected" ? (
                  <span className={styles.methodMeta}>
                    {method.emailMasked ?? "이메일 제공 안 됨"}
                  </span>
                ) : (
                  <span className={styles.methodMeta}>
                    지금 기록에 안전하게 연결할 수 있어요
                  </span>
                )}
                {method.status === "connected" ? (
                  <span className={styles.connectedStatus}>
                    <BadgeCheck aria-hidden="true" size={14} />
                    {method.current ? "현재 로그인" : "연결됨"}
                  </span>
                ) : null}
              </div>
              {method.status === "available" ? (
                <button
                  className={styles.connectButton}
                  disabled={!security.features.linking || pending !== null}
                  onClick={() => void connectProvider(method.provider)}
                  type="button"
                >
                  {pending === method.provider ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className={styles.spinner}
                      size={16}
                    />
                  ) : (
                    <Link2 aria-hidden="true" size={16} />
                  )}
                  {pending === method.provider ? "연결 중" : "연결"}
                </button>
              ) : method.canUnlink && security.features.unlinking ? (
                <button
                  aria-label={`${method.label} 로그인 연결 해제`}
                  className={styles.unlinkButton}
                  disabled={pending !== null}
                  onClick={(event) =>
                    openUnlinkDialog(method, event.currentTarget)
                  }
                  type="button"
                >
                  <Unlink aria-hidden="true" size={16} />
                </button>
              ) : (
                <ShieldCheck
                  aria-label="안전하게 연결됨"
                  className={styles.protectedIcon}
                  size={18}
                />
              )}
            </article>
          ))}
        </div>
      ) : null}

      {security && !security.features.linking ? (
        <p className={styles.featureNotice} role="status">
          새 로그인 연결은 잠시 점검 중이에요. 현재 로그인과 기록은 그대로
          사용할 수 있어요.
        </p>
      ) : null}

      {notice ? (
        <p
          className={styles.notice}
          data-tone={notice.tone}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.message}
        </p>
      ) : null}

      <button
        className={styles.logoutButton}
        disabled={pending !== null}
        onClick={() => void signOut()}
        type="button"
      >
        <LogOut aria-hidden="true" size={17} />
        {pending === "logout" ? "로그아웃 중" : "로그아웃"}
      </button>

      {unlinkTarget ? (
        <div className={styles.backdrop} data-modal-layer="true">
          <section
            aria-labelledby={unlinkTitleId}
            aria-modal="true"
            className={styles.dialog}
            ref={unlinkDialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <span className={styles.dialogIcon} aria-hidden="true">
              <Unlink size={20} />
            </span>
            <h3 id={unlinkTitleId}>{unlinkTarget.label} 연결을 해제할까요?</h3>
            <p>
              뉴앙 기록은 삭제되지 않지만, 다시 연결하기 전까지 이 방법으로
              로그인할 수 없어요.
            </p>
            <div className={styles.dialogActions}>
              <button
                data-modal-initial-focus="true"
                onClick={closeUnlinkDialog}
                type="button"
              >
                유지하기
              </button>
              <button
                disabled={pending !== null}
                onClick={() => void unlinkProvider()}
                type="button"
              >
                {pending ? "해제 중" : "연결 해제"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function ProviderLogo({ provider }: { provider: AccountProvider }) {
  if (provider === "kakao") {
    return (
      <span className={styles.providerLogo} data-provider="kakao">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 4.2c-5.05 0-9.15 3.18-9.15 7.1 0 2.47 1.63 4.64 4.1 5.91l-.95 3.5a.43.43 0 0 0 .66.47l4.17-2.76c.38.04.77.06 1.17.06 5.05 0 9.15-3.18 9.15-7.09S17.05 4.2 12 4.2Z" />
        </svg>
      </span>
    );
  }

  return (
    <span className={styles.providerLogo} data-provider="google">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M21.35 12.23c0-.71-.06-1.23-.2-1.78H12v3.32h5.37a4.7 4.7 0 0 1-1.99 3.03l-.02.11 2.88 2.23.2.02c1.84-1.69 2.91-4.18 2.91-6.93Z" fill="#4285F4" />
        <path d="M12 21.75c2.62 0 4.82-.86 6.43-2.59l-3.06-2.36c-.82.56-1.92.95-3.37.95-2.52 0-4.67-1.7-5.44-4.05l-.11.01-3 2.32-.04.1A9.72 9.72 0 0 0 12 21.75Z" fill="#34A853" />
        <path d="M6.56 13.7A5.87 5.87 0 0 1 6.23 12c0-.59.11-1.16.32-1.7v-.12L3.5 7.82l-.1.05A9.74 9.74 0 0 0 2.25 12c0 1.49.42 2.89 1.16 4.13l3.15-2.43Z" fill="#FBBC05" />
        <path d="M12 6.25c1.83 0 3.06.79 3.76 1.44l2.74-2.67A9.22 9.22 0 0 0 12 2.25a9.72 9.72 0 0 0-8.59 5.62l3.14 2.43C7.33 7.95 9.48 6.25 12 6.25Z" fill="#EB4335" />
      </svg>
    </span>
  );
}
