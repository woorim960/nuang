import { z } from "zod";

export const assessmentQualityObservationSchema = z
  .object({
    assessmentSlug: z.string().regex(/^[a-z0-9-]{2,80}$/),
    clientSessionId: z.uuid(),
    instrumentVersion: z.string().trim().min(3).max(120),
    localResultId: z.string().trim().min(6).max(128).optional(),
    productReleaseId: z.string().uuid().optional(),
    observations: z
      .array(
        z.discriminatedUnion("kind", [
          z.object({
            kind: z.literal("item_experience"),
            questionId: z.string().trim().min(2).max(100),
            response: z.enum([
              "answered",
              "no_experience",
              "context_varies",
              "wording_unclear",
              "prefer_not_to_answer",
            ]),
            dwellBucket: z.enum([
              "under_3s",
              "3_to_10s",
              "10_to_30s",
              "over_30s",
            ]),
            revisionBucket: z.enum(["none", "once", "multiple"]),
          }),
          z.object({
            kind: z.literal("result_fit"),
            helpfulness: z.enum(["low", "middle", "high"]).optional(),
            fit: z.enum(["low", "middle", "high"]).optional(),
          }),
        ]),
      )
      .min(1)
      .max(40),
    submissionId: z.uuid(),
  })
  .strict();

export type AssessmentQualityObservationInput = z.infer<
  typeof assessmentQualityObservationSchema
>;

export function classifyAssessmentQualityPriority(
  observation: AssessmentQualityObservationInput["observations"][number],
) {
  if (
    (observation.kind === "item_experience" &&
      observation.response === "wording_unclear") ||
    (observation.kind === "result_fit" && observation.fit === "low")
  ) {
    return "high" as const;
  }
  if (
    (observation.kind === "item_experience" &&
      (observation.response === "context_varies" ||
        observation.revisionBucket === "multiple" ||
        observation.dwellBucket === "over_30s")) ||
    (observation.kind === "result_fit" && observation.helpfulness === "low")
  ) {
    return "medium" as const;
  }
  return "normal" as const;
}
