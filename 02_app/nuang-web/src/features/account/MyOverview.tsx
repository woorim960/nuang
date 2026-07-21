"use client";

import {
  BookmarkCheck,
  ChevronRight,
  FileText,
  LogIn,
  MessagesSquare,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import type { NuangCharacterMotif } from "@/components/character/nuang-character-assets";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import { readJsonResponse } from "@/features/account/response-json";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
import { calculateLocalAttemptScore } from "@/features/assessment/local-attempt-score";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import styles from "./MyOverview.module.css";

type MyProfileSummary = {
  code: string;
  completedAt: string;
  href: string;
  motif: NuangCharacterMotif;
  name: string;
  source: string;
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
  const completedLocalCount = localAttempts.filter(
    (attempt) => attempt.state === "completed",
  ).length;
  const reportCount = Math.max(accountResults.length, completedLocalCount);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.wordmark}>
          <span>NUANG</span>
          <h1>마이</h1>
        </div>
        <Link aria-label="설정 열기" href="/my/settings">
          <Settings aria-hidden="true" size={21} strokeWidth={1.75} />
        </Link>
      </header>

      {!loaded ? (
        <MyLoadingState />
      ) : profile ? (
        <>
          <section className={styles.hero}>
            <div className={styles.profileOverview}>
              <div className={styles.characterWrap}>
                <NuangCharacter motif={profile.motif} size="md" />
              </div>
              <div className={styles.profileIdentity}>
                <small>{profile.source} 검사 기준</small>
                <h2>{profile.code}</h2>
                <strong>{profile.name}</strong>
              </div>
            </div>
            <p className={styles.profileDescription}>
              지금의 나와 가장 가까운 대표 성향이에요. 검사와 활동이 쌓이면 더
              자세한 모습을 확인할 수 있어요.
            </p>

            <div className={styles.profileStats}>
              <span>
                <strong>{reportCount.toLocaleString("ko-KR")}</strong>
                저장된 리포트
              </span>
              <span>
                <strong>{formatDate(profile.completedAt)}</strong>
                최근 업데이트
              </span>
            </div>

            <div className={styles.profileActions}>
              <Link href="/my/profile">내 성향 보기</Link>
              <Link href={profile.href}>최신 리포트</Link>
            </div>
          </section>

          <NextStep profile={profile} />
        </>
      ) : (
        <EmptyProfile isCheckingAuth={isCheckingAuth} isLoggedIn={isLoggedIn} />
      )}

      <section className={styles.mySpace}>
        <div className={styles.sectionHeading}>
          <h2>나의 활동</h2>
          <p>내가 남긴 결과와 커뮤니티 활동을 다시 볼 수 있어요.</p>
        </div>
        <nav aria-label="나의 활동 메뉴" className={styles.activityList}>
          <MyMenuLink
            description="내가 참여한 질문과 선택을 다시 봐요"
            href="/feed/perspectives?from=my"
            icon={BookmarkCheck}
            title="성향 놀이터 기록"
            tone="play"
          />
          <MyMenuLink
            description="내 커뮤니티 프로필과 게시물을 확인해요"
            href="/feed/me"
            icon={MessagesSquare}
            title="내 게시물"
            tone="conversation"
          />
          <MyMenuLink
            description="검사 결과와 비교 리포트를 모아 봐요"
            href="/my/reports"
            icon={FileText}
            title="내 리포트"
            tone="brand"
          />
        </nav>
      </section>

      <nav aria-label="계정 메뉴" className={styles.accountMenu}>
        <MyMenuLink
          description="계정, 공개 범위와 데이터 관리"
          href="/my/settings"
          icon={SlidersHorizontal}
          title="설정과 개인정보"
          tone="neutral"
        />
        {!isLoggedIn && !isCheckingAuth ? (
          <MyMenuLink
            description="커뮤니티와 계정 기능을 이용해요"
            href="/login?next=/my"
            icon={LogIn}
            title="로그인 또는 가입"
            tone="neutral"
          />
        ) : null}
      </nav>
    </div>
  );
}

function MyLoadingState() {
  return (
    <section aria-live="polite" className={styles.loading} role="status">
      <div className={styles.loadingAvatar} />
      <div>
        <span />
        <span />
        <span />
      </div>
      <p>내 프로필을 불러오는 중</p>
    </section>
  );
}

function EmptyProfile({
  isCheckingAuth,
  isLoggedIn,
}: {
  isCheckingAuth: boolean;
  isLoggedIn: boolean;
}) {
  return (
    <section className={styles.emptyHero}>
      <div className={styles.profileOverview}>
        <div className={styles.characterWrap}>
          <NuangCharacter motif="purple" size="md" />
        </div>
        <div className={styles.profileIdentity}>
          <small>
            {isCheckingAuth
              ? "프로필 확인 중"
              : isLoggedIn
                ? "아직 검사 결과 없음"
                : "처음 만나는 나의 성향"}
          </small>
          <h2 className={styles.emptyTitle}>내 뉴앙 코드를 만나보세요</h2>
        </div>
      </div>
      <p className={styles.profileDescription}>
        첫 성향 검사로 대표 성향을 확인하고, 준비된 검사를 더할수록 나를 더
        자세히 이해할 수 있어요.
      </p>
      <Link className={styles.startAssessment} href="/assessments">
        첫 성향 검사 시작하기
        <ChevronRight aria-hidden="true" size={17} strokeWidth={1.8} />
      </Link>
    </section>
  );
}

function NextStep({ profile }: { profile: MyProfileSummary }) {
  const isFullResult = profile.source === "정밀 코어";
  const href = isFullResult
    ? "/assessments"
    : "/assessments/nu-core-full?from=my&backTo=%2Fmy&returnTo=%2Fmy";

  return (
    <Link className={styles.nextStep} href={href}>
      <span>
        <small>{isFullResult ? "다음 발견" : "조금 더 자세히"}</small>
        <strong>
          {isFullResult
            ? "새로운 주제 검사로 나를 더 알아봐요"
            : "정밀 검사로 내 성향을 더 선명하게 봐요"}
        </strong>
      </span>
      <ChevronRight aria-hidden="true" size={18} strokeWidth={1.8} />
    </Link>
  );
}

function MyMenuLink({
  description,
  href,
  icon: Icon,
  title,
  tone,
}: {
  description: string;
  href: string;
  icon: typeof FileText;
  title: string;
  tone: "brand" | "conversation" | "neutral" | "play";
}) {
  return (
    <Link className={styles.menuLink} href={href}>
      <span className={styles.menuIcon} data-tone={tone}>
        <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
      </span>
      <span className={styles.menuCopy}>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ChevronRight
        aria-hidden="true"
        className={styles.menuChevron}
        size={17}
        strokeWidth={1.7}
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
  const accountResult = accountResults
    .filter((result) => getCandidateProfileDefinition(result.profileCode))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];

  if (accountResult) {
    return {
      code: accountResult.profileCode,
      completedAt: accountResult.completedAt,
      href: `/results/account/${accountResult.resultReportId}`,
      motif: getMotif(accountResult.profileCode),
      name: accountResult.profileName,
      source: accountResult.kind === "full" ? "정밀 코어" : "빠른 코어",
    };
  }

  const localResult = localAttempts
    .filter((attempt) => attempt.state === "completed")
    .map((attempt) => {
      const result = calculateLocalAttemptScore(attempt);
      return result ? { attempt, result } : null;
    })
    .filter(
      (entry): entry is NonNullable<typeof entry> =>
        Boolean(entry?.result.code) &&
        Boolean(getCandidateProfileDefinition(entry?.result.code ?? "")),
    )
    .sort((a, b) =>
      (b.attempt.completedAt ?? b.attempt.updatedAt).localeCompare(
        a.attempt.completedAt ?? a.attempt.updatedAt,
      ),
    )[0];

  if (!localResult?.result.code || !localResult.result.profileName) return null;

  return {
    code: localResult.result.code,
    completedAt:
      localResult.attempt.completedAt ?? localResult.attempt.updatedAt,
    href: `/results/local/${localResult.attempt.id}`,
    motif: getMotif(localResult.result.code),
    name: localResult.result.profileName,
    source:
      localResult.attempt.assessmentId === "nu-core-full"
        ? "정밀 코어"
        : "빠른 코어",
  };
}

function getMotif(code: string): NuangCharacterMotif {
  return getCandidateProfileDefinition(code) ? "purple" : "purple";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "최근";

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
  }).format(date);
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
