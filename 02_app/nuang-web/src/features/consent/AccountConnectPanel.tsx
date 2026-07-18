"use client";

import type { User } from "@supabase/supabase-js";
import { CheckCircle2, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getSupabaseOAuthProvider,
  socialAuthProviders,
} from "@/features/auth/auth-policy";
import { startSocialSignIn } from "@/features/auth/start-social-sign-in";
import {
  consentDraftSchema,
  isRequiredConsentComplete,
  type ConsentDraft,
} from "@/features/consent/consent-draft";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils/cn";

type ClosedState = ReturnType<typeof createApiClosedPayload>;
type ConnectedAccount = {
  displayName: string;
  providerLabel: string;
};

export function AccountConnectPanel() {
  const router = useRouter();
  const [savedConsentDraft] = useState(readSavedConsentDraft);
  const [terms, setTerms] = useState(savedConsentDraft?.terms ?? false);
  const [privacy, setPrivacy] = useState(savedConsentDraft?.privacy ?? false);
  const [analytics, setAnalytics] = useState(
    savedConsentDraft?.analytics ?? false,
  );
  const [marketing, setMarketing] = useState(
    savedConsentDraft?.marketing ?? false,
  );
  const [message, setMessage] = useState("");
  const [closedState, setClosedState] = useState<ClosedState | null>(null);
  const [pendingProviderId, setPendingProviderId] = useState<string | null>(
    null,
  );
  const [connectedAccount, setConnectedAccount] =
    useState<ConnectedAccount | null>(null);
  const [isCheckingAccount, setIsCheckingAccount] = useState(true);
  const isReadyForAuth = isRequiredConsentComplete({
    privacy,
    terms,
  });

  const consentSummary = useMemo(
    () => ({
      terms,
      privacy,
      analytics,
      marketing,
    }),
    [analytics, marketing, privacy, terms],
  );

  useEffect(() => {
    const authStatus = new URLSearchParams(window.location.search).get("auth");
    let nextMessage = "";
    let nextClosedState: ClosedState | null = null;

    if (authStatus === "connected") {
      nextMessage = "계정 연결이 완료됐어요.";
    }

    if (authStatus === "missing_code" || authStatus === "error") {
      nextMessage = "계정 연결을 마치지 못했어요. 다시 시도해 주세요.";
    }

    if (authStatus === "env_missing") {
      nextClosedState = createApiClosedPayload("supabase_env_missing");
      nextMessage = nextClosedState.display.message;
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

      return () => {
        window.clearTimeout(timeoutId);
      };
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
  }, []);

  async function handleProviderClick(
    provider: (typeof socialAuthProviders)[number],
  ) {
    if (
      typeof localStorage !== "undefined" &&
      typeof localStorage.setItem === "function"
    ) {
      localStorage.setItem(
        "nuang-consent-draft",
        JSON.stringify(consentSummary),
      );
    }

    setPendingProviderId(provider.id);
    setMessage("");
    setClosedState(null);

    const result = await startSocialSignIn(provider.id);

    if (result.status !== "redirecting") {
      setMessage(result.message);
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

    setConnectedAccount(null);
    setPendingProviderId(null);
    setMessage("로그아웃했어요.");
    window.history.replaceState({}, "", window.location.pathname);
    router.refresh();
  }

  if (isCheckingAccount) {
    return (
      <section
        aria-label="계정 연결 확인"
        className="border-y border-line py-4"
      >
        <p className="text-sm text-muted">계정 연결을 확인하고 있어요.</p>
      </section>
    );
  }

  if (connectedAccount) {
    return (
      <section aria-labelledby="account-connect-title">
        <div>
          <h2 className="text-base font-bold" id="account-connect-title">
            연결된 계정
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            내 결과와 공유 기능에 사용할 계정이에요.
          </p>
        </div>

        <div className="mt-3 flex items-center gap-3 border-y border-line py-4">
          <CheckCircle2
            aria-hidden="true"
            className="shrink-0 text-ink"
            size={20}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">
              {connectedAccount.displayName}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {connectedAccount.providerLabel} 계정 연결됨
            </p>
          </div>
          <button
            className="inline-flex min-h-10 shrink-0 items-center gap-2 px-1 text-sm font-semibold text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pendingProviderId !== null}
            onClick={handleSignOut}
            type="button"
          >
            <LogOut aria-hidden="true" size={17} />
            {pendingProviderId === "signout" ? "처리 중" : "로그아웃"}
          </button>
        </div>

        {message && (
          <p
            aria-live="polite"
            className="mt-3 text-xs text-muted"
            role="status"
          >
            {message}
          </p>
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="account-connect-title">
      <div>
        <h2 className="text-base font-bold" id="account-connect-title">
          계정 연결
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          검사는 로그인 없이 시작할 수 있어요. 리포트 저장과 공유가 필요할 때만
          로그인하세요.
        </p>
      </div>

      <div className="mt-4 border-y border-line">
        <ConsentCheck
          checked={terms}
          label="이용약관에 동의합니다"
          onChange={setTerms}
        />
        <ConsentCheck
          checked={privacy}
          label="필수 개인정보 처리에 동의합니다"
          onChange={setPrivacy}
        />
        <ConsentCheck
          checked={analytics}
          label="서비스 개선 분석에 동의합니다"
          onChange={setAnalytics}
          optional
        />
        <ConsentCheck
          checked={marketing}
          label="소식과 혜택 알림을 받습니다"
          onChange={setMarketing}
          optional
        />
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        연결 전에{" "}
        <Link className="font-bold text-primary" href="/policies/terms">
          이용약관
        </Link>
        과{" "}
        <Link className="font-bold text-primary" href="/policies/privacy">
          개인정보 처리방침
        </Link>
        을 확인해 주세요.
      </p>

      <div className="mt-5 grid gap-2">
        {socialAuthProviders.map((provider) =>
          getSupabaseOAuthProvider(provider.id) ? (
            <button
              className="min-h-12 rounded-lg border border-line bg-white px-4 text-sm font-bold text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:text-muted"
              disabled={!isReadyForAuth || pendingProviderId !== null}
              key={provider.id}
              onClick={() => handleProviderClick(provider)}
              type="button"
            >
              {pendingProviderId === provider.id
                ? `${provider.label} 연결 중`
                : `${provider.label}로 계속하기`}
            </button>
          ) : (
            <div
              className="flex min-h-12 items-center justify-between border-t border-line px-1 text-sm"
              key={provider.id}
            >
              <span className="font-semibold">{provider.label}</span>
              <span className="text-xs font-semibold text-muted">준비 중</span>
            </div>
          ),
        )}
      </div>
      <p className="mt-3 text-center text-xs leading-5 text-muted">
        {isReadyForAuth
          ? "원하는 계정으로 안전하게 연결할 수 있어요."
          : "필수 확인 2가지를 선택하면 소셜 로그인 버튼이 열려요."}
      </p>

      {message && (
        <p
          aria-live="polite"
          className="mt-3 text-center text-xs text-muted"
          role="status"
        >
          {message}
        </p>
      )}
      {closedState && <ClosedStateNotice closedState={closedState} />}
    </section>
  );
}

function ClosedStateNotice({ closedState }: { closedState: ClosedState }) {
  return (
    <div className="mt-3 border-t border-line pt-3 text-sm leading-6 text-muted">
      <p className="font-semibold text-foreground">
        {closedState.feature.label}
      </p>
      <p className="mt-1">{closedState.safeFallback}</p>
      <p className="mt-2">{closedState.display.nextStep}</p>
    </div>
  );
}

function readCurrentUserWithTimeout(
  supabase: NonNullable<ReturnType<typeof createBrowserSupabaseClient>>,
) {
  return new Promise<User | null>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      resolve(null);
    }, 2500);

    void supabase.auth
      .getUser()
      .then((result: { data: { user: User | null } }) => {
        resolve(result.data.user ?? null);
      })
      .catch(() => {
        resolve(null);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });
  });
}

function ConsentCheck({
  checked,
  label,
  onChange,
  optional,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  optional?: boolean;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-line py-3 last:border-b-0">
      <input
        checked={checked}
        className={cn(
          "h-5 w-5 shrink-0 rounded border-line accent-ink",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        )}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="min-w-0 flex-1">{label}</span>
      {optional && <span className="text-xs text-muted">선택</span>}
    </label>
  );
}

function createConnectedAccount(user: User): ConnectedAccount {
  const providerId =
    typeof user.app_metadata.provider === "string"
      ? user.app_metadata.provider
      : user.identities?.[0]?.provider;
  const providerLabel =
    socialAuthProviders.find((provider) => provider.id === providerId)?.label ??
    "소셜";
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
    providerLabel,
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
