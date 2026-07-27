import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import enakcCopyAudit from "../../../docs/research/trait-map-data-center-v2/generated/ENAKC_SCENARIO_COPY_AUDIT_V2.json";
import enakcManifest from "../../../docs/research/trait-map-data-center-v2/generated/ENAKC_LONGFORM_RESEARCH_MANIFEST_V2.json";
import irgmqCopyAudit from "../../../docs/research/trait-map-data-center-v2/generated/IRGMQ_SCENARIO_COPY_AUDIT_V2.json";
import irgmqManifest from "../../../docs/research/trait-map-data-center-v2/generated/IRGMQ_LONGFORM_RESEARCH_MANIFEST_V2.json";
import {
  traitMapProfilePackageV2Schema,
  traitMapV2ChapterIds,
} from "@/features/nuang-code/trait-map-data-center-v2";

const profiles = [
  {
    code: "ENAKC",
    roleName: "사람과 가능성을 잇는 연결가",
    manifest: enakcManifest,
    copyAudit: enakcCopyAudit,
  },
  {
    code: "IRGMQ",
    roleName: "변화의 원인을 좇는 추적자",
    manifest: irgmqManifest,
    copyAudit: irgmqCopyAudit,
  },
] as const;

describe.each(profiles)(
  "$code Q/C-derived longform research draft v2",
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
    });

    it("stays in the 50k-60k range without customer approval", () => {
      expect(manifest.totalNonWhitespaceCharacters).toBeGreaterThanOrEqual(
        50_000,
      );
      expect(manifest.researchMetrics.customerApprovedClaims).toBe(0);
      expect(manifest.researchMetrics.structuredNeighborContrasts).toBe(
        "20/20",
      );
      expect(copyAudit.automaticPasses).toBe(288);
      expect(copyAudit.rewriteRequired).toBe(0);
    });

    it("keeps the named manuscript on disk", () => {
      const source = fs.readFileSync(
        path.join(
          process.cwd(),
          `docs/trait-maps/${code}/${code}_DATA_CENTER_V2_RESEARCH_DRAFT.md`,
        ),
        "utf8",
      );
      expect(source).toContain(`> 역할 이름: ${roleName}`);
      expect(source).toContain("## 10. 마음에 드는 사람을 알아갈 때");
      expect(source).toContain("## 16. 어떻게 만들고 확인하는가");
    });
  },
);
