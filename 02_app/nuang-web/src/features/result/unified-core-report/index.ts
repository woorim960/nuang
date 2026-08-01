export {
  adaptAccountCoreResult,
  adaptPublicCoreResult,
  adaptValidatedLocalCoreResult,
  isRenderableCoreResultModel,
  type PublicCoreResultProjection,
} from "@/features/result/unified-core-report/core-result-report-adapter";
export {
  selectLatestCompletedCoreReport,
  selectLatestCoreResult,
  selectRepresentativeCoreResult,
} from "@/features/result/unified-core-report/core-result-report-selector";
export {
  buildReleaseOneOwnerSections,
  buildReleaseOnePublicSections,
  getReleaseOneOmissionCodes,
} from "@/features/result/unified-core-report/core-result-section-contract";
export type {
  CoreResultCandidate,
  CoreResultCandidateCollection,
  CoreResultCandidateDiagnosticCode,
  CoreResultKind,
  CoreResultReportModel,
  CoreResultReportSection,
  CoreResultSelection,
  CoreResultVersionBundle,
  ReportContentSnapshot,
} from "@/features/result/unified-core-report/core-result-report-model";
export {
  collectValidatedCoreResultCandidates,
  type CollectValidatedCoreResultCandidatesInput,
} from "@/features/result/unified-core-report/validated-core-result-candidates";
