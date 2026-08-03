import type { ReactNode } from "react";
import Link from "next/link";
import { NuangOperatorBadge } from "@/components/identity/NuangOperatorBadge";
import type { PublicProfileImage } from "@/features/public-profile/profile-image";
import { PublicProfileImageView } from "@/features/public-profile/PublicProfileImageView";
import styles from "./ProfileIdentitySurface.module.css";

export type ProfileIdentityTrait =
  | { code: string; label: string; type: "code" }
  | { label: string; type: "status" };

export function ProfileIdentitySurface({
  actions,
  bio,
  connectionsHrefBase = null,
  displayName,
  emptyBio,
  followerCount,
  followingCount,
  handle,
  image,
  operator = false,
  postCount,
  trait,
}: {
  actions?: ReactNode;
  bio: string | null | undefined;
  connectionsHrefBase?: string | null;
  displayName: string;
  emptyBio: string;
  followerCount: number | null;
  followingCount: number | null;
  handle: string | null | undefined;
  image: PublicProfileImage;
  operator?: boolean;
  postCount: number | null;
  trait: ProfileIdentityTrait;
}) {
  return (
    <>
      <div className={styles.profileOverview}>
        <PublicProfileImageView
          className={styles.profileImage}
          image={image}
          priority
          size="lg"
        />
        <div className={styles.profileIdentity}>
          <div className={styles.identityNameRow}>
            <h2>{displayName}</h2>
            {operator ? <NuangOperatorBadge /> : null}
          </div>
          {handle ? <span className={styles.handle}>@{handle}</span> : null}
          {trait.type === "code" ? (
            <div className={styles.roleRow}>
              <span>{trait.code}</span>
              <strong>{trait.label}</strong>
            </div>
          ) : (
            <span className={styles.status}>{trait.label}</span>
          )}
        </div>
      </div>

      <p className={styles.bio}>{bio || emptyBio}</p>

      <div aria-label="프로필 활동 요약" className={styles.stats}>
        <Stat count={postCount} label="게시물" />
        {connectionsHrefBase ? (
          <Link href={`${connectionsHrefBase}?tab=followers`}>
            <strong>{formatCount(followerCount)}</strong>팔로워
          </Link>
        ) : (
          <Stat count={followerCount} label="팔로워" />
        )}
        {connectionsHrefBase ? (
          <Link href={`${connectionsHrefBase}?tab=following`}>
            <strong>{formatCount(followingCount)}</strong>팔로잉
          </Link>
        ) : (
          <Stat count={followingCount} label="팔로잉" />
        )}
      </div>

      {actions}
    </>
  );
}

function Stat({ count, label }: { count: number | null; label: string }) {
  return (
    <span>
      <strong>{formatCount(count)}</strong>
      {label}
    </span>
  );
}

function formatCount(count: number | null) {
  return count === null ? "—" : count.toLocaleString("ko-KR");
}
