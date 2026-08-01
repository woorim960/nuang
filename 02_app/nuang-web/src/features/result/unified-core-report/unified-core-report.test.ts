import { describe, expect, it } from "vitest";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import { prepareAssessmentCompletion } from "@/features/assessment/assessment-completion";
import { betaCoreAssessment } from "@/features/assessment/beta-core-seed";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import { candidateQuickCoreAssessment } from "@/features/assessment/candidate-quick-core-seed";
import type {
  AssessmentDefinition,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";
import { coreResultCopyVersion } from "@/features/result/report-copy";
import {
  adaptAccountCoreResult,
  adaptPublicCoreResult,
  adaptValidatedLocalCoreResult,
  collectValidatedCoreResultCandidates,
  selectLatestCompletedCoreReport,
  selectRepresentativeCoreResult,
} from "@/features/result/unified-core-report";
import { buildReportContentSnapshot } from "@/features/result/unified-core-report/report-content-snapshot";

describe("unified core result report Gate 1-2", () => {
  it("produces identical measurement facts from one new local/account result", () => {
    const local = buildCompletedAttempt(
      candidateFullCoreAssessment,
      "local_full_parity",
      "2026-07-30T00:00:00.000Z",
    );
    const account = buildAccountResult(local, {
      resultReportId: "11111111-1111-4111-8111-111111111111",
    });
    const localModel = adaptValidatedLocalCoreResult(local);
    const accountModel = adaptAccountCoreResult(account);

    expect(localModel).not.toBeNull();
    expect(accountModel).not.toBeNull();
    expect(accountModel?.measurement).toEqual(localModel?.measurement);
    expect(accountModel?.result.domains).toEqual(localModel?.result.domains);
    expect(accountModel?.result.facets).toEqual(localModel?.result.facets);
    expect(accountModel?.result.alternativeCodes).toEqual(
      localModel?.result.alternativeCodes,
    );
    expect(accountModel?.result.responseEvidenceStatus).toBe(
      localModel?.result.responseEvidenceStatus,
    );
    expect(accountModel?.sections).toEqual(localModel?.sections);
    expect(accountModel?.completeness.state).toBe("complete");
  });

  it("reopens a new account result from its exact completion content snapshot", () => {
    const local = buildCompletedAttempt(
      candidateFullCoreAssessment,
      "local_full_snapshot",
      "2026-07-30T00:00:00.000Z",
    );
    const account = buildAccountResult(local, {
      resultReportId: "10111111-1111-4111-8111-111111111111",
    });
    account.reportContentSnapshot = buildReportContentSnapshot({
      code: account.profileCode,
      kind: account.kind,
      measurementVersion: account.resultCopyVersion!,
    });

    const model = adaptAccountCoreResult(account);

    expect(model?.interpretation).toMatchObject({
      contentResolution: "completion_snapshot",
      manifestDigest: account.reportContentSnapshot.manifestDigest,
      traitMapBaselineId: account.reportContentSnapshot.traitMapBaselineId,
    });
    expect(model?.sections).toHaveLength(
      account.reportContentSnapshot.sections.length,
    );
  });

  it("deduplicates only a verified origin and keeps the account route canonical", () => {
    const local = buildCompletedAttempt(
      candidateFullCoreAssessment,
      "local_full_merge",
      "2026-07-30T00:00:00.000Z",
    );
    const account = buildAccountResult(local, {
      resultReportId: "22222222-2222-4222-8222-222222222222",
    });
    const collection = collectValidatedCoreResultCandidates({
      accountReadState: "ready",
      accountResults: [account],
      localAttempts: [local],
    });

    expect(collection.candidates).toHaveLength(1);
    expect(collection.candidates[0]).toMatchObject({
      renderable: true,
      source: "account",
      stableId: "account:22222222-2222-4222-8222-222222222222",
    });
    expect(collection.candidates[0]?.model?.identity).toMatchObject({
      canonicalResultId: "account:22222222-2222-4222-8222-222222222222",
      sourceState: "merged",
    });
  });

  it("rejects duplicated or code-inconsistent account measurement structures", () => {
    const local = buildCompletedAttempt(
      candidateFullCoreAssessment,
      "local_structural_source",
      "2026-07-30T00:00:00.000Z",
    );
    const valid = buildAccountResult(local, {
      resultReportId: "12111111-1111-4111-8111-111111111111",
    });
    const duplicatedDomain = valid.domains[0]!;
    const tampered: AccountResultSummary = {
      ...valid,
      domains: valid.domains.map(() => ({ ...duplicatedDomain })),
    };

    const model = adaptAccountCoreResult(tampered);

    expect(model?.completeness.state).toBe("unsupported");
    expect(model?.completeness.missingFieldCodes).toContain(
      "DOMAIN_STRUCTURE_INVALID",
    );
    expect(
      collectValidatedCoreResultCandidates({
        accountReadState: "ready",
        accountResults: [tampered],
      }).candidates[0]?.renderable,
    ).toBe(false);
  });

  it("does not merge records merely because their code and time match", () => {
    const local = buildCompletedAttempt(
      candidateFullCoreAssessment,
      "local_full_distinct",
      "2026-07-30T00:00:00.000Z",
    );
    const account = {
      ...buildAccountResult(local, {
        resultReportId: "33333333-3333-4333-8333-333333333333",
      }),
      localResultId: null,
      originResultId: null,
      responseSnapshotHash: null,
    };
    const collection = collectValidatedCoreResultCandidates({
      accountReadState: "ready",
      accountResults: [account],
      localAttempts: [local],
    });

    expect(collection.candidates).toHaveLength(2);
  });

  it("separates latest completion from the full-first representative policy", () => {
    const full = buildCompletedAttempt(
      candidateFullCoreAssessment,
      "local_full_old",
      "2026-07-01T00:00:00.000Z",
    );
    const quick = buildCompletedAttempt(
      candidateQuickCoreAssessment,
      "local_quick_new",
      "2026-07-30T00:00:00.000Z",
    );
    const collection = collectValidatedCoreResultCandidates({
      localAttempts: [full, quick],
    });
    const latest = selectLatestCompletedCoreReport(collection);
    const representative = selectRepresentativeCoreResult(collection);

    expect(latest.latestRenderableReport?.identity.localResultId).toBe(
      "local_quick_new",
    );
    expect(representative?.identity.localResultId).toBe("local_full_old");
  });

  it("surfaces a damaged latest completion and returns an older renderable fallback", () => {
    const older = buildCompletedAttempt(
      candidateFullCoreAssessment,
      "local_full_valid",
      "2026-07-01T00:00:00.000Z",
    );
    const damaged = buildCompletedAttempt(
      candidateQuickCoreAssessment,
      "local_quick_damaged",
      "2026-07-30T00:00:00.000Z",
    );
    damaged.resultSnapshot = {
      ...damaged.resultSnapshot!,
      responseSnapshotHash: "fnv1a32x2:tampered",
    };
    const selection = selectLatestCompletedCoreReport(
      collectValidatedCoreResultCandidates({
        localAttempts: [older, damaged],
      }),
    );

    expect(selection.selectionReason).toBe("LATEST_UNRENDERABLE_WITH_FALLBACK");
    expect(selection.latestCompletionRecord).toMatchObject({
      model: null,
      stableId: "local:local_quick_damaged",
    });
    expect(selection.latestCompletionRecord?.diagnosticCodes).toContain(
      "INVALID_LOCAL_SNAPSHOT",
    );
    expect(selection.latestRenderableReport?.identity.localResultId).toBe(
      "local_full_valid",
    );
  });

  it("marks missing legacy fields without inferring ready or evidence state", () => {
    const local = buildCompletedAttempt(
      candidateFullCoreAssessment,
      "local_legacy_source",
      "2026-07-01T00:00:00.000Z",
    );
    const complete = buildAccountResult(local, {
      resultReportId: "44444444-4444-4444-8444-444444444444",
    });
    const legacy: AccountResultSummary = {
      assessmentAttemptId: complete.assessmentAttemptId,
      completedAt: complete.completedAt,
      createdAt: complete.createdAt,
      domains: complete.domains.map((domain) => ({
        domainId: domain.domainId,
        label: domain.label,
        score: domain.score,
        symbol: domain.symbol,
      })),
      facets: complete.facets.map((facet) => ({
        facetId: facet.facetId,
        label: facet.label,
        score: facet.score,
        status: facet.status,
      })),
      kind: complete.kind,
      localResultId: null,
      profileCode: complete.profileCode,
      profileName: complete.profileName,
      resultLabel: complete.resultLabel,
      resultReportId: complete.resultReportId,
    };
    const model = adaptAccountCoreResult(legacy);
    const collection = collectValidatedCoreResultCandidates({
      accountReadState: "ready",
      accountResults: [legacy],
    });

    expect(model?.identity.sourceState).toBe("legacy_partial");
    expect(model?.result.responseEvidenceStatus).toBe("unknown_legacy");
    expect(model?.completeness.state).toBe("partial");
    expect(model?.result.domains).toEqual([]);
    expect(model?.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sectionId: "life_contexts",
          sourceClass: "current_customer_guide",
        }),
      ]),
    );
    expect(collection.candidates[0]?.renderable).toBe(true);
    expect(collection.candidates[0]?.diagnosticCodes).toContain(
      "LEGACY_FIELDS_MISSING",
    );
    expect(collection.candidates[0]?.diagnosticCodes).toContain(
      "RESULT_NOT_READY",
    );
  });

  it("keeps a cryptographically validated candidate-beta snapshot as a limited report", () => {
    const beta = buildCompletedAttempt(
      betaCoreAssessment,
      "local_beta_valid",
      "2026-06-30T00:00:00.000Z",
    );
    const collection = collectValidatedCoreResultCandidates({
      localAttempts: [beta],
    });

    expect(collection.candidates[0]?.model?.completeness.state).toBe("partial");
    expect(collection.candidates[0]?.model?.identity.sourceState).toBe(
      "legacy_partial",
    );
    expect(collection.candidates[0]?.renderable).toBe(true);
    expect(selectRepresentativeCoreResult(collection)?.result.code).toBe(
      beta.resultSnapshot?.scoreResult.code,
    );
  });

  it("distinguishes an account API failure from an empty result list", () => {
    const failed = collectValidatedCoreResultCandidates({
      accountReadState: "error",
    });
    const empty = collectValidatedCoreResultCandidates({
      accountReadState: "ready",
    });

    expect(failed.diagnosticCodes).toContain("ACCOUNT_RESULTS_READ_FAILED");
    expect(empty.diagnosticCodes).not.toContain("ACCOUNT_RESULTS_READ_FAILED");
    expect(selectLatestCompletedCoreReport(empty).selectionReason).toBe(
      "NO_CORE_RESULT",
    );
  });

  it("keeps owner-only identity and measurement out of the public adapter", () => {
    const model = adaptPublicCoreResult({
      completedAt: "2026-07-30T00:00:00.000Z",
      kind: "full",
      profileCode: "ERGKC",
      profileName: "완료 당시 이름",
      resultReportId: "55555555-5555-4555-8555-555555555555",
    });

    expect(model?.identity).toMatchObject({
      accountResultReportId: null,
      assessmentAttemptId: null,
      canonicalResultId: "public:projection",
      localResultId: null,
      originResultId: null,
    });
    expect(model?.measurement.responseSnapshotHash).toBeNull();
    expect(model?.result.domains).toEqual([]);
    expect(model?.result.facets).toEqual([]);
    expect(model?.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          allowedSurfaces: ["profile"],
          privacyScope: "profile_public",
          sourceClass: "current_customer_guide",
        }),
        expect.objectContaining({
          allowedSurfaces: ["share"],
          privacyScope: "share_public",
          sourceClass: "current_customer_guide",
        }),
      ]),
    );
  });
});

function buildCompletedAttempt(
  assessment: AssessmentDefinition,
  id: string,
  completedAt: string,
): LocalAssessmentAttempt {
  const responses = Object.fromEntries(
    assessment.items.map((item, index) => [
      item.itemId,
      {
        answeredAt: new Date(
          Date.parse(completedAt) + index * 1000,
        ).toISOString(),
        itemId: item.itemId,
        value: (item.isReverse ? 1 : 5) as 1 | 5,
      },
    ]),
  );
  const draft: LocalAssessmentAttempt = {
    assessmentId: assessment.assessmentId,
    completedAt,
    createdAt: completedAt,
    currentIndex: assessment.items.length - 1,
    expiresAt: completedAt,
    id,
    itemIds: assessment.items.map((item) => item.itemId),
    localPersistStatus: "saved",
    mode: assessment.mode,
    releaseId: assessment.releaseId,
    responses,
    state: "completed",
    updatedAt: completedAt,
  };
  const readiness = prepareAssessmentCompletion(assessment, draft);

  return {
    ...draft,
    completionStatus: "completed",
    responseSnapshotHash: readiness.responseSnapshotHash,
    resultCopyVersion: coreResultCopyVersion,
    resultEvidenceStatus: readiness.evidenceStatus,
    resultSnapshot: {
      ...readiness.versionBundle,
      createdAt: completedAt,
      responseSnapshotHash: readiness.responseSnapshotHash,
      resultCopyVersion: coreResultCopyVersion,
      resultStatus: "ready",
      scoreResult: readiness.result,
    },
  };
}

function buildAccountResult(
  attempt: LocalAssessmentAttempt,
  { resultReportId }: { resultReportId: string },
): AccountResultSummary {
  const snapshot = attempt.resultSnapshot!;

  return {
    alternativeCodes: [...snapshot.scoreResult.alternativeCodes],
    assessmentAttemptId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    completedAt: attempt.completedAt!,
    createdAt: attempt.completedAt!,
    domains: snapshot.scoreResult.domains.map((domain) => ({ ...domain })),
    facets: snapshot.scoreResult.facets.map((facet) => ({ ...facet })),
    kind: attempt.mode,
    localResultId: attempt.id,
    originResultId: attempt.id,
    profileCode: snapshot.scoreResult.code!,
    profileName: snapshot.scoreResult.profileName!,
    reportContentSnapshot: null,
    responseSnapshotHash: snapshot.responseSnapshotHash,
    resultCopyVersion: snapshot.resultCopyVersion,
    resultEvidenceStatus: attempt.resultEvidenceStatus!,
    resultLabel: attempt.mode === "full" ? "정밀 성향 결과" : "첫 성향 결과",
    resultReportId,
    resultStatus: "ready",
    versionBundle: {
      assessmentReleaseId: snapshot.assessmentReleaseId,
      codeSchemeVersion: snapshot.codeSchemeVersion,
      scoringModelVersion: snapshot.scoringModelVersion,
      scoringReleaseId: snapshot.scoringReleaseId,
    },
  };
}
