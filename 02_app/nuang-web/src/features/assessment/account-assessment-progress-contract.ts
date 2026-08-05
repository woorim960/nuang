import { z } from "zod";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { reportContentSnapshotSchema } from "@/features/result/unified-core-report/report-content-snapshot-contract";

const responseValueSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

const unsureReasonSchema = z.enum([
  "NO_EXPERIENCE",
  "CONTEXT_VARIES",
  "WORDING_UNCLEAR",
  "PREFER_NOT_TO_ANSWER",
]);

const assessmentAnswerSchema = z
  .object({
    answeredAt: z.string().datetime(),
    isUnsure: z.boolean().optional(),
    itemId: z.string().min(1).max(120),
    unsureReason: unsureReasonSchema.optional(),
    value: responseValueSchema.optional(),
  })
  .superRefine((answer, context) => {
    const hasValue = answer.value !== undefined;
    const isUnsure = answer.isUnsure === true;

    if (hasValue === isUnsure) {
      context.addIssue({
        code: "custom",
        message: "응답 값과 판단 어려움 중 하나만 선택해야 합니다.",
        path: ["value"],
      });
    }

    if (!isUnsure && answer.unsureReason) {
      context.addIssue({
        code: "custom",
        message: "판단 어려움 사유는 판단 어려움 응답에만 사용할 수 있습니다.",
        path: ["unsureReason"],
      });
    }
  });

const facetScoreSchema = z.object({
  facetId: z.string().min(1).max(24),
  label: z.string().min(1).max(80),
  score: z.number().min(0).max(100).nullable(),
  status: z.enum(["valid", "partial", "insufficient"]),
  validResponses: z.number().int().min(0).max(80),
});

const domainScoreSchema = z.object({
  domainId: z.string().min(1).max(24),
  isBoundary: z.boolean(),
  label: z.string().min(1).max(80),
  score: z.number().min(0).max(100).nullable(),
  status: z.enum(["valid", "partial", "insufficient"]),
  symbol: z.string().min(1).max(8).nullable(),
});

const resultSnapshotSchema = z.object({
  assessmentReleaseId: z.string().min(1).max(120),
  codeSchemeVersion: z.string().min(1).max(120),
  createdAt: z.string().datetime(),
  reportContentSnapshot: reportContentSnapshotSchema.optional(),
  responseSnapshotHash: z.string().min(8).max(160),
  resultCopyVersion: z.string().min(1).max(120),
  resultStatus: z.enum(["ready", "insufficient_evidence"]),
  scoreResult: z.object({
    alternativeCodes: z.array(z.string().regex(/^[A-Z]{5}$/)).max(5),
    code: z.string().regex(/^[A-Z]{5}$/).nullable(),
    domains: z.array(domainScoreSchema).max(5),
    facets: z.array(facetScoreSchema).max(10),
    profileName: z.string().min(1).max(120).nullable(),
  }),
  scoringModelVersion: z.string().min(1).max(120),
  scoringReleaseId: z.string().min(1).max(120),
});

const milestoneSchema = z.object({
  contentVersion: z.string().min(1).max(120),
  id: z.literal("HALFWAY_BREAK_V1"),
  resolvedAt: z.string().datetime().optional(),
  shownAt: z.string().datetime(),
  status: z.enum(["shown", "completed", "deferred"]),
});

const assessmentItemSnapshotSchema = z.object({
  contextLabel: z.string().max(240).optional(),
  domainId: z.string().min(1).max(24),
  facetId: z.string().min(1).max(24),
  isReverse: z.boolean(),
  itemId: z.string().min(1).max(120),
  responseFormat: z.enum(["frequency_5", "forced_direction_4"]).optional(),
  text: z.string().min(1).max(1000),
});

const assessmentDefinitionSnapshotSchema = z.object({
  adaptiveItems: z.array(assessmentItemSnapshotSchema).max(20).optional(),
  assessmentId: z.enum(["nu-core-quick", "nu-core-full"]),
  contentReleaseId: z.string().uuid().optional(),
  estimatedMinutes: z.number().int().min(1).max(120),
  items: z.array(assessmentItemSnapshotSchema).min(1).max(80),
  mode: z.enum(["quick", "full"]),
  releaseId: z.string().min(1).max(120),
  resultLabel: z.string().min(1).max(160),
  title: z.string().min(1).max(160),
});

export const accountAssessmentProgressAttemptSchema = z
  .object({
    adaptiveItemIds: z.array(z.string().min(1).max(120)).max(20).optional(),
    adaptiveStatus: z
      .enum(["intro", "in_progress", "completed"])
      .optional(),
    assessmentId: z.enum(["nu-core-quick", "nu-core-full"]),
    assessmentContentReleaseId: z.string().uuid().optional(),
    assessmentSnapshot: assessmentDefinitionSnapshotSchema.optional(),
    completedAt: z.string().datetime().optional(),
    completionRequestId: z.string().min(1).max(128).optional(),
    completionStatus: z
      .enum([
        "submitting",
        "completed",
        "insufficient_evidence",
        "failed",
      ])
      .optional(),
    createdAt: z.string().datetime(),
    currentIndex: z.number().int().min(0).max(99),
    expiresAt: z.string().datetime(),
    id: z.string().min(6).max(128),
    itemIds: z.array(z.string().min(1).max(120)).min(1).max(80),
    localPersistStatus: z
      .enum(["idle", "saving", "saved", "failed"])
      .optional(),
    milestones: z
      .object({ HALFWAY_BREAK_V1: milestoneSchema.optional() })
      .optional(),
    mode: z.enum(["quick", "full"]),
    releaseId: z.string().min(1).max(120),
    responseSnapshotHash: z.string().min(8).max(160).optional(),
    responses: z.record(z.string().min(1).max(120), assessmentAnswerSchema),
    resultCopyVersion: z.string().min(1).max(120).optional(),
    resultEvidenceStatus: z
      .enum(["clear", "near_boundary", "insufficient_evidence"])
      .optional(),
    resultSnapshot: resultSnapshotSchema.optional(),
    returnDestination: z.string().min(1).max(240).optional(),
    state: z.enum(["in_progress", "completed"]),
    updatedAt: z.string().datetime(),
  })
  .superRefine((attempt, context) => {
    if (Object.keys(attempt.responses).length > 80) {
      context.addIssue({
        code: "custom",
        message: "저장할 수 있는 응답 수를 초과했습니다.",
        path: ["responses"],
      });
    }

    for (const [itemId, answer] of Object.entries(attempt.responses)) {
      if (itemId !== answer.itemId) {
        context.addIssue({
          code: "custom",
          message: "응답 문항 식별자가 일치하지 않습니다.",
          path: ["responses", itemId],
        });
      }
    }

    if (
      attempt.state === "completed" &&
      (!attempt.completedAt || attempt.completionStatus !== "completed")
    ) {
      context.addIssue({
        code: "custom",
        message: "완료 기록에 필요한 상태 정보가 없습니다.",
        path: ["state"],
      });
    }
  });

export const accountAssessmentProgressPutSchema = z.object({
  attempt: accountAssessmentProgressAttemptSchema,
  expectedRevision: z.number().int().min(1).optional(),
});

export type AccountAssessmentProgressAttempt = z.infer<
  typeof accountAssessmentProgressAttemptSchema
>;

export type AccountAssessmentProgressEntry = {
  attempt: LocalAssessmentAttempt;
  revision: number;
  serverUpdatedAt?: string;
};

export type AccountAssessmentProgressGetSuccess = {
  accountId: string;
  attempts: AccountAssessmentProgressEntry[];
  ok: true;
};

export type AccountAssessmentProgressPutSuccess = {
  accountId: string;
  attempt: LocalAssessmentAttempt;
  ok: true;
  restored: boolean;
  revision: number;
};

export function createAssessmentProgressValidationFailure() {
  return {
    error: "assessment_progress_validation_failed",
    message: "검사 진행 기록을 확인할 수 없어요. 검사를 다시 열어 주세요.",
    ok: false,
  } as const;
}

export function createAssessmentProgressConflictFailure(
  currentRevision: number | null,
) {
  return {
    currentRevision,
    error: "assessment_progress_conflict",
    message:
      "다른 기기에서 검사 기록이 변경됐어요. 최신 기록을 불러온 뒤 다시 시도해 주세요.",
    ok: false,
  } as const;
}

export function createAssessmentProgressReadFailure() {
  return {
    error: "assessment_progress_read_failed",
    message: "검사 진행 기록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    ok: false,
  } as const;
}

export function createAssessmentProgressWriteFailure() {
  return {
    error: "assessment_progress_write_failed",
    message: "검사 진행 기록을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    ok: false,
  } as const;
}
