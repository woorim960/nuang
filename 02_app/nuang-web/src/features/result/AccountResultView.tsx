"use client";

import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TraitRadarChart } from "@/components/ui/TraitRadarChart";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";
import { TraitMapResultBridge } from "@/features/result/TraitMapResultBridge";
import styles from "@/features/result/AccountResultView.module.css";

const domainShortLabel: Record<string, string> = {
  ER: "마음",
  OE: "감각",
  RO: "관계",
  SE: "사람",
  SM: "일상",
};

export function AccountResultView({
  resultReportId,
}: {
  resultReportId: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<AccountResultSummary | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "ready">(
    "loading",
  );
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
      <main className={styles.stateRoot}>
        <Image
          alt="결과를 준비하는 뉴앙 캐릭터"
          className={styles.stateMascot}
          height={512}
          priority
          src="/assets/assessment/nuang-loading-mascot-v2.png"
          width={512}
        />
        <p aria-live="polite" role="status">
          내 결과를 불러오고 있어요
        </p>
        <span aria-hidden="true" className={styles.loadingLine} />
      </main>
    );
  }

  if (state === "missing" || !result) {
    return (
      <main className={styles.stateRoot}>
        <h1>결과를 열 수 없어요</h1>
        <p>삭제되었거나 더 이상 확인할 수 없는 결과예요.</p>
        <Link className={styles.stateLink} href="/my/reports">
          내 리포트로 돌아가기
        </Link>
      </main>
    );
  }

  const profile = getCandidateProfileDefinition(result.profileCode);
  const profileName = profile?.displayName ?? result.profileName;
  const resultKindLabel =
    result.kind === "full" ? "정밀 성향 결과" : "첫 성향 결과";
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
    <main className={styles.root}>
      <header className={styles.appBar}>
        <Link
          aria-label="내 리포트로 돌아가기"
          className={styles.backButton}
          href="/my/reports"
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.9} />
        </Link>
        <p>결과 리포트</p>
        <span aria-hidden="true" />
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroCopy}>
            <span className={styles.statusTag}>{resultKindLabel}</span>
            <p className={styles.kicker}>내 뉴앙 코드</p>
            <p
              aria-label={`뉴앙 코드 ${result.profileCode}`}
              className={styles.code}
            >
              {result.profileCode.split("").map((letter, index) => (
                <span aria-hidden="true" key={`${letter}-${index}`}>
                  {letter}
                </span>
              ))}
            </p>
            <h1>{profileName}</h1>
          </div>
          <Image
            alt="빛나는 핵을 품은 뉴앙 캐릭터"
            className={styles.heroMascot}
            height={512}
            priority
            src="/assets/assessment/nuang-loading-mascot-v2.png"
            width={512}
          />
          <p className={styles.meta}>{formatDate(result.completedAt)} 검사</p>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2>이번 답에서 보인 내 모습</h2>
          </div>
          {profile ? (
            <div className={styles.overviewList}>
              {profile.overview.map((item) => (
                <article className={styles.overviewItem} key={item.label}>
                  <p>{item.label}</p>
                  <span>{item.text}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.legacyOverview}>
              <p>
                현재 성향을 코드 자리로 요약한 결과예요. 점수보다 여러 상황에서
                반복해서 나타난 방향을 중심으로 읽어보세요.
              </p>
              <span>
                이 결과는 이전 코드 체계로 만들어졌어요. 새 정밀 검사를 하면
                현재 뉴앙 코드와 더 자세한 성향지도를 볼 수 있어요.
              </span>
            </div>
          )}
        </section>

        <TraitMapResultBridge
          code={result.profileCode}
          profileName={profileName}
        />

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2>다섯 영역에서 나타난 방향</h2>
          </div>
          <p className={styles.sectionDescription}>
            중심에서 멀수록 이번 답에서 더 자주 나타난 방향이에요.
          </p>
          <div className={styles.radarWrap}>
            <TraitRadarChart
              ariaLabel="코드 지도 그래프"
              axes={axes}
              centerLabel="응답 방향"
            />
          </div>
          <div className={styles.domainList}>
            {result.domains.map((domain) => (
              <div key={domain.domainId}>
                <span>{domain.label}</span>
                <strong>
                  {domain.score === null
                    ? "응답 부족"
                    : `${Math.round(domain.score)}%`}
                </strong>
              </div>
            ))}
          </div>
        </section>

        {result.facets.length > 0 ? (
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <h2>세부 신호</h2>
            </div>
            <p className={styles.sectionDescription}>
              가운데 50을 기준으로 어느 방향이 이번 답에서 더 자주 나타났는지
              보여줘요.
            </p>
            <div className={styles.facetList}>
              {result.facets.map((facet) => (
                <CenteredFacetBar facet={facet} key={facet.facetId} />
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.nextSection}>
          {profile ? (
            <Link className={styles.primaryAction} href="/feed">
              커뮤니티 둘러보기
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
            </Link>
          ) : (
            <Link className={styles.primaryAction} href="/assessments">
              새 정밀 검사 시작하기
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
            </Link>
          )}
          <Link className={styles.secondaryAction} href="/my/reports">
            내 리포트 목록
          </Link>
        </section>

        <section className={styles.deleteSection}>
          <button
            aria-busy={deleteState === "working"}
            disabled={deleteState === "working"}
            onClick={handleDelete}
            type="button"
          >
            <Trash2 aria-hidden="true" size={16} strokeWidth={1.8} />
            {deleteState === "working" ? "삭제 중" : "이 결과 삭제"}
          </button>
          {deleteState === "error" ? (
            <p role="alert">
              결과를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.
            </p>
          ) : null}
        </section>
      </div>
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
      className={styles.facetItem}
      role="meter"
    >
      <div className={styles.facetMeta}>
        <span>{facet.label}</span>
        <strong>{bounded}%</strong>
      </div>
      <div className={styles.facetTrack}>
        <div>
          <div
            className={styles.facetLow}
            style={{ width: `${leftWidth * 2}%` }}
          />
        </div>
        <div>
          <div
            className={styles.facetHigh}
            style={{ width: `${rightWidth * 2}%` }}
          />
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
