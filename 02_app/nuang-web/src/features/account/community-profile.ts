import { z } from "zod";
import type { PublicProfileImage } from "@/features/public-profile/profile-image";

export const communityProfileDisplayNameMaxLength = 20;
export const communityProfileBioMaxLength = 120;
export const communityProfileAvatarMaxBytes = 5 * 1024 * 1024;
export const communityProfileAvatarBucket = "profile-avatars";

export const communityProfileTextSchema = z
  .object({
    bio: z.string().trim().max(communityProfileBioMaxLength),
    displayName: z
      .string()
      .trim()
      .min(2, "닉네임은 두 글자 이상 입력해 주세요.")
      .max(
        communityProfileDisplayNameMaxLength,
        `닉네임은 ${communityProfileDisplayNameMaxLength}자까지 입력할 수 있어요.`,
      ),
    expectedRevision: z.number().int().positive(),
    handle: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "사용자 ID는 세 글자 이상 입력해 주세요.")
      .max(24, "사용자 ID는 24자까지 입력할 수 있어요.")
      .regex(
        /^[a-z0-9._]+$/,
        "사용자 ID에는 영문, 숫자, 점과 밑줄만 사용할 수 있어요.",
      ),
  })
  .strict();

export type CommunityProfileRecord = {
  accountId: string;
  avatarBucket: string | null;
  avatarObjectPath: string | null;
  avatarRevision: number;
  bio: string;
  codeVisibility: "private" | "public";
  comparisonEnabled: boolean;
  detailVisibility: "private" | "public";
  displayName: string;
  handle: string;
  id: string;
  revision: number;
  status: "active" | "deleted" | "hidden";
};

export type CommunityProfileEditorPayload = {
  avatar: PublicProfileImage;
  bio: string;
  code: string | null;
  displayName: string;
  handle: string;
  profileName: string | null;
  publicId: string;
  revision: number;
};

export function normalizeCommunityProfileRow(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;

  if (
    typeof row.id !== "string" ||
    typeof row.account_id !== "string" ||
    typeof row.display_name !== "string" ||
    typeof row.handle !== "string"
  ) {
    return null;
  }

  return {
    accountId: row.account_id,
    avatarBucket:
      typeof row.avatar_bucket === "string" ? row.avatar_bucket : null,
    avatarObjectPath:
      typeof row.avatar_object_path === "string"
        ? row.avatar_object_path
        : null,
    avatarRevision:
      typeof row.avatar_revision === "number" ? row.avatar_revision : 0,
    bio: typeof row.bio === "string" ? row.bio : "",
    codeVisibility: row.code_visibility === "private" ? "private" : "public",
    comparisonEnabled: row.comparison_enabled !== false,
    detailVisibility:
      row.detail_visibility === "private" ? "private" : "public",
    displayName: row.display_name,
    handle: row.handle,
    id: row.id,
    revision: typeof row.revision === "number" ? row.revision : 1,
    status:
      row.status === "hidden" || row.status === "deleted"
        ? row.status
        : "active",
  } satisfies CommunityProfileRecord;
}

export function createDefaultCommunityHandle(accountId: string) {
  const compactId = accountId.replaceAll("-", "").toLowerCase();
  return `nuang.${compactId.slice(0, 5)}${compactId.slice(-13)}`;
}

export function isSupportedCommunityAvatarType(type: string) {
  return type === "image/jpeg" || type === "image/png" || type === "image/webp";
}
