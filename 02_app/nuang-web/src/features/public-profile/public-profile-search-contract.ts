import type { PublicProfileImage } from "@/features/public-profile/profile-image";

export const publicProfileSearchMinQueryLength = 2;
export const publicProfileSearchMaxQueryLength = 32;
export const publicProfileSearchMaxResults = 12;
export const publicProfileSearchDebounceMs = 300;

export type PublicProfileSearchIntent = "browse" | "compare";

export type PublicProfileSearchItem = {
  code: string | null;
  comparisonAvailable: boolean;
  displayName: string;
  handle: string;
  profileImage: PublicProfileImage;
  profileMessage: string;
  publicProfileId: string;
  publicSnapshotId: string;
  roleName: string | null;
};

export type PublicProfileSearchResponse =
  | {
      ok: true;
      profiles: PublicProfileSearchItem[];
    }
  | {
      code: "invalid_query" | "search_unavailable";
      message: string;
      ok: false;
    };

export type NormalizedPublicProfileSearchQuery =
  | { code: "invalid"; ok: false }
  | { code: "too_long"; ok: false }
  | { code: "too_short"; ok: false }
  | { ok: true; value: string };

export function normalizePublicProfileSearchQuery(
  rawQuery: string,
): NormalizedPublicProfileSearchQuery {
  const value = rawQuery
    .normalize("NFKC")
    .trim()
    .replace(/^@+/, "")
    .replace(/\s+/g, " ");

  if (value.length < publicProfileSearchMinQueryLength) {
    return { code: "too_short", ok: false };
  }
  if (value.length > publicProfileSearchMaxQueryLength) {
    return { code: "too_long", ok: false };
  }
  if (!/^[\p{Letter}\p{Number}._\-\s]+$/u.test(value)) {
    return { code: "invalid", ok: false };
  }

  return { ok: true, value };
}
