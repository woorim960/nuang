import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import engkcManifest from "../../../docs/research/trait-map-data-center-v2/generated/ENGKC_LONGFORM_RESEARCH_MANIFEST_V2.json";
import erakcManifest from "../../../docs/research/trait-map-data-center-v2/generated/ERAKC_LONGFORM_RESEARCH_MANIFEST_V2.json";
import eramqManifest from "../../../docs/research/trait-map-data-center-v2/generated/ERAMQ_LONGFORM_RESEARCH_MANIFEST_V2.json";
import inamqManifest from "../../../docs/research/trait-map-data-center-v2/generated/INAMQ_LONGFORM_RESEARCH_MANIFEST_V2.json";
import ingkqManifest from "../../../docs/research/trait-map-data-center-v2/generated/INGKQ_LONGFORM_RESEARCH_MANIFEST_V2.json";
import {
  traitMapProfilePackageV2Schema,
  traitMapV2ChapterIds,
} from "@/features/nuang-code/trait-map-data-center-v2";

const cases = [
  {
    code: "INGKQ",
    roleName: "가능성과 변수를 살피는 구상가",
    manifest: ingkqManifest,
  },
  {
    code: "INAMQ",
    roleName: "마음의 이야기를 품는 기록가",
    manifest: inamqManifest,
  },
  {
    code: "ERAMQ",
    roleName: "마음에 바로 반응하는 공감자",
    manifest: eramqManifest,
  },
  {
    code: "ERAKC",
    roleName: "차분히 관계를 맞추는 조율가",
    manifest: erakcManifest,
  },
  {
    code: "ENGKC",
    roleName: "가능성을 계획하는 기획자",
    manifest: engkcManifest,
  },
] as const;

describe.each(cases)(
  "$code remaining batch 2 longform v2",
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
