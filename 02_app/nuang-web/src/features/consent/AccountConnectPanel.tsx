"use client";

import { Check, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { socialAuthProviders } from "@/features/auth/auth-policy";
import { startSocialSignIn } from "@/features/auth/start-social-sign-in";
import { ageBands, isRequiredConsentComplete } from "@/features/consent/consent-draft";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";
import { cn } from "@/lib/utils/cn";

type ClosedState = ReturnType<typeof createApiClosedPayload>;

export function AccountConnectPanel() {
  const [is14OrOlder, setIs14OrOlder] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [ageBand, setAgeBand] = useState<string>("");
  const [message, setMessage] = useState("");
  const [closedState, setClosedState] = useState<ClosedState | null>(null);
  const [pendingProviderId, setPendingProviderId] = useState<string | null>(null);
  const isReadyForAuth = isRequiredConsentComplete({
    is14OrOlder,
    privacy,
    terms,
  });

  const consentSummary = useMemo(
    () => ({
      is14OrOlder,
      ageBand,
      terms,
      privacy,
      analytics,
      marketing,
    }),
    [ageBand, analytics, is14OrOlder, marketing, privacy, terms],
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
  }, []);

  async function handleProviderClick(
    provider: (typeof socialAuthProviders)[number],
  ) {
    localStorage.setItem("nuang-consent-draft", JSON.stringify(consentSummary));

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

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-surface-soft text-primary">
          <LockKeyhole aria-hidden="true" size={21} />
        </div>
        <div>
          <StatusPill tone="primary">계정 연결 전 확인</StatusPill>
          <h2 className="mt-3 text-lg font-bold">계정 저장과 공유를 준비해요</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            검사는 로그인 없이 시작할 수 있어요. 계정 확인은 결과 저장, 공유,
            비교처럼 서버가 필요한 기능을 열 때만 사용합니다.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <ConsentCheck
          checked={is14OrOlder}
          label="만 14세 이상입니다"
          onChange={setIs14OrOlder}
        />
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
        약관과 개인정보 문서는 아직 최종 검토 전입니다.{" "}
        <Link className="font-bold text-primary" href="/policies/terms">
          이용약관 준비 문서
        </Link>
        과{" "}
        <Link className="font-bold text-primary" href="/policies/privacy">
          개인정보 준비 문서
        </Link>
        을 먼저 확인할 수 있어요.
      </p>

      <div className="mt-5">
        <p className="text-sm font-semibold">연령대</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {ageBands.map((band) => (
            <button
              className={cn(
                "min-h-10 rounded-lg border border-line bg-white text-sm font-semibold text-muted",
                ageBand === band && "border-primary bg-surface-soft text-primary",
              )}
              key={band}
              onClick={() => setAgeBand(band)}
              type="button"
            >
              {band}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        {socialAuthProviders.map((provider) => (
          <Button
            disabled={!isReadyForAuth || pendingProviderId !== null}
            key={provider.id}
            onClick={() => handleProviderClick(provider)}
            variant="secondary"
          >
            {pendingProviderId === provider.id
              ? `${provider.label} 연결 중`
              : `${provider.label}로 계속하기`}
          </Button>
        ))}
      </div>
      <p className="mt-3 text-center text-xs leading-5 text-muted">
        {isReadyForAuth
          ? "소셜 로그인은 계정 서버 환경이 연결된 뒤 실제 저장과 공유에 사용됩니다."
          : "필수 확인 3가지를 선택하면 소셜 로그인 버튼이 열려요."}
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
    <div className="mt-3 rounded-lg bg-surface-soft p-3 text-sm leading-6 text-muted">
      <p className="font-semibold text-foreground">{closedState.feature.label}</p>
      <p className="mt-1">{closedState.safeFallback}</p>
      <p className="mt-2">
        <span className="font-semibold text-foreground">다음 단계 </span>
        {closedState.display.nextStep}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {closedState.display.blockedBy.map((item) => (
          <span
            className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-muted"
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
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
    <button
      aria-pressed={checked}
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-lg border border-line bg-white px-3 text-left text-sm font-semibold",
        checked && "border-primary bg-surface-soft text-primary",
      )}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line",
          checked && "border-primary bg-primary text-white",
        )}
      >
        {checked && <Check aria-hidden="true" size={15} />}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      {optional && <span className="text-xs text-muted">선택</span>}
    </button>
  );
}
