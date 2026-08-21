import { z } from "zod";
import type { PublicProfileImage } from "@/features/public-profile/profile-image";

const profileMutationTargetFields = {
  communityProfileId: z.string().uuid().optional(),
  publicSnapshotId: z.string().uuid().optional(),
};

export const profileFollowRequestSchema = requireProfileMutationTarget(
  z.object({
    action: z.enum(["follow", "unfollow"]),
    ...profileMutationTargetFields,
  }),
);

export const profileReportReasons = [
  "privacy",
  "harassment",
  "sensitive_content",
  "spam",
  "other",
] as const;

export const profileSafetyActionRequestSchema = requireProfileMutationTarget(
  z.discriminatedUnion("action", [
    z.object({
      action: z.enum(["block", "unblock"]),
      ...profileMutationTargetFields,
    }),
    z.object({
      action: z.literal("report"),
      details: z.string().trim().max(500).optional(),
      reason: z.enum(profileReportReasons),
      ...profileMutationTargetFields,
    }),
  ]),
);

export type CommunityNotification = {
  actorDisplayName: string;
  actorPublicSnapshotId: string | null;
  createdAt: string;
  eventType: "comment" | "follow" | "mention" | "reaction" | "reply";
  id: string;
  previewText: string | null;
  targetId: string;
  targetType: "feed_comment" | "feed_post" | "public_profile";
};

export type CommunityNotificationsResult = {
  notifications: CommunityNotification[];
  state: "ready" | "unauthenticated" | "unavailable";
};

export type CommunityProfileSocialState = {
  actions: {
    block: "ready" | "unavailable";
    follow: "ready" | "unfollow_only" | "unavailable";
    report: "ready" | "unavailable";
  };
  followerCount: number;
  followingCount: number;
  following: boolean;
  isOwnProfile: boolean;
};

export type CommunityProfileConnection = {
  code: string | null;
  communityProfileId?: string;
  connectedAt: string;
  displayName: string;
  profileImage: PublicProfileImage;
  profileName: string | null;
  publicSnapshotId: string;
};

export type CommunityProfileConnectionsResult = {
  followers: CommunityProfileConnection[];
  following: CommunityProfileConnection[];
  ownerDisplayName: string;
  ownerPublicSnapshotId: string;
  state: "profile_not_found" | "ready" | "unavailable";
};

function requireProfileMutationTarget<T extends z.ZodType>(schema: T) {
  return schema.refine(
    (value) => {
      const target = value as {
        communityProfileId?: string;
        publicSnapshotId?: string;
      };
      return Boolean(target.communityProfileId || target.publicSnapshotId);
    },
    {
      message: "communityProfileId or publicSnapshotId is required",
      path: ["communityProfileId"],
    },
  );
}
