"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  buildFreeTopicResultReport,
  getFreeTopicAssessment,
} from "@/features/assessment/free-topic-assessments";
import {
  loadFreeTopicResultLocalFirst,
  syncFreeTopicResult,
  type StoredFreeTopicResult,
} from "@/features/assessment/free-topic-storage";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";

type FeedShareState =
  | { status: "idle" }
  | { status: "posting" }
  | { message: string; status: "notice" }
  | { message: string; status: "error" };

export function FreeTopicResultView({
  localResultId,
  slug,
}: {
  localResultId: string;
  slug: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<StoredFreeTopicResult | null>(null);
  const [feedShareState, setFeedShareState] = useState<FeedShareState>({
    status: "idle",
  });
  const assessment = getFreeTopicAssessment(slug);

  useEffect(() => {
    let isMounted = true;

    void Promise.resolve().then(() => {
      const nextResult = loadFreeTopicResultLocalFirst(localResultId);
      return nextResult;
    }).then((nextResult) => {
      if (!isMounted) return;
      setResult(nextResult);

      if (nextResult && nextResult.sync.status !== "synced") {
        void syncFreeTopicResult(nextResult).then((syncedResult) => {
          if (isMounted) setResult(syncedResult);
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [localResultId, slug]);

  if (!assessment || !result) {
    return (
      <main className="mx-auto min-h-dvh max-w-[520px] bg-white px-5 py-5">
        <BackLink />
        <section className="mt-6 border-y border-line py-8">
          <h1 className="text-2xl font-black">결과를 찾지 못했어요</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            검사를 다시 진행하면 새 결과를 바로 확인할 수 있어요.
          </p>
        </section>
      </main>
    );
  }

  const activeAssessment = assessment;
  const report = buildFreeTopicResultReport({
    assessment: activeAssessment,
    result: result.result,
  });
  const currentResultPath = `/assessments/topics/${activeAssessment.slug}/result/${localResultId}`;

  async function handleShareToFeed() {
    const body = `${activeAssessment.title} 검사 결과를 공유했어요. ${report.headline}`.slice(
      0,
      800,
    );

    try {
      setFeedShareState({ status: "posting" });
      const response = await fetch("/api/feed", {
        body: JSON.stringify({
          action: "create_post",
          body,
          source: "free_text",
          sourceId: activeAssessment.slug,
          visibility: "public",
        } satisfies FeedWriteRequest),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
      } | null;

      if (response.status === 401) {
        setFeedShareState({
          message: "로그인 후 피드에 공유할 수 있어요.",
          status: "notice",
        });
        router.push(`/login?next=${encodeURIComponent(currentResultPath)}`);
        return;
      }

      if (!response.ok || !payload?.ok) {
        setFeedShareState({
          message: "피드 공유를 완료하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
          status: "error",
        });
        return;
      }

      setFeedShareState({
        message: "피드에 공유했어요.",
        status: "notice",
      });
      router.push("/feed");
      router.refresh();
    } catch {
      setFeedShareState({
        message: "네트워크 연결 때문에 피드 공유를 완료하지 못했어요.",
        status: "error",
      });
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] bg-white px-5 pb-10 pt-5">
      <BackLink />

      <section className="mt-5 border-b border-line pb-6">
        <p className="text-xs font-bold text-primary">
          {assessment.categoryLabel} · {getSyncLabel(result.sync.status)}
        </p>
        <h1 className="mt-4 text-2xl font-black leading-8">{assessment.title} 결과</h1>
        <p className="mt-3 text-[15px] leading-7 text-ink">{report.headline}</p>
      </section>

      <section className="border-b border-line py-6">
        <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-5">
          <div className="min-w-0">
            <h2 className="text-base font-bold">이번 검사 요약</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {report.confidenceCopy}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-muted">{report.confidenceLabel}</p>
            <p className="mt-2 text-[42px] font-black leading-none tabular-nums">
              {report.averageScore ?? "-"}
            </p>
          </div>
        </div>
        <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-muted">
          숫자는 순위나 능력 점수가 아니라, 이번 주제에서 드러난 성향 방향의
          선명도를 0부터 100 사이로 정리한 값이에요.
        </p>
      </section>

      <section className="border-b border-line py-6">
        <h2 className="text-base font-bold">세부 해석</h2>
        <div className="mt-4 divide-y divide-line border-y border-line">
          {report.signals.map((signal) => (
            <article className="py-4" key={signal.label}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-black">{signal.label}</p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {signal.areaLabel} · {signal.roleLabel}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-black tabular-nums">{signal.score}</p>
                  <p className="mt-1 text-xs font-bold text-primary">
                    {signal.levelLabel}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden bg-[#efedf5]">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${signal.score}%` }}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                {signal.interpretation}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-b border-line py-6">
        <h2 className="text-base font-bold">결과를 읽는 기준</h2>
        <div className="mt-4 grid gap-4 text-sm leading-6 text-muted">
          <p>
            이 리포트는 짧은 주제 검사에서 드러난 방향을 정리한 결과예요. 한 번의
            결과만으로 사람을 단정하지 않고, 코어 검사와 여러 주제 검사에서 같은
            흐름이 반복될 때 신뢰도가 높아져요.
          </p>
          <p>
            대표 성향이 바뀌는 경우에도 즉시 바뀌지 않아요. 충분한 누적 데이터가
            같은 방향을 보여줄 때만 현재 대표 성향이 조심스럽게 업데이트됩니다.
          </p>
        </div>
      </section>

      {report.signals.length === 0 && (
        <section className="border-b border-line py-6">
          <h2 className="text-base font-bold">아직 해석할 신호가 부족해요</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            검사를 다시 완료하면 이곳에 세부 해석이 채워져요.
          </p>
        </section>
      )}

      <section className="py-5">
        <div className="grid gap-3">
          <button
            aria-busy={feedShareState.status === "posting"}
            className="inline-flex min-h-12 items-center justify-center bg-[#111111] px-4 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            disabled={feedShareState.status === "posting"}
            onClick={() => void handleShareToFeed()}
            type="button"
          >
            {feedShareState.status === "posting" ? "피드에 공유 중" : "피드에 공유"}
          </button>
          <Link
            className="inline-flex min-h-12 items-center justify-center border border-line px-4 text-sm font-bold"
            href="/my/profile"
          >
            내 성향 변화 보기
          </Link>
          <Link
            className="inline-flex min-h-12 items-center justify-center border border-line px-4 text-sm font-bold"
            href={`/assessments/topics/${assessment.slug}`}
          >
            <RefreshCw aria-hidden="true" className="mr-2" size={16} />
            다시 해보기
          </Link>
        </div>
        {feedShareState.status === "notice" && (
          <p className="mt-3 text-sm leading-6 text-muted" role="status">
            {feedShareState.message}
          </p>
        )}
        {feedShareState.status === "error" && (
          <p className="mt-3 text-sm leading-6 text-muted" role="alert">
            {feedShareState.message}
          </p>
        )}
      </section>
    </main>
  );
}

function BackLink() {
  return (
    <Link
      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted"
      href="/assessments"
    >
      <ArrowLeft size={18} />
      검사
    </Link>
  );
}

function getSyncLabel(status: StoredFreeTopicResult["sync"]["status"]) {
  if (status === "synced") return "동기화 완료";
  if (status === "failed") return "동기화 대기";
  return "저장 완료";
}
