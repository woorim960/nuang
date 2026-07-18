"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { TraitRadarChart } from "@/components/ui/TraitRadarChart";
import type { AccountResultSummary } from "@/features/account/account-result-contract";

const domainShortLabel: Record<string, string> = {
  ER: "마음",
  OE: "감각",
  RO: "관계",
  SE: "사람",
  SM: "일상",
};

const motifByPrefix = {
  SC: "forest",
  SV: "water",
  TC: "sun",
  TV: "flame",
} as const;

export function AccountResultView({
  resultReportId,
}: {
  resultReportId: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<AccountResultSummary | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "ready">("loading");
  const [deleteState, setDeleteState] = useState<"error" | "idle" | "working">(
    "idle",
  );

  useEffect(() => {
    let isMounted = true;

    readAccountResult(resultReportId).then((nextResult) => {
      if (!isMounted) return;

      if (!nextResult) {
        setState("missing");
        return;
      }

      setResult(nextResult);
      setState("ready");
    });

    return () => {
      isMounted = false;
    };
  }, [resultReportId]);

  if (state === "loading") {
    return (
      <main className="mx-auto min-h-dvh max-w-[520px] bg-white px-5 py-8">
        <p aria-live="polite" className="text-sm text-muted" role="status">
          결과를 불러오고 있어요.
        </p>
      </main>
    );
  }

  if (state === "missing" || !result) {
    return (
      <main className="mx-auto min-h-dvh max-w-[520px] bg-white px-5 py-8">
        <h1 className="text-xl font-bold">결과를 열 수 없어요</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          삭제되었거나 더 이상 확인할 수 없는 결과예요.
        </p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center font-semibold text-ink"
          href="/my/reports"
        >
          내 리포트로 돌아가기
        </Link>
      </main>
    );
  }

  const prefix = result.profileCode.slice(0, 2) as keyof typeof motifByPrefix;
  const motif = motifByPrefix[prefix] ?? "purple";
  const axes = result.domains.map((domain) => ({
    id: domain.domainId,
    label: domain.label,
    shortLabel: domainShortLabel[domain.domainId] ?? domain.label,
    value: domain.score,
  }));

  async function handleDelete() {
    const confirmed = window.confirm(
      "이 결과를 삭제할까요? 삭제하면 다시 열 수 없고 공유 주소와 비교 기록도 함께 삭제돼요.",
    );

    if (!confirmed) return;

    setDeleteState("working");

    try {
      const response = await fetch("/api/account-results", {
        body: JSON.stringify({ resultReportId }),
        headers: {
          "content-type": "application/json",
        },
        method: "DELETE",
      });
      const body = (await response.json()) as { ok?: boolean };

      if (!response.ok || !body.ok) {
        setDeleteState("error");
        return;
      }

      router.replace("/my/reports");
    } catch {
      setDeleteState("error");
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] bg-white px-5 pb-12">
      <header className="sticky top-0 z-10 -mx-5 grid h-14 grid-cols-[40px_minmax(0,1fr)_40px] items-center border-b border-line bg-white/95 px-4 backdrop-blur-xl">
        <Link
          aria-label="내 리포트로 돌아가기"
          className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-surface"
          href="/my/reports"
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.9} />
        </Link>
        <p className="truncate px-2 text-center text-sm font-bold">결과 리포트</p>
        <span aria-hidden="true" />
      </header>

      <section className="border-b border-line pb-6 pt-7">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-muted">{result.resultLabel}</p>
            <p className="mt-2 text-[34px] font-black leading-none tracking-normal text-ink">
              {result.profileCode}
            </p>
            <h1 className="mt-3 text-2xl font-black leading-8">
              {result.profileName}
            </h1>
          </div>
          <NuangCharacter motif={motif} size="lg" />
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">
          현재 성향을 코드 자리로 요약한 결과예요. 점수보다 반복해서 나타나는
          방향을 중심으로 읽어보세요.
        </p>
        <p className="mt-3 text-xs text-muted">
          {formatDate(result.completedAt)} ·{" "}
          {result.kind === "full" ? "정밀 코어" : "빠른 코어"}
        </p>
      </section>

      <section className="border-b border-line py-6">
        <h2 className="text-base font-bold">코드 지도</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          중심에서 멀수록 그 성향을 더 자주 사용하는 편이에요.
        </p>
        <TraitRadarChart
          ariaLabel="코드 지도 그래프"
          axes={axes}
          centerLabel="코드 지도"
        />
      </section>

      {result.facets.length > 0 && (
        <section className="border-b border-line py-6">
          <h2 className="text-base font-bold">세부 신호</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            가운데 50을 기준으로 어느 방향이 더 자주 나타나는지 보여줘요.
          </p>
          <div className="mt-5 grid gap-4">
            {result.facets.map((facet) => (
              <CenteredFacetBar facet={facet} key={facet.facetId} />
            ))}
          </div>
        </section>
      )}

      <section className="border-b border-line py-6">
        <h2 className="text-base font-bold">영역별 요약</h2>
        <div className="mt-3 divide-y divide-line border-y border-line">
          {result.domains.map((domain) => (
            <div
              className="flex min-h-14 items-center justify-between gap-3 py-3"
              key={domain.domainId}
            >
              <span className="text-sm font-semibold">{domain.label}</span>
              <span className="text-sm font-bold text-muted">
                {domain.score === null ? "응답 부족" : Math.round(domain.score)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-5 py-5 text-sm font-semibold">
        <Link className="text-ink" href="/my/reports">
          내 리포트
        </Link>
        <Link className="text-muted hover:text-ink" href="/assessments">
          검사 보기
        </Link>
      </div>

      <section className="border-t border-line py-5">
        <button
          aria-busy={deleteState === "working"}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
          disabled={deleteState === "working"}
          onClick={handleDelete}
          type="button"
        >
          <Trash2 aria-hidden="true" size={17} />
          {deleteState === "working" ? "삭제 중" : "결과 삭제"}
        </button>
        {deleteState === "error" && (
          <p className="mt-2 text-sm text-danger" role="alert">
            결과를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.
          </p>
        )}
      </section>
    </main>
  );
}

function CenteredFacetBar({
  facet,
}: {
  facet: AccountResultSummary["facets"][number];
}) {
  const value = facet.score ?? 50;
  const bounded = Math.max(0, Math.min(100, Math.round(value)));
  const leftWidth = bounded < 50 ? 50 - bounded : 0;
  const rightWidth = bounded >= 50 ? bounded - 50 : 0;

  return (
    <div
      aria-label={`${facet.label} ${bounded}점`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={bounded}
      role="meter"
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold">{facet.label}</span>
        <span className="tabular-nums text-muted">{bounded}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-px bg-line">
        <div className="flex h-2.5 justify-end bg-[#f6f5f9]">
          <div className="h-full bg-water" style={{ width: `${leftWidth * 2}%` }} />
        </div>
        <div className="h-2.5 bg-[#f6f5f9]">
          <div className="h-full bg-primary" style={{ width: `${rightWidth * 2}%` }} />
        </div>
      </div>
    </div>
  );
}

async function readAccountResult(resultReportId: string) {
  try {
    const response = await fetch(
      `/api/account-results?resultReportId=${encodeURIComponent(resultReportId)}`,
      {
        cache: "no-store",
        method: "GET",
      },
    );

    if (!response.ok) return null;

    const body = (await response.json()) as {
      ok?: boolean;
      results?: AccountResultSummary[];
    };

    return body.ok && body.results?.length === 1 ? body.results[0] : null;
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "날짜 알 수 없음";

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
