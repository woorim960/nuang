import type { AccountResultSummary } from "@/features/account/account-result-contract";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import {
  adaptAccountCoreResult,
  adaptValidatedLocalCoreResult,
  isRenderableCoreResultModel,
} from "@/features/result/unified-core-report/core-result-report-adapter";
import type {
  CoreResultCandidate,
  CoreResultCandidateCollection,
  CoreResultCandidateDiagnosticCode,
  CoreResultReportModel,
} from "@/features/result/unified-core-report/core-result-report-model";

export type CollectValidatedCoreResultCandidatesInput = {
  accountReadState?: "ready" | "not_requested" | "error";
  accountResults?: readonly AccountResultSummary[];
  localAttempts?: readonly LocalAssessmentAttempt[];
};

type InternalCandidate = CoreResultCandidate & {
  identityKeys: string[];
};

export function collectValidatedCoreResultCandidates({
  accountReadState = "not_requested",
  accountResults = [],
  localAttempts = [],
}: CollectValidatedCoreResultCandidatesInput): CoreResultCandidateCollection {
  const diagnostics: CoreResultCandidateDiagnosticCode[] = [];

  if (accountReadState === "error") {
    diagnostics.push("ACCOUNT_RESULTS_READ_FAILED");
  }

  const accountCandidates =
    accountReadState === "error"
      ? []
      : accountResults.map(buildAccountCandidate);
  const localCandidates = localAttempts.flatMap((attempt) => {
    if (!isCompletedCoreAttempt(attempt)) return [];

    if (!attempt.completedAt) {
      diagnostics.push("INVALID_LOCAL_SNAPSHOT");
      return [];
    }

    return [buildLocalCandidate(attempt)];
  });
  const merged = mergeStrictOriginCopies(accountCandidates, localCandidates);

  return {
    accountReadState,
    candidates: merged.candidates.map(stripInternalFields),
    diagnosticCodes: uniqueDiagnostics([
      ...diagnostics,
      ...merged.diagnosticCodes,
    ]),
  };
}

function buildAccountCandidate(
  result: AccountResultSummary,
): InternalCandidate {
  const model = adaptAccountCoreResult(result);
  const diagnosticCodes: CoreResultCandidateDiagnosticCode[] = [];

  if (!model) diagnosticCodes.push("UNKNOWN_PROFILE_CODE");
  if (result.resultStatus !== "ready") {
    diagnosticCodes.push("RESULT_NOT_READY");
  }
  if (model?.completeness.state === "partial") {
    diagnosticCodes.push("LEGACY_FIELDS_MISSING");
  }
  if (model?.completeness.state === "unsupported") {
    diagnosticCodes.push("UNSUPPORTED_RELEASE");
  }

  return {
    completedAt: result.completedAt,
    diagnosticCodes: uniqueDiagnostics(diagnosticCodes),
    identityKeys: buildAccountIdentityKeys(result),
    kind: result.kind,
    model,
    renderable: Boolean(
      model &&
      (result.resultStatus === "ready" ||
        (result.resultStatus === undefined &&
          model.identity.sourceState === "legacy_partial")) &&
      isRenderableCoreResultModel(model),
    ),
    source: "account",
    stableId: `account:${result.resultReportId}`,
  };
}

function buildLocalCandidate(
  attempt: LocalAssessmentAttempt,
): InternalCandidate {
  const model = adaptValidatedLocalCoreResult(attempt);
  const diagnosticCodes: CoreResultCandidateDiagnosticCode[] = [];

  if (!model) diagnosticCodes.push("INVALID_LOCAL_SNAPSHOT");
  if (model?.completeness.state === "partial") {
    diagnosticCodes.push("LEGACY_FIELDS_MISSING");
  }
  if (model?.completeness.state === "unsupported") {
    diagnosticCodes.push("UNSUPPORTED_RELEASE");
  }

  return {
    completedAt: attempt.completedAt!,
    diagnosticCodes: uniqueDiagnostics(diagnosticCodes),
    identityKeys: uniqueStrings([
      `origin:${attempt.id}`,
      ...(model?.measurement.responseSnapshotHash &&
      model.measurement.assessmentReleaseId
        ? [
            `snapshot:${model.measurement.assessmentReleaseId}:${model.measurement.responseSnapshotHash}`,
          ]
        : []),
    ]),
    kind: attempt.mode,
    model,
    renderable: Boolean(model && isRenderableCoreResultModel(model)),
    source: "local",
    stableId: `local:${attempt.id}`,
  };
}

function mergeStrictOriginCopies(
  accountCandidates: InternalCandidate[],
  localCandidates: InternalCandidate[],
) {
  const remainingLocal = new Set(localCandidates);
  const candidates: InternalCandidate[] = [];
  const diagnosticCodes: CoreResultCandidateDiagnosticCode[] = [];

  for (const accountCandidate of accountCandidates) {
    const localCandidate = localCandidates.find(
      (candidate) =>
        remainingLocal.has(candidate) &&
        hasSharedIdentityKey(accountCandidate, candidate),
    );

    if (!localCandidate) {
      candidates.push(accountCandidate);
      continue;
    }

    if (!canSafelyMerge(accountCandidate.model, localCandidate.model)) {
      const conflict = uniqueDiagnostics([
        ...accountCandidate.diagnosticCodes,
        "IDENTITY_CONFLICT",
      ]);
      candidates.push({ ...accountCandidate, diagnosticCodes: conflict });
      diagnosticCodes.push("IDENTITY_CONFLICT");
      continue;
    }

    remainingLocal.delete(localCandidate);
    candidates.push(
      buildMergedCandidate(
        accountCandidate,
        localCandidate,
        localCandidate.model!,
      ),
    );
  }

  candidates.push(
    ...localCandidates.filter((candidate) => remainingLocal.has(candidate)),
  );

  return { candidates, diagnosticCodes };
}

function buildMergedCandidate(
  accountCandidate: InternalCandidate,
  localCandidate: InternalCandidate,
  trustedLocalModel: CoreResultReportModel,
): InternalCandidate {
  const accountModel = accountCandidate.model!;
  const model: CoreResultReportModel = {
    ...trustedLocalModel,
    identity: {
      ...trustedLocalModel.identity,
      accountResultReportId: accountModel.identity.accountResultReportId,
      assessmentAttemptId: accountModel.identity.assessmentAttemptId,
      canonicalResultId: accountModel.identity.canonicalResultId,
      localResultId:
        accountModel.identity.localResultId ??
        trustedLocalModel.identity.localResultId,
      originResultId:
        accountModel.identity.originResultId ??
        trustedLocalModel.identity.originResultId,
      sourceState: "merged",
    },
    interpretation:
      accountModel.interpretation.contentResolution === "completion_snapshot"
        ? accountModel.interpretation
        : trustedLocalModel.interpretation,
  };

  return {
    completedAt: model.identity.completedAt,
    diagnosticCodes: uniqueDiagnostics([
      ...accountCandidate.diagnosticCodes.filter(
        (code) =>
          code !== "LEGACY_FIELDS_MISSING" && code !== "RESULT_NOT_READY",
      ),
      ...localCandidate.diagnosticCodes,
    ]),
    identityKeys: uniqueStrings([
      ...accountCandidate.identityKeys,
      ...localCandidate.identityKeys,
    ]),
    kind: model.identity.kind,
    model,
    renderable: isRenderableCoreResultModel(model),
    source: "account",
    stableId: model.identity.canonicalResultId,
  };
}

function canSafelyMerge(
  accountModel: CoreResultReportModel | null,
  localModel: CoreResultReportModel | null,
) {
  if (!accountModel || !localModel) return false;
  if (
    accountModel.identity.kind !== localModel.identity.kind ||
    accountModel.identity.completedAt !== localModel.identity.completedAt ||
    accountModel.result.code !== localModel.result.code
  ) {
    return false;
  }

  const versionKeys = [
    "assessmentReleaseId",
    "codeSchemeVersion",
    "scoringModelVersion",
    "scoringReleaseId",
  ] as const;
  if (
    versionKeys.some((key) => {
      const accountValue = accountModel.measurement[key];
      return (
        accountValue !== null && accountValue !== localModel.measurement[key]
      );
    })
  ) {
    return false;
  }

  if (
    accountModel.measurement.responseSnapshotHash &&
    accountModel.measurement.responseSnapshotHash !==
      localModel.measurement.responseSnapshotHash
  ) {
    return false;
  }

  return (
    hasNoDomainConflict(accountModel, localModel) &&
    hasNoFacetConflict(accountModel, localModel) &&
    (accountModel.result.responseEvidenceStatus === "unknown_legacy" ||
      accountModel.result.responseEvidenceStatus ===
        localModel.result.responseEvidenceStatus)
  );
}

function hasNoDomainConflict(
  accountModel: CoreResultReportModel,
  localModel: CoreResultReportModel,
) {
  return accountModel.result.domains.every((accountDomain) => {
    const localDomain = localModel.result.domains.find(
      (domain) => domain.domainId === accountDomain.domainId,
    );
    return (
      localDomain &&
      accountDomain.domainId === localDomain.domainId &&
      accountDomain.isBoundary === localDomain.isBoundary &&
      accountDomain.label === localDomain.label &&
      accountDomain.score === localDomain.score &&
      accountDomain.status === localDomain.status &&
      accountDomain.symbol === localDomain.symbol
    );
  });
}

function hasNoFacetConflict(
  accountModel: CoreResultReportModel,
  localModel: CoreResultReportModel,
) {
  return accountModel.result.facets.every((accountFacet) => {
    const localFacet = localModel.result.facets.find(
      (facet) => facet.facetId === accountFacet.facetId,
    );
    return (
      localFacet &&
      accountFacet.facetId === localFacet.facetId &&
      accountFacet.label === localFacet.label &&
      accountFacet.score === localFacet.score &&
      accountFacet.status === localFacet.status &&
      accountFacet.validResponses === localFacet.validResponses
    );
  });
}

function buildAccountIdentityKeys(result: AccountResultSummary) {
  const keys = [
    result.originResultId ? `origin:${result.originResultId}` : null,
    result.localResultId ? `origin:${result.localResultId}` : null,
    result.responseSnapshotHash && result.versionBundle?.assessmentReleaseId
      ? `snapshot:${result.versionBundle.assessmentReleaseId}:${result.responseSnapshotHash}`
      : null,
  ];

  return uniqueStrings(keys.flatMap((key) => (key ? [key] : [])));
}

function hasSharedIdentityKey(
  left: InternalCandidate,
  right: InternalCandidate,
) {
  const rightKeys = new Set(right.identityKeys);
  return left.identityKeys.some((key) => rightKeys.has(key));
}

function isCompletedCoreAttempt(attempt: LocalAssessmentAttempt) {
  return (
    attempt.state === "completed" &&
    (attempt.assessmentId === "nu-core-quick" ||
      attempt.assessmentId === "nu-core-full" ||
      attempt.assessmentId === "nu-core-beta")
  );
}

function stripInternalFields(
  candidate: InternalCandidate,
): CoreResultCandidate {
  return {
    completedAt: candidate.completedAt,
    diagnosticCodes: candidate.diagnosticCodes,
    kind: candidate.kind,
    model: candidate.model,
    renderable: candidate.renderable,
    source: candidate.source,
    stableId: candidate.stableId,
  };
}

function uniqueDiagnostics(values: CoreResultCandidateDiagnosticCode[]) {
  return Array.from(new Set(values));
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}
