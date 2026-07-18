import { describe, expect, it } from "vitest";
import {
  createPublicComparisonFailurePayload,
  createPublicComparisonReportPayload,
  createPublicProfileSnapshotPayload,
  hasRequiredPublicComparisonScope,
  publicComparisonFailures,
  publicComparisonWriteSteps,
} from "@/features/together/public-comparison-contract";
import { profileVisibilityPolicyVersion } from "@/features/together/profile-visibility-policy";
import type { CoreScoreResult } from "@/lib/scoring/types";

const viewerResult: CoreScoreResult = {
  alternativeCodes: [],
  code: "TVOAE",
  domains: [
    {
      domainId: "SE",
      isBoundary: false,
      label: "사람 사이 에너지",
      score: 72.4,
      status: "valid",
      symbol: "T",
    },
    {
      domainId: "ER",
      isBoundary: false,
      label: "마음의 반응",
      score: 64.2,
      status: "valid",
      symbol: "V",
    },
    {
      domainId: "SM",
      isBoundary: false,
      label: "일상 리듬",
      score: 58.1,
      status: "valid",
      symbol: "O",
    },
  ],
  facets: [
    {
      facetId: "SE-AI",
      label: "먼저 표현하기",
      score: 71.8,
      status: "valid",
      validResponses: 6,
    },
  ],
  profileName: "불꽃의 온기 탐험가",
};

const targetResult: CoreScoreResult = {
  ...viewerResult,
  code: "SVODE",
  domains: [
    {
      domainId: "SE",
      isBoundary: false,
      label: "사람 사이 에너지",
      score: 38.3,
      status: "valid",
      symbol: "S",
    },
    {
      domainId: "ER",
      isBoundary: false,
      label: "마음의 반응",
      score: 61.8,
      status: "valid",
      symbol: "V",
    },
    {
      domainId: "SM",
      isBoundary: false,
      label: "일상 리듬",
      score: 79.1,
      status: "valid",
      symbol: "O",
    },
  ],
  profileName: "물결의 새길 개척가",
};

describe("public profile comparison contract", () => {
  it("keeps the comparison write flow ordered around public snapshot scope", () => {
    expect(publicComparisonWriteSteps.map((step) => step.id)).toEqual([
      "ensure_viewer_full_core",
      "read_target_public_snapshot",
      "validate_snapshot_policy_version",
      "revalidate_target_public_scope",
      "project_allowed_fields",
      "build_comparison_report",
      "record_comparison_audit_event",
    ]);
  });

  it("builds a public profile snapshot from summary fields only", () => {
    const snapshot = createPublicProfileSnapshotPayload({
      createdAt: "2026-07-04T00:00:00.000Z",
      displayProfile: {
        displayName: "탐험가",
        motif: "flame",
      },
      result: viewerResult,
      snapshotId: "11111111-1111-4111-8111-111111111111",
    });

    expect(snapshot.visibility.policyVersion).toBe(profileVisibilityPolicyVersion);
    expect(snapshot.visibility.includedFields).toEqual([
      "display_profile",
      "representative_profile",
      "core_domain_map",
      "core_facet_summary",
    ]);
    expect(snapshot.publicData.coreDomainMap[0].score).toBe(72);
    expect(hasRequiredPublicComparisonScope(snapshot)).toBe(true);
  });

  it("creates a comparison report without counterparty approval or compatibility scoring", () => {
    const viewer = createPublicProfileSnapshotPayload({
      createdAt: "2026-07-04T00:00:00.000Z",
      displayProfile: {
        displayName: "나",
        motif: "flame",
      },
      result: viewerResult,
      snapshotId: "11111111-1111-4111-8111-111111111111",
    });
    const target = createPublicProfileSnapshotPayload({
      createdAt: "2026-07-04T00:00:00.000Z",
      displayProfile: {
        displayName: "상대",
        motif: "water",
      },
      result: targetResult,
      snapshotId: "22222222-2222-4222-8222-222222222222",
    });

    const report = createPublicComparisonReportPayload({
      comparisonId: "33333333-3333-4333-8333-333333333333",
      createdAt: "2026-07-04T00:00:00.000Z",
      target,
      viewer,
    });

    expect(report.comparison.requiresCounterpartyApproval).toBe(false);
    expect(report.comparison.access).toEqual({
      reevaluateOnVisibilityChange: true,
      targetSnapshotStatusRequired: "active",
      viewerResultDeletionDisablesReport: true,
    });
    expect(report.comparison.safety).toEqual({
      compatibilityScoreProvided: false,
      directResponsesUsed: false,
      privateInferenceUsed: false,
      rawScoresUsed: false,
      rankingProvided: false,
    });
    expect(report.comparison.sections.differences[0]).toMatchObject({
      domainId: "SE",
      difference: 34,
    });
    expect(report.comparison.sections.commonGround[0]).toMatchObject({
      domainId: "ER",
      difference: 2,
    });
    expect(report.comparison.sections.axisComparisons).toHaveLength(3);
    expect(report.comparison.sections.axisComparisons[0]).toMatchObject({
      domainId: "SE",
      interpretation: expect.stringContaining("에너지가 시작되는 방식"),
      targetSymbol: "S",
      viewerSymbol: "T",
    });
    expect(report.comparison.sections.summary).toMatchObject({
      closestAxisLabel: "마음이 흔들릴 때의 반응",
      strongestDifferenceLabel: "에너지가 시작되는 방식",
    });
    expect(report.comparison.sections.misunderstandingScenes.length).toBeGreaterThan(0);
  });

  it("maps every comparison failure to a public response contract", () => {
    Object.entries(publicComparisonFailures).forEach(([code, failure]) => {
      const payload = createPublicComparisonFailurePayload(
        code as keyof typeof publicComparisonFailures,
      );

      expect(payload.ok).toBe(false);
      expect(payload.error).toBe("public_comparison_failed");
      expect(payload.code).toBe(code);
      expect(payload.message).toBe(failure.message);
      expect(payload.retryable).toBe(failure.retryable);
      expect(payload.step).toBe(failure.step);
      expect(failure.httpStatus).toBeGreaterThanOrEqual(400);
    });
  });

  it("keeps public snapshot and comparison payloads free of private data surfaces", () => {
    const viewer = createPublicProfileSnapshotPayload({
      createdAt: "2026-07-04T00:00:00.000Z",
      displayProfile: {
        displayName: "나",
        motif: "flame",
      },
      result: viewerResult,
      snapshotId: "11111111-1111-4111-8111-111111111111",
    });
    const target = createPublicProfileSnapshotPayload({
      createdAt: "2026-07-04T00:00:00.000Z",
      displayProfile: {
        displayName: "상대",
        motif: "water",
      },
      result: targetResult,
      snapshotId: "22222222-2222-4222-8222-222222222222",
    });
    const report = createPublicComparisonReportPayload({
      comparisonId: "33333333-3333-4333-8333-333333333333",
      createdAt: "2026-07-04T00:00:00.000Z",
      target,
      viewer,
    });
    const publicJson = JSON.stringify([viewer, target, report]);

    expect(viewer.privacy).toEqual({
      includesAccountIdentity: false,
      includesCrisisHelpInteractions: false,
      includesDirectResponses: false,
      includesRawScorePayload: false,
      includesSensitiveAssessments: false,
    });
    expect(publicJson).not.toContain("email");
    expect(publicJson).not.toContain("provider");
    expect(publicJson).not.toMatch(/"responses"\s*:/);
    expect(publicJson).not.toContain("score_payload");
    expect(publicJson).not.toContain("itemId");
    expect(publicJson).not.toContain("token_hash");
  });
});
