import { z } from "zod";

export const coreResultFeedbackSentiments = [
  "fit",
  "depends",
  "not_fit",
] as const;
export const coreResultFeedbackReasons = [
  "context_differs",
  "too_broad",
  "wording_unclear",
  "important_part_missing",
  "other",
] as const;
export const coreResultFeedbackStatuses = [
  "received",
  "reviewing",
  "incorporated",
  "dismissed",
] as const;

export type CoreResultFeedbackSentiment =
  (typeof coreResultFeedbackSentiments)[number];
export type CoreResultFeedbackReason =
  (typeof coreResultFeedbackReasons)[number];
export type CoreResultFeedbackStatus =
  (typeof coreResultFeedbackStatuses)[number];

export const coreResultFeedbackSentimentLabels: Record<
  CoreResultFeedbackSentiment,
  string
> = {
  depends: "상황에 따라 달라요",
  fit: "나와 비슷해요",
  not_fit: "나와 달라요",
};

export const coreResultFeedbackReasonLabels: Record<
  CoreResultFeedbackReason,
  string
> = {
  context_differs: "상황에 따라 모습이 달라요",
  important_part_missing: "중요한 모습이 빠졌어요",
  other: "다른 이유가 있어요",
  too_broad: "설명이 너무 넓어요",
  wording_unclear: "문장이 이해하기 어려워요",
};

export const coreResultFeedbackWriteSchema = z
  .object({
    contentKey: z.string().trim().min(1).max(160),
    contentVersion: z.string().trim().min(1).max(160),
    reason: z.enum(coreResultFeedbackReasons).nullable().default(null),
    resultReportId: z.uuid(),
    sectionId: z.string().trim().min(1).max(160),
    sentiment: z.enum(coreResultFeedbackSentiments),
    surface: z.enum(["completion", "my"]),
  })
  .strict();

export const adminCoreResultFeedbackActionSchema = z.object({
  feedbackId: z.uuid(),
  status: z.enum(["reviewing", "incorporated", "dismissed"]),
});

export type CoreResultFeedbackWriteInput = z.infer<
  typeof coreResultFeedbackWriteSchema
>;
