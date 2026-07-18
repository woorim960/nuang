import { z } from "zod";
import { consentDraftSchema } from "@/features/consent/consent-draft";
import {
  getProfileVisibilityRule,
  profileVisibilityFieldIds,
  profileVisibilityPolicyVersion,
} from "@/features/together/profile-visibility-policy";

const profileVisibilityFieldIdSchema = z.enum(profileVisibilityFieldIds);
const profileVisibilityLevelSchema = z.enum(["public", "private"]);

export const profileVisibilitySettingRequestSchema = z
  .object({
    fieldId: profileVisibilityFieldIdSchema,
    visibility: profileVisibilityLevelSchema,
  })
  .superRefine((setting, context) => {
    const rule = getProfileVisibilityRule(setting.fieldId);

    if (rule?.comparisonUse === "blocked" && setting.visibility !== "private") {
      context.addIssue({
        code: "custom",
        message: "Blocked profile fields must remain private.",
        path: ["visibility"],
      });
    }
  });

export const saveProfileVisibilityRequestSchema = z
  .object({
    consentDraft: consentDraftSchema,
    policyVersion: z.literal(profileVisibilityPolicyVersion),
    settings: z
      .array(profileVisibilitySettingRequestSchema)
      .length(profileVisibilityFieldIds.length),
  })
  .superRefine((payload, context) => {
    const seen = new Set(payload.settings.map((setting) => setting.fieldId));

    if (seen.size !== profileVisibilityFieldIds.length) {
      context.addIssue({
        code: "custom",
        message: "Profile visibility settings must include every field once.",
        path: ["settings"],
      });
    }

    profileVisibilityFieldIds.forEach((fieldId) => {
      if (!seen.has(fieldId)) {
        context.addIssue({
          code: "custom",
          message: `Missing visibility setting for ${fieldId}.`,
          path: ["settings"],
        });
      }
    });
  });

export const createPublicComparisonRequestSchema = z
  .object({
    policyVersion: z.literal(profileVisibilityPolicyVersion),
    target: z
      .object({
        publicSnapshotId: z.string().uuid(),
      })
      .strict(),
    viewerResultReportId: z.string().uuid().optional(),
  });
