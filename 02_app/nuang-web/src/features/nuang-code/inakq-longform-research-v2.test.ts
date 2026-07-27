import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import copyAudit from "../../../docs/research/trait-map-data-center-v2/generated/INAKQ_SCENARIO_COPY_AUDIT_V2.json";
import manifest from "../../../docs/research/trait-map-data-center-v2/generated/INAKQ_LONGFORM_RESEARCH_MANIFEST_V2.json";
import {
  traitMapProfilePackageV2Schema,
  traitMapV2ChapterIds,
} from "@/features/nuang-code/trait-map-data-center-v2";

const markdownPath = path.join(
  process.cwd(),
  "docs/trait-maps/INAKQ/INAKQ_DATA_CENTER_V2_RESEARCH_DRAFT.md",
);

describe("INAKQ longform research draft v2", () => {
  it("conforms to the profile package contract", () => {
    expect(() => traitMapProfilePackageV2Schema.parse(manifest)).not.toThrow();
  });

  it("contains all 16 chapters and the full 72-scene inventory", () => {
    expect(manifest.chapters.map((chapter) => chapter.chapterId)).toEqual([
      ...traitMapV2ChapterIds,
    ]);
    expect(manifest.scenarioRefs).toHaveLength(72);
    expect(manifest.claimRefs).toHaveLength(314);
    expect(manifest.evidenceSourceRefs.length).toBeGreaterThanOrEqual(30);
  });

  it("stays inside the 50k-60k range without claiming approval", () => {
    expect(manifest.totalNonWhitespaceCharacters).toBeGreaterThanOrEqual(
      50_000,
    );
    expect(manifest.status).toBe("research_draft");
    expect(manifest.researchMetrics.customerApprovedClaims).toBe(0);
    expect(copyAudit.automaticPasses).toBe(288);
    expect(copyAudit.rewriteRequired).toBe(0);
  });

  it("includes all five one-letter neighbor comparisons and keeps their review gate", () => {
    expect(manifest.researchMetrics.structuredNeighborContrasts).toBe("20/20");
    expect(
      manifest.publicationBlockers.some((item) =>
        item.includes("양방향 대칭성"),
      ),
    ).toBe(true);
  });

  it("keeps the generated research manuscript on disk", () => {
    const source = fs.readFileSync(markdownPath, "utf8");
    expect(source).toContain("# INAKQ 성향지도 데이터센터 v2");
    expect(source).toContain("## 10. 마음에 드는 사람을 알아갈 때");
    expect(source).toContain("## 16. 어떻게 만들고 확인하는가");
  });
});
