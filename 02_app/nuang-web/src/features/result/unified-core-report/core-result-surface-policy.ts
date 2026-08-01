import type {
  CoreResultReportModel,
  CoreResultReportSection,
} from "./core-result-report-model";
export type CoreResultReportSurface = "completion" | "my" | "profile" | "share";

export type CoreResultSurfacePolicy = {
  isOwner: boolean;
  showCompletionMetadata: boolean;
  showManagement: boolean;
  showMeasurementDetails: boolean;
};

export function getCoreResultSurfacePolicy(
  surface: CoreResultReportSurface,
): CoreResultSurfacePolicy {
  const isOwner = surface === "completion" || surface === "my";
  return {
    isOwner,
    showCompletionMetadata: isOwner,
    showManagement: isOwner,
    showMeasurementDetails: isOwner,
  };
}

/**
 * 공개 표면에는 코드 수준의 게시 콘텐츠만 남깁니다. 원본 응답을 유추할 수
 * 있는 점수·경계·세부 신호·식별자·버전 정보는 projection 단계에서 제거합니다.
 */
export function projectCoreResultModelForSurface(
  model: CoreResultReportModel,
  surface: CoreResultReportSurface,
): CoreResultReportModel {
  const policy = getCoreResultSurfacePolicy(surface);
  if (policy.isOwner) return model;

  return {
    ...model,
    identity: {
      ...model.identity,
      accountResultReportId: null,
      assessmentAttemptId: null,
      canonicalResultId: "public:projection",
      localResultId: null,
      originResultId: null,
      sourceState: "legacy_partial",
    },
    measurement: {
      assessmentReleaseId: null,
      codeSchemeVersion: null,
      responseSnapshotHash: null,
      resultCopyVersion: null,
      scoringModelVersion: null,
      scoringReleaseId: null,
    },
    result: {
      ...model.result,
      alternativeCodes: [],
      boundaryDomainIds: [],
      domains: [],
      facets: [],
      responseEvidenceStatus: "unknown_legacy",
    },
    sections: model.sections.filter((section) =>
      isSectionAllowedOnSurface(section, surface),
    ),
    completeness: {
      missingFieldCodes: [],
      omittedSectionCodes: ["OWNER_ONLY_MEASUREMENT"],
      state: "partial",
    },
  };
}

function isSectionAllowedOnSurface(
  section: CoreResultReportSection,
  surface: CoreResultReportSurface,
) {
  if (!section.allowedSurfaces.includes(surface)) return false;
  if (surface === "profile") {
    return section.privacyScope === "profile_public";
  }
  if (surface === "share") {
    return section.privacyScope === "share_public";
  }
  return true;
}
