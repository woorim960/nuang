"use client";

import { ArrowLeft, ArrowRight, RotateCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import {
  deleteLocalAttempt,
  listLocalAttempts,
} from "@/features/assessment/assessment-storage";
import { buildPrecisionIntroHref } from "@/features/assessment/precision-entry";
import { CoreResultReportTemplate } from "./CoreResultReportTemplate";
import type {
  CoreResultReportModel,
  CoreResultSelection,
} from "./core-result-report-model";
import { selectLatestCompletedCoreReport } from "./core-result-report-selector";
import { collectValidatedCoreResultCandidates } from "./validated-core-result-candidates";
import styles from "./MyLatestCoreReportView.module.css";

type LoadState =
  | { kind: "loading" }
  | { kind: "account-error-empty" }
  | { kind: "empty" }
  | {
      kind: "selection";
      readIncomplete: boolean;
      selection: CoreResultSelection;
    };

export function MyLatestCoreReportView() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<"error" | "idle" | "working">(
    "idle",
  );

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    setFallbackOpen(false);
    setDeleteState("idle");

    const [localRead, accountRead] = await Promise.all([
      listLocalAttempts()
        .then((attempts) => ({ attempts, state: "ready" as const }))
        .catch(() => ({ attempts: [], state: "error" as const })),
      readAccountResults(),
    ]);
    const collection = collectValidatedCoreResultCandidates({
      accountReadState: accountRead.state,
      accountResults: accountRead.results,
      localAttempts: localRead.attempts,
    });
    const selection = selectLatestCompletedCoreReport(collection);

    if (!selection.latestCompletionRecord) {
      setState({
        kind:
          accountRead.state === "error" || localRead.state === "error"
            ? "account-error-empty"
            : "empty",
      });
      return;
    }

    setState({
      kind: "selection",
      readIncomplete:
        accountRead.state === "error" || localRead.state === "error",
      selection,
    });
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  if (state.kind === "loading") {
    return <LatestReportLoadingState />;
  }

  if (state.kind === "empty" || state.kind === "account-error-empty") {
    return (
      <LatestReportEmptyState
        isError={state.kind === "account-error-empty"}
        onRetry={() => void load()}
      />
    );
  }

  const { selection } = state;
  if (state.readIncomplete && !fallbackOpen) {
    return (
      <LatestReadIncompleteState
        canOpenAvailable={Boolean(selection.latestRenderableReport)}
        onOpenAvailable={() => setFallbackOpen(true)}
        onRetry={() => void load()}
      />
    );
  }
  const latestIsUnavailable =
    selection.selectionReason === "LATEST_UNRENDERABLE_WITH_FALLBACK" ||
    selection.selectionReason === "LATEST_UNRENDERABLE_WITHOUT_FALLBACK";

  if (latestIsUnavailable && !fallbackOpen) {
    return (
      <LatestUnavailableState
        canOpenPrevious={Boolean(selection.latestRenderableReport)}
        onOpenPrevious={() => setFallbackOpen(true)}
      />
    );
  }

  const model = selection.latestRenderableReport;
  if (!model) {
    return (
      <LatestUnavailableState
        canOpenPrevious={false}
        onOpenPrevious={() => undefined}
      />
    );
  }
  const renderModel: CoreResultReportModel = model;

  const precisionHref =
    renderModel.identity.kind === "quick"
      ? buildPrecisionIntroHref({
          backDestination: "/my/reports",
          entrySource: "first-result",
          returnDestination: "/my?tab=reports",
        })
      : null;

  async function handleDelete() {
    if (deleteState === "working") return;
    const confirmed = window.confirm(
      "이 결과를 삭제할까요? 삭제하면 다시 열 수 없고 연결된 공유 주소도 함께 닫혀요.",
    );
    if (!confirmed) return;

    setDeleteState("working");
    try {
      const deletedLocalResultId = await deleteAccountCopy(renderModel);
      const localResultId =
        deletedLocalResultId ?? renderModel.identity.localResultId ?? null;
      if (localResultId) await deleteLocalAttempt(localResultId);
      await load();
    } catch {
      setDeleteState("error");
    }
  }

  return (
    <CoreResultReportTemplate
      backHref="/my?tab=reports"
      deleteError={
        deleteState === "error"
          ? "결과를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요."
          : null
      }
      deletePending={deleteState === "working"}
      model={renderModel}
      onDelete={() => void handleDelete()}
      originalReportKey={
        renderModel.identity.accountResultReportId
          ? `core_${renderModel.identity.accountResultReportId}`
          : undefined
      }
      precisionHref={precisionHref}
      secondaryAction={{ href: "/my/reports/history", label: "지난 결과 보기" }}
      shareEnabled={Boolean(renderModel.identity.accountResultReportId)}
      statusMessage={
        state.readIncomplete
          ? "일부 저장 위치를 확인하지 못해, 현재 확인된 결과를 보여드리고 있어요."
          : selection.selectionReason === "LATEST_UNRENDERABLE_WITH_FALLBACK"
            ? "현재 최신 결과 대신, 안전하게 열 수 있는 이전 결과를 보여드리고 있어요."
            : null
      }
      surface="my"
    />
  );
}

function LatestReportLoadingState() {
  return (
    <main aria-busy="true" className={styles.root}>
      <header className={styles.appBar}>
        <Link aria-label="마이로 돌아가기" href="/my?tab=reports">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.8} />
        </Link>
        <p>결과 리포트</p>
        <span aria-hidden="true" />
      </header>
      <div className={styles.skeleton}>
        <div aria-hidden="true" className={styles.skeletonHero}>
          <span />
          <strong />
          <b />
          <i />
        </div>
        <p aria-live="polite" role="status">
          가장 최근 결과를 불러오고 있어요
        </p>
        <div aria-hidden="true" className={styles.skeletonRows}>
          <span />
          <span />
          <span />
        </div>
      </div>
    </main>
  );
}

function LatestReportEmptyState({
  isError,
  onRetry,
}: {
  isError: boolean;
  onRetry: () => void;
}) {
  return (
    <main className={styles.stateRoot}>
      <header className={styles.appBar}>
        <Link aria-label="마이로 돌아가기" href="/my?tab=reports">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.8} />
        </Link>
        <p>결과 리포트</p>
        <span aria-hidden="true" />
      </header>
      <section className={styles.stateBody}>
        <Image
          alt=""
          aria-hidden="true"
          height={180}
          src="/assets/assessment/nuang-loading-mascot-v2.png"
          width={180}
        />
        <h1>
          {isError ? "결과를 불러오지 못했어요" : "아직 코어 결과가 없어요"}
        </h1>
        <p>
          {isError
            ? "저장된 결과를 확인하지 못했어요. 연결을 확인하고 다시 시도해 주세요."
            : "첫 성향 검사나 정밀 검사를 마치면 가장 최근 리포트가 여기에 보여요."}
        </p>
        {isError ? (
          <button onClick={onRetry} type="button">
            <RotateCw aria-hidden="true" size={17} strokeWidth={1.8} />
            다시 불러오기
          </button>
        ) : (
          <Link href="/home">
            첫 성향 검사 시작하기
            <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
          </Link>
        )}
        <Link className={styles.secondaryLink} href="/my/reports/history">
          지난 기록 확인하기
        </Link>
      </section>
    </main>
  );
}

function LatestUnavailableState({
  canOpenPrevious,
  onOpenPrevious,
}: {
  canOpenPrevious: boolean;
  onOpenPrevious: () => void;
}) {
  return (
    <main className={styles.stateRoot}>
      <header className={styles.appBar}>
        <Link aria-label="마이로 돌아가기" href="/my?tab=reports">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.8} />
        </Link>
        <p>결과 리포트</p>
        <span aria-hidden="true" />
      </header>
      <section className={styles.stateBody}>
        <Image
          alt=""
          aria-hidden="true"
          height={180}
          src="/assets/assessment/nuang-loading-mascot-v2.png"
          width={180}
        />
        <h1>최근 결과를 지금 화면에서 온전히 열기 어려워요</h1>
        <p>
          완료 당시 형식과 현재 리포트가 달라 일부 정보를 안전하게 불러올 수
          없어요.
        </p>
        {canOpenPrevious ? (
          <button onClick={onOpenPrevious} type="button">
            이전에 열 수 있는 결과 보기
          </button>
        ) : (
          <Link href="/home">새 검사 시작하기</Link>
        )}
        <Link className={styles.secondaryLink} href="/my/reports/history">
          전체 기록 보기
        </Link>
      </section>
    </main>
  );
}

function LatestReadIncompleteState({
  canOpenAvailable,
  onOpenAvailable,
  onRetry,
}: {
  canOpenAvailable: boolean;
  onOpenAvailable: () => void;
  onRetry: () => void;
}) {
  return (
    <main className={styles.stateRoot}>
      <header className={styles.appBar}>
        <Link aria-label="마이로 돌아가기" href="/my?tab=reports">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.8} />
        </Link>
        <p>결과 리포트</p>
        <span aria-hidden="true" />
      </header>
      <section className={styles.stateBody}>
        <Image
          alt=""
          aria-hidden="true"
          height={180}
          src="/assets/assessment/nuang-loading-mascot-v2.png"
          width={180}
        />
        <h1>가장 최근 결과인지 확인하지 못했어요</h1>
        <p>
          계정 또는 이 기기의 저장 결과 일부를 불러오지 못했어요. 다시
          확인하거나, 지금 확인된 결과를 열 수 있어요.
        </p>
        <button onClick={onRetry} type="button">
          <RotateCw aria-hidden="true" size={17} strokeWidth={1.8} />
          다시 확인하기
        </button>
        {canOpenAvailable ? (
          <button
            className={styles.secondaryButton}
            onClick={onOpenAvailable}
            type="button"
          >
            지금 확인된 결과 보기
          </button>
        ) : null}
        <Link className={styles.secondaryLink} href="/my/reports/history">
          전체 기록 보기
        </Link>
      </section>
    </main>
  );
}

async function readAccountResults(): Promise<{
  results: AccountResultSummary[];
  state: "error" | "not_requested" | "ready";
}> {
  try {
    const response = await fetch("/api/account-results", {
      cache: "no-store",
      method: "GET",
    });
    const body = (await response.json()) as {
      ok?: boolean;
      results?: AccountResultSummary[];
    };
    if (response.status === 401) {
      return { results: [], state: "not_requested" };
    }
    if (!response.ok || !body.ok || !Array.isArray(body.results)) {
      return { results: [], state: "error" };
    }
    return { results: body.results, state: "ready" };
  } catch {
    return { results: [], state: "error" };
  }
}

async function deleteAccountCopy(model: CoreResultReportModel) {
  if (!model.identity.accountResultReportId) return null;
  const response = await fetch("/api/account-results", {
    body: JSON.stringify({
      resultReportId: model.identity.accountResultReportId,
    }),
    headers: { "content-type": "application/json" },
    method: "DELETE",
  });
  const body = (await response.json()) as {
    ok?: boolean;
    result?: { localResultId?: string | null };
  };
  if (!response.ok || !body.ok) throw new Error("account_result_delete_failed");
  return body.result?.localResultId ?? null;
}
