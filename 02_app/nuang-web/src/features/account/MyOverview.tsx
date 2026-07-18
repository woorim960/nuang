"use client";

import { ChevronRight, FileText, LogIn, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import type { NuangCharacterMotif } from "@/components/character/nuang-character-assets";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import { readJsonResponse } from "@/features/account/response-json";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
import { fullScoringRelease } from "@/features/assessment/full-core-seed";
import { quickScoringRelease } from "@/features/assessment/quick-core-seed";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { calculateCoreScore } from "@/lib/scoring/core";
import type { ItemResponse } from "@/lib/scoring/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type MyProfileSummary = {
  code: string;
  href: string;
  motif: NuangCharacterMotif;
  name: string;
  source: string;
};

const motifByPrefix: Record<string, NuangCharacterMotif> = {
  SC: "forest",
  SV: "water",
  TC: "sun",
  TV: "flame",
};

export function MyOverview() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [localAttempts, setLocalAttempts] = useState<LocalAssessmentAttempt[]>(
    [],
  );
  const [accountResults, setAccountResults] = useState<AccountResultSummary[]>(
    [],
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      void Promise.resolve().then(() => {
        if (isMounted) setIsCheckingAuth(false);
      });

      return () => {
        isMounted = false;
      };
    }

    void supabase.auth
      .getUser()
      .then((result: { data: { user: unknown | null } }) => {
        if (!isMounted) return;
        setIsLoggedIn(Boolean(result.data.user));
        setIsCheckingAuth(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const [nextLocalAttempts, nextAccountResults] = await Promise.all([
        listLocalAttempts(),
        listAccountResults(),
      ]);

      if (!isMounted) return;
      setLocalAttempts(nextLocalAttempts);
      setAccountResults(nextAccountResults);
      setLoaded(true);
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const profile = useMemo(
    () => buildProfileSummary({ accountResults, localAttempts }),
    [accountResults, localAttempts],
  );

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold">마이</h1>
        <p className="mt-1 text-sm text-muted">
          내 대표 성향과 리포트를 가볍게 확인해요.
        </p>
      </header>

      {loaded && profile ? (
        <Link
          aria-label={`${profile.code} ${profile.name} 자세히 보기`}
          className="block border-y border-line py-5"
          href="/my/profile"
        >
          <div className="flex items-center justify-between gap-5">
            <div className="min-w-0">
              <p className="text-[34px] font-black leading-none tracking-normal text-ink">
                {profile.code}
              </p>
              <h2 className="mt-3 text-xl font-black">{profile.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {profile.source} 기준 대표 성향이에요. 자세한 해석은 다음
                화면에서 확인할 수 있어요.
              </p>
            </div>
            <NuangCharacter motif={profile.motif} size="lg" />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm font-semibold">
            <span>내 성향 자세히 보기</span>
            <ChevronRight aria-hidden="true" className="text-muted" size={18} />
          </div>
        </Link>
      ) : (
        <section className="border-y border-line py-5">
          <div className="flex items-center justify-between gap-5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-muted">
                {isCheckingAuth
                  ? "확인 중"
                  : isLoggedIn
                    ? "아직 결과 없음"
                    : "비회원"}
              </p>
              <h2 className="mt-2 text-xl font-black">
                {isLoggedIn
                  ? "검사를 완료하면 대표 성향이 보여요"
                  : "로그인하면 성향과 리포트를 이어서 볼 수 있어요"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                검사는 로그인 없이도 시작할 수 있고, 리포트 저장과 공유가 필요할
                때 로그인하면 됩니다.
              </p>
            </div>
            <NuangCharacter motif="purple" size="md" />
          </div>
        </section>
      )}

      <nav aria-label="마이 메뉴" className="border-y border-line">
        <MyMenuLink
          description="검사 결과, 비교 리포트, 추후 그룹 리포트"
          href="/my/reports"
          icon={FileText}
          title="내 리포트"
        />
        <MyMenuLink
          description="계정, 공개 범위, 데이터 관리"
          href="/my/settings"
          icon={Settings}
          title="설정"
        />
        {!isLoggedIn && !isCheckingAuth && (
          <MyMenuLink
            description="리포트 저장과 공유를 이어서 사용"
            href="/login?next=/my"
            icon={LogIn}
            title="로그인하기"
          />
        )}
      </nav>
    </div>
  );
}

function MyMenuLink({
  description,
  href,
  icon: Icon,
  title,
}: {
  description: string;
  href: string;
  icon: typeof FileText;
  title: string;
}) {
  return (
    <Link
      className="flex min-h-16 items-center gap-3 border-b border-line py-3 last:border-b-0"
      href={href}
    >
      <Icon aria-hidden="true" className="shrink-0 text-muted" size={19} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{title}</span>
        <span className="mt-1 block truncate text-xs text-muted">
          {description}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="shrink-0 text-muted"
        size={17}
      />
    </Link>
  );
}

function buildProfileSummary({
  accountResults,
  localAttempts,
}: {
  accountResults: AccountResultSummary[];
  localAttempts: LocalAssessmentAttempt[];
}): MyProfileSummary | null {
  const accountResult = [...accountResults].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  )[0];

  if (accountResult) {
    return {
      code: accountResult.profileCode,
      href: `/results/account/${accountResult.resultReportId}`,
      motif: getMotif(accountResult.profileCode),
      name: accountResult.profileName,
      source: accountResult.kind === "full" ? "정밀 코어" : "빠른 코어",
    };
  }

  const localResult = localAttempts
    .filter((attempt) => attempt.state === "completed")
    .map((attempt) => {
      const result = scoreLocalAttempt(attempt);
      return result ? { attempt, result } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) =>
      (b.attempt.completedAt ?? b.attempt.updatedAt).localeCompare(
        a.attempt.completedAt ?? a.attempt.updatedAt,
      ),
    )[0];

  if (!localResult?.result.code || !localResult.result.profileName) return null;

  return {
    code: localResult.result.code,
    href: `/results/local/${localResult.attempt.id}`,
    motif: getMotif(localResult.result.code),
    name: localResult.result.profileName,
    source:
      localResult.attempt.assessmentId === "nu-core-full"
        ? "정밀 코어"
        : "빠른 코어",
  };
}

function scoreLocalAttempt(attempt: LocalAssessmentAttempt) {
  const scoringRelease =
    attempt.assessmentId === "nu-core-full"
      ? fullScoringRelease
      : quickScoringRelease;
  const responses: ItemResponse[] = Object.values(attempt.responses).map(
    (response) => ({
      itemId: response.itemId,
      isUnsure: response.isUnsure,
      value: response.value,
    }),
  );

  return calculateCoreScore(scoringRelease, responses);
}

function getMotif(code: string): NuangCharacterMotif {
  return motifByPrefix[code.slice(0, 2)] ?? "purple";
}

async function listAccountResults(): Promise<AccountResultSummary[]> {
  try {
    const response = await fetch("/api/account-results", {
      cache: "no-store",
      method: "GET",
    });

    if (!response.ok) return [];

    const body = await readJsonResponse<{
      ok?: boolean;
      results?: AccountResultSummary[];
    }>(response);

    return body?.ok && Array.isArray(body.results) ? body.results : [];
  } catch {
    return [];
  }
}
