import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import erakqCopyAudit from "../../../docs/research/trait-map-data-center-v2/generated/ERAKQ_SCENARIO_COPY_AUDIT_V2.json";
import erakqManifest from "../../../docs/research/trait-map-data-center-v2/generated/ERAKQ_LONGFORM_RESEARCH_MANIFEST_V2.json";
import ingmcCopyAudit from "../../../docs/research/trait-map-data-center-v2/generated/INGMC_SCENARIO_COPY_AUDIT_V2.json";
import ingmcManifest from "../../../docs/research/trait-map-data-center-v2/generated/INGMC_LONGFORM_RESEARCH_MANIFEST_V2.json";
import {
  traitMapProfilePackageV2Schema,
  traitMapV2ChapterIds,
} from "@/features/nuang-code/trait-map-data-center-v2";

const profiles = [
  {
    code: "ERAKQ",
    roleName: "관계 변화를 살피는 관계지기",
    manifest: erakqManifest,
    copyAudit: erakqCopyAudit,
  },
  {
    code: "INGMC",
    roleName: "새 가능성을 찾는 탐험가",
    manifest: ingmcManifest,
    copyAudit: ingmcCopyAudit,
  },
] as const;

describe.each(profiles)(
  "$code N/R-derived longform research draft v2",
  ({ code, roleName, manifest, copyAudit }) => {
    it("conforms to the package contract and full research structure", () => {
      expect(() =>
        traitMapProfilePackageV2Schema.parse(manifest),
      ).not.toThrow();
      expect(manifest.chapters.map((chapter) => chapter.chapterId)).toEqual([
        ...traitMapV2ChapterIds,
      ]);
      expect(manifest.scenarioRefs).toHaveLength(72);
      expect(manifest.claimRefs).toHaveLength(314);
      expect(manifest.evidenceSourceRefs.length).toBeGreaterThanOrEqual(30);
      expect(manifest.researchMetrics.structuredNeighborContrasts).toBe(
        "20/20",
      );
    });

    it("stays above the 50k research minimum without customer approval", () => {
      expect(manifest.totalNonWhitespaceCharacters).toBeGreaterThanOrEqual(
        50_000,
      );
      expect(manifest.status).toBe("research_draft");
      expect(manifest.researchMetrics.customerApprovedClaims).toBe(0);
      expect(copyAudit.automaticPasses).toBe(288);
      expect(copyAudit.rewriteRequired).toBe(0);
    });

    it("keeps the named 16-chapter manuscript on disk", () => {
      const markdownPath = path.join(
        process.cwd(),
        `docs/trait-maps/${code}/${code}_DATA_CENTER_V2_RESEARCH_DRAFT.md`,
      );
      const source = fs.readFileSync(markdownPath, "utf8");
      expect(source).toContain(`# ${code} 성향지도 데이터센터 v2`);
      expect(source).toContain(`> 역할 이름: ${roleName}`);
      expect(source).toContain("## 10. 마음에 드는 사람을 알아갈 때");
      expect(source).toContain("## 16. 어떻게 만들고 확인하는가");
    });
  },
);
