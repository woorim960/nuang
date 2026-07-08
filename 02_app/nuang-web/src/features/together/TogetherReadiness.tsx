"use client";

import {
  CheckCircle2,
  CircleDashed,
  Link2,
  LockKeyhole,
  Search,
  UsersRound,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { publicProfileCodeExample } from "@/features/community/PublicProfileCodeIssuePreview";

type ReadinessItem = {
  detail: string;
  label: string;
  state: "done" | "locked" | "planned" | "ready" | "waiting";
};

export function TogetherReadiness() {
  const [attempts, setAttempts] = useState<LocalAssessmentAttempt[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    listLocalAttempts().then((nextAttempts) => {
      if (!isMounted) return;
      setAttempts(nextAttempts);
      setLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const fullCompleted = attempts.find(
    (attempt) =>
      attempt.assessmentId === "nu-core-full" && attempt.state === "completed",
  );
  const fullInProgress = attempts.find(
    (attempt) =>
      attempt.assessmentId === "nu-core-full" && attempt.state === "in_progress",
  );
  const quickCompleted = attempts.find(
    (attempt) =>
      attempt.assessmentId === "nu-core-quick" && attempt.state === "completed",
  );

  const readinessItems = useMemo<ReadinessItem[]>(
    () => [
      {
        detail: fullCompleted
          ? "이 기기에 정밀 코어 결과가 있어요."
          : fullInProgress
            ? `${Object.keys(fullInProgress.responses).length} / ${fullInProgress.itemIds.length} 응답 완료`
            : quickCompleted
              ? "빠른 코어 결과는 있지만 비교에는 정밀 코어가 필요해요."
              : "60문항 정밀 코어를 먼저 완료해 주세요.",
        label: "정밀 코어",
        state: fullCompleted ? "done" : fullInProgress ? "waiting" : "locked",
      },
      {
        detail: "기본 프로필과 성향지도는 공개, 민감 항목은 비공개로 시작해요.",
        label: "공개 범위",
        state: "ready",
      },
      {
        detail:
          "공개 스냅샷이 생기면 추가 승인 없이 공개 범위 안에서 바로 비교해요.",
        label: "상대 공개 프로필",
        state: "planned",
      },
    ],
    [fullCompleted, fullInProgress, quickCompleted],
  );

  if (!loaded) {
    return (
      <section
        aria-live="polite"
        className="rounded-lg border border-line bg-white p-4 text-sm text-muted"
        role="status"
      >
        함께 준비 상태 확인 중
      </section>
    );
  }

  const cta = getPrimaryCta({
    fullCompleted: Boolean(fullCompleted),
    fullInProgress,
    quickCompleted: Boolean(quickCompleted),
  });

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
          <UsersRound aria-hidden="true" size={23} />
        </div>
        <div className="min-w-0">
          <StatusPill tone={fullCompleted ? "success" : "neutral"}>
            공개 범위 비교
          </StatusPill>
          <h2 className="mt-3 text-lg font-bold">
            {fullCompleted
              ? "내 정밀 결과는 비교 기준으로 준비됐어요"
              : "정밀 코어가 있어야 비교할 수 있어요"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            1:1 비교는 상대가 공개해 둔 프로필 범위 안에서 바로 열고, 민감
            항목은 기본 비공개로 둡니다.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        {readinessItems.map((item) => (
          <ReadinessRow item={item} key={item.label} />
        ))}
      </div>

      <PublicComparisonEntry isReady={Boolean(fullCompleted)} />

      <ButtonLink
        className="mt-3 w-full"
        href="/together/comparison-preview"
        variant="secondary"
      >
        리포트 구성 보기
      </ButtonLink>

      <ButtonLink className="mt-5 w-full" href={cta.href} icon={cta.icon}>
        {cta.label}
      </ButtonLink>
    </section>
  );
}

function PublicComparisonEntry({ isReady }: { isReady: boolean }) {
  const [profileReference, setProfileReference] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const normalizedReference = profileReference.trim();
  const canSubmit = isReady && normalizedReference.length >= 4;
  const submitLabel = !isReady
    ? "정밀 결과 필요"
    : normalizedReference.length >= 4
      ? "확인"
      : "입력 후 확인";
  const defaultMessage = isReady
    ? "상대가 공개한 코드나 링크가 있으면 이곳에서 바로 비교를 시작하게 됩니다."
    : "내 정밀 코어 결과가 생기면 공개 프로필 비교를 시작할 수 있어요.";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isReady) {
      setMessage("내 정밀 코어 결과가 있어야 공개 프로필 비교를 시작할 수 있어요.");
      return;
    }

    if (normalizedReference.length < 4) {
      setMessage("공개 프로필 코드나 링크를 4자 이상 입력해 주세요.");
      return;
    }

    setMessage(
      "공개 코드/링크 조회와 비교 리포트 생성은 서버 연결 후 열립니다. 추가 승인 요청은 만들지 않아요.",
    );
  }

  return (
    <form
      className="mt-5 rounded-lg border border-line bg-surface-soft p-3"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold">공개 프로필 코드/링크</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            공개 범위 안에서 바로 비교
          </p>
        </div>
        <StatusPill tone="neutral">서버 준비 중</StatusPill>
      </div>
      <div className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor="public-profile-code">
          공개 프로필 코드 또는 링크
        </label>
        <input
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-sm font-semibold outline-none transition-colors placeholder:text-muted focus:border-primary"
          id="public-profile-code"
          onChange={(event) => setProfileReference(event.target.value)}
          placeholder={`${publicProfileCodeExample} 또는 /p/${publicProfileCodeExample}`}
          value={profileReference}
        />
        <Button
          aria-label={
            isReady
              ? "공개 프로필 코드로 비교 준비 확인"
              : "정밀 코어 완료 후 공개 프로필 비교 준비 확인"
          }
          className="shrink-0 px-3"
          disabled={!canSubmit}
          icon={<Search aria-hidden="true" size={17} />}
          type="submit"
        >
          {submitLabel}
        </Button>
      </div>
      <p aria-live="polite" className="mt-2 text-xs leading-5 text-muted" role="status">
        {message ?? defaultMessage}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted">
        내 공개 코드는 마이 탭에서 발급 준비 중이며, 대표 성향 코드와 별도로
        관리해요.
      </p>
    </form>
  );
}

function ReadinessRow({ item }: { item: ReadinessItem }) {
  const tone =
    item.state === "done"
      ? "success"
      : item.state === "waiting"
        ? "caution"
        : item.state === "planned"
          ? "neutral"
        : item.state === "ready"
          ? "primary"
          : "neutral";

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {item.state === "done" ? (
            <CheckCircle2 aria-hidden="true" className="shrink-0 text-success" size={18} />
          ) : item.state === "waiting" ? (
            <CircleDashed aria-hidden="true" className="shrink-0 text-[#9a6400]" size={18} />
          ) : item.state === "planned" ? (
            <CircleDashed aria-hidden="true" className="shrink-0 text-muted" size={18} />
          ) : item.state === "ready" ? (
            <CheckCircle2 aria-hidden="true" className="shrink-0 text-primary" size={18} />
          ) : (
            <LockKeyhole aria-hidden="true" className="shrink-0 text-muted" size={18} />
          )}
          <p className="font-semibold">{item.label}</p>
        </div>
        <StatusPill tone={tone}>
          {item.state === "done"
            ? "완료"
            : item.state === "waiting"
              ? "진행 중"
              : item.state === "planned"
                ? "준비 중"
              : item.state === "ready"
                ? "기본값"
                : "필요"}
        </StatusPill>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
    </div>
  );
}

function getPrimaryCta({
  fullCompleted,
  fullInProgress,
  quickCompleted,
}: {
  fullCompleted: boolean;
  fullInProgress: LocalAssessmentAttempt | undefined;
  quickCompleted: boolean;
}) {
  if (fullCompleted) {
    return {
      href: "/my",
      icon: <LockKeyhole size={17} />,
      label: "공개 설정 준비 보기",
    };
  }

  if (fullInProgress) {
    return {
      href: "/assessments/nu-core-full",
      icon: <CircleDashed size={17} />,
      label: "정밀 코어 이어하기",
    };
  }

  return {
    href: "/assessments/nu-core-full",
    icon: <Link2 size={17} />,
    label: quickCompleted ? "정밀 코어로 확장" : "정밀 코어 시작",
  };
}
