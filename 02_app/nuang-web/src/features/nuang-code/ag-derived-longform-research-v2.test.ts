import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import engkqCopyAudit from "../../../docs/research/trait-map-data-center-v2/generated/ENGKQ_SCENARIO_COPY_AUDIT_V2.json";
import engkqManifest from "../../../docs/research/trait-map-data-center-v2/generated/ENGKQ_LONGFORM_RESEARCH_MANIFEST_V2.json";
import iramcCopyAudit from "../../../docs/research/trait-map-data-center-v2/generated/IRAMC_SCENARIO_COPY_AUDIT_V2.json";
import iramcManifest from "../../../docs/research/trait-map-data-center-v2/generated/IRAMC_LONGFORM_RESEARCH_MANIFEST_V2.json";
import {
  traitMapProfilePackageV2Schema,
  traitMapV2ChapterIds,
} from "@/features/nuang-code/trait-map-data-center-v2";

const profiles = [
  {
    code: "ENGKQ",
    roleName: "변화에 답하는 혁신가",
    manifest: engkqManifest,
    copyAudit: engkqCopyAudit,
  },
  {
    code: "IRAMC",
    roleName: "조용히 곁을 맞추는 지원가",
    manifest: iramcManifest,
    copyAudit: iramcCopyAudit,
  },
] as const;

describe.each(profiles)(
  "$code A/G-derived longform research draft v2",
  ({ code, roleName, manifest, copyAudit }) => {
    it("conforms to the full profile package contract", () => {
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

    it("stays in the 50k-60k research range without customer approval", () => {
      expect(manifest.totalNonWhitespaceCharacters).toBeGreaterThanOrEqual(
        50_000,
      );
      expect(manifest.status).toBe("research_draft");
      expect(manifest.researchMetrics.customerApprovedClaims).toBe(0);
      expect(copyAudit.automaticPasses).toBe(288);
      expect(copyAudit.rewriteRequired).toBe(0);
    });

    it("keeps the named 16-chapter manuscript on disk", () => {
      const source = fs.readFileSync(
        path.join(
          process.cwd(),
          `docs/trait-maps/${code}/${code}_DATA_CENTER_V2_RESEARCH_DRAFT.md`,
        ),
        "utf8",
      );
      expect(source).toContain(`# ${code} 성향지도 데이터센터 v2`);
      expect(source).toContain(`> 역할 이름: ${roleName}`);
      expect(source).toContain("## 10. 마음에 드는 사람을 알아갈 때");
      expect(source).toContain("## 16. 어떻게 만들고 확인하는가");
    });
  },
);
