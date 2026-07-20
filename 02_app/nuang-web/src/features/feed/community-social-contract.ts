import { z } from "zod";
import type { PublicProfileImage } from "@/features/public-profile/profile-image";

export const profileFollowRequestSchema = z.object({
  action: z.enum(["follow", "unfollow"]),
  publicSnapshotId: z.string().uuid(),
});

export const profileReportReasons = [
  "privacy",
  "harassment",
  "sensitive_content",
  "spam",
  "other",
] as const;

export const profileSafetyActionRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.enum(["block", "unblock"]),
    publicSnapshotId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("report"),
    details: z.string().trim().max(500).optional(),
    publicSnapshotId: z.string().uuid(),
    reason: z.enum(profileReportReasons),
  }),
]);

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
  followerCount: number;
  followingCount: number;
  following: boolean;
  isOwnProfile: boolean;
};

export type CommunityProfileConnection = {
  code: string;
  connectedAt: string;
  displayName: string;
  profileImage: PublicProfileImage;
  profileName: string;
  publicSnapshotId: string;
};

export type CommunityProfileConnectionsResult = {
  followers: CommunityProfileConnection[];
  following: CommunityProfileConnection[];
  ownerDisplayName: string;
  ownerPublicSnapshotId: string;
  state: "profile_not_found" | "ready" | "unavailable";
};
