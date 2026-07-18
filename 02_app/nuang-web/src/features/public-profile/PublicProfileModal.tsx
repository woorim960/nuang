"use client";

import { ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { PublicProfileImageView } from "@/features/public-profile/PublicProfileImageView";
import type { PublicProfileCardPayload } from "@/features/public-profile/public-profile-card-contract";
import { profileVisibilityPolicyVersion } from "@/features/together/profile-visibility-policy";
import { cn } from "@/lib/utils/cn";

export function PublicProfileButton({
  ariaLabel,
  children,
  className,
  profile,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  profile?: PublicProfileCardPayload;
}) {
  const [open, setOpen] = useState(false);

  if (!profile) {
    return <>{children}</>;
  }

  return (
    <>
      <button
        aria-label={ariaLabel}
        className={cn(
          "min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]",
          className,
        )}
        onClick={() => setOpen(true)}
        type="button"
      >
        {children}
      </button>
      <PublicProfileModal
        onClose={() => setOpen(false)}
        open={open}
        profile={profile}
      />
    </>
  );
}

export function PublicProfileModal({
  onClose,
  open,
  profile,
}: {
  onClose: () => void;
  open: boolean;
  profile: PublicProfileCardPayload;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const primaryHighlight = profile.highlights.domainHighlights[0];
  const secondaryHighlight = profile.highlights.domainHighlights[1];

  async function compareWithMe() {
    setMessage(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/public-comparisons", {
        body: JSON.stringify({
          policyVersion: profileVisibilityPolicyVersion,
          target: {
            publicSnapshotId: profile.source.publicSnapshotId,
          },
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | {
            code?: string;
            comparisonReportId?: string;
            comparison?: { id?: string };
            message?: string;
            ok?: boolean;
          }
        | null;

      if (response.status === 401) {
        const nextPath = `${window.location.pathname}${window.location.search}`;
        router.push(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      const comparisonReportId = body?.comparisonReportId ?? body?.comparison?.id;

      if (response.ok && comparisonReportId) {
        router.push(`/reports/comparison/${comparisonReportId}`);
        return;
      }

      if (body?.code === "viewer_full_core_missing") {
        setMessage("내 코어 검사 결과가 있어야 비교 리포트를 만들 수 있어요.");
        return;
      }

      if (body?.message) {
        setMessage(toFriendlyComparisonMessage(body.message));
        return;
      }

      setMessage("비교 리포트 생성 기능을 연결하는 중이에요.");
    } catch {
      setMessage("연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      aria-labelledby="public-profile-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-3 pb-3 pt-12 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
    >
      <button
        aria-label="프로필 닫기"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative w-full max-w-[430px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
        <header className="flex items-center justify-between border-b border-[#efefef] px-5 py-4">
          <p className="text-[15px] font-extrabold text-[#111111]">프로필</p>
          <button
            aria-label="닫기"
            className="-mr-2 grid h-9 w-9 place-items-center rounded-full text-[#111111] hover:bg-[#f5f5f5]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={20} strokeWidth={2} />
          </button>
        </header>

        <div className="px-5 pb-5 pt-6">
          <div className="flex items-start gap-4">
            <PublicProfileImageView
              image={profile.display.profileImage}
              priority
              size="lg"
            />
            <div className="min-w-0 flex-1 pt-1">
              <h2
                className="truncate text-[22px] font-black leading-7 tracking-normal text-[#111111]"
                id="public-profile-title"
              >
                {profile.display.displayName}
              </h2>
              <p className="mt-1 text-sm font-bold text-[#777777]">
                {profile.display.code}
              </p>
              <p className="mt-3 text-[17px] font-extrabold leading-6 text-[#111111]">
                {profile.display.profileName}
              </p>
            </div>
          </div>

          <div className="mt-6 border-y border-[#eeeeee] py-4">
            <p className="text-sm leading-6 text-[#4a4a4a]">
              공개된 성향 정보를 기준으로 상대의 리듬을 간단히 확인할 수
              있어요.
            </p>
            <div className="mt-4 grid gap-3">
              {primaryHighlight ? <AxisLine axis={primaryHighlight} /> : null}
              {secondaryHighlight ? <AxisLine axis={secondaryHighlight} /> : null}
            </div>
          </div>

          {message ? (
            <p className="mt-4 rounded-lg bg-[#f7f7f7] px-4 py-3 text-sm font-semibold leading-5 text-[#555555]">
              {message}
            </p>
          ) : null}

          <button
            className="mt-5 flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-[#111111] text-[15px] font-extrabold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            onClick={compareWithMe}
            type="button"
          >
            {submitting ? "준비 중" : "나와 비교하기"}
            <ChevronRight aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
          <p className="mt-3 text-center text-xs font-medium leading-5 text-[#8a8a8a]">
            비공개 항목은 비교에 사용하지 않아요.
          </p>
        </div>
      </section>
    </div>
  );
}

function AxisLine({
  axis,
}: {
  axis: PublicProfileCardPayload["highlights"]["domainHighlights"][number];
}) {
  const score = axis.score ?? 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="truncate text-sm font-bold text-[#111111]">
          {axis.label}
        </span>
        <span className="shrink-0 text-xs font-bold text-[#777777]">
          {axis.score === null ? "분석 중" : `${score}점`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#ededed]">
        <div
          className="h-full rounded-full bg-[#111111]"
          style={{ width: `${Math.max(6, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

function toFriendlyComparisonMessage(message: string) {
  if (message.includes("Sign in") || message.includes("required")) {
    return "로그인 후 이용할 수 있어요.";
  }

  if (message.includes("정밀 코어") || message.includes("코어")) {
    return "내 코어 검사 결과가 있어야 비교 리포트를 만들 수 있어요.";
  }

  if (message.includes("closed") || message.includes("pending")) {
    return "비교 리포트 생성 기능을 연결하는 중이에요.";
  }

  return message;
}

