import type { DomainScore, FacetScore } from "@/lib/scoring/types";
import type { ReportContentSnapshot } from "./report-content-snapshot-contract";

export type CoreResultKind = "quick" | "full";

export type CoreResultVersionBundle = {
  assessmentReleaseId: string;
  scoringReleaseId: string;
  scoringModelVersion: string;
  codeSchemeVersion: string;
};

export type CoreResultReportSection = {
  canonicalVariantId: string | null;
  canonicalVersion: number | null;
  sectionId: string;
  sourceClass:
    | "measurement"
    | "current_customer_guide"
    | "approved_canonical"
    | "reflection_prompt";
  contentKey: string;
  contentVersion: string;
  requiredSignals: string[];
  privacyScope: "owner_only" | "profile_public" | "share_public";
  allowedSurfaces: Array<"completion" | "my" | "profile" | "share">;
  availability: "render" | "omit";
  omissionCode: string | null;
};

export type { ReportContentSnapshot };

export type CoreResultReportModel = {
  identity: {
    canonicalResultId: string;
    originResultId: string | null;
    accountResultReportId: string | null;
    localResultId: string | null;
    assessmentAttemptId: string | null;
    kind: CoreResultKind;
    completedAt: string;
    sourceState: "account" | "local" | "merged" | "legacy_partial";
  };
  measurement: {
    assessmentReleaseId: string | null;
    scoringReleaseId: string | null;
    scoringModelVersion: string | null;
    codeSchemeVersion: string | null;
    resultCopyVersion: string | null;
    responseSnapshotHash: string | null;
  };
  result: {
    code: string;
    profileNameAtCompletion: string | null;
    currentProfileName: string;
    profileNameReleaseId: string | null;
    profileNameValidationState:
      "legacy_published" | "product_published" | "user_validated";
    responseEvidenceStatus:
      "clear" | "near_boundary" | "insufficient_evidence" | "unknown_legacy";
    boundaryDomainIds: string[];
    domains: DomainScore[];
    facets: FacetScore[];
    alternativeCodes: string[];
  };
  interpretation: {
    traitMapBaselineId: string | null;
    guideVersion: string | null;
    excerptManifestDigest: string | null;
    manifestDigest: string | null;
    canonicalRefs: Array<{
      canonicalVariantId: string;
      version: number;
      contentKey: string;
    }>;
    contentResolution:
      | "completion_snapshot"
      | "current_customer_guide_fallback"
      | "legacy_limited";
  };
  sections: CoreResultReportSection[];
  completeness: {
    state: "complete" | "partial" | "unsupported";
    missingFieldCodes: string[];
    omittedSectionCodes: string[];
  };
};

export type CoreResultCandidateDiagnosticCode =
  | "ACCOUNT_RESULTS_READ_FAILED"
  | "IDENTITY_CONFLICT"
  | "INVALID_LOCAL_SNAPSHOT"
  | "LEGACY_FIELDS_MISSING"
  | "RESULT_NOT_READY"
  | "UNSUPPORTED_RELEASE"
  | "UNKNOWN_PROFILE_CODE";

export type CoreResultCandidate = {
  completedAt: string;
  diagnosticCodes: CoreResultCandidateDiagnosticCode[];
  kind: CoreResultKind;
  model: CoreResultReportModel | null;
  renderable: boolean;
  source: "account" | "local";
  stableId: string;
};

export type CoreResultCandidateCollection = {
  accountReadState: "ready" | "not_requested" | "error";
  candidates: CoreResultCandidate[];
  diagnosticCodes: CoreResultCandidateDiagnosticCode[];
};

export type CoreResultSelection = {
  diagnosticCodes: CoreResultCandidateDiagnosticCode[];
  latestCompletionRecord: CoreResultCandidate | null;
  latestRenderableReport: CoreResultReportModel | null;
  selectionReason:
    | "NO_CORE_RESULT"
    | "LATEST_RENDERABLE"
    | "LATEST_UNRENDERABLE_WITH_FALLBACK"
    | "LATEST_UNRENDERABLE_WITHOUT_FALLBACK";
};
