import { z } from "zod";
import { consentDraftSchema } from "@/features/consent/consent-draft";
import { localResultIdSchema } from "@/features/result-persistence/local-result-id-contract";

const claimResponseSchema = z
  .object({
    answeredAt: z.string().datetime(),
    isUnsure: z.boolean().optional(),
    itemId: z.string().min(1).max(120),
    unsureReason: z
      .enum([
        "NO_EXPERIENCE",
        "CONTEXT_VARIES",
        "WORDING_UNCLEAR",
        "PREFER_NOT_TO_ANSWER",
      ])
      .optional(),
    value: z.number().int().min(1).max(5).optional(),
  })
  .superRefine((response, context) => {
    const hasValue = response.value !== undefined;
    const isUnsure = response.isUnsure === true;

    if (hasValue === isUnsure) {
      context.addIssue({
        code: "custom",
        message: "응답 값과 판단 어려움 중 하나만 선택해야 합니다.",
        path: ["value"],
      });
    }

    if (!isUnsure && response.unsureReason) {
      context.addIssue({
        code: "custom",
        message: "판단 어려움 사유는 판단 어려움 응답에만 사용할 수 있습니다.",
        path: ["unsureReason"],
      });
    }
  });

export const claimResultRequestSchema = z.object({
  assessmentKind: z.enum(["quick", "full"]),
  localResultId: localResultIdSchema,
  responses: z.array(claimResponseSchema).min(1).max(80),
  versionBundle: z.object({
    assessmentReleaseId: z.string().min(1).max(120),
    codeSchemeVersion: z.string().min(1).max(120),
    scoringModelVersion: z.string().min(1).max(120),
    scoringReleaseId: z.string().min(1).max(120),
  }),
  resultSummary: z.object({
    completedAt: z.string().datetime(),
  }),
});

export const resultAccountStatusQuerySchema = z.object({
  localResultId: localResultIdSchema,
});

export const createShareLinkRequestSchema = z.object({
  consentDraft: consentDraftSchema,
  resultReportId: z.string().uuid(),
  ttlDays: z.number().int().min(1).max(30).default(30),
  visibility: z.enum(["summary"]).default("summary"),
});

export const revokeShareLinkRequestSchema = z.object({
  shareLinkId: z.string().uuid(),
});
