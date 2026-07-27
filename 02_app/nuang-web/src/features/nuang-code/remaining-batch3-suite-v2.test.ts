import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import audit from "../../../docs/research/trait-map-data-center-v2/generated/REMAINING_BATCH3_CALIBRATION_AUDIT_V2.json";
import engmcManifest from "../../../docs/research/trait-map-data-center-v2/generated/ENGMC_LONGFORM_RESEARCH_MANIFEST_V2.json";
import engmcNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/ENGMC_NEIGHBOR_REVIEW_V2.json";
import ergmqManifest from "../../../docs/research/trait-map-data-center-v2/generated/ERGMQ_LONGFORM_RESEARCH_MANIFEST_V2.json";
import ergmqNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/ERGMQ_NEIGHBOR_REVIEW_V2.json";
import inamcManifest from "../../../docs/research/trait-map-data-center-v2/generated/INAMC_LONGFORM_RESEARCH_MANIFEST_V2.json";
import inamcNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/INAMC_NEIGHBOR_REVIEW_V2.json";
import irakcManifest from "../../../docs/research/trait-map-data-center-v2/generated/IRAKC_LONGFORM_RESEARCH_MANIFEST_V2.json";
import irakcNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/IRAKC_NEIGHBOR_REVIEW_V2.json";
import irgkqManifest from "../../../docs/research/trait-map-data-center-v2/generated/IRGKQ_LONGFORM_RESEARCH_MANIFEST_V2.json";
import irgkqNeighbors from "../../../docs/research/trait-map-data-center-v2/generated/IRGKQ_NEIGHBOR_REVIEW_V2.json";
import {
  engmcFoundationClaimsV2,
  ergmqFoundationClaimsV2,
  inamcFoundationClaimsV2,
  irakcFoundationClaimsV2,
  irgkqFoundationClaimsV2,
} from "@/features/nuang-code/remaining-batch3-foundation-candidates-v2";
import {
  getOneLetterNeighborCodes,
  traitMapClaimV2Schema,
  traitMapProfilePackageV2Schema,
  traitMapV2ChapterIds,
} from "@/features/nuang-code/trait-map-data-center-v2";

const cases = [
  {
    code: "ENGMC",
    roleName: "새 길을 여는 개척자",
    foundation: engmcFoundationClaimsV2,
    neighbors: engmcNeighbors,
    manifest: engmcManifest,
  },
  {
    code: "INAMC",
    roleName: "마음과 가능성을 그리는 상상가",
    foundation: inamcFoundationClaimsV2,
    neighbors: inamcNeighbors,
    manifest: inamcManifest,
  },
  {
    code: "IRAKC",
    roleName: "조용히 마음을 지키는 수호자",
    foundation: irakcFoundationClaimsV2,
    neighbors: irakcNeighbors,
    manifest: irakcManifest,
  },
  {
    code: "IRGKQ",
    roleName: "변수를 꼼꼼히 살피는 전략가",
    foundation: irgkqFoundationClaimsV2,
    neighbors: irgkqNeighbors,
    manifest: irgkqManifest,
  },
  {
    code: "ERGMQ",
    roleName: "빠르게 움직이는 현장해결가",
    foundation: ergmqFoundationClaimsV2,
    neighbors: ergmqNeighbors,
    manifest: ergmqManifest,
  },
] as const;

describe("remaining profile batch 3 complete suite v2", () => {
  it("passes two-parent calibration and exact totals", () => {
    expect(audit.status).toBe(
      "THIRD_REMAINING_BATCH_STRUCTURALLY_COMPLETE_HUMAN_VALIDATION_REQUIRED",
    );
    expect(audit.checks.exactProfileCoverage).toBe(true);
    expect(audit.checks.exactInteractionCoverage).toBe(true);
    expect(audit.checks.twoParentPathConvergence).toBe(true);
    expect(audit.checks.fullResearchStructure).toBe(true);
    expect(audit.checks.allContentResearchOnly).toBe(true);
    expect(audit.totals.scenarios).toBe(360);
    expect(audit.totals.scenarioClaims).toBe(1_440);
    expect(audit.totals.interactionScenarioClaims).toBe(16);
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
