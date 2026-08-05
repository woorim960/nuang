import { z } from "zod";

export const assessmentStudioCategories = [
  "core",
  "topic",
  "lab",
  "together",
] as const;

export const assessmentStudioSubtypes = [
  "core_quick",
  "core_precision",
  "free_topic",
  "odd_lab",
  "balance_pack",
  "friend_match",
] as const;

export const assessmentStudioStatuses = [
  "draft",
  "in_review",
  "published",
  "paused",
  "archived",
] as const;

export type AssessmentStudioCategory =
  (typeof assessmentStudioCategories)[number];
export type AssessmentStudioSubtype =
  (typeof assessmentStudioSubtypes)[number];
export type AssessmentStudioStatus =
  (typeof assessmentStudioStatuses)[number];

export const assessmentStudioDocumentSchema = z
  .object({
    ageAccessPolicy: z.enum([
      "all_ages",
      "adult_verification_required",
    ]),
    caption: z.string().trim().max(240),
    category: z.enum(assessmentStudioCategories),
    description: z.string().trim().max(500),
    estimatedMinutes: z.number().int().min(1).max(120),
    payload: z.record(z.string(), z.unknown()),
    schemaVersion: z.literal(1),
    sensitivity: z.enum(["general", "caution"]),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    subtype: z.enum(assessmentStudioSubtypes),
    title: z.string().trim().min(1).max(120),
  })
  .strict();

export type AssessmentStudioDocument = z.infer<
  typeof assessmentStudioDocumentSchema
>;

export type AssessmentStudioValidationIssue = {
  code: string;
  fieldPath: string;
  message: string;
  severity: "blocker" | "warning" | "info";
};

export type AssessmentStudioRelease = {
  id: string;
  releaseNumber: number;
  releaseKey: string;
  contentHash: string;
  changeNote: string;
  publishedAt: string;
  retiredAt: string | null;
};

export type AssessmentStudioEntry = {
  id: string | null;
  sourceKey: string;
  sourceOrigin: "builtin" | "operator";
  category: AssessmentStudioCategory;
  subtype: AssessmentStudioSubtype;
  slug: string;
  title: string;
  summary: string;
  status: AssessmentStudioStatus;
  document: AssessmentStudioDocument;
  workingRevision: number;
  publishedReleaseId: string | null;
  publishedReleaseKey: string | null;
  hasUnpublishedChanges: boolean;
  displayOrder: number;
  itemCount: number;
  resultCount: number;
  updatedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  releases: AssessmentStudioRelease[];
  validationIssues: AssessmentStudioValidationIssue[];
};

export type AssessmentStudioDashboard = {
  entries: AssessmentStudioEntry[];
  generatedAt: string;
  databaseAvailable: boolean;
  counts: {
    total: number;
    published: number;
    inReview: number;
    blocked: number;
    paused: number;
    archived: number;
  };
};

export const assessmentStudioWriteSchema = z
  .object({
    action: z.literal("save"),
    displayOrder: z.number().int().min(0).max(100_000),
    document: assessmentStudioDocumentSchema,
    entryId: z.string().uuid().nullable(),
    expectedRevision: z.number().int().positive().nullable(),
    sourceOrigin: z.enum(["builtin", "operator"]),
  })
  .strict();

export const assessmentStudioManagementSchema = z
  .object({
    action: z.enum([
      "submit_review",
      "return_draft",
      "publish",
      "pause",
      "archive",
      "restore",
    ]),
    entryId: z.string().uuid(),
    note: z.string().trim().min(5).max(1000),
  })
  .strict();

export const assessmentStudioReorderSchema = z
  .object({
    action: z.literal("reorder"),
    entryIds: z.array(z.string().uuid()).min(1).max(500),
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export const assessmentStudioRollbackSchema = z
  .object({
    action: z.literal("rollback"),
    entryId: z.string().uuid(),
    note: z.string().trim().min(5).max(1000),
    releaseId: z.string().uuid(),
  })
  .strict();

export const assessmentStudioActionSchema = z.discriminatedUnion("action", [
  assessmentStudioManagementSchema,
  assessmentStudioRollbackSchema,
]);
