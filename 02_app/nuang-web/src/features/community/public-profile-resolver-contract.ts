import { z } from "zod";
import {
  publicProfileCardContractVersion,
  type PublicProfileCardPayload,
} from "@/features/community/public-profile-card-contract";
import {
  validatePublicProfileCode,
} from "@/features/community/public-profile-code-policy";
import { profileVisibilityPolicyVersion } from "@/features/together/profile-visibility-policy";

export { publicProfileCodePattern } from "@/features/community/public-profile-code-policy";

export const publicProfileResolverContractVersion =
  "public-profile-resolver.v0.1";

export const publicProfileResolveRequestSchema = z
  .object({
    reference: z.string().trim().min(4).max(180),
  })
  .transform((payload) => ({
    reference: payload.reference,
    publicProfileCode: normalizePublicProfileReference(payload.reference),
  }))
  .superRefine((payload, context) => {
    if (!payload.publicProfileCode) {
      context.addIssue({
        code: "custom",
        message: "A valid NUANG public profile code or link is required.",
        path: ["reference"],
      });
    }
  });

export type PublicProfileResolverFailureCode =
  | "invalid_public_profile_reference"
  | "public_profile_not_found"
  | "public_profile_unavailable"
  | "public_profile_lookup_failed";

export type PublicProfileResolverStepId =
  | "normalize_public_profile_reference"
  | "lookup_public_profile_code"
  | "read_public_profile_snapshot"
  | "project_public_profile_card"
  | "return_noindex_public_profile";

export const publicProfileResolverSteps = [
  {
    id: "normalize_public_profile_reference",
    operation: "parse_code_or_profile_link",
  },
  {
    id: "lookup_public_profile_code",
    operation: "resolve_public_profile_code",
  },
  {
    id: "read_public_profile_snapshot",
    operation: "read_published_snapshot_scope",
  },
  {
    id: "project_public_profile_card",
    operation: "summary_card_projection",
  },
  {
    id: "return_noindex_public_profile",
    operation: "return_public_profile_payload",
  },
] as const satisfies ReadonlyArray<{
  id: PublicProfileResolverStepId;
  operation: string;
}>;

export const publicProfileResolverFailures: Record<
  PublicProfileResolverFailureCode,
  {
    httpStatus: 400 | 404 | 410 | 500;
    message: string;
    retryable: boolean;
    step: PublicProfileResolverStepId;
  }
> = {
  invalid_public_profile_reference: {
    httpStatus: 400,
    message: "공개 프로필 코드나 링크 형식을 확인해 주세요.",
    retryable: false,
    step: "normalize_public_profile_reference",
  },
  public_profile_not_found: {
    httpStatus: 404,
    message: "공개 프로필을 찾을 수 없어요.",
    retryable: false,
    step: "lookup_public_profile_code",
  },
  public_profile_unavailable: {
    httpStatus: 410,
    message: "현재 공개되지 않은 프로필이에요.",
    retryable: false,
    step: "read_public_profile_snapshot",
  },
  public_profile_lookup_failed: {
    httpStatus: 500,
    message: "공개 프로필을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "lookup_public_profile_code",
  },
};

export type PublicProfileResolverSuccessPayload = {
  ok: true;
  publicProfile: {
    card: PublicProfileCardPayload;
    code: string;
    contractVersion: typeof publicProfileResolverContractVersion;
    noindexRequired: true;
    policyVersion: typeof profileVisibilityPolicyVersion;
    profilePath: string;
    sourceCardContractVersion: typeof publicProfileCardContractVersion;
  };
  privacy: {
    includesAccountIdentity: false;
    includesCrisisHelpInteractions: false;
    includesDirectResponses: false;
    includesRawScorePayload: false;
    includesSensitiveAssessments: false;
  };
};

export function normalizePublicProfileReference(reference: string) {
  const trimmed = reference.trim();
  const pathMatch = trimmed.match(/(?:^|\/)p\/([^/?#]+)/i);
  const candidate = pathMatch?.[1] ?? trimmed;
  const validation = validatePublicProfileCode(candidate);

  return validation.ok ? validation.code : null;
}

export function createPublicProfileResolverFailurePayload(
  code: PublicProfileResolverFailureCode,
) {
  const failure = publicProfileResolverFailures[code];

  return {
    ok: false,
    error: "public_profile_resolve_failed",
    code,
    message: failure.message,
    retryable: failure.retryable,
    step: failure.step,
  } as const;
}

export function createPublicProfileResolverSuccessPayload({
  card,
  code,
}: {
  card: PublicProfileCardPayload;
  code: string;
}): PublicProfileResolverSuccessPayload {
  return {
    ok: true,
    publicProfile: {
      card,
      code,
      contractVersion: publicProfileResolverContractVersion,
      noindexRequired: true,
      policyVersion: profileVisibilityPolicyVersion,
      profilePath: `/p/${code}`,
      sourceCardContractVersion: publicProfileCardContractVersion,
    },
    privacy: {
      includesAccountIdentity: false,
      includesCrisisHelpInteractions: false,
      includesDirectResponses: false,
      includesRawScorePayload: false,
      includesSensitiveAssessments: false,
    },
  };
}
