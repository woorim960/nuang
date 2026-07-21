import type { PublicProfileImage } from "@/features/public-profile/profile-image";

export type BlockedProfile = {
  blockedAccountId: string;
  blockedAt: string;
  code: string | null;
  displayName: string;
  profileImage: PublicProfileImage;
  profileName: string | null;
  publicSnapshotId: string | null;
};

export type BlockedProfilesResponse =
  | {
      blockedProfiles: BlockedProfile[];
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };
