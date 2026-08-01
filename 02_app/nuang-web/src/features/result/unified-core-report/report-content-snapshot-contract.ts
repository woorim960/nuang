import { z } from "zod";

export const reportContentSnapshotVersion =
  "nuang-core-result-content-snapshot.v2" as const;

const sourceClassSchema = z.enum([
  "measurement",
  "current_customer_guide",
  "approved_canonical",
  "reflection_prompt",
]);
const privacyScopeSchema = z.enum([
  "owner_only",
  "profile_public",
  "share_public",
]);

const reportContentSnapshotSectionV2Schema = z.object({
  canonicalVariantId: z.string().min(1).max(160).nullable(),
  canonicalVersion: z.number().int().min(1).nullable(),
  contentKey: z.string().min(1).max(160),
  contentVersion: z.string().min(1).max(160),
  privacyScope: privacyScopeSchema,
  sectionId: z.string().min(1).max(160),
  sourceClass: sourceClassSchema,
});

const reportContentSnapshotV2Schema = z.object({
  excerptManifestDigest: z
    .string()
    .min(1)
    .max(160)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  guideVersion: z
    .string()
    .min(1)
    .max(160)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  manifestDigest: z.string().min(1).max(160),
  profileNameReleaseId: z.string().min(1).max(120),
  schemaVersion: z.literal(reportContentSnapshotVersion),
  sections: z.array(reportContentSnapshotSectionV2Schema).max(40),
  surface: z.literal("owner_report"),
  traitMapBaselineId: z.string().min(1).max(120),
});

const legacyReportContentSnapshotSchema = z.object({
  manifestDigest: z.string().min(1).max(160),
  profileNameReleaseId: z.string().min(1).max(120),
  sections: z
    .array(
      z.object({
        canonicalVariantId: z.string().min(1).max(160).nullable(),
        contentKey: z.string().min(1).max(160),
        privacyScope: privacyScopeSchema,
        sectionId: z.string().min(1).max(160),
        sourceClass: sourceClassSchema,
        version: z.number().int().min(1),
      }),
    )
    .max(40),
  surface: z.literal("owner_report"),
  traitMapBaselineId: z.string().min(1).max(120),
});

export const reportContentSnapshotSchema = z
  .union([reportContentSnapshotV2Schema, legacyReportContentSnapshotSchema])
  .transform((snapshot) => {
    if ("schemaVersion" in snapshot) return snapshot;

    return {
      ...snapshot,
      excerptManifestDigest: null,
      guideVersion: null,
      schemaVersion: reportContentSnapshotVersion,
      sections: snapshot.sections.map((section) => ({
        canonicalVariantId: section.canonicalVariantId,
        canonicalVersion: section.canonicalVariantId ? section.version : null,
        contentKey: section.contentKey,
        contentVersion: section.canonicalVariantId
          ? `canonical-${section.version}`
          : `legacy-${section.version}`,
        privacyScope: section.privacyScope,
        sectionId: section.sectionId,
        sourceClass: section.sourceClass,
      })),
    };
  });

export type ReportContentSnapshot = z.output<
  typeof reportContentSnapshotSchema
>;
