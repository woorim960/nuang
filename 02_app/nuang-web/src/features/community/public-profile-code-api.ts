import { z } from "zod";
import {
  normalizePublicProfileCodeCandidate,
  publicProfileCodePolicyVersion,
  validatePublicProfileCode,
} from "@/features/community/public-profile-code-policy";
import { consentDraftSchema } from "@/features/consent/consent-draft";
import { profileVisibilityPolicyVersion } from "@/features/together/profile-visibility-policy";

export const issuePublicProfileCodeRequestSchema = z
  .object({
    codePolicyVersion: z.literal(publicProfileCodePolicyVersion),
    consentDraft: consentDraftSchema,
    profileVisibilityPolicyVersion: z.literal(profileVisibilityPolicyVersion),
    publicSnapshotId: z.string().uuid().optional(),
    requestedCode: z
      .string()
      .trim()
      .min(4)
      .max(32)
      .transform((code) => normalizePublicProfileCodeCandidate(code))
      .optional(),
    resultReportId: z.string().uuid().optional(),
  })
  .superRefine((payload, context) => {
    if (!payload.publicSnapshotId && !payload.resultReportId) {
      context.addIssue({
        code: "custom",
        message: "A public snapshot id or result report id is required.",
        path: ["publicSnapshotId"],
      });
    }

    if (payload.requestedCode) {
      const validation = validatePublicProfileCode(payload.requestedCode);

      if (!validation.ok) {
        context.addIssue({
          code: "custom",
          message: validation.message,
          path: ["requestedCode"],
        });
      }
    }
  });
