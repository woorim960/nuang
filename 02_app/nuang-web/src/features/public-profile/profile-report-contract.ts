import { z } from "zod";

export const profileReportKindSchema = z.enum(["core", "lab", "topic"]);
export const profileReportVisibilitySchema = z.enum([
  "private",
  "profile_public",
]);

export const profileReportKeySchema = z
  .string()
  .regex(/^(core|topic|lab)_[0-9a-f-]{36}$/i);

export const updateProfileReportVisibilityRequestSchema = z.object({
  reportKey: profileReportKeySchema,
  visibility: profileReportVisibilitySchema,
});

export type ProfileReportKind = z.infer<typeof profileReportKindSchema>;
export type ProfileReportVisibility = z.infer<
  typeof profileReportVisibilitySchema
>;

export type OriginalProfileReportSummary = {
  assessmentSlug: string;
  assessmentTitle: string;
  completedAt: string;
  reportKey: string;
  resultName: string;
  summary: string;
  type: ProfileReportKind;
  viewerCanManage: boolean;
  visibility: ProfileReportVisibility;
};

export function createProfileReportKey(
  kind: ProfileReportKind,
  sourceId: string,
) {
  return profileReportKeySchema.parse(`${kind}_${sourceId}`);
}

export function parseProfileReportKey(value: string) {
  const parsed = profileReportKeySchema.safeParse(value);
  if (!parsed.success) return null;
  const separatorIndex = parsed.data.indexOf("_");

  return {
    kind: parsed.data.slice(0, separatorIndex) as ProfileReportKind,
    sourceId: parsed.data.slice(separatorIndex + 1),
  };
}

export function getProfileReportKindLabel(kind: ProfileReportKind) {
  if (kind === "core") return "뉴앙 코어";
  if (kind === "topic") return "성향 검사";
  return "별난 연구소";
}
