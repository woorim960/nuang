import { describe, expect, it } from "vitest";
import {
  candidateFullCoreAssessment,
  candidateFullScoringRelease,
} from "@/features/assessment/candidate-full-core-seed";
import {
  deriveTrustedClaimResult,
  type TrustedClaimPayload,
} from "@/features/account/server-result-claim";
import { buildTrustedResultSummary } from "@/features/account/server-writes";
import { coreResultCopyVersion } from "@/features/result/report-copy";

const completedAt = "2026-07-28T00:00:00.000Z";

function buildPayload(): TrustedClaimPayload {
  return {
    assessmentKind: "full",
    localResultId: "local_server_score_test",
    responses: candidateFullCoreAssessment.items.map((item, index) => ({
      answeredAt: new Date(
        Date.parse(completedAt) + index * 1000,
      ).toISOString(),
      itemId: item.itemId,
      value: item.isReverse ? 1 : 5,
    })),
    resultSummary: { completedAt },
    versionBundle: {
      assessmentReleaseId: candidateFullCoreAssessment.releaseId,
      codeSchemeVersion: candidateFullScoringRelease.codeSchemeVersion,
      scoringModelVersion: candidateFullScoringRelease.scoringModelVersion,
      scoringReleaseId: candidateFullScoringRelease.scoringReleaseId,
    },
  };
}

describe("deriveTrustedClaimResult", () => {
  it("recalculates a complete response snapshot on the server", () => {
    const result = deriveTrustedClaimResult(buildPayload());

    expect(result?.profileCode).toHaveLength(5);
    expect(result?.profileName).toBeTruthy();
    expect(result?.domains).toHaveLength(5);
    expect(result?.facets.every((facet) => facet.validResponses > 0)).toBe(
      true,
    );
    expect(result?.evidenceStatus).toBe("clear");
    expect(result?.responseSnapshotHash).toMatch(/^fnv1a32x2:/);
    expect(result?.resultCopyVersion).toBe(coreResultCopyVersion);
    expect(result?.resultStatus).toBe("ready");
    expect(result?.responseRows).toHaveLength(
      candidateFullCoreAssessment.items.length,
    );
  });

  it("stores the trusted boundary, origin, evidence, and version contract", () => {
    const payload = buildPayload();
    const trusted = deriveTrustedClaimResult(payload);

    expect(trusted).not.toBeNull();
    if (!trusted) return;
    const summary = buildTrustedResultSummary(payload, trusted);

    expect(summary).toMatchObject({
      alternativeCodes: trusted.alternativeCodes,
      originResultId: payload.localResultId,
      reportContentSnapshot: expect.objectContaining({
        excerptManifestDigest: expect.stringMatching(/^fnv1a32x2:/),
        guideVersion: expect.any(String),
        manifestDigest: "NUANG-RESULT-SUMMARY-PUBLICATION-CLOSED-2.3.0",
        profileNameReleaseId: "NUANG-PROFILE-NAME-CANDIDATE-3.0",
        schemaVersion: "nuang-core-result-content-snapshot.v2",
        surface: "owner_report",
      }),
      responseSnapshotHash: trusted.responseSnapshotHash,
      resultCopyVersion: coreResultCopyVersion,
      resultEvidenceStatus: trusted.evidenceStatus,
      resultStatus: "ready",
      versionBundle: trusted.trustedRelease,
    });
    expect(summary.domains.every((domain) => "isBoundary" in domain)).toBe(
      true,
    );
    expect(summary.facets.every((facet) => "validResponses" in facet)).toBe(
      true,
    );
    expect(JSON.stringify(summary)).not.toContain("responses");
  });

  it("ignores client supplied profile claims", () => {
    const payload = {
      ...buildPayload(),
      resultSummary: {
        completedAt,
        profileCode: "XXXXX",
        profileName: "조작된 결과",
      },
    };
    const result = deriveTrustedClaimResult(payload);

    expect(result?.profileCode).not.toBe("XXXXX");
    expect(result?.profileName).not.toBe("조작된 결과");
  });

  it("rejects missing, duplicate, and unknown responses", () => {
    const complete = buildPayload();

    expect(
      deriveTrustedClaimResult({
        ...complete,
        responses: complete.responses.slice(1),
      }),
    ).toBeNull();
    expect(
      deriveTrustedClaimResult({
        ...complete,
        responses: [...complete.responses, complete.responses[0]],
      }),
    ).toBeNull();
    expect(
      deriveTrustedClaimResult({
        ...complete,
        responses: [
          ...complete.responses.slice(0, -1),
          {
            answeredAt: completedAt,
            itemId: "UNKNOWN-ITEM",
            value: 5,
          },
        ],
      }),
    ).toBeNull();
  });

  it("rejects a mismatched release bundle and straight-line answers", () => {
    const complete = buildPayload();

    expect(
      deriveTrustedClaimResult({
        ...complete,
        versionBundle: {
          ...complete.versionBundle,
          scoringReleaseId: "FORGED",
        },
      }),
    ).toBeNull();
    expect(
      deriveTrustedClaimResult({
        ...complete,
        responses: complete.responses.map((response) => ({
          ...response,
          value: 5,
        })),
      }),
    ).toBeNull();
  });
});
