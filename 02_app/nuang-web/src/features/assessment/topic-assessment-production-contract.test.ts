import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { topicAssessmentCatalog } from "@/features/assessment/assessment-catalog";
import {
  buildFreeTopicResultReport,
  calculateFreeTopicResult,
  getFreeTopicAssessment,
  getFreeTopicQuestions,
  type FreeTopicAnswer,
} from "@/features/assessment/free-topic-assessments";
import { buildFreeTopicNuangCodeSection } from "@/features/assessment/free-topic-long-report";
import { getFreeTopicEvidenceVersion } from "@/features/assessment/free-topic-result-version";
import { getTopicAssessmentEvidence } from "@/features/assessment/topic-assessment-evidence";

const publishedTopicSlugs = [
  "apology-style",
  "comfort-style",
  "focus-switch",
  "hurt-expression",
  "organizing-style",
  "recharge-routine",
] as const;

function buildScoreCombinations(
  scaleCount: number,
  prefix: number[] = [],
): number[][] {
  if (prefix.length === scaleCount) return [prefix];
  return [0, 25, 50, 75, 100].flatMap((score) =>
    buildScoreCombinations(scaleCount, [...prefix, score]),
  );
}

describe("topic assessment production standard", () => {
  it("keeps every published topic available to all ages", () => {
    const publishedTopics = topicAssessmentCatalog.filter(
      (assessment) => assessment.publicationStatus === "published",
    );

    expect(publishedTopics.map((assessment) => assessment.id).sort()).toEqual(
      publishedTopicSlugs.map((slug) => `topic:${slug}`).sort(),
    );
    publishedTopics.forEach((assessment) => {
      expect(assessment.ageAccessPolicy).toBe("all_ages");
    });
  });

  it.each(publishedTopicSlugs)(
    "%s has a full dimension-by-situation blueprint",
    (slug) => {
      const assessment = getFreeTopicAssessment(slug);
      const questions = getFreeTopicQuestions(slug);

      expect(assessment).not.toBeNull();
      expect(assessment?.reportMode).toBe("independent_dimensions");
      const expectedScaleCount = slug === "organizing-style" ? 4 : 3;
      expect(assessment?.reportScales).toHaveLength(expectedScaleCount);
      expect(questions).toHaveLength(expectedScaleCount * 4);
      expect(
        new Set(questions.map((question) => question.contextLabel)).size,
      ).toBe(4);

      assessment?.reportScales?.forEach((scale) => {
        expect(
          questions.filter((question) => question.reportScaleId === scale.id),
        ).toHaveLength(4);
      });
    },
  );

  it.each(publishedTopicSlugs)(
    "%s produces a deep, traceable report and Nuang-code interpretation",
    (slug) => {
      const assessment = getFreeTopicAssessment(slug)!;
      const questions = getFreeTopicQuestions(slug);
      const answers = Object.fromEntries(
        questions.map((question) => [
          question.id,
          {
            answeredAt: "2026-07-28T00:00:00.000Z",
            questionId: question.id,
            value: 4,
          } satisfies FreeTopicAnswer,
        ]),
      );
      const result = calculateFreeTopicResult({
        answers,
        assessment,
        observedAt: "2026-07-28T00:01:00.000Z",
      });
      const report = buildFreeTopicResultReport({ assessment, result });
      const nuangCodeSection = buildFreeTopicNuangCodeSection({
        assessment,
        code: "INGMC",
        scoresByScaleId: result.scoresByScaleId,
      });

      expect(report.longReportSections.length).toBeGreaterThanOrEqual(7);
      expect(JSON.stringify(report.longReportSections).length).toBeGreaterThan(
        2_500,
      );
      expect(
        report.longReportSections.some((section) =>
          /강점|잘 맞는 도움|잘 쓰는 충전법/.test(section.title),
        ),
      ).toBe(true);
      report.longReportSections.forEach((section) => {
        expect(section.claimIds.length).toBeGreaterThan(0);
      });
      expect(nuangCodeSection).not.toBeNull();
      expect(nuangCodeSection?.body.length).toBeGreaterThan(150);
      expect(nuangCodeSection?.claimIds.length).toBeGreaterThan(0);
    },
  );

  it.each(publishedTopicSlugs)(
    "%s leads every score combination with an everyday tendency",
    (slug) => {
      const assessment = getFreeTopicAssessment(slug)!;
      const scaleIds = assessment.reportScales?.map((scale) => scale.id) ?? [];
      const scoreCombinations = buildScoreCombinations(scaleIds.length);

      scoreCombinations.forEach((scores) => {
        const report = buildFreeTopicResultReport({
          assessment,
          result: {
            observations: [],
            scoresByScaleId: Object.fromEntries(
              scaleIds.map((scaleId, index) => [scaleId, scores[index]]),
            ),
            scoresByTargetId: {},
          },
        });
        const title = report.personalizedSummary?.title ?? "";
        const body = report.personalizedSummary?.body ?? "";

        expect(title.length).toBeGreaterThanOrEqual(15);
        expect(title).not.toMatch(
          /(세|두) (행동|경로|방법|항목)|전환 행동|비슷하게|점수가? (높|낮)|가장 (자주|많이) 나타/,
        );
        expect(body.length).toBeGreaterThanOrEqual(45);
        expect(body).not.toMatch(
          /각각 (정리|살펴)|항목을 살펴|점수만 보|비슷한 정도로 나타/,
        );
      });
    },
  );

  it.each(publishedTopicSlugs)(
    "%s exposes a primary-source evidence trail",
    (slug) => {
      const evidence = getTopicAssessmentEvidence(slug);

      expect(evidence).not.toBeNull();
      expect(evidence?.principles.length).toBeGreaterThanOrEqual(3);
      expect(evidence?.sources.length).toBeGreaterThanOrEqual(
        slug === "comfort-style" ? 8 : 6,
      );
      evidence?.sources.forEach((source) => {
        expect(source.href).toMatch(/^https:\/\/doi\.org\//);
        expect(source.focus.length).toBeGreaterThan(20);
      });
      expect(getFreeTopicEvidenceVersion(slug)).toMatch(
        new RegExp(`^${slug}-evidence-v\\d+`),
      );
    },
  );

  it("keeps trust-lowering internal labels out of assessment customer surfaces", () => {
    const customerSurfaceFiles = [
      "src/features/assessment/AssessmentEvidenceSources.tsx",
      "src/features/assessment/AssessmentResultQualityPrompt.tsx",
      "src/features/assessment/FreeTopicResultView.tsx",
      "src/features/assessment/FreeTopicRunner.tsx",
      "src/app/assessments/topics/[slug]/page.tsx",
    ];
    const customerSurfaceText = customerSurfaceFiles
      .map((file) => readFileSync(resolve(process.cwd(), file), "utf8"))
      .join("\n");

    ["검증 전 자기성찰용 파일럿", "미검증", "비진단", "파일럿 검사"].forEach(
      (label) => {
        expect(customerSurfaceText).not.toContain(label);
      },
    );
  });
});
