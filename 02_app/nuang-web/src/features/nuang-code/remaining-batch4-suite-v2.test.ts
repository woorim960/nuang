import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import audit from "../../../docs/research/trait-map-data-center-v2/generated/REMAINING_BATCH4_CALIBRATION_AUDIT_V2.json";
import eramcManifest from "../../../docs/research/trait-map-data-center-v2/generated/ERAMC_LONGFORM_RESEARCH_MANIFEST_V2.json";
import eramcNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/ERAMC_NEIGHBOR_REVIEW_V2.json";
import ergkcManifest from "../../../docs/research/trait-map-data-center-v2/generated/ERGKC_LONGFORM_RESEARCH_MANIFEST_V2.json";
import ergkcNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/ERGKC_NEIGHBOR_REVIEW_V2.json";
import ingkcManifest from "../../../docs/research/trait-map-data-center-v2/generated/INGKC_LONGFORM_RESEARCH_MANIFEST_V2.json";
import ingkcNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/INGKC_NEIGHBOR_REVIEW_V2.json";
import ingmqManifest from "../../../docs/research/trait-map-data-center-v2/generated/INGMQ_LONGFORM_RESEARCH_MANIFEST_V2.json";
import ingmqNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/INGMQ_NEIGHBOR_REVIEW_V2.json";
import iramqManifest from "../../../docs/research/trait-map-data-center-v2/generated/IRAMQ_LONGFORM_RESEARCH_MANIFEST_V2.json";
import iramqNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/IRAMQ_NEIGHBOR_REVIEW_V2.json";
import {
  eramcFoundationClaimsV2,
  ergkcFoundationClaimsV2,
  ingkcFoundationClaimsV2,
  ingmqFoundationClaimsV2,
  iramqFoundationClaimsV2,
} from "@/features/nuang-code/remaining-batch4-foundation-candidates-v2";
import {
  getOneLetterNeighborCodes,
  traitMapClaimV2Schema,
  traitMapProfilePackageV2Schema,
  traitMapV2ChapterIds,
} from "@/features/nuang-code/trait-map-data-center-v2";

const cases = [
  {
    code: "ERAMC",
    roleName: "유연하게 곁을 걷는 동행가",
    foundation: eramcFoundationClaimsV2,
    neighbors: eramcNeighbors,
    manifest: eramcManifest,
  },
  {
    code: "ERGKC",
    roleName: "차분히 답을 세우는 운영가",
    foundation: ergkcFoundationClaimsV2,
    neighbors: ergkcNeighbors,
    manifest: ergkcManifest,
  },
  {
    code: "INGKC",
    roleName: "가능성을 차근차근 짓는 설계자",
    foundation: ingkcFoundationClaimsV2,
    neighbors: ingkcNeighbors,
    manifest: ingkcManifest,
  },
  {
    code: "INGMQ",
    roleName: "가능성을 깊이 좇는 사색가",
    foundation: ingmqFoundationClaimsV2,
    neighbors: ingmqNeighbors,
    manifest: ingmqManifest,
  },
  {
    code: "IRAMQ",
    roleName: "마음 변화를 듣는 경청자",
    foundation: iramqFoundationClaimsV2,
    neighbors: iramqNeighbors,
    manifest: iramqManifest,
  },
] as const;

describe("remaining profile batch 4 complete suite v2", () => {
  it("passes two-parent calibration and exact totals", () => {
    expect(audit.status).toBe(
      "FOURTH_REMAINING_BATCH_STRUCTURALLY_COMPLETE_HUMAN_VALIDATION_REQUIRED",
    );
    expect(audit.checks.exactProfileCoverage).toBe(true);
    expect(audit.checks.exactInteractionCoverage).toBe(true);
    expect(audit.checks.twoParentPathConvergence).toBe(true);
    expect(audit.checks.fullResearchStructure).toBe(true);
    expect(audit.checks.allContentResearchOnly).toBe(true);
    expect(audit.totals.scenarios).toBe(360);
    expect(audit.totals.scenarioClaims).toBe(1_440);
    expect(audit.totals.interactionScenarioClaims).toBe(12);
    expect(audit.totals.structuredClaims).toBe(1_570);
    expect(audit.totals.neighborClaims).toBe(100);
  });

  it.each(cases)(
    "$code has valid foundations, neighbors, and longform",
    ({ code, roleName, foundation, neighbors, manifest }) => {
      expect(foundation).toHaveLength(6);
      for (const claim of foundation) {
        expect(() => traitMapClaimV2Schema.parse(claim)).not.toThrow();
        expect(claim.publicationState).toBe("research_only");
      }
      expect(new Set(neighbors.neighborCodes)).toEqual(
        new Set(getOneLetterNeighborCodes(code)),
      );
      expect(neighbors.claims).toHaveLength(20);
      for (const claim of neighbors.claims) {
        expect(() => traitMapClaimV2Schema.parse(claim)).not.toThrow();
      }
      expect(() =>
        traitMapProfilePackageV2Schema.parse(manifest),
      ).not.toThrow();
      expect(manifest.chapters.map((chapter) => chapter.chapterId)).toEqual([
        ...traitMapV2ChapterIds,
      ]);
      expect(manifest.totalNonWhitespaceCharacters).toBeGreaterThanOrEqual(
        50_000,
      );
      expect(manifest.researchMetrics.customerApprovedClaims).toBe(0);
      const source = fs.readFileSync(
        path.join(
          process.cwd(),
          `docs/trait-maps/${code}/${code}_DATA_CENTER_V2_RESEARCH_DRAFT.md`,
        ),
        "utf8",
      );
      expect(source).toContain(`> 역할 이름: ${roleName}`);
    },
  );
});
