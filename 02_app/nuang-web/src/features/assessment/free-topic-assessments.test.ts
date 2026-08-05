import { describe, expect, it } from "vitest";
import {
  buildFreeTopicResultReport,
  buildFreeTopicEvidenceObservations,
  buildTargetKey,
  calculateFreeTopicResult,
  defaultFreeTopicRecallPrompt,
  featuredFreeTopicAssessments,
  forbiddenFreeTopicKeywords,
  freeTopicAssessments,
  freeTopicSourceWeight,
  getFreeTopicAssessment,
  getFreeTopicQuestions,
  isRepresentativeTraitTarget,
  resolveFreeTopicTraitRule,
} from "@/features/assessment/free-topic-assessments";
import {
  coreDomainDefinitions,
  coreFacetDefinitions,
} from "@/features/assessment/quick-core-seed";
import { dynamicTraitSourceWeights } from "@/lib/scoring/dynamic-trait-evidence";

describe("freeTopicAssessments", () => {
  it("keeps the approved v0.1 catalog compactly featureable", () => {
    expect(freeTopicAssessments).toHaveLength(19);
    expect(featuredFreeTopicAssessments).toHaveLength(3);
    expect(
      featuredFreeTopicAssessments.map((assessment) => assessment.slug),
    ).toEqual(["conversation-temperature", "apology-style", "distance-rhythm"]);
  });

  it("uses the free topic evidence weight and never opens comparison use by default", () => {
    expect(freeTopicSourceWeight).toBe(dynamicTraitSourceWeights.free_topic);

    freeTopicAssessments.forEach((assessment) => {
      expect(assessment.sourceWeight).toBe(0.35);
      expect(assessment.comparisonUse).toBe(false);
    });
  });

  it("keeps every first-question guide to one concise sentence", () => {
    freeTopicAssessments.forEach((assessment) => {
      const guide = assessment.recallPrompt ?? defaultFreeTopicRecallPrompt;

      expect(guide.length).toBeLessThanOrEqual(50);
      expect(guide.match(/[.!?]/g)).toHaveLength(1);
    });
  });

  it("maps every target to an approved core domain or facet", () => {
    const domainIds = new Set(
      coreDomainDefinitions.map((domain) => domain.domainId),
    );
    const facetIds = new Set(
      coreFacetDefinitions.map((facet) => facet.facetId),
    );

    freeTopicAssessments.forEach((assessment) => {
      if (assessment.reportMode === "independent_dimensions") {
        expect(assessment.mappings).toEqual([]);
        return;
      }

      expect(assessment.mappings.length).toBeGreaterThan(0);
      expect(
        assessment.mappings.some((mapping) => mapping.role === "primary"),
      ).toBe(true);

      assessment.mappings.forEach((mapping) => {
        expect(mapping.constructDirectness).toBeGreaterThan(0);
        expect(mapping.constructDirectness).toBeLessThanOrEqual(1);
        expect(mapping.measurementAmount).toBeGreaterThan(0);
        expect(mapping.measurementAmount).toBeLessThanOrEqual(1);

        if (mapping.target.kind === "domain") {
          expect(domainIds.has(mapping.target.id)).toBe(true);
        } else {
          expect(facetIds.has(mapping.target.id)).toBe(true);
        }
      });
    });
  });

  it("keeps research-detail facets in reports but out of the representative code", () => {
    expect(isRepresentativeTraitTarget({ id: "RO-EC", kind: "facet" })).toBe(
      true,
    );
    expect(isRepresentativeTraitTarget({ id: "RO-RN", kind: "facet" })).toBe(
      false,
    );
    expect(
      resolveFreeTopicTraitRule("conversation-temperature", {
        contextLabel: "대화 상황",
        id: "detail-only",
        target: { id: "RO-RN", kind: "facet" },
        text: "상대가 원하는 방식을 확인한다.",
      }).scoring,
    ).toBe("excluded");
  });

  it("keeps high-risk or clinical topics out of the free topic catalog", () => {
    const searchableText = freeTopicAssessments
      .flatMap((assessment) => [
        assessment.title,
        assessment.caption,
        assessment.categoryLabel,
      ])
      .join(" ");

    forbiddenFreeTopicKeywords.forEach((keyword) => {
      expect(searchableText).not.toContain(keyword);
    });
  });

  it("keeps public topic results out of the representative code until validation", () => {
    const assessment = getFreeTopicAssessment("conversation-temperature");
    expect(assessment).not.toBeNull();

    expect(assessment?.impactGrade).toBe("A");
    expect(assessment?.evidenceUse).toBe("dynamic_trait_evidence");

    const observations = buildFreeTopicEvidenceObservations({
      assessment: assessment!,
      observedAt: "2026-07-10T00:00:00.000Z",
      scoresByTargetId: {
        "facet:RO-EC": 72,
        "facet:RO-RN": 64,
        "facet:SE-AI": 80,
      },
    });

    expect(observations).toEqual([]);
  });

  it("gives every open question a concrete situation label", () => {
    [
      "conversation-temperature",
      "apology-style",
      "distance-rhythm",
      "conflict-repair",
      "recharge-routine",
      "focus-switch",
      "organizing-style",
      "mood-shift",
      "hurt-expression",
      "comfort-style",
    ].forEach((slug) => {
      getFreeTopicQuestions(slug).forEach((question) => {
        expect(question.contextLabel.trim().length).toBeGreaterThanOrEqual(4);
        expect(question.text).not.toContain(question.contextLabel);
      });
    });
  });

  it("uses four common scenes for each independent recharge path", () => {
    const questions = getFreeTopicQuestions("recharge-routine");
    const countByScale = questions.reduce<Record<string, number>>(
      (counts, question) => {
        const scaleId = question.reportScaleId ?? "missing";
        counts[scaleId] = (counts[scaleId] ?? 0) + 1;
        return counts;
      },
      {},
    );

    expect(questions).toHaveLength(12);
    expect(countByScale).toEqual({
      gentle_reactivation: 4,
      quiet_detachment: 4,
      supportive_connection: 4,
    });
    expect(questions.filter((question) => question.isReverse)).toHaveLength(0);
    [...new Set(questions.map((question) => question.contextLabel))].forEach(
      (contextLabel) => {
        expect(
          questions.filter(
            (question) => question.contextLabel === contextLabel,
          ),
        ).toHaveLength(3);
      },
    );
  });

  it("uses four common scenes for each independent focus-switch action", () => {
    const questions = getFreeTopicQuestions("focus-switch");
    const countByScale = questions.reduce<Record<string, number>>(
      (counts, question) => {
        const scaleId = question.reportScaleId ?? "missing";
        counts[scaleId] = (counts[scaleId] ?? 0) + 1;
        return counts;
      },
      {},
    );

    expect(questions).toHaveLength(12);
    expect(countByScale).toEqual({
      goal_reorientation: 4,
      resumption_cue: 4,
      small_reentry: 4,
    });
    expect(questions.filter((question) => question.isReverse)).toHaveLength(0);
    expect(
      new Set(questions.map((question) => question.contextLabel)).size,
    ).toBe(4);
  });

  it("uses four common scenes for each independent organizing action", () => {
    const questions = getFreeTopicQuestions("organizing-style");
    const countByScale = questions.reduce<Record<string, number>>(
      (counts, question) => {
        const scaleId = question.reportScaleId ?? "missing";
        counts[scaleId] = (counts[scaleId] ?? 0) + 1;
        return counts;
      },
      {},
    );

    expect(questions).toHaveLength(16);
    expect(countByScale).toEqual({
      adaptive_reset: 4,
      batch_reset: 4,
      stable_structure: 4,
      visible_capture: 4,
    });
    expect(questions.filter((question) => question.isReverse)).toHaveLength(0);
    expect(
      new Set(questions.map((question) => question.contextLabel)).size,
    ).toBe(4);
    expect(questions.map((question) => question.text).join("\n")).not.toContain(
      "둘 곳",
    );
    expect(questions.find((question) => question.id === "os-04")?.text).toBe(
      "목록이나 달력에서 종류·마감일·날짜에 따라 나누어 정리하는 편이다.",
    );
  });

  it("does not turn an unfamiliar comfort scene into a midpoint score", () => {
    const assessment = getFreeTopicAssessment("comfort-style")!;
    const questions = getFreeTopicQuestions("comfort-style");
    let emotionalAnswers = 0;
    const answers = Object.fromEntries(
      questions.map((question) => {
        if (question.reportScaleId === "emotional_acknowledgement") {
          emotionalAnswers += 1;
          return emotionalAnswers <= 2
            ? [
                question.id,
                {
                  answeredAt: "2026-07-28T00:00:00.000Z",
                  questionId: question.id,
                  value: 5 as const,
                },
              ]
            : [
                question.id,
                {
                  answeredAt: "2026-07-28T00:00:00.000Z",
                  questionId: question.id,
                  unsureReason: "NO_EXPERIENCE" as const,
                },
              ];
        }

        return [
          question.id,
          {
            answeredAt: "2026-07-28T00:00:00.000Z",
            questionId: question.id,
            value: 4 as const,
          },
        ];
      }),
    );
    const result = calculateFreeTopicResult({
      answers,
      assessment,
      observedAt: "2026-07-28T00:01:00.000Z",
    });

    expect(result.validResponsesByScaleId).toMatchObject({
      autonomy_pacing: 2,
      collaborative_problem_solving: 2,
      emotional_acknowledgement: 2,
    });
    expect(result.scoresByScaleId).toEqual({});
    expect(result.scoresByTargetId).toEqual({});
  });

  it("excludes an incomplete hurt-expression scene instead of inventing midpoint answers", () => {
    const assessment = getFreeTopicAssessment("hurt-expression")!;
    const questions = getFreeTopicQuestions("hurt-expression");
    const contextLabels = [
      ...new Set(questions.map((question) => question.contextLabel)),
    ];
    const buildAnswers = (excludedContextLabels: string[]) =>
      Object.fromEntries(
        questions.map((question) => [
          question.id,
          excludedContextLabels.includes(question.contextLabel)
            ? {
                answeredAt: "2026-07-28T00:00:00.000Z",
                questionId: question.id,
                unsureReason: "NO_EXPERIENCE" as const,
              }
            : {
                answeredAt: "2026-07-28T00:00:00.000Z",
                questionId: question.id,
                value: 4 as const,
              },
        ]),
      );

    const threeSceneResult = calculateFreeTopicResult({
      answers: buildAnswers([contextLabels[0]]),
      assessment,
      observedAt: "2026-07-28T00:01:00.000Z",
    });

    expect(threeSceneResult.validResponsesByScaleId).toEqual({
      change_request: 3,
      feeling_expression: 3,
      specific_event_expression: 3,
    });
    expect(threeSceneResult.scoresByScaleId).toEqual({
      change_request: 75,
      feeling_expression: 75,
      specific_event_expression: 75,
    });

    const twoSceneResult = calculateFreeTopicResult({
      answers: buildAnswers([contextLabels[0], contextLabels[1]]),
      assessment,
      observedAt: "2026-07-28T00:02:00.000Z",
    });

    expect(twoSceneResult.validResponsesByScaleId).toEqual({
      change_request: 2,
      feeling_expression: 2,
      specific_event_expression: 2,
    });
    expect(twoSceneResult.scoresByScaleId).toEqual({});
  });

  it("builds user-facing report signals without exposing internal target codes", () => {
    const assessment = getFreeTopicAssessment("conversation-temperature");
    expect(assessment).not.toBeNull();

    const report = buildFreeTopicResultReport({
      assessment: assessment!,
      result: {
        observations: buildFreeTopicEvidenceObservations({
          assessment: assessment!,
          observedAt: "2026-07-10T00:00:00.000Z",
          scoresByTargetId: {
            "facet:RO-EC": 72,
            "facet:RO-RN": 50,
            "facet:SE-AI": 100,
          },
        }),
        scoresByTargetId: {
          "facet:RO-EC": 72,
          "facet:RO-RN": 50,
          "facet:SE-AI": 100,
        },
      },
    });
    const serialized = JSON.stringify(report);

    expect(report.signals.map((signal) => signal.label)).toEqual([
      "상대 마음 살피기",
      "기준과 선택 존중",
      "먼저 말 꺼내기",
    ]);
    expect(report.headline).toContain("먼저 말 꺼내기");
    expect(report.headline).toContain("3개의 질문");
    expect(serialized).not.toContain("RO-EC");
    expect(serialized).not.toContain("RO-RN");
    expect(serialized).not.toContain("SE-AI");
    expect(serialized).not.toContain("facet:");
  });

  it("also excludes preference topics from representative-code evidence", () => {
    const assessment = getFreeTopicAssessment("cafe-seat-style");
    expect(assessment?.impactGrade).toBe("A");
    expect(assessment?.evidenceUse).toBe("dynamic_trait_evidence");

    const observations = buildFreeTopicEvidenceObservations({
      assessment: assessment!,
      observedAt: "2026-07-10T00:00:00.000Z",
      scoresByTargetId: Object.fromEntries(
        assessment!.mappings.map((mapping) => [
          buildTargetKey(mapping.target),
          70,
        ]),
      ),
    });

    expect(observations).toEqual([]);
  });

  it("names the opposite behavior when a result is clearly below the midpoint", () => {
    const assessment = getFreeTopicAssessment("conversation-temperature")!;
    const report = buildFreeTopicResultReport({
      assessment,
      result: {
        observations: [],
        scoresByTargetId: {
          "facet:RO-EC": 0,
          "facet:RO-RN": 50,
          "facet:SE-AI": 25,
        },
      },
    });

    expect(report.signals.map((signal) => signal.label)).toEqual([
      "핵심과 해결 먼저 보기",
      "기준과 선택 존중",
      "흐름을 보고 말하기",
    ]);
    expect(report.headline).toContain("핵심과 해결 먼저 보기");
  });
});
