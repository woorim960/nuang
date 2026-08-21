"use client";

import {
  ChevronRight,
  Compass,
  LockKeyhole,
  LogIn,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import type { NuangCharacterMotif } from "@/components/character/nuang-character-assets";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
import { LegacyCoreBetaNotice } from "@/features/assessment/LegacyCoreBetaNotice";
import { canPromoteCoreResultToRepresentative } from "@/features/assessment/legacy-core-containment-policy";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
import { createCharacterProfileImage } from "@/features/public-profile/profile-image";
import { ProfileIdentitySurface } from "@/features/public-profile/ProfileIdentitySurface";
import { selectRepresentativeCoreResult } from "@/features/result/unified-core-report/core-result-report-selector";
import { collectValidatedCoreResultCandidates } from "@/features/result/unified-core-report/validated-core-result-candidates";
import profileStyles from "./SelfProfileScreen.module.css";
import styles from "./MyOverview.module.css";

type ContentTab = "posts" | "reports";

type MyProfileSummary = {
  code: string;
  completedAt: string;
  href: string;
  isExploratoryBeta: boolean;
  motif: NuangCharacterMotif;
  name: string;
  source: string;
};

export function MyOverview({
  initialContent = "posts",
  showAdminEntry = false,
}: {
  initialContent?: ContentTab;
  showAdminEntry?: boolean;
}) {
  const [activeContent, setActiveContent] =
    useState<ContentTab>(initialContent);
  const [localAttempts, setLocalAttempts] = useState<LocalAssessmentAttempt[]>(
    [],
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const nextLocalAttempts = await listLocalAttempts();

      if (!isMounted) return;
      setLocalAttempts(nextLocalAttempts);
      setLoaded(true);
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const profile = useMemo(
    () => buildProfileSummary(localAttempts),
    [localAttempts],
  );
  const reportCount = localAttempts.filter(
    (attempt) => attempt.state === "completed",
  ).length;
  const profileImage = useMemo(
    () =>
      createCharacterProfileImage({
        alt: "나의 뉴앙 프로필 이미지",
        motif: profile?.motif ?? "purple",
      }),
    [profile?.motif],
  );

  function moveTabWithKeyboard(
    event: KeyboardEvent<HTMLButtonElement>,
    current: ContentTab,
  ) {
    let next: ContentTab | null = null;
    if (event.key === "Home") next = "posts";
    if (event.key === "End") next = "reports";
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      next = current === "posts" ? "reports" : "posts";
    }
    if (!next) return;

    event.preventDefault();
    setActiveContent(next);
    document.getElementById(`guest-my-${next}-tab`)?.focus();
  }

  return (
    <CommunityScreenShell
      backHref={null}
      title="마이"
      trailing={
        <Link aria-label="설정 열기" href="/my/settings">
          <Settings aria-hidden="true" size={20} strokeWidth={1.7} />
        </Link>
      }
    >
      {!loaded ? (
        <MyLoadingState />
      ) : (
        <>
          <section className={profileStyles.hero}>
            <ProfileIdentitySurface
              actions={
                <div className={profileStyles.actions} data-single="true">
                  <Link
                    className={profileStyles.editProfileButton}
                    href="/login?next=/my"
                  >
                    <LogIn aria-hidden="true" size={16} strokeWidth={1.7} />
                    로그인 또는 가입
                  </Link>
                </div>
              }
              bio={
                profile
                  ? profile.isExploratoryBeta
                    ? "탐색적 베타 결과는 지금 이 기기에 참고 기록으로 저장돼 있어요."
                    : "검사 결과는 지금 이 기기에 저장돼 있어요. 로그인하면 어디서나 이어볼 수 있어요."
                  : "로그인하면 프로필과 활동을 한곳에서 관리할 수 있어요."
              }
              displayName="나의 뉴앙"
              emptyBio="로그인하면 프로필과 활동을 한곳에서 관리할 수 있어요."
              followerCount={0}
              followingCount={0}
              handle={null}
              image={profileImage}
              operator={showAdminEntry}
              postCount={0}
              trait={
                profile && !profile.isExploratoryBeta
                  ? {
                      code: profile.code,
                      label: profile.name,
                      type: "code",
                    }
                  : {
                      label: profile ? "탐색적 베타 기록 있음" : "첫 검사 전",
                      type: "status",
                    }
              }
            />

            <LegacyCoreBetaNotice
              className={profileStyles.legacyBetaNotice}
              context="my"
            />

            <GuestAssessmentAction profile={profile} />

            <nav
              aria-label="내 프로필 바로가기"
              className={profileStyles.shortcuts}
            >
              <Link href="/my/reports">내 성향 상세</Link>
              <Link href="/my/events">참여한 이벤트</Link>
              <Link href="/my/feedback?from=%2Fmy">의견 보내기</Link>
            </nav>

            {showAdminEntry ? (
              <Link className={profileStyles.adminEntry} href="/admin">
                <span>
                  <ShieldCheck
                    aria-hidden="true"
                    size={18}
                    strokeWidth={1.65}
                  />
                </span>
                <strong>관리자 운영 센터</strong>
                <ChevronRight aria-hidden="true" size={17} strokeWidth={1.65} />
              </Link>
            ) : null}
          </section>

          <div
            aria-label="프로필 콘텐츠"
            className={profileStyles.contentTabs}
            role="tablist"
          >
            <button
              aria-controls="guest-my-posts-panel"
              aria-selected={activeContent === "posts"}
              id="guest-my-posts-tab"
              onClick={() => setActiveContent("posts")}
              onKeyDown={(event) => moveTabWithKeyboard(event, "posts")}
              role="tab"
              tabIndex={activeContent === "posts" ? 0 : -1}
              type="button"
            >
              게시물
              <span>0</span>
            </button>
            <button
              aria-controls="guest-my-reports-panel"
              aria-selected={activeContent === "reports"}
              id="guest-my-reports-tab"
              onClick={() => setActiveContent("reports")}
              onKeyDown={(event) => moveTabWithKeyboard(event, "reports")}
              role="tab"
              tabIndex={activeContent === "reports" ? 0 : -1}
              type="button"
            >
              검사 결과
              <span>{reportCount.toLocaleString("ko-KR")}</span>
            </button>
          </div>

          <section
            aria-labelledby={`guest-my-${activeContent}-tab`}
            id={`guest-my-${activeContent}-panel`}
            role="tabpanel"
          >
            {activeContent === "posts" ? (
              <GuestPostCollection />
            ) : (
              <GuestReportCollection
                profile={profile}
                reportCount={reportCount}
              />
            )}
          </section>
        </>
      )}
    </CommunityScreenShell>
  );
}

function MyLoadingState() {
  return (
    <section aria-live="polite" className={styles.loading} role="status">
      <div className={styles.loadingIdentity}>
        <span className={styles.loadingAvatar} />
        <div>
          <span />
          <span />
        </div>
      </div>
      <span className={styles.loadingLine} />
      <div className={styles.loadingStats}>
        <span />
        <span />
        <span />
      </div>
      <span className={styles.loadingAction} />
      <p>내 프로필을 불러오는 중</p>
    </section>
  );
}

function GuestAssessmentAction({
  profile,
}: {
  profile: MyProfileSummary | null;
}) {
  if (profile?.isExploratoryBeta) {
    return (
      <section className={profileStyles.assessmentAction}>
        <div className={profileStyles.assessmentCopy}>
          <small>탐색적 베타 결과</small>
          <strong>이전 탐색 결과를 보관하고 있어요</strong>
          <p>
            검사 당시 응답을 바탕으로 보존한 참고용 결과예요. 대표 코드나
            공개·공유·비교에는 사용되지 않아요.
          </p>
        </div>
        <Link className={profileStyles.assessmentButton} href={profile.href}>
          베타 결과 보기
          <ChevronRight aria-hidden="true" size={18} strokeWidth={1.8} />
        </Link>
      </section>
    );
  }

  const isFullResult = profile?.source === "정밀 코어";
  const href = profile
    ? isFullResult
      ? profile.href
      : "/assessments/nu-core-full?from=my&backTo=%2Fmy&returnTo=%2Fmy%3Ftab%3Dreports"
    : "/assessments/nu-core-quick?returnTo=%2Fmy%3Ftab%3Dreports";

  return (
    <section className={profileStyles.assessmentAction}>
      <div className={profileStyles.assessmentCopy}>
        <small>{profile ? `${profile.source} 검사 완료` : "첫 검사 전"}</small>
        <strong>
          {profile
            ? isFullResult
              ? "나를 설명하는 성향 리포트가 준비됐어요"
              : "내 성향을 더 깊이 알아볼 차례예요"
            : "첫 성향 검사로 내 뉴앙 코드를 만나보세요"}
        </strong>
        <p>
          {profile
            ? isFullResult
              ? `${profile.code} · ${profile.name} · ${formatDate(profile.completedAt)}`
              : "여러 상황에서 보이는 내 모습을 더 자세히 살펴봐요."
            : "3~5분이면 나를 설명하는 첫 뉴앙 코드를 만날 수 있어요."}
        </p>
      </div>
      <Link className={profileStyles.assessmentButton} href={href}>
        {profile
          ? isFullResult
            ? "내 결과 보기"
            : "정밀 검사 시작하기"
          : "첫 성향 검사 시작하기"}
        <ChevronRight aria-hidden="true" size={18} strokeWidth={1.8} />
      </Link>
      {profile && !isFullResult ? (
        <Link
          className={profileStyles.secondaryAssessmentLink}
          href={profile.href}
        >
          지금 결과 보기
        </Link>
      ) : null}
    </section>
  );
}

function GuestPostCollection() {
  return (
    <section className={profileStyles.empty}>
      <span aria-hidden="true">
        <LockKeyhole size={23} strokeWidth={1.65} />
      </span>
      <strong>로그인하면 내 게시물을 모아볼 수 있어요</strong>
      <Link href="/login?next=/my">로그인하고 시작하기</Link>
    </section>
  );
}

function GuestReportCollection({
  profile,
  reportCount,
}: {
  profile: MyProfileSummary | null;
  reportCount: number;
}) {
  if (!profile) {
    return (
      <section className={profileStyles.empty}>
        <span aria-hidden="true">
          <Compass size={23} strokeWidth={1.65} />
        </span>
        <strong>아직 완료한 검사 결과가 없어요</strong>
        <Link href="/assessments/nu-core-quick?returnTo=%2Fmy%3Ftab%3Dreports">
          첫 검사 시작하기
        </Link>
      </section>
    );
  }

  return (
    <section className={profileStyles.empty}>
      <span aria-hidden="true">
        <Compass size={23} strokeWidth={1.65} />
      </span>
      <strong>
        이 기기에 검사 결과 {reportCount.toLocaleString("ko-KR")}개가 있어요
      </strong>
      <Link href={profile.href}>검사 결과 보기</Link>
    </section>
  );
}

function buildProfileSummary(
  localAttempts: LocalAssessmentAttempt[],
): MyProfileSummary | null {
  const collection = collectValidatedCoreResultCandidates({
    accountReadState: "not_requested",
    localAttempts,
  });
  const representative = selectRepresentativeCoreResult(collection);
  if (!representative) return null;

  return {
    code: representative.result.code,
    completedAt: representative.identity.completedAt,
    href: "/my/reports",
    isExploratoryBeta: !canPromoteCoreResultToRepresentative({
      assessmentReleaseId: representative.measurement.assessmentReleaseId,
    }),
    motif: "purple",
    name: representative.result.currentProfileName,
    source: representative.identity.kind === "full" ? "정밀 코어" : "빠른 코어",
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "최근";

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
  }).format(date);
}
