import { z } from "zod";
import { traitMapScenarioCatalogV2 } from "@/features/nuang-code/trait-map-data-center-v2";

export const traitMapScenarioValidationContractVersion =
  "nuang-trait-map-scenario-validation.v2";

export const traitMapScenarioValidationInternalGatesV2 = {
  minimumCognitiveInterviewsPerContext: 8,
  minimumQuantitativeResponsesPerScenario: 30,
  minimumComprehensionPassRate: 0.8,
  minimumConcreteRecallPassRate: 0.7,
  minimumThoughtResponseDistinctionPassRate: 0.8,
  maximumStereotypeConcernRate: 0.1,
  maximumUnclearWordRate: 0.1,
} as const;

const canonicalScenarioIds = traitMapScenarioCatalogV2.map(
  (scenario) => scenario.scenarioId,
);

export const traitMapScenarioValidationResponseV2Schema = z
  .object({
    contractVersion: z.literal(traitMapScenarioValidationContractVersion),
    studyId: z.string().min(1),
    participantToken: z
      .string()
      .min(8)
      .describe("이름·이메일 대신 사용하는 연구용 익명 토큰"),
    consentVersion: z.string().min(1),
    participantCode: z.literal("ENAKQ"),
    codeEvidence: z.enum([
      "precision_assessment",
      "quick_assessment",
      "self_identified",
      "unknown",
    ]),
    scenarioId: z.enum(
      canonicalScenarioIds as [
        (typeof canonicalScenarioIds)[number],
        ...(typeof canonicalScenarioIds)[number][],
      ],
    ),
    presentedClaimIds: z.array(z.string().regex(/^ENAKQ\./)).min(2),
    contextFamiliarity: z.number().int().min(1).max(5),
    comprehension: z.object({
      understoodMeaning: z.number().int().min(1).max(5),
      paraphrase: z.string().min(1),
      unclearWords: z.array(z.string().min(1)),
    }),
    recall: z.object({
      couldRecallConcreteExperience: z.boolean(),
      example: z.string().optional(),
      recency: z
        .enum([
          "within_1_month",
          "within_6_months",
          "within_1_year",
          "older",
          "not_recalled",
        ])
        .optional(),
    }),
    judgment: z.object({
      firstThoughtFit: z.number().int().min(1).max(5).nullable(),
      actualResponseFit: z.number().int().min(1).max(5).nullable(),
      thoughtResponseDistinction: z.number().int().min(1).max(5),
      differingCondition: z.string().optional(),
    }),
    languageAndSafety: z.object({
      feltStereotyped: z.boolean(),
      feltJudged: z.boolean(),
      relationshipOutcomeImplied: z.boolean(),
      abilityImplied: z.boolean(),
      feedback: z.string().optional(),
    }),
    skipped: z.boolean(),
    skipReason: z
      .enum([
        "no_relevant_experience",
        "too_personal",
        "unclear_scenario",
        "prefer_not_to_answer",
        "other",
      ])
      .optional(),
    durationMs: z.number().int().nonnegative(),
    submittedAt: z.string().datetime(),
  })
  .superRefine((response, context) => {
    if (
      response.recall.couldRecallConcreteExperience &&
      !response.recall.example
    ) {
      context.addIssue({
        code: "custom",
        message: "구체적인 경험을 떠올렸다면 예시를 함께 기록해야 해요.",
        path: ["recall", "example"],
      });
    }
    if (response.skipped && !response.skipReason) {
      context.addIssue({
        code: "custom",
        message: "건너뛴 응답에는 이유가 필요해요.",
        path: ["skipReason"],
      });
    }
    if (!response.skipped && response.skipReason) {
      context.addIssue({
        code: "custom",
        message: "완료한 응답에는 건너뛴 이유를 저장하지 않아요.",
        path: ["skipReason"],
      });
    }
  });

export type TraitMapScenarioValidationResponseV2 = z.infer<
  typeof traitMapScenarioValidationResponseV2Schema
>;

export function summarizeTraitMapScenarioValidationV2(
  responses: readonly TraitMapScenarioValidationResponseV2[],
) {
  const completed = responses.filter((response) => !response.skipped);
  const rate = (
    predicate: (response: TraitMapScenarioValidationResponseV2) => boolean,
  ) =>
    completed.length === 0
      ? 0
      : completed.filter(predicate).length / completed.length;

  const summary = {
    totalResponses: responses.length,
    completedResponses: completed.length,
    comprehensionPassRate: rate(
      (response) => response.comprehension.understoodMeaning >= 4,
    ),
    concreteRecallPassRate: rate(
      (response) => response.recall.couldRecallConcreteExperience,
    ),
    thoughtResponseDistinctionPassRate: rate(
      (response) => response.judgment.thoughtResponseDistinction >= 4,
    ),
    stereotypeConcernRate: rate(
      (response) => response.languageAndSafety.feltStereotyped,
    ),
    unclearWordRate: rate(
      (response) => response.comprehension.unclearWords.length > 0,
    ),
  };

  return {
    ...summary,
    passesInternalLanguageGate:
      summary.comprehensionPassRate >=
        traitMapScenarioValidationInternalGatesV2.minimumComprehensionPassRate &&
      summary.concreteRecallPassRate >=
        traitMapScenarioValidationInternalGatesV2.minimumConcreteRecallPassRate &&
      summary.thoughtResponseDistinctionPassRate >=
        traitMapScenarioValidationInternalGatesV2.minimumThoughtResponseDistinctionPassRate &&
      summary.stereotypeConcernRate <=
        traitMapScenarioValidationInternalGatesV2.maximumStereotypeConcernRate &&
      summary.unclearWordRate <=
        traitMapScenarioValidationInternalGatesV2.maximumUnclearWordRate,
  };
}
