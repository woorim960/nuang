import { describe, expect, it } from "vitest";
import migrationPacket from "@/features/nuang-code/fixtures/enakq-v2-migration.generated.json";
import {
  traitMapClaimV2Schema,
  traitMapScenarioCatalogV2,
} from "@/features/nuang-code/trait-map-data-center-v2";
import {
  traitMapChangeContextEvidenceFindingsV2,
  traitMapChangeContextEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-change-context-evidence-v2";
import {
  traitMapFoundationEvidenceFindingsV2,
  traitMapFoundationEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-foundation-evidence-v2";
import {
  traitMapFriendshipEvidenceFindingsV2,
  traitMapFriendshipEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-friendship-evidence-v2";
import {
  traitMapRelationshipEvidenceFindingsV2,
  traitMapRelationshipEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-relationship-evidence-v2";
import {
  traitMapProcessEvidenceFindingsV2,
  traitMapProcessEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-process-evidence-v2";
import {
  traitMapWorkEvidenceFindingsV2,
  traitMapWorkEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-work-evidence-v2";

describe("ENAKQ v2 migration packet", () => {
  it("preserves all 158 canonical claims without publishing any", () => {
    expect(migrationPacket.claims).toHaveLength(158);
    expect(
      new Set(migrationPacket.claims.map((item) => item.v2Claim.claimId)).size,
    ).toBe(158);
    expect(
      migrationPacket.claims.every(
        (item) => item.v2Claim.publicationState === "research_only",
      ),
    ).toBe(true);
  });

  it("conforms every migrated candidate to the v2 claim contract", () => {
    for (const item of migrationPacket.claims) {
      expect(() => traitMapClaimV2Schema.parse(item.v2Claim)).not.toThrow();
    }
  });

  it("only references canonical scenarios", () => {
    const scenarioIds = new Set(
      traitMapScenarioCatalogV2.map((item) => item.scenarioId),
    );

    for (const item of migrationPacket.claims) {
      for (const scenarioRef of item.v2Claim.scenarioRefs) {
        expect(scenarioIds.has(scenarioRef)).toBe(true);
      }
    }
  });

  it("preserves all 42 evidence source candidates for normalization", () => {
    expect(migrationPacket.sourceCandidates).toHaveLength(42);
    expect(
      new Set(
        migrationPacket.sourceCandidates.map((item) => item.sourceId),
      ).size,
    ).toBe(42);
    expect(
      migrationPacket.sourceCandidates.every(
        (item) =>
          item.normalizationStatus ===
          "needs_manual_source_and_finding_extraction",
      ),
    ).toBe(true);
  });

  it("links only recognized foundation findings and keeps all claims unpublished", () => {
    const findingIds = new Set<string>(
      [
        ...traitMapChangeContextEvidenceFindingsV2,
        ...traitMapFoundationEvidenceFindingsV2,
        ...traitMapFriendshipEvidenceFindingsV2,
        ...traitMapRelationshipEvidenceFindingsV2,
        ...traitMapProcessEvidenceFindingsV2,
        ...traitMapWorkEvidenceFindingsV2,
      ].map((finding) => finding.findingId),
    );
    const sourceIds = new Set<string>(
      [
        ...traitMapChangeContextEvidenceSourcesV2,
        ...traitMapFoundationEvidenceSourcesV2,
        ...traitMapFriendshipEvidenceSourcesV2,
        ...traitMapRelationshipEvidenceSourcesV2.filter(
          (source) => source.screeningStatus === "included",
        ),
        ...traitMapProcessEvidenceSourcesV2,
        ...traitMapWorkEvidenceSourcesV2,
      ].map((source) => source.sourceId),
    );

    expect(migrationPacket.summary.claimsWithNormalizedFindings).toBeGreaterThan(
      0,
    );
    expect(
      migrationPacket.summary.claimsWithoutNormalizedFindings,
    ).toBeGreaterThan(0);
    expect(migrationPacket.summary.approvedClaims).toBe(0);

    for (const item of migrationPacket.claims) {
      for (const findingRef of item.v2Claim.evidenceFindingRefs) {
        expect(findingIds.has(findingRef)).toBe(true);
      }
      for (const sourceRef of item.v2Claim.independentSourceRefs) {
        expect(sourceIds.has(sourceRef)).toBe(true);
      }
    }

    expect(
      migrationPacket.claims.every(
        (item) =>
          !item.v2Claim.independentSourceRefs.includes(
            "SRC-RESPONSIVENESS-STRESS-2021",
          ),
      ),
    ).toBe(true);
  });
});
