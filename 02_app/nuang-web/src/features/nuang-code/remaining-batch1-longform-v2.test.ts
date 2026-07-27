import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import enamcManifest from "../../../docs/research/trait-map-data-center-v2/generated/ENAMC_LONGFORM_RESEARCH_MANIFEST_V2.json";
import engmqManifest from "../../../docs/research/trait-map-data-center-v2/generated/ENGMQ_LONGFORM_RESEARCH_MANIFEST_V2.json";
import ergkqManifest from "../../../docs/research/trait-map-data-center-v2/generated/ERGKQ_LONGFORM_RESEARCH_MANIFEST_V2.json";
import inakcManifest from "../../../docs/research/trait-map-data-center-v2/generated/INAKC_LONGFORM_RESEARCH_MANIFEST_V2.json";
import irakqManifest from "../../../docs/research/trait-map-data-center-v2/generated/IRAKQ_LONGFORM_RESEARCH_MANIFEST_V2.json";
import {
  traitMapProfilePackageV2Schema,
  traitMapV2ChapterIds,
} from "@/features/nuang-code/trait-map-data-center-v2";

const cases = [
  {
    code: "IRAKQ",
    roleName: "마음 변화를 살피는 관찰자",
    manifest: irakqManifest,
  },
  {
    code: "ERGKQ",
    roleName: "변수에 빠르게 반응하는 해결사",
    manifest: ergkqManifest,
  },
  {
    code: "ENGMQ",
    roleName: "가능성을 펼치는 발상가",
    manifest: engmqManifest,
  },
  {
    code: "ENAMC",
    roleName: "상상과 마음을 나누는 소통가",
    manifest: enamcManifest,
  },
  {
    code: "INAKC",
    roleName: "조용히 관계를 잇는 조정자",
    manifest: inakcManifest,
  },
] as const;

describe.each(cases)(
  "$code remaining batch 1 longform v2",
  ({ code, roleName, manifest }) => {
    it("conforms to the full 16-chapter research package", () => {
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

    it("keeps the manuscript in range and unpublished", () => {
      expect(manifest.totalNonWhitespaceCharacters).toBeGreaterThanOrEqual(
        50_000,
      );
      expect(manifest.researchMetrics.customerApprovedClaims).toBe(0);
      expect(manifest.researchMetrics.automaticCopyAudit).toBe("288/288");
      expect(manifest.researchMetrics.structuredNeighborContrasts).toBe(
        "20/20",
      );
      const source = fs.readFileSync(
        path.join(
          process.cwd(),
          `docs/trait-maps/${code}/${code}_DATA_CENTER_V2_RESEARCH_DRAFT.md`,
        ),
        "utf8",
      );
      expect(source).toContain(`> 역할 이름: ${roleName}`);
    });
  },
);
