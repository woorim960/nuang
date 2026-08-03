"use client";

import type { User } from "@supabase/supabase-js";
import { Check, CheckCircle2, LoaderCircle, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getSupabaseOAuthProvider,
  socialAuthProviders,
  type SocialAuthProviderId,
} from "@/features/auth/auth-policy";
import { startSocialSignIn } from "@/features/auth/start-social-sign-in";
import {
  consentDraftSchema,
  isRequiredConsentComplete,
  type ConsentDraft,
} from "@/features/consent/consent-draft";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import styles from "./AccountConnectPanel.module.css";
import { clearAccountOwnedLocalAttempts } from "@/features/assessment/assessment-account-sync";

type ClosedState = ReturnType<typeof createApiClosedPayload>;
type ConnectedAccount = {
  displayName: string;
  providerId: SocialAuthProviderId | null;
  providerLabel: string;
};

export function AccountConnectPanel({
  context = "account",
}: {
  context?: "account" | "community";
}) {
  const router = useRouter();
  const [savedConsentDraft] = useState(readSavedConsentDraft);
  const [is14OrOlder, setIs14OrOlder] = useState(
    savedConsentDraft?.is14OrOlder ?? false,
  );
  const [terms, setTerms] = useState(savedConsentDraft?.terms ?? false);
  const [privacy, setPrivacy] = useState(savedConsentDraft?.privacy ?? false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [message, setMessage] = useState("");
  const [closedState, setClosedState] = useState<ClosedState | null>(null);
  const [pendingProviderId, setPendingProviderId] = useState<string | null>(
    null,
  );
  const [connectedAccount, setConnectedAccount] =
    useState<ConnectedAccount | null>(null);
  const [isCheckingAccount, setIsCheckingAccount] = useState(true);
  const isReadyForAuth = isRequiredConsentComplete({
    is14OrOlder,
    privacy,
    terms,
  });
  const allRequiredChecked = is14OrOlder && terms && privacy;

  const consentSummary = useMemo(
    () => ({ terms, privacy, is14OrOlder, analytics, marketing }),
    [analytics, is14OrOlder, marketing, privacy, terms],
  );

  useEffect(() => {
    clearOptionalConsentFromSavedDraft(savedConsentDraft);
    const authStatus = new URLSearchParams(window.location.search).get("auth");
    let nextMessage = authReturnMessage(authStatus);
    let nextClosedState: ClosedState | null = null;

    if (authStatus === "env_missing") {
      nextClosedState = createApiClosedPayload("supabase_env_missing");
      nextMessage = "로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.";
    }

    if (nextMessage) {
      window.setTimeout(() => {
        setClosedState(nextClosedState);
        setMessage(nextMessage);
      }, 0);
    }

    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      const timeoutId = window.setTimeout(() => {
        setIsCheckingAccount(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    let isActive = true;

    void (async () => {
      const user = await readCurrentUserWithTimeout(supabase);
      if (!isActive) return;
      setConnectedAccount(user ? createConnectedAccount(user) : null);
      setIsCheckingAccount(false);
    })();

    return () => {
      isActive = false;
    };
  }, [savedConsentDraft]);

  async function handleProviderClick(
    provider: (typeof socialAuthProviders)[number],
  ) {
    const parsedConsent = consentDraftSchema.safeParse(consentSummary);

    if (!parsedConsent.success) {
      setMessage("필수 항목을 확인해 주세요.");
      return;
    }

    const consentSaved = await saveConsentIntent(parsedConsent.data);

    if (!consentSaved) {
      setMessage("필수 동의를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    if (
      typeof localStorage !== "undefined" &&
      typeof localStorage.setItem === "function"
    ) {
      saveRequiredConsentDraft(consentSummary);
    }

    setPendingProviderId(provider.id);
    setMessage("");
    setClosedState(null);

    const result = await startSocialSignIn(provider.id);

    if (result.status !== "redirecting") {
      setMessage(
        result.status === "missing_env"
          ? "로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요."
          : result.message,
      );
      setClosedState(result.closedState ?? null);
      setPendingProviderId(null);
    }
  }

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      setMessage("로그아웃을 시작하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    setPendingProviderId("signout");
    setMessage("");
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage("로그아웃하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      setPendingProviderId(null);
      return;
    }

    await clearAccountOwnedLocalAttempts();
    clearSavedConsentDraft();
    setConnectedAccount(null);
    setPendingProviderId(null);
    setMessage("로그아웃했어요.");
    window.history.replaceState({}, "", window.location.pathname);
    router.refresh();
  }

  if (isCheckingAccount) {
    return <AccountSkeleton />;
  }

  if (connectedAccount) {
    return (
      <section aria-labelledby="account-connect-title" className={styles.panel}>
        <div className={styles.connectedHeading}>
          <span className={styles.connectedIcon}>
            <CheckCircle2 aria-hidden="true" size={19} strokeWidth={1.8} />
          </span>
          <span>
            <h2 id="account-connect-title">로그인 정보</h2>
          </span>
        </div>

        <div className={styles.connectedRow}>
          <ProviderLogo providerId={connectedAccount.providerId} />
          <div>
            <strong>{connectedAccount.displayName}</strong>
            <small>{connectedAccount.providerLabel}로 로그인 중</small>
          </div>
          <button
            disabled={pendingProviderId !== null}
            onClick={handleSignOut}
            type="button"
          >
            <LogOut aria-hidden="true" size={16} strokeWidth={1.8} />
            {pendingProviderId === "signout" ? "처리 중" : "로그아웃"}
          </button>
        </div>

        {message ? <StatusNotice message={message} /> : null}
      </section>
    );
  }

  const availableProviders = socialAuthProviders.filter((provider) =>
    getSupabaseOAuthProvider(provider.id),
  );

  return (
    <section aria-labelledby="account-connect-title" className={styles.panel}>
      <div className={styles.intro}>
        <h2 id="account-connect-title">원하는 계정으로 시작하세요</h2>
        {context === "community" ? (
          <p>로그인 후 방금 하던 활동으로 돌아갑니다.</p>
        ) : null}
      </div>

      <div className={styles.consentBox}>
        <ConsentCheck
          checked={allRequiredChecked}
          emphasis
          label="필수 항목 모두 동의"
          onChange={(checked) => {
            setIs14OrOlder(checked);
            setTerms(checked);
            setPrivacy(checked);
          }}
        />
        <div className={styles.consentGroup}>
          <ConsentCheck
            checked={is14OrOlder}
            label="만 14세 이상이에요"
            onChange={setIs14OrOlder}
          />
          <ConsentCheck
            checked={terms}
            label="이용약관에 동의해요"
            onChange={setTerms}
          />
          <ConsentCheck
            checked={privacy}
            label="개인정보 처리방침에 동의해요"
            onChange={setPrivacy}
          />
        </div>
        <details className={styles.optionalConsent}>
          <summary>선택 동의 보기</summary>
          <ConsentCheck
            checked={analytics}
            description="어떤 화면과 기능을 이용했는지만 모아 더 편하게 개선해요. 검사 답변과 작성한 내용은 포함하지 않아요."
            label="서비스 개선을 위한 이용 데이터 수집"
            onChange={setAnalytics}
            optional
          />
          <ConsentCheck
            checked={marketing}
            description="뉴앙의 새 검사, 함께하기, 이벤트, 혜택과 제휴 소식을 이메일로 받아봐요. 동의하지 않아도 모든 서비스를 이용할 수 있고, 설정이나 이메일의 수신거부에서 언제든 철회할 수 있어요."
            label="광고성 이메일 수신 동의"
            onChange={setMarketing}
            optional
          />
        </details>
      </div>

      <p className={styles.policyCopy}>
        계속하면 <Link href="/policies/terms">이용약관</Link>과{" "}
        <Link href="/policies/privacy">개인정보 처리방침</Link>에 동의하게
        됩니다.
      </p>

      <div className={styles.providerList}>
        {availableProviders.map((provider) => (
          <SocialAuthButton
            disabled={!isReadyForAuth || pendingProviderId !== null}
            key={provider.id}
            onClick={() => handleProviderClick(provider)}
            pending={pendingProviderId === provider.id}
            providerId={provider.id}
          />
        ))}
      </div>

      {!isReadyForAuth ? (
        <p className={styles.authHint} aria-live="polite">
          필수 항목에 동의하면 로그인할 수 있어요.
        </p>
      ) : null}

      {message ? <StatusNotice message={message} /> : null}
      {closedState ? (
        <p className={styles.retryHint}>
          잠시 후 같은 계정으로 다시 시도해 주세요.
        </p>
      ) : null}
    </section>
  );
}

function authReturnMessage(status: string | null) {
  const messages: Record<string, string> = {
    account_deleted:
      "삭제된 계정의 로그인 정보예요. 다른 로그인 방법을 이용해 주세요.",
    connected: "로그인이 완료됐어요.",
    consent_error:
      "필수 동의를 저장하지 못했어요. 확인 후 다시 로그인해 주세요.",
    consent_required: "필수 동의를 확인한 뒤 다시 로그인해 주세요.",
    error: "로그인을 마치지 못했어요. 다시 시도해 주세요.",
    identity_conflict:
      "같은 사용자로 보이는 기록을 안전하게 확인하지 못했어요. 다른 로그인 방법으로 다시 시도해 주세요.",
    identity_error:
      "로그인 정보를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    identity_unsupported:
      "이 로그인 정보를 확인하지 못했어요. 다른 로그인 방법으로 다시 시도해 주세요.",
    intent_expired:
      "로그인 시간이 지나 다시 확인이 필요해요. 다시 로그인해 주세요.",
    intent_invalid: "로그인 확인 정보가 올바르지 않아요. 다시 로그인해 주세요.",
    intent_missing: "로그인 확인 정보가 없어 다시 시작이 필요해요.",
    missing_code: "로그인을 마치지 못했어요. 다시 시도해 주세요.",
    oauth_cancelled: "로그인을 취소했어요. 원할 때 다시 시도해 주세요.",
    origin_mismatch:
      "로그인을 시작한 주소로 돌아오지 못했어요. 현재 주소에서 다시 로그인해 주세요.",
    session_cleanup_error:
      "로그인 정보를 정리하지 못했어요. 새로고침한 뒤 다시 시도해 주세요.",
    session_error: "로그인 정보를 저장하지 못했어요. 다시 시도해 주세요.",
  };
  return status ? (messages[status] ?? "") : "";
}

function AccountSkeleton() {
  return (
    <section
      aria-label="로그인 상태 확인"
      aria-live="polite"
      className={styles.skeleton}
      role="status"
    >
      <span className={styles.skeletonTitle} />
      <span className={styles.skeletonCopy} />
      <span className={styles.skeletonButton} />
      <span className={styles.skeletonButton} />
    </section>
  );
}

function SocialAuthButton({
  disabled,
  onClick,
  pending,
  providerId,
}: {
  disabled: boolean;
  onClick: () => void;
  pending: boolean;
  providerId: SocialAuthProviderId;
}) {
  const label =
    providerId === "google"
      ? "Google"
      : providerId === "kakao"
        ? "카카오"
        : "네이버";

  return (
    <button
      className={styles.providerButton}
      data-provider={providerId}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <ProviderLogo providerId={providerId} />
      <span>{pending ? label + "로 로그인 중" : label + "로 계속하기"}</span>
      {pending ? (
        <LoaderCircle aria-hidden="true" className={styles.spinner} size={17} />
      ) : (
        <span aria-hidden="true" className={styles.providerSpacer} />
      )}
    </button>
  );
}

function ProviderLogo({
  providerId,
}: {
  providerId: SocialAuthProviderId | null;
}) {
  if (providerId === "kakao") {
    return (
      <svg
        aria-hidden="true"
        className={styles.providerLogo}
        viewBox="0 0 24 24"
      >
        <path
          d="M12 4.2c-4.86 0-8.8 3.02-8.8 6.75 0 2.4 1.67 4.52 4.16 5.72l-.94 3.45c-.08.3.26.54.52.37l4.12-2.73c.31.03.62.04.94.04 4.86 0 8.8-3.02 8.8-6.85S16.86 4.2 12 4.2Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (providerId === "google") {
    return (
      <svg
        aria-hidden="true"
        className={styles.providerLogo}
        viewBox="0 0 24 24"
      >
        <path
          d="M21.35 12.2c0-.72-.06-1.25-.2-1.8H12v3.45h5.37a4.6 4.6 0 0 1-1.99 2.92v2.38h3.23c1.89-1.75 2.74-4.32 2.74-6.95Z"
          fill="var(--nu-provider-google-blue)"
        />
        <path
          d="M12 21.7c2.62 0 4.82-.86 6.61-2.55l-3.23-2.38c-.9.6-2.04.96-3.38.96-2.53 0-4.68-1.71-5.45-4.01H3.22v2.45A9.98 9.98 0 0 0 12 21.7Z"
          fill="var(--nu-provider-google-green)"
        />
        <path
          d="M6.55 13.72a6.04 6.04 0 0 1 0-3.85V7.42H3.22a10.02 10.02 0 0 0 0 8.75l3.33-2.45Z"
          fill="var(--nu-provider-google-yellow)"
        />
        <path
          d="M12 5.85c1.48 0 2.8.51 3.85 1.5l2.83-2.82A9.5 9.5 0 0 0 12 1.8a9.98 9.98 0 0 0-8.78 5.62l3.33 2.45C7.32 7.56 9.47 5.85 12 5.85Z"
          fill="var(--nu-provider-google-red)"
        />
      </svg>
    );
  }

  return (
    <span aria-hidden="true" className={styles.genericProviderLogo}>
      N
    </span>
  );
}

function StatusNotice({ message }: { message: string }) {
  return (
    <p aria-live="polite" className={styles.statusNotice} role="status">
      {message}
    </p>
  );
}

function readCurrentUserWithTimeout(
  supabase: NonNullable<ReturnType<typeof createBrowserSupabaseClient>>,
) {
  return new Promise<User | null>((resolve) => {
    const timeoutId = window.setTimeout(() => resolve(null), 2500);

    void supabase.auth
      .getUser()
      .then((result: { data: { user: User | null } }) => {
        resolve(result.data.user ?? null);
      })
      .catch(() => resolve(null))
      .finally(() => window.clearTimeout(timeoutId));
  });
}

function ConsentCheck({
  checked,
  description,
  emphasis = false,
  label,
  onChange,
  optional = false,
}: {
  checked: boolean;
  description?: string;
  emphasis?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  optional?: boolean;
}) {
  return (
    <label
      className={styles.consentRow}
      data-emphasis={emphasis ? "true" : "false"}
    >
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span aria-hidden="true" className={styles.checkmark}>
        {checked ? <Check size={14} strokeWidth={2.5} /> : null}
      </span>
      <span className={styles.consentLabel}>
        <span>{label}</span>
        {description ? <small>{description}</small> : null}
      </span>
      {optional ? <small>선택</small> : null}
    </label>
  );
}

function createConnectedAccount(user: User): ConnectedAccount {
  const rawProviderId =
    typeof user.app_metadata.provider === "string"
      ? user.app_metadata.provider
      : user.identities?.[0]?.provider;
  const provider = socialAuthProviders.find(
    (candidate) => candidate.id === rawProviderId,
  );
  const displayNameCandidates = [
    user.user_metadata.full_name,
    user.user_metadata.name,
    user.user_metadata.nickname,
  ];
  const displayName =
    displayNameCandidates.find(
      (candidate): candidate is string =>
        typeof candidate === "string" && candidate.trim().length > 0,
    ) ?? "뉴앙 사용자";

  return {
    displayName,
    providerId: provider?.id ?? null,
    providerLabel: provider?.label ?? "소셜 계정",
  };
}

function readSavedConsentDraft(): ConsentDraft | null {
  if (
    typeof localStorage === "undefined" ||
    typeof localStorage.getItem !== "function"
  ) {
    return null;
  }

  const savedDraft = localStorage.getItem("nuang-consent-draft");
  if (!savedDraft) return null;

  try {
    const parsedDraft = consentDraftSchema.safeParse(JSON.parse(savedDraft));
    return parsedDraft.success ? parsedDraft.data : null;
  } catch {
    return null;
  }
}

function clearOptionalConsentFromSavedDraft(draft: ConsentDraft | null) {
  if (!draft) return;
  saveRequiredConsentDraft(draft);
}

function saveRequiredConsentDraft(draft: {
  is14OrOlder: boolean;
  privacy: boolean;
  terms: boolean;
}) {
  if (
    typeof localStorage === "undefined" ||
    typeof localStorage.setItem !== "function"
  ) {
    return;
  }

  try {
    localStorage.setItem(
      "nuang-consent-draft",
      JSON.stringify({
        is14OrOlder: draft.is14OrOlder,
        privacy: draft.privacy,
        terms: draft.terms,
      }),
    );
  } catch {
    // Browser storage is a convenience only. The signed-in consent intent is
    // kept in the short-lived HttpOnly cookie instead.
  }
}

function clearSavedConsentDraft() {
  try {
    localStorage.removeItem("nuang-consent-draft");
  } catch {
    // A blocked storage area must not prevent sign-out.
  }
}

async function saveConsentIntent(draft: ConsentDraft) {
  try {
    const response = await fetch("/api/auth/consent-intent", {
      body: JSON.stringify(draft),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    return response.ok;
  } catch {
    return false;
  }
}
