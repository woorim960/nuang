import type {
  CoreResultCandidate,
  CoreResultCandidateCollection,
  CoreResultReportModel,
  CoreResultSelection,
} from "@/features/result/unified-core-report/core-result-report-model";

export function selectLatestCompletedCoreReport(
  collection: CoreResultCandidateCollection,
): CoreResultSelection {
  const sorted = sortCandidates(collection.candidates);
  const latestCompletionRecord = sorted[0] ?? null;
  const latestRenderableReport =
    sorted.find((candidate) => candidate.renderable && candidate.model)
      ?.model ?? null;
  const selectionReason = !latestCompletionRecord
    ? "NO_CORE_RESULT"
    : latestCompletionRecord.renderable && latestCompletionRecord.model
      ? "LATEST_RENDERABLE"
      : latestRenderableReport
        ? "LATEST_UNRENDERABLE_WITH_FALLBACK"
        : "LATEST_UNRENDERABLE_WITHOUT_FALLBACK";

  return {
    diagnosticCodes: Array.from(
      new Set([
        ...collection.diagnosticCodes,
        ...(latestCompletionRecord?.diagnosticCodes ?? []),
      ]),
    ),
    latestCompletionRecord,
    latestRenderableReport,
    selectionReason,
  };
}

export const selectLatestCoreResult = selectLatestCompletedCoreReport;

export function selectRepresentativeCoreResult(
  collection: CoreResultCandidateCollection,
): CoreResultReportModel | null {
  const renderable = sortCandidates(collection.candidates).filter(
    (
      candidate,
    ): candidate is CoreResultCandidate & { model: CoreResultReportModel } =>
      candidate.renderable && Boolean(candidate.model),
  );

  return (
    renderable.find((candidate) => candidate.kind === "full")?.model ??
    renderable[0]?.model ??
    null
  );
}

function sortCandidates(candidates: readonly CoreResultCandidate[]) {
  return [...candidates].sort((left, right) => {
    const completedAtOrder = right.completedAt.localeCompare(left.completedAt);
    if (completedAtOrder !== 0) return completedAtOrder;

    const kindOrder =
      Number(right.kind === "full") - Number(left.kind === "full");
    if (kindOrder !== 0) return kindOrder;

    const sourceOrder =
      Number(right.source === "account") - Number(left.source === "account");
    if (sourceOrder !== 0) return sourceOrder;

    return left.stableId.localeCompare(right.stableId);
  });
}
